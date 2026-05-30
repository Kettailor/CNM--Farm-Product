import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureWarehouseSchema } from "@/lib/warehouse-schema";
import { loadWarehouseItems, loadWarehouseZones, mapWarehouseRow, type WarehouseRow } from "@/lib/warehouse-data";
import {
  getWarehouseTypeOption,
  isWarehouseStatus,
  isWarehouseType,
  type WarehouseMetadata,
  type WarehouseStatus,
  type WarehouseType,
} from "@/lib/warehouse-types";

export const dynamic = "force-dynamic";

type WarehousePayload = {
  code?: unknown;
  zoneId?: unknown;
  name?: unknown;
  type?: unknown;
  group?: unknown;
  quantity?: unknown;
  unit?: unknown;
  minimumQuantity?: unknown;
  location?: unknown;
  status?: unknown;
  receivedDate?: unknown;
  expiryDate?: unknown;
  supplier?: unknown;
  manager?: unknown;
  estimatedValue?: unknown;
  note?: unknown;
  metadata?: unknown;
};

const TYPE_PREFIX: Record<WarehouseType, string> = {
  cong_cu: "CC",
  hoa_chat: "HC",
  thuc_an: "TA",
  thanh_pham_vat_nuoi: "TP",
};

function cleanString(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function parseNumber(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateOrNull(value: unknown) {
  const raw = cleanString(value, 20);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function metadataText(metadata: WarehouseMetadata, key: string, max = 240) {
  return cleanString(metadata[key], max);
}

function metadataNumber(metadata: WarehouseMetadata, key: string) {
  const value = metadata[key];
  if (value == null || value === "") return null;
  return parseNumber(value, 0);
}

function metadataDate(metadata: WarehouseMetadata, key: string) {
  return dateOrNull(metadata[key]);
}

function cleanMetadata(value: unknown): WarehouseMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<WarehouseMetadata>((result, [key, entry]) => {
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 60);
    if (!safeKey) return result;
    if (typeof entry === "number") {
      result[safeKey] = Number.isFinite(entry) ? entry : null;
      return result;
    }
    result[safeKey] = cleanString(entry, 400);
    return result;
  }, {});
}

function makeWarehouseCode(type: WarehouseType) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `KHO-${TYPE_PREFIX[type]}-${today}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function getOwnerFarmId(ownerId: string) {
  const farmRs = await db.query<{ id: string }>(
    `select id
     from du_lieu.trang_trai
     where chu_so_huu_id = $1
     order by created_at desc
     limit 1`,
    [ownerId]
  );
  return farmRs.rows[0]?.id;
}

function normalizePayload(body: WarehousePayload) {
  const type: WarehouseType = isWarehouseType(body.type) ? body.type : "cong_cu";
  const typeOption = getWarehouseTypeOption(type);
  const status: WarehouseStatus = isWarehouseStatus(body.status) ? body.status : "binh_thuong";
  const name = cleanString(body.name, 180);
  const quantity = parseNumber(body.quantity, 0);
  const minimumQuantity = parseNumber(body.minimumQuantity, 0);
  const estimatedValueRaw = cleanString(body.estimatedValue, 40);
  const estimatedValue = estimatedValueRaw ? parseNumber(estimatedValueRaw, 0) : null;

  const payload = {
    code: cleanString(body.code, 80),
    zoneId: cleanString(body.zoneId, 80),
    name,
    type,
    group: cleanString(body.group, 120),
    quantity,
    unit: cleanString(body.unit, 40) ?? typeOption.defaultUnit,
    minimumQuantity,
    location: cleanString(body.location, 180),
    status,
    receivedDate: dateOrNull(body.receivedDate),
    expiryDate: dateOrNull(body.expiryDate),
    supplier: cleanString(body.supplier, 180),
    manager: cleanString(body.manager, 120),
    estimatedValue,
    note: cleanString(body.note, 1200),
    metadata: cleanMetadata(body.metadata),
  };

  const chemical = {
    alias: metadataText(payload.metadata, "alias", 180),
    productType: metadataText(payload.metadata, "productType", 80) ?? payload.group,
    whpDays: metadataNumber(payload.metadata, "whpDays"),
    esiDays: metadataNumber(payload.metadata, "esiDays"),
    description: metadataText(payload.metadata, "description", 800) ?? payload.note,
    unitCount: metadataNumber(payload.metadata, "unitCount"),
    volumePerUnit: metadataNumber(payload.metadata, "volumePerUnit"),
    volumeUnit: metadataText(payload.metadata, "volumeUnit", 40) ?? payload.unit,
    totalVolume: metadataNumber(payload.metadata, "totalVolume") ?? payload.quantity,
    unitCost: metadataNumber(payload.metadata, "unitCost"),
    totalCost: metadataNumber(payload.metadata, "totalCost") ?? payload.estimatedValue,
    batchNumber: metadataText(payload.metadata, "batchNumber", 120),
    purchaseDate: metadataDate(payload.metadata, "purchaseDate") ?? payload.receivedDate,
    manufactureDate: metadataDate(payload.metadata, "manufactureDate"),
  };

  return { ...payload, chemical };
}

async function resolveWarehouseZone(farmId: string, zoneId: string | null, type: WarehouseType) {
  const zones = await loadWarehouseZones(farmId);
  if (zones.length === 0) {
    return {
      zones,
      zone: null,
      error: "Vui lòng thiết lập khu vực dành cho kho trước khi quản lý kho.",
    };
  }

  const zone = zones.find((item) => item.id === zoneId) ?? null;
  if (!zone) {
    return { zones, zone: null, error: "Vui lòng chọn khu vực kho hợp lệ." };
  }

  if (!zone.warehouseTypes.includes(type)) {
    return {
      zones,
      zone: null,
      error: "Loại vật tư không phù hợp với loại kho đã thiết lập cho khu vực này.",
    };
  }

  return { zones, zone, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWarehouseSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ items: [] });

    const [items, zones] = await Promise.all([loadWarehouseItems(farmId), loadWarehouseZones(farmId)]);
    return NextResponse.json({ items, zones });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tải dữ liệu kho.", error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWarehouseSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ message: "Chưa có trang trại để thêm vật tư kho." }, { status: 404 });

    const body = (await request.json()) as WarehousePayload;
    const payload = normalizePayload(body);
    const zoneCheck = await resolveWarehouseZone(farmId, payload.zoneId, payload.type);
    if (zoneCheck.error) return NextResponse.json({ message: zoneCheck.error, zones: zoneCheck.zones }, { status: 400 });

    if (!payload.name) {
      return NextResponse.json({ message: "Vui lòng nhập tên vật tư hoặc thành phẩm." }, { status: 400 });
    }
    if (payload.quantity < 0 || payload.minimumQuantity < 0) {
      return NextResponse.json({ message: "Số lượng và ngưỡng tối thiểu không được âm." }, { status: 400 });
    }

    const code = payload.code ?? makeWarehouseCode(payload.type);
    const result = await db.query<WarehouseRow>(
      `with inserted as (
        insert into du_lieu.kho_vat_tu (
          trang_trai_id, khu_vuc_id, ma_vat_tu, ten_vat_tu, loai_kho, nhom_hang, so_luong, don_vi,
          nguong_toi_thieu, vi_tri_luu_tru, trang_thai, ngay_nhap, han_su_dung,
          nha_cung_cap, nguoi_phu_trach, gia_tri_uoc_tinh, ghi_chu,
          ten_rut_gon, phan_loai_san_pham, whp_ngay, esi_ngay, mo_ta_san_pham,
          so_don_vi, dung_tich_moi_don_vi, don_vi_dung_tich, tong_dung_tich,
          don_gia, tong_chi_phi, so_lo, ngay_mua, ngay_san_xuat, metadata_json
        )
        values ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32::jsonb)
        returning *
      )
      select inserted.id::text, inserted.khu_vuc_id::text, zone.ten_khu_vuc, zone.ma_khu_vuc,
             inserted.ma_vat_tu, inserted.ten_vat_tu, inserted.loai_kho, inserted.nhom_hang,
             inserted.so_luong, inserted.don_vi, inserted.nguong_toi_thieu, inserted.vi_tri_luu_tru,
             inserted.trang_thai, inserted.ngay_nhap, inserted.han_su_dung, inserted.nha_cung_cap,
             inserted.nguoi_phu_trach, inserted.gia_tri_uoc_tinh, inserted.ghi_chu, inserted.metadata_json,
             inserted.ten_rut_gon, inserted.phan_loai_san_pham, inserted.whp_ngay, inserted.esi_ngay,
             inserted.mo_ta_san_pham, inserted.so_don_vi, inserted.dung_tich_moi_don_vi,
             inserted.don_vi_dung_tich, inserted.tong_dung_tich, inserted.don_gia, inserted.tong_chi_phi,
             inserted.so_lo, inserted.ngay_mua, inserted.ngay_san_xuat,
             inserted.created_at, inserted.updated_at
      from inserted
      left join du_lieu.khu_vuc zone on zone.id = inserted.khu_vuc_id`,
      [
        farmId,
        zoneCheck.zone?.id,
        code,
        payload.name,
        payload.type,
        payload.group,
        payload.quantity,
        payload.unit,
        payload.minimumQuantity,
        payload.location,
        payload.status,
        payload.receivedDate,
        payload.expiryDate,
        payload.supplier,
        payload.manager,
        payload.estimatedValue,
        payload.note,
        payload.type === "hoa_chat" ? payload.chemical.alias : null,
        payload.type === "hoa_chat" ? payload.chemical.productType : null,
        payload.type === "hoa_chat" ? payload.chemical.whpDays : null,
        payload.type === "hoa_chat" ? payload.chemical.esiDays : null,
        payload.type === "hoa_chat" ? payload.chemical.description : null,
        payload.type === "hoa_chat" ? payload.chemical.unitCount : null,
        payload.type === "hoa_chat" ? payload.chemical.volumePerUnit : null,
        payload.type === "hoa_chat" ? payload.chemical.volumeUnit : null,
        payload.type === "hoa_chat" ? payload.chemical.totalVolume : null,
        payload.type === "hoa_chat" ? payload.chemical.unitCost : null,
        payload.type === "hoa_chat" ? payload.chemical.totalCost : null,
        payload.type === "hoa_chat" ? payload.chemical.batchNumber : null,
        payload.type === "hoa_chat" ? payload.chemical.purchaseDate : null,
        payload.type === "hoa_chat" ? payload.chemical.manufactureDate : null,
        JSON.stringify(payload.type === "hoa_chat" ? {} : payload.metadata),
      ]
    );

    return NextResponse.json({ message: "Đã thêm vào kho.", item: mapWarehouseRow(result.rows[0]) });
  } catch (error) {
    const message = String(error).includes("kho_vat_tu_trang_trai_id_ma_vat_tu_key")
      ? "Mã vật tư đã tồn tại trong kho của trang trại."
      : "Không thể thêm vật tư kho.";
    return NextResponse.json({ message, error: String(error) }, { status: 500 });
  }
}
