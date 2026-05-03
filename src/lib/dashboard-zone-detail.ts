import { db } from "@/lib/db";

export type ZoneDetail = {
  id: string;
  farmName: string;
  name: string;
  rawType: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  areaHa: number;
  perimeterM: number | null;
  capacity: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  colorHex: string;
  polygon: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number };
  metrics: { pointCount: number; livestockCount: number; sensorCount: number; waterAssetCount: number; noteCount: number };
  details: Array<{ label: string; value: string }>;
  typeDetails: Array<{ label: string; value: string }>;
  livestock: Array<{ label: string; value: string }>;
  sensors: Array<{ label: string; value: string }>;
  notes: Array<{ id: string; type: string; date: string; info: string; user: string }>;
  activities: Array<{ id: string; date: string; action: string; details: string; actor: string }>;
};

type Point = { lat: number; lng: number };
const DEFAULT_COLOR = "#2e7d32";
const DEFAULT_CENTER = { lat: 10.762622, lng: 106.660172 };

const normalizePoints = (raw: unknown): Point[] => {
  const polygon = Array.isArray(raw) ? raw : [];
  return polygon
    .filter((p): p is { lat?: number | string; lng?: number | string } => Number.isFinite(Number((p as any)?.lat)) && Number.isFinite(Number((p as any)?.lng)))
    .map((p) => ({ lat: Number((p as any).lat), lng: Number((p as any).lng) }));
};
const centroid = (points: Point[]) => {
  if (!points.length) return DEFAULT_CENTER;
  const sum = points.reduce((acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
};
const displayText = (value: unknown) => (value === null || value === undefined || value === "" ? "" : String(value));
const safeDate = (value: unknown) => (value ? new Date(String(value)).toLocaleString("vi-VN") : "");
const normalizeZoneType = (raw: string) => {
  const value = raw.toLowerCase();
  if (value.includes("cropping") || value.includes("trong trot") || value.includes("cay trong")) return { key: "cropping", label: "Trồng trọt" };
  if (value.includes("grazing") || value.includes("chan tha")) return { key: "grazing", label: "Chăn thả" };
  if (value.includes("hay") || value.includes("co kho")) return { key: "hay", label: "Cỏ khô" };
  if (value.includes("resting") || value.includes("nghi dat")) return { key: "resting", label: "Nghỉ đất" };
  if (value.includes("nguon nuoc") || value.includes("water")) return { key: "nguon_nuoc", label: "Nguồn nước" };
  if (value.includes("phuong tien") || value.includes("vehicle")) return { key: "phuong_tien", label: "Phương tiện" };
  if (value.includes("chan nuoi") || value.includes("vat nuoi") || value.includes("cattle") || value.includes("livestock")) return { key: "chan_nuoi", label: "Chăn nuôi" };
  if (value.includes("dung cu") || value.includes("tool")) return { key: "dung_cu", label: "Dụng cụ" };
  if (value.includes("nha kho") || value.includes("warehouse")) return { key: "nha_kho", label: "Nhà kho" };
  return { key: "cropping", label: "Trồng trọt" };
};
const normalizeZoneStatus = (raw: unknown) => {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("cancel") || value.includes("huy")) return { key: "cancelled", label: "Đã hủy" };
  if (value.includes("inactive") || value.includes("off") || value.includes("ngung")) return { key: "inactive", label: "Ngừng hoạt động" };
  if (value.includes("planned") || value.includes("draft") || value.includes("lap")) return { key: "planned", label: "Dự kiến" };
  return { key: "active", label: "Đang hoạt động" };
};


const COMMON_METADATA_KEYS = new Set(["areacolor", "area_color", "description", "notes", "capacity", "perimeterm", "perimeter_m", "updated_from", "last_updated"]);
const formatMetadataLabel = (key: string) => key
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/\b\w/g, (ch) => ch.toUpperCase());
const metadataDetails = (metadata: Record<string, unknown>) =>
  Object.entries(metadata)
    .filter(([key, value]) => !COMMON_METADATA_KEYS.has(key.toLowerCase()) && value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => ({ label: formatMetadataLabel(key), value: displayText(value) }));
type ZoneRowDetail = {
  id: string; farm_name?: string | null; name?: string | null; raw_type?: string | null; status?: string | null; area_ha?: number | string | null; perimeter_m?: number | string | null; capacity?: string | null; description?: string | null; created_at?: string | Date | null; updated_at?: string | Date | null; area_color?: string | null; geo?: { polygon?: unknown } | null; boundary_geojson?: { geo?: { polygon?: unknown } | null; polygon?: unknown } | null;
};

async function fetchZoneRow(zoneId: string, ownerId?: string | null) {
  const sql = `select k.id::text as id, coalesce(t.ten_trang_trai::text, '') as farm_name, coalesce(nullif(k.ten_khu_vuc::text, ''), '') as name, coalesce(nullif(loai.ten::text, ''), nullif(k.mo_ta::text, ''), '') as raw_type, coalesce(nullif(k.trang_thai::text, ''), '') as status, coalesce(k.dien_tich_ha::float8, 0)::float8 as area_ha, coalesce(k.chu_vi_m::float8, (k.hinh_hoc_geojson->'metadata'->>'perimeterM')::float8, null) as perimeter_m, nullif(coalesce(k.suc_chua::text, k.hinh_hoc_geojson->'metadata'->>'capacity', k.hinh_hoc_geojson->'metadata'->>'suc_chua'), '') as capacity, nullif(coalesce(k.mo_ta::text, k.hinh_hoc_geojson->'metadata'->>'description', k.hinh_hoc_geojson->'metadata'->>'notes'), '') as description, k.created_at, k.updated_at, k.hinh_hoc_geojson::jsonb as boundary_geojson, coalesce(k.mau_sac, k.hinh_hoc_geojson->'metadata'->>'areaColor', k.hinh_hoc_geojson->'metadata'->>'area_color') as area_color, coalesce(k.hinh_hoc_geojson->'geo', k.hinh_hoc_geojson) as geo from du_lieu.khu_vuc k join du_lieu.trang_trai t on t.id = k.trang_trai_id left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = k.loai_khu_vuc_id where (k.id::text = $1 or k.ma_khu_vuc::text = $1) ${ownerId ? "and t.chu_so_huu_id::text = $2" : ""} limit 1`;
  return db.query(sql, ownerId ? [zoneId, ownerId] : [zoneId]).catch(() => ({ rows: [] } as { rows: unknown[] }));
}

async function fetchLinkedZoneData(zoneId: string, ownerId?: string | null) {
  const zoneRs = await fetchZoneRow(zoneId, ownerId);
  const zone = zoneRs.rows[0] as ZoneRowDetail | undefined;
  if (!zone) return null;
  const ownerFilter = ownerId ? "and t.chu_so_huu_id::text = $2" : "";
  const sensorSql = `select c.id::text, c.loai_cam_bien, c.don_vi, c.dang_hoat_dong from du_lieu.cam_bien c join du_lieu.khu_vuc k on k.id = c.khu_vuc_id join du_lieu.trang_trai t on t.id = k.trang_trai_id where k.id::text = $1 ${ownerFilter} order by c.created_at desc limit 6`;
  const livestockSql = `select v.id::text, v.ma_vat_nuoi, v.the_nhan_dien, v.trang_thai, v.mo_ta from du_lieu.vat_nuoi v join du_lieu.trang_trai t on t.id = v.trang_trai_id where t.id = (select trang_trai_id from du_lieu.khu_vuc where id::text = $1 limit 1) ${ownerId ? "and t.chu_so_huu_id::text = $2" : ""} order by v.created_at desc limit 6`;
  const countSql = `select coalesce((select count(*) from du_lieu.dem_dong_vat d where d.khu_vuc_id = k.id), 0)::int as livestock_count, coalesce((select count(*) from du_lieu.cam_bien c where c.khu_vuc_id = k.id), 0)::int as sensor_count, 0::int as water_asset_count, coalesce((select count(*) from du_lieu.canh_bao w where w.khu_vuc_id = k.id), 0)::int as note_count from du_lieu.khu_vuc k where k.id::text = $1 limit 1`;
  const [sensorRs, livestockRs, countRs] = await Promise.all([db.query(sensorSql, ownerId ? [zoneId, ownerId] : [zoneId]).catch(() => ({ rows: [] } as { rows: unknown[] })), db.query(livestockSql, ownerId ? [zoneId, ownerId] : [zoneId]).catch(() => ({ rows: [] } as { rows: unknown[] })), db.query(countSql, [zoneId]).catch(() => ({ rows: [] } as { rows: unknown[] }))]);
  return { zone, sensors: sensorRs.rows as any[], livestock: livestockRs.rows as any[], counts: (countRs.rows[0] as any) ?? {} };
}

export async function getZoneDetail(ownerId: string | null, zoneId: string): Promise<ZoneDetail | null> {
  const linked = await fetchLinkedZoneData(zoneId, ownerId);
  if (!linked) return null;
  return buildZoneDetail(linked.zone as ZoneRowDetail, linked);
}

function buildZoneDetail(row: ZoneRowDetail, linked?: { sensors: Array<{ loai_cam_bien?: string | null; don_vi?: string | null; dang_hoat_dong?: boolean }>; livestock: Array<{ ma_vat_nuoi?: string | null; the_nhan_dien?: string | null; trang_thai?: string | null; mo_ta?: string | null }>; counts: { livestock_count?: number; sensor_count?: number; water_asset_count?: number; note_count?: number } }): ZoneDetail {
  const boundary = row.boundary_geojson ?? {};
  const polygon = normalizePoints(row.geo?.polygon ?? boundary?.geo?.polygon ?? boundary?.polygon);
  const center = centroid(polygon);
  const typeInfo = normalizeZoneType(String(row.raw_type ?? ""));
  const statusInfo = normalizeZoneStatus(row.status);
  const colorHex = /^#[0-9a-f]{6}$/i.test(String(row.area_color ?? "")) ? String(row.area_color) : DEFAULT_COLOR;
  const area = Number(row.area_ha ?? 0);
  const metadata = (boundary?.metadata ?? {}) as Record<string, unknown>;
  const typeDetails = metadataDetails(metadata);
  const livestockCount = linked?.counts.livestock_count ?? 0;
  const sensorCount = linked?.counts.sensor_count ?? 0;
  const waterAssetCount = linked?.counts.water_asset_count ?? 0;
  const noteCount = linked?.counts.note_count ?? 0;
  return { id: String(row.id), farmName: displayText(row.farm_name), name: displayText(row.name), rawType: displayText(row.raw_type), typeLabel: typeInfo.label, status: statusInfo.key, statusLabel: statusInfo.label, areaHa: area, perimeterM: row.perimeter_m != null ? Number(row.perimeter_m) : null, capacity: displayText(row.capacity), description: displayText(row.description), createdAt: safeDate(row.created_at), updatedAt: safeDate(row.updated_at), colorHex, polygon, center, metrics: { pointCount: polygon.length, livestockCount, sensorCount, waterAssetCount, noteCount }, details: [{ label: "Tên khu vực", value: displayText(row.name) }, { label: "Loại", value: typeInfo.label }, { label: "Trạng thái", value: statusInfo.label }, { label: "Diện tích", value: area ? `${area.toFixed(2)} ha` : "" }, { label: "Chu vi", value: row.perimeter_m != null ? `${Number(row.perimeter_m).toFixed(2)} m` : "" }, { label: "Sức chứa", value: displayText(row.capacity) }, { label: "Mô tả", value: displayText(row.description) }, { label: "Tạo lúc", value: safeDate(row.created_at) }, { label: "Cập nhật", value: safeDate(row.updated_at) }], typeDetails, livestock: (linked?.livestock ?? []).map((item) => ({ label: item.the_nhan_dien || item.ma_vat_nuoi || "Vật nuôi", value: [item.trang_thai, item.mo_ta].filter(Boolean).join(" · ") })), sensors: (linked?.sensors ?? []).map((item) => ({ label: item.loai_cam_bien || "Cảm biến", value: [item.don_vi, item.dang_hoat_dong ? "đang hoạt động" : "ngừng hoạt động"].filter(Boolean).join(" · ") })), notes: [], activities: [] };
}
