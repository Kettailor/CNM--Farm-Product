import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureWarehouseSchema } from "@/lib/warehouse-schema";
import { loadWarehouseZones, mapWarehouseRow, type WarehouseRow } from "@/lib/warehouse-data";
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

export async function PUT(request: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWarehouseSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ message: "Chưa có trang trại để cập nhật kho." }, { status: 404 });

    const body = (await request.json()) as WarehousePayload;
    const payload = normalizePayload(body);
    const zoneCheck = await resolveWarehouseZone(farmId, payload.zoneId, payload.type);
    if (zoneCheck.error) return NextResponse.json({ message: zoneCheck.error, zones: zoneCheck.zones }, { status: 400 });

    if (!payload.name) return NextResponse.json({ message: "Vui lòng nhập tên vật tư hoặc thành phẩm." }, { status: 400 });
    if (payload.quantity < 0 || payload.minimumQuantity < 0) {
      return NextResponse.json({ message: "Số lượng và ngưỡng tối thiểu không được âm." }, { status: 400 });
    }

    const result = await db.query<WarehouseRow>(
      `with updated as (
        update du_lieu.kho_vat_tu
           set ma_vat_tu = coalesce($1, ma_vat_tu),
               khu_vuc_id = $2::uuid,
               ten_vat_tu = $3,
               loai_kho = $4,
               nhom_hang = $5,
               so_luong = $6,
               don_vi = $7,
               nguong_toi_thieu = $8,
               vi_tri_luu_tru = $9,
               trang_thai = $10,
               ngay_nhap = $11,
               han_su_dung = $12,
               nha_cung_cap = $13,
               nguoi_phu_trach = $14,
               gia_tri_uoc_tinh = $15,
               ghi_chu = $16,
               ten_rut_gon = $17,
               phan_loai_san_pham = $18,
               whp_ngay = $19,
               esi_ngay = $20,
               mo_ta_san_pham = $21,
               so_don_vi = $22,
               dung_tich_moi_don_vi = $23,
               don_vi_dung_tich = $24,
               tong_dung_tich = $25,
               don_gia = $26,
               tong_chi_phi = $27,
               so_lo = $28,
               ngay_mua = $29,
               ngay_san_xuat = $30,
               metadata_json = $31::jsonb,
               updated_at = now()
         where id::text = $32 and trang_trai_id = $33
         returning *
      )
      select updated.id::text, updated.khu_vuc_id::text, zone.ten_khu_vuc, zone.ma_khu_vuc,
             updated.ma_vat_tu, updated.ten_vat_tu, updated.loai_kho, updated.nhom_hang,
             updated.so_luong, updated.don_vi, updated.nguong_toi_thieu, updated.vi_tri_luu_tru,
             updated.trang_thai, updated.ngay_nhap, updated.han_su_dung, updated.nha_cung_cap,
             updated.nguoi_phu_trach, updated.gia_tri_uoc_tinh, updated.ghi_chu, updated.metadata_json,
             updated.ten_rut_gon, updated.phan_loai_san_pham, updated.whp_ngay, updated.esi_ngay,
             updated.mo_ta_san_pham, updated.so_don_vi, updated.dung_tich_moi_don_vi,
             updated.don_vi_dung_tich, updated.tong_dung_tich, updated.don_gia, updated.tong_chi_phi,
             updated.so_lo, updated.ngay_mua, updated.ngay_san_xuat,
             updated.created_at, updated.updated_at
      from updated
      left join du_lieu.khu_vuc zone on zone.id = updated.khu_vuc_id`,
      [
        payload.code,
        zoneCheck.zone?.id,
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
        params.itemId,
        farmId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Không tìm thấy vật tư kho hoặc không có quyền chỉnh sửa." }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã cập nhật kho.", item: mapWarehouseRow(result.rows[0]) });
  } catch (error) {
    return NextResponse.json({ message: "Không thể cập nhật vật tư kho.", error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWarehouseSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ message: "Chưa có trang trại để hủy vật tư kho." }, { status: 404 });

    const result = await db.query<WarehouseRow>(
      `with updated as (
        update du_lieu.kho_vat_tu
            set trang_thai = 'da_huy',
                ghi_chu = concat_ws(E'\n', nullif(ghi_chu, ''), 'Đã hủy khỏi nghiệp vụ kho vào ' || to_char(now(), 'YYYY-MM-DD HH24:MI')),
                updated_at = now()
          where id::text = $1 and trang_trai_id = $2
          returning *
      )
      select updated.id::text, updated.khu_vuc_id::text, zone.ten_khu_vuc, zone.ma_khu_vuc,
             updated.ma_vat_tu, updated.ten_vat_tu, updated.loai_kho, updated.nhom_hang,
             updated.so_luong, updated.don_vi, updated.nguong_toi_thieu, updated.vi_tri_luu_tru,
             updated.trang_thai, updated.ngay_nhap, updated.han_su_dung, updated.nha_cung_cap,
             updated.nguoi_phu_trach, updated.gia_tri_uoc_tinh, updated.ghi_chu, updated.metadata_json,
             updated.ten_rut_gon, updated.phan_loai_san_pham, updated.whp_ngay, updated.esi_ngay,
             updated.mo_ta_san_pham, updated.so_don_vi, updated.dung_tich_moi_don_vi,
             updated.don_vi_dung_tich, updated.tong_dung_tich, updated.don_gia, updated.tong_chi_phi,
             updated.so_lo, updated.ngay_mua, updated.ngay_san_xuat,
             updated.created_at, updated.updated_at
      from updated
      left join du_lieu.khu_vuc zone on zone.id = updated.khu_vuc_id`,
      [params.itemId, farmId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Không tìm thấy vật tư kho hoặc không có quyền hủy." }, { status: 404 });
    }

    return NextResponse.json({ message: "Đã chuyển vật tư kho sang trạng thái hủy.", item: mapWarehouseRow(result.rows[0]) });
  } catch (error) {
    return NextResponse.json({ message: "Không thể hủy vật tư kho.", error: String(error) }, { status: 500 });
  }
}
