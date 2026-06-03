import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { WAREHOUSE_TYPE_VALUES, type WarehouseType } from "@/lib/warehouse-types";
import { ensureZoneSchema } from "@/lib/zone-schema";
import { ensureLivestockSchema } from "@/lib/livestock-schema";
import { ensureGrazingSchema } from "@/lib/grazing-schema";
import type { ZoneTypeKey } from "@/lib/zone-type-utils";

type ZoneUpdatePayload = {
  action?: "cancel" | "restore";
  name?: string;
  status?: string;
  description?: string;
  color?: string;
  points?: Array<{ lat: number; lng: number }>;
  latitude?: number | string;
  longitude?: number | string;
  areaHa?: number | string;
  perimeterM?: number | string;
  capacity?: string;
  typeSpecific?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

const CANCELLED_ZONE_STATUS = "đã hủy";
const ACTIVE_ZONE_STATUS = "đang hoạt động";
const INACTIVE_LIVESTOCK_STATUSES = [
  "da chet",
  "đã chết",
  "chet",
  "chết",
  "dead",
  "da huy",
  "đã hủy",
  "huy",
  "hủy",
  "cancelled",
  "da xuat",
  "đã xuất",
  "xuat chuong",
  "xuất chuồng",
  "da xuat khoi trang trai",
  "đã xuất khỏi trang trại",
  "sold",
  "archived",
  "luu tru",
  "lưu trữ",
  "da luu tru",
  "đã lưu trữ",
  "ngung theo doi",
  "ngừng theo dõi",
];
const INACTIVE_GRAZING_STATUSES = ["da huy", "đã hủy", "huy", "hủy", "cancelled", "completed", "hoan thanh", "hoàn thành", "da hoan thanh", "đã hoàn thành"];

function normalizeStatusText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[_-]+/g, " ")
    .trim();
}

const isCancelRequest = (body: ZoneUpdatePayload) => {
  const status = normalizeStatusText(body.status);
  return body.action === "cancel" || status === "da huy" || status === "cancelled";
};

const isRestoreRequest = (body: ZoneUpdatePayload) => body.action === "restore";

type ZoneSnapshot = {
  id: string;
  ten_khu_vuc: string | null;
  trang_thai: string | null;
  mo_ta: string | null;
  mau_sac: string | null;
  dien_tich_ha: number | string | null;
  chu_vi_m: number | string | null;
  tam_vi_do: number | string | null;
  tam_kinh_do: number | string | null;
  hinh_hoc_geojson: {
    geo?: { polygon?: Array<{ lat: number; lng: number }> } | null;
    metadata?: Record<string, unknown> | null;
  } | null;
};

const normalizePolygon = (points: unknown) => {
  const list = Array.isArray(points) ? points : [];
  return list
    .filter((p): p is { lat: number; lng: number } => Number.isFinite(Number((p as { lat?: unknown }).lat)) && Number.isFinite(Number((p as { lng?: unknown }).lng)))
    .map((p) => ({ lat: Number((p as { lat: number | string }).lat), lng: Number((p as { lng: number | string }).lng) }));
};

const hasCoordinateValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== "";

const parseCoordinate = (value: unknown) => {
  if (!hasCoordinateValue(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const isCoord = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const cleanJsonRecord = (value: unknown) => {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.entries(record).filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")
  );
};

const isZoneTypeKey = (value: unknown): value is ZoneTypeKey =>
  value === "parking" || value === "storage" || value === "cropping" || value === "livestock" || value === "grazing" || value === "water";

const cleanWarehouseTypes = (value: unknown): WarehouseType[] => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(list.filter((item): item is WarehouseType => WAREHOUSE_TYPE_VALUES.includes(item as WarehouseType))));
};

const textValue = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return value === undefined || value === null || Array.isArray(value) || typeof value === "object" ? null : String(value);
};

const numberValue = (record: Record<string, unknown>, key: string) => {
  const parsed = Number(record[key]);
  return Number.isFinite(parsed) ? parsed : null;
};

async function insertTypeSnapshot(zoneId: string, typeKey: ZoneTypeKey, typeSpecific: Record<string, unknown>, warehouseTypes: WarehouseType[]) {
  if (typeKey === "cropping") {
    await db.query(
      `insert into du_lieu.khu_vuc_trong_trot (khu_vuc_id, cay_trong, ph_do_dat, do_am_dat, so_gio_nang)
       values ($1,$2,$3,$4,$5)`,
      [zoneId, textValue(typeSpecific, "cropType"), numberValue(typeSpecific, "soilPh"), numberValue(typeSpecific, "soilMoisture"), numberValue(typeSpecific, "sunHours")]
    );
    return;
  }

  if (typeKey === "grazing") {
    await db.query(
      `insert into du_lieu.khu_vuc_dong_co (khu_vuc_id, so_ngay_nghi_co, dse_load, ty_le_chan_tha, thuc_an_san_co, so_ngay_chan_tha_con_lai, toc_do_moc_co, trang_thai_co, loai_co, dien_tich_canh_tac_ha)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        zoneId,
        numberValue(typeSpecific, "daysEmpty"),
        numberValue(typeSpecific, "dseLoad"),
        numberValue(typeSpecific, "stockingRate"),
        numberValue(typeSpecific, "feedOnOffer"),
        numberValue(typeSpecific, "grazingDaysRemaining"),
        numberValue(typeSpecific, "pastureGrowthRate"),
        textValue(typeSpecific, "pastureState"),
        textValue(typeSpecific, "pastureType"),
        null,
      ]
    );
    return;
  }

  if (typeKey === "storage") {
    await db.query(
      `insert into du_lieu.khu_vuc_kho_luong_thuc (khu_vuc_id, suc_chua, loai_luu_tru, nhom_luu_tru, nhiet_do, thong_tin_kho)
       values ($1,$2,$3,$4::text[],$5,$6::jsonb)`,
      [zoneId, numberValue(typeSpecific, "capacity"), warehouseTypes.join(","), warehouseTypes, numberValue(typeSpecific, "temperature"), JSON.stringify(typeSpecific)]
    );
    return;
  }

  if (typeKey === "parking") {
    await db.query(
      `insert into du_lieu.khu_vuc_bai_do_xe (khu_vuc_id, suc_chua, loai_bai_do_xe, nhiet_do)
       values ($1,$2,$3,$4)`,
      [zoneId, numberValue(typeSpecific, "capacity"), textValue(typeSpecific, "parkingType"), numberValue(typeSpecific, "temperature")]
    );
  }
}

const snapshotJson = (zone: ZoneSnapshot | null) => {
  if (!zone) return null;
  const polygon = normalizePolygon(zone.hinh_hoc_geojson?.geo?.polygon ?? []);
  return {
    id: zone.id,
    name: zone.ten_khu_vuc ?? "",
    status: zone.trang_thai ?? "",
    description: zone.mo_ta ?? "",
    color: zone.mau_sac ?? "",
    areaHa: zone.dien_tich_ha ?? "",
    perimeterM: zone.chu_vi_m ?? "",
    latitude: zone.tam_vi_do ?? "",
    longitude: zone.tam_kinh_do ?? "",
    polygon,
    metadata: zone.hinh_hoc_geojson?.metadata ?? {},
  };
};

async function loadCurrentZone(zoneId: string, farmId: string) {
  const rs = await db.query(
    `select
      k.id::text as id,
      k.ten_khu_vuc,
      k.trang_thai,
      k.mo_ta,
      k.mau_sac,
      k.dien_tich_ha,
      k.chu_vi_m,
      k.tam_vi_do,
      k.tam_kinh_do,
      k.hinh_hoc_geojson
     from du_lieu.khu_vuc k
     where k.trang_trai_id::text = $1 and (k.id::text = $2 or k.ma_khu_vuc::text = $2)
     limit 1`,
    [farmId, zoneId]
  );
  return (rs.rows[0] as ZoneSnapshot | undefined) ?? null;
}

async function getCancelBlockers(zoneId: string, farmId: string) {
  const params = [farmId, zoneId, INACTIVE_LIVESTOCK_STATUSES, INACTIVE_GRAZING_STATUSES];
  const result = await db.query(
    `with target_zone as (
       select k.id
       from du_lieu.khu_vuc k
       where k.trang_trai_id::text = $1
         and (k.id::text = $2 or k.ma_khu_vuc::text = $2)
       limit 1
     )
     select
       coalesce((
         select count(*)::int
         from du_lieu.vat_nuoi v
         left join du_lieu.nhom_vat_nuoi n on n.id = v.nhom_vat_nuoi_id
         where coalesce(v.khu_vuc_id, n.khu_vuc_id) = (select id from target_zone)
           and lower(coalesce(v.trang_thai, '')) <> all($3::text[])
       ), 0) as live_livestock_count,
       coalesce((
         select count(*)::int
         from du_lieu.nhom_vat_nuoi n
         where n.khu_vuc_id = (select id from target_zone)
           and coalesce(n.so_luong, 0) > 0
           and lower(coalesce(n.trang_thai_suc_khoe, '')) <> all($3::text[])
       ), 0) as active_group_count,
       coalesce((
         select count(*)::int
         from du_lieu.ke_hoach_chan_tha_khu_vuc lk
         join du_lieu.ke_hoach_chan_tha p on p.id = lk.ke_hoach_id
         where lk.khu_vuc_id = (select id from target_zone)
           and lower(coalesce(p.trang_thai, '')) <> all($4::text[])
       ), 0) as active_grazing_plan_count,
       coalesce((
         select count(*)::int
         from du_lieu.su_kien_chan_tha e
         join du_lieu.ke_hoach_chan_tha p on p.id = e.ke_hoach_id
         where e.khu_vuc_id = (select id from target_zone)
           and lower(coalesce(e.trang_thai, '')) <> all($4::text[])
           and lower(coalesce(p.trang_thai, '')) <> all($4::text[])
       ), 0) as active_grazing_event_count`,
    params
  );
  const row = result.rows[0] ?? {};
  return {
    liveLivestockCount: Number(row.live_livestock_count ?? 0),
    activeGroupCount: Number(row.active_group_count ?? 0),
    activeGrazingPlanCount: Number(row.active_grazing_plan_count ?? 0),
    activeGrazingEventCount: Number(row.active_grazing_event_count ?? 0),
  };
}

export async function PUT(request: Request, { params }: { params: { zoneId: string } }) {
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Bạn chưa đăng nhập." }, { status: 401 });
    await ensureZoneSchema();
    const farmId = await getAccessibleFarmId(ownerId, "write");
    if (!farmId) return NextResponse.json({ message: "Không có quyền chỉnh sửa khu vực." }, { status: 403 });

    const body = (await request.json()) as ZoneUpdatePayload;
    const zoneId = params.zoneId;
    const current = await loadCurrentZone(zoneId, farmId);
    if (!current) return NextResponse.json({ message: "Không tìm thấy khu vực hoặc không có quyền chỉnh sửa." }, { status: 404 });
    const cancelRequested = isCancelRequest(body);

    if (cancelRequested) {
      await Promise.all([ensureLivestockSchema(), ensureGrazingSchema()]);
      const blockers = await getCancelBlockers(zoneId, farmId);
      const reasons = [
        blockers.liveLivestockCount > 0 ? `${blockers.liveLivestockCount} vật nuôi còn sống đang gắn với khu vực` : "",
        blockers.activeGroupCount > 0 ? `${blockers.activeGroupCount} nhóm vật nuôi còn số lượng đang gắn với khu vực` : "",
        blockers.activeGrazingPlanCount > 0 ? `${blockers.activeGrazingPlanCount} kế hoạch chăn thả còn hiệu lực đang dùng khu vực` : "",
        blockers.activeGrazingEventCount > 0 ? `${blockers.activeGrazingEventCount} sự kiện chăn thả còn hiệu lực đang dùng khu vực` : "",
      ].filter(Boolean);

      if (reasons.length > 0) {
        return NextResponse.json(
          {
            message: `Không thể hủy khu vực vì còn ràng buộc: ${reasons.join("; ")}.`,
            blockers,
          },
          { status: 409 }
        );
      }
      body.status = CANCELLED_ZONE_STATUS;
    }

    if (isRestoreRequest(body)) {
      body.status = ACTIVE_ZONE_STATUS;
    }

    const polygon = normalizePolygon(body.points);
    const hasLatitude = hasCoordinateValue(body.latitude);
    const hasLongitude = hasCoordinateValue(body.longitude);
    if (hasLatitude !== hasLongitude) {
      return NextResponse.json({ message: "Vui lòng nhập đủ vĩ độ và kinh độ." }, { status: 400 });
    }
    const nextLatitude = parseCoordinate(body.latitude);
    const nextLongitude = parseCoordinate(body.longitude);
    if (hasLatitude && (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude) || !isCoord(Number(nextLatitude), Number(nextLongitude)))) {
      return NextResponse.json({ message: "Tọa độ vị trí không hợp lệ." }, { status: 400 });
    }
    const before = snapshotJson(current) ?? {};
    const typeSpecific = cleanJsonRecord(body.typeSpecific);
    const zoneTypeKey = isZoneTypeKey(typeSpecific.zoneTypeKey) ? typeSpecific.zoneTypeKey : null;
    const warehouseTypes = zoneTypeKey === "storage" ? cleanWarehouseTypes(typeSpecific.warehouseTypes) : [];
    const after = {
      ...before,
      name: body.name ?? current.ten_khu_vuc ?? "",
      status: body.status ?? current.trang_thai ?? "",
      description: body.description ?? current.mo_ta ?? "",
      color: body.color ?? current.mau_sac ?? "",
      areaHa: body.areaHa ?? current.dien_tich_ha ?? "",
      perimeterM: body.perimeterM ?? current.chu_vi_m ?? "",
      latitude: nextLatitude ?? current.tam_vi_do ?? "",
      longitude: nextLongitude ?? current.tam_kinh_do ?? "",
      capacity: body.capacity ?? (before as Record<string, unknown>).capacity ?? "",
      typeSpecific,
      polygon: polygon.length > 0 ? polygon : normalizePolygon(current.hinh_hoc_geojson?.geo?.polygon ?? []),
    };

    const updateResult = await db.query(
      `update du_lieu.khu_vuc k
         set ten_khu_vuc = coalesce(nullif($1, ''), ten_khu_vuc),
             trang_thai = coalesce(nullif($2, ''), trang_thai),
             mo_ta = coalesce(nullif($3, ''), mo_ta),
             mau_sac = coalesce(nullif($4, ''), mau_sac),
             hinh_hoc_geojson = jsonb_set(
               jsonb_set(
                 coalesce(k.hinh_hoc_geojson, '{}'::jsonb),
                 '{geo}',
                 coalesce(k.hinh_hoc_geojson->'geo', '{}'::jsonb)
                   || case when jsonb_array_length($5::jsonb) >= 3 then jsonb_build_object('polygon', $5::jsonb) else '{}'::jsonb end
                   || case when $14::numeric is not null and $15::numeric is not null then jsonb_build_object('lat', $14::numeric, 'lng', $15::numeric) else '{}'::jsonb end,
                 true
               ),
              '{metadata}',
               coalesce(k.hinh_hoc_geojson->'metadata', '{}'::jsonb) || jsonb_build_object(
                 'updated_from', 'dashboard-edit',
                 'kind', coalesce(nullif($12, ''), k.loai_khu_vuc, k.hinh_hoc_geojson->'metadata'->>'kind'),
                 'extra', coalesce(k.hinh_hoc_geojson->'metadata'->'extra', '{}'::jsonb) || $10::jsonb,
                 'warehouseTypes', case when coalesce(nullif($12, ''), k.loai_khu_vuc, k.hinh_hoc_geojson->'metadata'->>'kind') = 'storage' then to_jsonb($13::text[]) else '[]'::jsonb end,
                 'storageGroups', case when coalesce(nullif($12, ''), k.loai_khu_vuc, k.hinh_hoc_geojson->'metadata'->>'kind') = 'storage' then to_jsonb($13::text[]) else '[]'::jsonb end
               ),
               true
             ),
             dien_tich_ha = coalesce(nullif($6, '')::numeric, dien_tich_ha),
             chu_vi_m = coalesce(nullif($7, '')::numeric, chu_vi_m),
             suc_chua = coalesce(nullif($11, '')::numeric, suc_chua),
             loai_khu_vuc = coalesce(nullif($12, ''), loai_khu_vuc),
             thong_tin_loai = coalesce(k.thong_tin_loai, '{}'::jsonb) || $10::jsonb,
             nhom_luu_tru_kho = case when coalesce(nullif($12, ''), loai_khu_vuc) = 'storage' then $13::text[] else '{}'::text[] end,
             tam_vi_do = coalesce($14::numeric, tam_vi_do),
             tam_kinh_do = coalesce($15::numeric, tam_kinh_do),
             updated_at = now()
       where k.trang_trai_id::text = $8
         and (k.id::text = $9 or k.ma_khu_vuc::text = $9)
       returning k.id::text as id`,
      [body.name ?? "", body.status ?? "", body.description ?? "", body.color ?? "", JSON.stringify(polygon), body.areaHa ?? "", body.perimeterM ?? "", farmId, zoneId, JSON.stringify(typeSpecific), body.capacity ?? "", zoneTypeKey ?? "", warehouseTypes, nextLatitude, nextLongitude]
    );

    if (!updateResult.rows[0]) {
      return NextResponse.json({ message: "Không thể cập nhật khu vực." }, { status: 500 });
    }

    if (zoneTypeKey) await insertTypeSnapshot(updateResult.rows[0].id, zoneTypeKey, typeSpecific, warehouseTypes);

    const updated = await loadCurrentZone(zoneId, farmId);
    const logPayload = {
      before,
      after: snapshotJson(updated) ?? after,
      changedFields: Object.keys(after).filter((key) => JSON.stringify((before as Record<string, unknown>)[key]) !== JSON.stringify((after as Record<string, unknown>)[key])),
    };

    await db.query(
      `insert into du_lieu.nhat_ky_chinh_sua_khu_vuc (khu_vuc_id, nguoi_dung_id, hanh_dong, du_lieu_cu, du_lieu_moi, ghi_luc_vao)
       values ($1, $2, $3, $4::jsonb, $5::jsonb, now())`,
      [updateResult.rows[0].id, ownerId, "Cập nhật khu vực", JSON.stringify(before), JSON.stringify(logPayload)]
    );

    return NextResponse.json({ ok: true, id: updateResult.rows[0].id, log: logPayload });
  } catch (error) {
    return NextResponse.json({ message: "Không thể cập nhật khu vực.", error: String(error) }, { status: 500 });
  }
}
