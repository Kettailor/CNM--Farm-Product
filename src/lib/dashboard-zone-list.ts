import { db } from "@/lib/db";
import { ensureZoneSchema } from "@/lib/zone-schema";
import { getZoneTypeInfo, normalizeText } from "@/lib/zone-type-utils";

export type ZoneListItem = {
  id: string;
  name: string;
  code: string;
  status: string;
  statusLabel: string;
  type: string;
  typeLabel: string;
  typeSlug: string;
  areaHa: number;
  perimeterM: number | null;
  stockingRate: number | null;
  polygon: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number };
  color: string;
  updatedAt: string | null;
};

export type ZoneTypeFilter = { slug: string; label: string; count: number };
export type FarmLocation = { farmName: string; locationName: string | null; latitude: number; longitude: number };

const DEFAULT_CENTER = { lat: 10.762622, lng: 106.660172 };
const DEFAULT_COLOR = "#2f855a";

const statusLabelFromRaw = (raw: string) => { const value = normalizeText(raw); if (value.includes("cancel") || value.includes("huy")) return "Đã hủy"; if (value.includes("inactive") || value.includes("ngung")) return "Ngừng hoạt động"; if (value.includes("draft") || value.includes("planned") || value.includes("lap") || value.includes("du kien")) return "Dự kiến"; if (value.includes("maintenance") || value.includes("bao tri")) return "Bảo trì"; if (value.includes("completed") || value.includes("hoan thanh")) return "Hoàn thành"; return "Đang hoạt động"; };
const colorFromRaw = (raw: unknown) => (/^#[0-9a-f]{6}$/i.test(String(raw ?? "")) ? String(raw) : DEFAULT_COLOR);
const centroid = (points: Array<{ lat: number; lng: number }>) => { if (!points.length) return DEFAULT_CENTER; const sum = points.reduce((acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }), { lat: 0, lng: 0 }); return { lat: sum.lat / points.length, lng: sum.lng / points.length }; };
const polygonFromJson = (geo: unknown) => { const polygon = Array.isArray((geo as { geo?: { polygon?: unknown } } | null)?.geo?.polygon) ? ((geo as { geo?: { polygon?: Array<{ lat?: number | string; lng?: number | string }> } } | null)?.geo?.polygon ?? []) : []; return polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))).map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })); };

export async function getFarmLocation(ownerId: string): Promise<FarmLocation | null> {
  const rs = await db.query(
    `select t.ten_trang_trai as farm_name,
            coalesce(v.ten_dia_diem, t.ten_trang_trai, 'Trang trại') as location_name,
            nullif(v.vi_do::text, '')::float8 as location_lat,
            nullif(v.kinh_do::text, '')::float8 as location_lng,
            nullif(t.vi_do::text, '')::float8 as farm_lat,
            nullif(t.kinh_do::text, '')::float8 as farm_lng,
            t.vi_do as direct_lat,
            t.kinh_do as direct_lng
     from du_lieu.trang_trai t
     left join lateral (
       select vv.ten_dia_diem, vv.vi_do, vv.kinh_do
       from du_lieu.vi_tri_trang_trai vv
       where vv.trang_trai_id = t.id
       order by vv.created_at desc nulls last, vv.id desc
       limit 1
     ) v on true
     where t.chu_so_huu_id = $1
     order by t.created_at desc
     limit 1`,
    [ownerId]
  );
  const row = rs.rows[0];
  if (!row) return null;

  const latitude = Number(row.location_lat ?? row.farm_lat ?? row.direct_lat);
  const longitude = Number(row.location_lng ?? row.farm_lng ?? row.direct_lng);
  return {
    farmName: String(row.farm_name ?? "Trang trại"),
    locationName: row.location_name ? String(row.location_name) : null,
    latitude: Number.isFinite(latitude) ? latitude : DEFAULT_CENTER.lat,
    longitude: Number.isFinite(longitude) ? longitude : DEFAULT_CENTER.lng,
  };
}

export async function getZoneList(ownerId: string): Promise<{ farmName: string; zones: ZoneListItem[]; filters: ZoneTypeFilter[]; location: FarmLocation | null }> {
  await ensureZoneSchema();
  const location = await getFarmLocation(ownerId);
  const rs = await db.query(
    `select
        t.ten_trang_trai as farm_name,
        kv.id::text as id,
        coalesce(nullif(kv.ten_khu_vuc::text, ''), 'Khu vực chưa đặt tên') as name,
        kv.ma_khu_vuc::text as code,
        coalesce(nullif(kv.trang_thai::text, ''), 'đang hoạt động') as status,
        coalesce(nullif(kv.loai_khu_vuc::text, ''), kv.hinh_hoc_geojson->'metadata'->>'kind', kv.hinh_hoc_geojson->'metadata'->>'areaType', kv.hinh_hoc_geojson->'metadata'->>'usage', nullif(loai.ten::text, ''), nullif(kv.nguon_tao::text, ''), kv.mo_ta::text, kv.hinh_hoc_geojson->'metadata'->>'farmType', 'cropping') as raw_type,
        case when cardinality(coalesce(kv.nhom_luu_tru_kho, '{}'::text[])) > 0 then to_jsonb(kv.nhom_luu_tru_kho) else coalesce(kv.hinh_hoc_geojson->'metadata'->'warehouseTypes', kv.hinh_hoc_geojson->'metadata'->'extra'->'warehouseTypes', '[]'::jsonb) end as warehouse_types,
        coalesce(kv.dien_tich_ha::float8, 0)::float8 as area_ha,
        kv.chu_vi_m::float8 as perimeter_m,
        coalesce(kv.suc_chua::float8, 0) as stocking_rate,
        coalesce(kv.mau_sac, kv.hinh_hoc_geojson->'metadata'->>'areaColor', kv.hinh_hoc_geojson->'metadata'->>'area_color') as color,
        kv.hinh_hoc_geojson::jsonb as geo,
        kv.updated_at
     from du_lieu.khu_vuc kv
     join du_lieu.trang_trai t on t.id = kv.trang_trai_id
     left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = kv.loai_khu_vuc_id
     where t.chu_so_huu_id = $1
     order by kv.created_at desc nulls last, kv.id desc
     limit 200`,
    [ownerId]
  );

  const farmName = String(rs.rows[0]?.farm_name ?? location?.farmName ?? "Trang trại");
  const zones = rs.rows.map((row) => {
    const polygon = polygonFromJson(row.geo);
    const center = centroid(polygon);
    const typeInfo = getZoneTypeInfo(row.raw_type, row.warehouse_types);
    const statusLabel = statusLabelFromRaw(String(row.status ?? ""));
    return { id: String(row.id), name: String(row.name ?? "Khu vực chưa đặt tên"), code: String(row.code ?? row.id), status: String(row.status ?? "active"), statusLabel, type: String(row.raw_type ?? ""), typeLabel: typeInfo.label, typeSlug: typeInfo.slug, areaHa: Number(row.area_ha ?? 0), perimeterM: row.perimeter_m != null ? Number(row.perimeter_m) : null, stockingRate: row.stocking_rate != null ? Number(row.stocking_rate) : null, polygon, center, color: colorFromRaw(row.color), updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleString("vi-VN") : null };
  });

  const filters = [{ slug: "tat-ca", label: "Tất cả", count: zones.length }, ...Array.from(new Map(zones.map((z) => [z.typeSlug, z.typeLabel])).entries()).map(([slug, label]) => ({ slug, label, count: zones.filter((z) => z.typeSlug === slug).length }))];
  return { farmName, zones, filters, location };
}
