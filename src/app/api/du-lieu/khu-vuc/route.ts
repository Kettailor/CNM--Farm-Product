import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { WAREHOUSE_TYPE_VALUES, type WarehouseType } from "@/lib/warehouse-types";
import { ensureZoneSchema } from "@/lib/zone-schema";
import { normalizeText, type ZoneTypeKey } from "@/lib/zone-type-utils";

type ZoneKind = ZoneTypeKey;
type ZoneState = "đang hoạt động" | "bản nháp" | "ngừng hoạt động" | "bảo trì" | "đã ngừng" | "dự kiến" | "hoàn thành" | "đã hủy";

type Payload = {
  name: string;
  status: ZoneState;
  kind: ZoneKind;
  categoryId?: string | null;
  description?: string;
  areaHa?: string;
  perimeterM?: string;
  latitude?: string;
  longitude?: string;
  color?: string;
  points?: Array<{ lat: number; lng: number }>;
  extra?: Record<string, unknown>;
};

const normalizeWarehouseTypes = (value: unknown): WarehouseType[] => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(list.filter((item): item is WarehouseType => WAREHOUSE_TYPE_VALUES.includes(item as WarehouseType))));
};

const isCoord = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
const isZoneKind = (value: unknown): value is ZoneKind =>
  value === "parking" || value === "storage" || value === "cropping" || value === "livestock" || value === "grazing" || value === "water";

const normalizeStatus = (value?: string): ZoneState => {
  const raw = normalizeText(value);
  if (raw.includes("ban nhap") || raw.includes("draft")) return "bản nháp";
  if (raw.includes("ngung") || raw.includes("inactive")) return "ngừng hoạt động";
  if (raw.includes("bao tri") || raw.includes("maintenance")) return "bảo trì";
  if (raw.includes("hoan thanh") || raw.includes("completed")) return "hoàn thành";
  if (raw.includes("da huy") || raw.includes("cancel")) return "đã hủy";
  if (raw.includes("du kien") || raw.includes("planned")) return "dự kiến";
  return "đang hoạt động";
};

const createZoneDetail = async (client: PoolClient, zoneId: string, kind: ZoneKind, payload: Payload, areaHa: number | null) => {
  const extra = payload.extra ?? {};
  if (kind === "cropping") {
    await client.query(
      `insert into du_lieu.khu_vuc_trong_trot (khu_vuc_id, cay_trong, ph_do_dat, do_am_dat, so_gio_nang)
       values ($1,$2,$3,$4,$5)`,
      [zoneId, extra.cropType ?? null, extra.soilPh ?? null, extra.soilMoisture ?? null, extra.sunHours ?? null]
    );
    return;
  }

  if (kind === "grazing") {
    await client.query(
      `insert into du_lieu.khu_vuc_dong_co (khu_vuc_id, so_ngay_nghi_co, dse_load, ty_le_chan_tha, thuc_an_san_co, so_ngay_chan_tha_con_lai, toc_do_moc_co, trang_thai_co, loai_co, dien_tich_canh_tac_ha)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        zoneId,
        extra.daysEmpty ? Number(extra.daysEmpty) : null,
        extra.dseLoad ? Number(extra.dseLoad) : null,
        extra.stockingRate ? Number(extra.stockingRate) : null,
        extra.feedOnOffer ? Number(extra.feedOnOffer) : null,
        extra.grazingDaysRemaining ? Number(extra.grazingDaysRemaining) : null,
        extra.pastureGrowthRate ? Number(extra.pastureGrowthRate) : null,
        extra.pastureState ?? null,
        extra.pastureType ?? null,
        areaHa,
      ]
    );
    return;
  }

  if (kind === "storage") {
    const warehouseTypes = normalizeWarehouseTypes(extra.warehouseTypes);
    const uniqueWarehouseTypes = Array.from(new Set(warehouseTypes));
    await client.query(
      `insert into du_lieu.khu_vuc_kho_luong_thuc (khu_vuc_id, suc_chua, loai_luu_tru, nhom_luu_tru, nhiet_do, thong_tin_kho)
       values ($1,$2,$3,$4::text[],$5,$6::jsonb)`,
      [zoneId, extra.capacity ? Number(extra.capacity) : null, uniqueWarehouseTypes.join(","), uniqueWarehouseTypes, extra.temperature ? Number(extra.temperature) : null, JSON.stringify(extra)]
    );
    return;
  }

  if (kind === "parking") {
    await client.query(
      `insert into du_lieu.khu_vuc_bai_do_xe (khu_vuc_id, suc_chua, loai_bai_do_xe, nhiet_do)
       values ($1,$2,$3,$4)`,
      [zoneId, extra.capacity ? Number(extra.capacity) : null, extra.parkingType ?? null, extra.temperature ? Number(extra.temperature) : null]
    );
  }
};

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    await ensureZoneSchema();

    const body = (await request.json()) as Payload;
    const name = String(body?.name ?? "").trim();
    const lat = Number(body?.latitude);
    const lng = Number(body?.longitude);

    if (!name) return NextResponse.json({ message: "Vui lòng nhập tên khu vực." }, { status: 400 });
    if (!isZoneKind(body.kind)) return NextResponse.json({ message: "Loại khu vực không hợp lệ." }, { status: 400 });
    const warehouseTypes = body.kind === "storage" ? normalizeWarehouseTypes(body.extra?.warehouseTypes) : [];
    if (body.kind === "storage" && warehouseTypes.length === 0) {
      return NextResponse.json({ message: "Vui lòng tick ít nhất một nhóm lưu trữ cho khu vực kho." }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isCoord(lat, lng)) {
      return NextResponse.json({ message: "Tọa độ vị trí không hợp lệ." }, { status: 400 });
    }

    const farmId = await getAccessibleFarmId(ownerId, "write");
    if (!farmId) return NextResponse.json({ message: "Không có quyền tạo khu vực." }, { status: 403 });

    const client = await db.connect();
    try {
      await client.query("begin");
      const id = randomUUID();
      const code = `KV-${id.slice(0, 8).toUpperCase()}`;
      const polygon = Array.isArray(body.points) && body.points.length >= 3
        ? body.points
        : [
            { lat: lat + 0.0001, lng: lng - 0.0001 },
            { lat: lat + 0.0001, lng: lng + 0.0001 },
            { lat: lat - 0.0001, lng: lng + 0.0001 },
          ];
      const geojson = {
        geo: { polygon },
        metadata: {
          kind: body.kind,
          color: body.color ?? null,
          warehouseTypes: body.kind === "storage" ? warehouseTypes : [],
          extra: body.extra ?? {},
        },
      };
      const areaHa = Number(body.areaHa);
      const perimeterM = Number(body.perimeterM);
      const capacityValue = Number(body.extra?.capacity ?? body.extra?.herdCapacity ?? NaN);

      await client.query(
        `insert into du_lieu.khu_vuc
          (id, trang_trai_id, ma_khu_vuc, ten_khu_vuc, loai_khu_vuc_id, trang_thai, dien_tich_ha, chu_vi_m, suc_chua, tam_vi_do, tam_kinh_do, hinh_hoc_geojson, mo_ta, mau_sac, nguon_tao, loai_khu_vuc, thong_tin_loai, nhom_luu_tru_kho)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::text[])`,
        [
          id,
          farmId,
          code,
          name,
          body.categoryId ?? null,
          normalizeStatus(body.status),
          Number.isFinite(areaHa) ? areaHa : null,
          Number.isFinite(perimeterM) ? perimeterM : null,
          Number.isFinite(capacityValue) ? capacityValue : null,
          lat,
          lng,
          JSON.stringify(geojson),
          body.description?.trim() || null,
          body.color ?? null,
          `dashboard/khu-vuc/tao-moi:${body.kind}`,
          body.kind,
          JSON.stringify(body.extra ?? {}),
          body.kind === "storage" ? warehouseTypes : [],
        ]
      );

      await createZoneDetail(client, id, body.kind, body, Number.isFinite(areaHa) ? areaHa : null);

      await client.query("commit");
      return NextResponse.json({ message: "Lưu khu vực thành công.", zoneId: id, nextPath: `/dashboard/khu-vuc/${id}` });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ message: "Không thể lưu khu vực.", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
