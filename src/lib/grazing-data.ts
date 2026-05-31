import { db } from "@/lib/db";
import { ensureGrazingSchema } from "@/lib/grazing-schema";
import { ensureZoneSchema } from "@/lib/zone-schema";
import {
  isGrazingEventType,
  isGrazingPlanType,
  isGrazingStatus,
  type GrazingEvent,
  type GrazingEventType,
  type GrazingLivestockGroup,
  type GrazingMetadata,
  type GrazingPaddock,
  type GrazingPlan,
  type GrazingPlanType,
  type GrazingStatus,
} from "@/lib/grazing-types";

type PlanRow = {
  id: string;
  ma_ke_hoach: string | null;
  ten_ke_hoach: string | null;
  kieu_ke_hoach: string | null;
  trang_thai: string | null;
  ngay_bat_dau: string | Date | null;
  ngay_ket_thuc: string | Date | null;
  mua_vu: string | null;
  nguoi_phu_trach: string | null;
  ghi_chu: string | null;
  metadata_json: GrazingMetadata | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

type PaddockRow = {
  ke_hoach_id: string;
  id: string;
  ma_khu_vuc: string | null;
  ten_khu_vuc: string | null;
  loai_khu_vuc: string | null;
  ten_loai_khu_vuc: string | null;
  trang_thai: string | null;
  dien_tich_ha: number | string | null;
  do_uu_tien: number | string | null;
  danh_gia: number | string | null;
};

type GroupRow = {
  ke_hoach_id: string;
  id: string;
  ma_nhom: string | null;
  ten_nhom: string | null;
  loai_vat_nuoi: string | null;
  so_luong: number | string | null;
  khu_vuc_id: string | null;
  ten_khu_vuc: string | null;
};

type EventRow = {
  id: string;
  ke_hoach_id: string;
  khu_vuc_id: string | null;
  ten_khu_vuc: string | null;
  nhom_vat_nuoi_id: string | null;
  ten_nhom: string | null;
  loai_su_kien: string | null;
  tieu_de: string | null;
  trang_thai: string | null;
  ngay_bat_dau: string | Date | null;
  ngay_ket_thuc: string | Date | null;
  ghi_chu: string | null;
};

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function dateOnly(value: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function dateTime(value: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function numberOrNull(value: number | string | null) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function zoneTypeLabel(value: string | null) {
  const normalized = normalizeSearch(value);
  if (["grazing", "pasture", "dong_co", "chan_tha"].includes(normalized)) return "Đồng cỏ chăn thả";
  if (["livestock", "chan_nuoi", "vat_nuoi"].includes(normalized)) return "Khu chăn nuôi";
  if (["cropping", "trong_trot", "field"].includes(normalized)) return "Khu trồng trọt";
  if (["water", "nguon_nuoc"].includes(normalized)) return "Khu nguồn nước";
  return cleanText(value) ?? "Khu vực";
}

function mapPaddock(row: PaddockRow): GrazingPaddock {
  const rawType = cleanText(row.loai_khu_vuc) ?? cleanText(row.ten_loai_khu_vuc);
  return {
    id: String(row.id),
    code: cleanText(row.ma_khu_vuc),
    name: cleanText(row.ten_khu_vuc) ?? "Ô chăn thả",
    zoneType: rawType,
    zoneTypeLabel: zoneTypeLabel(rawType),
    status: cleanText(row.trang_thai),
    areaHa: numberOrNull(row.dien_tich_ha),
    priority: numberOrNull(row.do_uu_tien) ?? 5,
    rating: numberOrNull(row.danh_gia) ?? 5,
  };
}

function mapGroup(row: GroupRow): GrazingLivestockGroup {
  return {
    id: String(row.id),
    code: cleanText(row.ma_nhom),
    name: cleanText(row.ten_nhom) ?? "Nhóm vật nuôi",
    species: cleanText(row.loai_vat_nuoi) ?? "Vật nuôi",
    headCount: Number(row.so_luong ?? 0),
    zoneId: cleanText(row.khu_vuc_id),
    zoneName: cleanText(row.ten_khu_vuc),
  };
}

function mapEvent(row: EventRow): GrazingEvent {
  const type: GrazingEventType = isGrazingEventType(row.loai_su_kien) ? row.loai_su_kien : "grazing";
  const status: GrazingStatus = isGrazingStatus(row.trang_thai) ? row.trang_thai : "active";
  return {
    id: String(row.id),
    planId: String(row.ke_hoach_id),
    paddockId: cleanText(row.khu_vuc_id),
    paddockName: cleanText(row.ten_khu_vuc),
    groupId: cleanText(row.nhom_vat_nuoi_id),
    groupName: cleanText(row.ten_nhom),
    type,
    title: cleanText(row.tieu_de) ?? "Sự kiện chăn thả",
    status,
    startDate: dateOnly(row.ngay_bat_dau),
    endDate: dateOnly(row.ngay_ket_thuc),
    note: cleanText(row.ghi_chu),
  };
}

export async function loadGrazingPaddocks(farmId: string): Promise<GrazingPaddock[]> {
  await ensureZoneSchema();
  const result = await db.query(
    `select k.id::text, k.ma_khu_vuc, k.ten_khu_vuc,
            coalesce(nullif(k.loai_khu_vuc, ''), nullif(loai.ten, ''), nullif(k.hinh_hoc_geojson->'metadata'->>'kind', ''), nullif(k.hinh_hoc_geojson->'metadata'->>'usage', '')) as loai_khu_vuc,
            loai.ten as ten_loai_khu_vuc,
            k.trang_thai, k.dien_tich_ha,
            coalesce((k.thong_tin_loai->>'priority')::int, (k.hinh_hoc_geojson->'metadata'->>'priority')::int, 5) as do_uu_tien,
            coalesce((k.thong_tin_loai->>'rating')::int, (k.hinh_hoc_geojson->'metadata'->>'rating')::int, 5) as danh_gia
     from du_lieu.khu_vuc k
     left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = k.loai_khu_vuc_id
     where k.trang_trai_id = $1
       and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'inactive')
       and (
         lower(coalesce(k.loai_khu_vuc, '')) in ('grazing', 'pasture', 'dong_co', 'chan_tha', 'livestock', 'chan_nuoi', 'cropping', 'trong_trot', 'field', 'water', 'nguon_nuoc')
         or lower(coalesce(loai.ten, '')) in ('grazing', 'livestock', 'cropping')
         or lower(coalesce(k.hinh_hoc_geojson->'metadata'->>'kind', '')) in ('grazing', 'pasture', 'livestock', 'cropping', 'field')
         or lower(coalesce(k.mo_ta, '')) like '%chăn thả%'
         or lower(coalesce(k.mo_ta, '')) like '%dong co%'
       )
     order by k.ten_khu_vuc asc, k.created_at asc`,
    [farmId]
  );
  return result.rows.map(mapPaddock);
}

export async function loadGrazingGroups(farmId: string): Promise<GrazingLivestockGroup[]> {
  const result = await db.query(
    `select n.id::text, n.ma_nhom, n.ten_nhom, n.loai_vat_nuoi, n.so_luong,
            n.khu_vuc_id::text, k.ten_khu_vuc
     from du_lieu.nhom_vat_nuoi n
     left join du_lieu.khu_vuc k on k.id = n.khu_vuc_id
     where n.trang_trai_id = $1
       and coalesce(lower(n.trang_thai_suc_khoe), '') not in ('da_huy', 'da huy', 'đã hủy', 'ngung theo doi')
     order by n.ten_nhom asc, n.created_at asc`,
    [farmId]
  );
  return result.rows.map(mapGroup);
}

export async function loadGrazingPlans(farmId: string): Promise<GrazingPlan[]> {
  await ensureGrazingSchema();

  const [planRs, paddockRs, groupRs, eventRs] = await Promise.all([
    db.query<PlanRow>(
      `select id::text, ma_ke_hoach, ten_ke_hoach, kieu_ke_hoach, trang_thai, ngay_bat_dau,
              ngay_ket_thuc, mua_vu, nguoi_phu_trach, ghi_chu, metadata_json, created_at, updated_at
       from du_lieu.ke_hoach_chan_tha
       where trang_trai_id = $1
       order by ngay_bat_dau asc nulls last, updated_at desc nulls last, created_at desc nulls last`,
      [farmId]
    ),
    db.query<PaddockRow>(
      `select lk.ke_hoach_id::text, k.id::text, k.ma_khu_vuc, k.ten_khu_vuc,
              coalesce(nullif(k.loai_khu_vuc, ''), nullif(loai.ten, ''), nullif(k.hinh_hoc_geojson->'metadata'->>'kind', ''), nullif(k.hinh_hoc_geojson->'metadata'->>'usage', '')) as loai_khu_vuc,
              loai.ten as ten_loai_khu_vuc,
              k.trang_thai,
              coalesce(lk.dien_tich_ha, k.dien_tich_ha) as dien_tich_ha, lk.do_uu_tien, lk.danh_gia
       from du_lieu.ke_hoach_chan_tha_khu_vuc lk
       join du_lieu.khu_vuc k on k.id = lk.khu_vuc_id
       join du_lieu.ke_hoach_chan_tha p on p.id = lk.ke_hoach_id
       left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = k.loai_khu_vuc_id
       where p.trang_trai_id = $1
       order by k.ten_khu_vuc asc`,
      [farmId]
    ),
    db.query<GroupRow>(
      `select lg.ke_hoach_id::text, n.id::text, n.ma_nhom, n.ten_nhom, n.loai_vat_nuoi,
              coalesce(lg.so_luong_du_kien, n.so_luong) as so_luong, n.khu_vuc_id::text, k.ten_khu_vuc
       from du_lieu.ke_hoach_chan_tha_nhom_vat_nuoi lg
       join du_lieu.nhom_vat_nuoi n on n.id = lg.nhom_vat_nuoi_id
       join du_lieu.ke_hoach_chan_tha p on p.id = lg.ke_hoach_id
       left join du_lieu.khu_vuc k on k.id = n.khu_vuc_id
       where p.trang_trai_id = $1
       order by n.ten_nhom asc`,
      [farmId]
    ),
    db.query<EventRow>(
      `select e.id::text, e.ke_hoach_id::text, e.khu_vuc_id::text, k.ten_khu_vuc,
              e.nhom_vat_nuoi_id::text, n.ten_nhom, e.loai_su_kien, e.tieu_de, e.trang_thai,
              e.ngay_bat_dau, e.ngay_ket_thuc, e.ghi_chu
       from du_lieu.su_kien_chan_tha e
       join du_lieu.ke_hoach_chan_tha p on p.id = e.ke_hoach_id
       left join du_lieu.khu_vuc k on k.id = e.khu_vuc_id
       left join du_lieu.nhom_vat_nuoi n on n.id = e.nhom_vat_nuoi_id
       where p.trang_trai_id = $1
       order by e.ngay_bat_dau asc nulls last, e.created_at asc`,
      [farmId]
    ),
  ]);

  const paddocksByPlan = new Map<string, GrazingPaddock[]>();
  for (const row of paddockRs.rows) {
    const key = String(row.ke_hoach_id);
    paddocksByPlan.set(key, [...(paddocksByPlan.get(key) ?? []), mapPaddock(row)]);
  }

  const groupsByPlan = new Map<string, GrazingLivestockGroup[]>();
  for (const row of groupRs.rows) {
    const key = String(row.ke_hoach_id);
    groupsByPlan.set(key, [...(groupsByPlan.get(key) ?? []), mapGroup(row)]);
  }

  const eventsByPlan = new Map<string, GrazingEvent[]>();
  for (const row of eventRs.rows) {
    const key = String(row.ke_hoach_id);
    eventsByPlan.set(key, [...(eventsByPlan.get(key) ?? []), mapEvent(row)]);
  }

  return planRs.rows.map((row) => {
    const id = String(row.id);
    const type: GrazingPlanType = isGrazingPlanType(row.kieu_ke_hoach) ? row.kieu_ke_hoach : "seasonal";
    const status: GrazingStatus = isGrazingStatus(row.trang_thai) ? row.trang_thai : "active";
    return {
      id,
      code: cleanText(row.ma_ke_hoach) ?? id,
      name: cleanText(row.ten_ke_hoach) ?? "Kế hoạch chăn thả",
      type,
      status,
      startDate: dateOnly(row.ngay_bat_dau),
      endDate: dateOnly(row.ngay_ket_thuc),
      season: cleanText(row.mua_vu),
      manager: cleanText(row.nguoi_phu_trach),
      note: cleanText(row.ghi_chu),
      paddocks: paddocksByPlan.get(id) ?? [],
      groups: groupsByPlan.get(id) ?? [],
      events: eventsByPlan.get(id) ?? [],
      metadata: row.metadata_json ?? {},
      createdAt: dateTime(row.created_at),
      updatedAt: dateTime(row.updated_at),
    };
  });
}
