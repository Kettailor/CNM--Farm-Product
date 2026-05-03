import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";

type ZoneKind = "pasture" | "cropping" | "storage" | "parking";
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
  extra?: Record<string, string>;
};

const isCoord = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
const normalizeStatus = (value?: string): ZoneState => {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("bản nháp") || raw.includes("draft")) return "bản nháp";
  if (raw.includes("ngừng") || raw.includes("inactive")) return "ngừng hoạt động";
  if (raw.includes("bảo trì") || raw.includes("maintenance")) return "bảo trì";
  if (raw.includes("hoàn thành") || raw.includes("completed")) return "hoàn thành";
  if (raw.includes("đã hủy") || raw.includes("cancel")) return "đã hủy";
  if (raw.includes("dự kiến") || raw.includes("planned")) return "dự kiến";
  return "đang hoạt động";
};

const createZoneDetail = async (client: Awaited<ReturnType<typeof db.connect>>, zoneId: string, kind: ZoneKind, payload: Payload, areaHa: number | null) => {
  const extra = payload.extra ?? {};
  if (kind === "cropping") {
    await client.query(
      `insert into du_lieu.khu_vuc_trong_trot (khu_vuc_id, cay_trong, ph_do_dat, do_am_dat, so_gio_nang)
       values ($1,$2,$3,$4,$5)`,
      [zoneId, extra.cropType ?? null, extra.soilPh ?? null, extra.soilMoisture ?? null, extra.sunHours ?? null]
    );
    return;
  }

  if (kind === "pasture") {
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
    await client.query(
      `insert into du_lieu.khu_vuc_kho_luong_thuc (khu_vuc_id, suc_chua, loai_luu_tru, nhiet_do)
       values ($1,$2,$3,$4)`,
      [zoneId, extra.capacity ? Number(extra.capacity) : null, extra.storageType ?? null, extra.temperature ? Number(extra.temperature) : null]
    );
    await client.query(
      `insert into du_lieu.khu_vuc_kho_dung_cu (khu_vuc_id, suc_chua, loai_luu_tru, nhiet_do)
       values ($1,$2,$3,$4)`,
      [zoneId, extra.capacity ? Number(extra.capacity) : null, extra.storageType ?? null, extra.temperature ? Number(extra.temperature) : null]
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

    const body = (await request.json()) as Payload;
    const name = String(body?.name ?? "").trim();
    const lat = Number(body?.latitude);
    const lng = Number(body?.longitude);

    if (!name) return NextResponse.json({ message: "Vui lòng nhập tên khu vực." }, { status: 400 });
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isCoord(lat, lng)) {
      return NextResponse.json({ message: "Tọa độ vị trí không hợp lệ." }, { status: 400 });
    }

    const farm = await db.query(
      `select t.id as farm_id
       from du_lieu.trang_trai t
       where t.chu_so_huu_id = $1
       order by t.created_at desc
       limit 1`,
      [ownerId]
    );
    const farmId = farm.rows[0]?.farm_id as string | undefined;
    if (!farmId) return NextResponse.json({ message: "Chưa có nông trại cho tài khoản này." }, { status: 404 });

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
      const geojson = { geo: { polygon }, metadata: { kind: body.kind, color: body.color ?? null, extra: body.extra ?? {} } };
      const areaHa = Number(body.areaHa);
      const perimeterM = Number(body.perimeterM);

      await client.query(
        `insert into du_lieu.khu_vuc
          (id, trang_trai_id, ma_khu_vuc, ten_khu_vuc, loai_khu_vuc_id, trang_thai, dien_tich_ha, chu_vi_m, tam_vi_do, tam_kinh_do, hinh_hoc_geojson, mo_ta, mau_sac, nguon_tao)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          id,
          farmId,
          code,
          name,
          body.categoryId ?? null,
          normalizeStatus(body.status),
          Number.isFinite(areaHa) ? areaHa : null,
          Number.isFinite(perimeterM) ? perimeterM : null,
          lat,
          lng,
          JSON.stringify(geojson),
          body.description?.trim() || null,
          body.color ?? null,
          `dashboard/khu-vuc/tao-moi:${body.kind}`,
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
