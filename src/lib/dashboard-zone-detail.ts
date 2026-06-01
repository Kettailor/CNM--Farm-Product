import { db } from "@/lib/db";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { ensureLivestockSchema } from "@/lib/livestock-schema";
import { ensureZoneSchema } from "@/lib/zone-schema";
import { getZoneTypeInfo, normalizeText, normalizeWarehouseTypeValues, ZONE_TYPE_FORM_CONFIGS, type ZoneTypeKey } from "@/lib/zone-type-utils";

export type ZoneDetail = {
  id: string;
  farmName: string;
  name: string;
  rawType: string;
  typeKey: ZoneTypeKey;
  typeSlug: string;
  typeLabel: string;
  typeSpecific: Record<string, string>;
  warehouseTypes: string[];
  isVegetationRelevant: boolean;
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
  metrics: { pointCount: number; livestockCount: number; waterAssetCount: number; noteCount: number };
  details: Array<{ label: string; value: string }>;
  livestock: Array<{ label: string; value: string }>;
  notes: Array<{ id: string; type: string; date: string; info: string; user: string }>;
  activities: Array<{ id: string; date: string; action: string; details: string; actor: string }>;
};

type Point = { lat: number; lng: number };
type RawPoint = { lat?: number | string | null; lng?: number | string | null };
type QueryRows<T> = { rows: T[] };
const DEFAULT_COLOR = "#2e7d32";
const DEFAULT_CENTER = { lat: 10.762622, lng: 106.660172 };

const isRawPoint = (value: unknown): value is RawPoint => {
  if (!value || typeof value !== "object") return false;
  const point = value as { lat?: unknown; lng?: unknown };
  return Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
};

const normalizePoints = (raw: unknown): Point[] => {
  const polygon = Array.isArray(raw) ? raw : [];
  return polygon
    .filter(isRawPoint)
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
};
const centroid = (points: Point[]) => {
  if (!points.length) return DEFAULT_CENTER;
  const sum = points.reduce((acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
};
const displayText = (value: unknown) => (value === null || value === undefined || value === "" ? "" : String(value));
const safeDate = (value: unknown) => (value ? new Date(String(value)).toLocaleString("vi-VN") : "");
const normalizeZoneType = (raw: string, warehouseTypes?: unknown) => getZoneTypeInfo(raw, warehouseTypes);
const normalizeZoneStatus = (raw: unknown) => {
  const value = normalizeText(raw);
  if (value.includes("cancel") || value.includes("huy")) return { key: "cancelled", label: "Đã hủy" };
  if (value.includes("inactive") || value.includes("off") || value.includes("ngung")) return { key: "inactive", label: "Ngừng hoạt động" };
  if (value.includes("maintenance") || value.includes("bao tri")) return { key: "maintenance", label: "Bảo trì" };
  if (value.includes("planned") || value.includes("draft") || value.includes("lap") || value.includes("du kien")) return { key: "planned", label: "Dự kiến" };
  return { key: "active", label: "Đang hoạt động" };
};

type ZoneRowDetail = {
  id: string; farm_name?: string | null; name?: string | null; raw_type?: string | null; warehouse_types?: unknown; metadata_extra?: Record<string, unknown> | null; status?: string | null; area_ha?: number | string | null; perimeter_m?: number | string | null; capacity?: string | null; description?: string | null; created_at?: string | Date | null; updated_at?: string | Date | null; area_color?: string | null; geo?: { polygon?: unknown } | null; boundary_geojson?: { geo?: { polygon?: unknown } | null; polygon?: unknown } | null;
};
type LivestockRow = { ma_vat_nuoi?: string | null; ma_qr?: string | null; trang_thai?: string | null; mo_ta?: string | null };
type CountRow = { livestock_count?: number; water_asset_count?: number; note_count?: number };
type CropDetailRow = { cay_trong?: string | null; ph_do_dat?: number | string | null; do_am_dat?: number | string | null; so_gio_nang?: number | string | null };
type PastureDetailRow = { so_ngay_nghi_co?: number | string | null; dse_load?: number | string | null; ty_le_chan_tha?: number | string | null; thuc_an_san_co?: number | string | null; so_ngay_chan_tha_con_lai?: number | string | null; toc_do_moc_co?: number | string | null; trang_thai_co?: string | null; loai_co?: string | null; dien_tich_canh_tac_ha?: number | string | null };
type StorageDetailRow = { suc_chua?: number | string | null; loai_luu_tru?: string | null; nhiet_do?: number | string | null };
type ParkingDetailRow = { suc_chua?: number | string | null; loai_bai_do_xe?: string | null; nhiet_do?: number | string | null };
type ZoneTypeSpecificData = { crop?: CropDetailRow | null; pasture?: PastureDetailRow | null; storage?: StorageDetailRow | null; parking?: ParkingDetailRow | null };
type LinkedZoneData = { livestock: LivestockRow[]; counts: CountRow; typeSpecific: ZoneTypeSpecificData };

async function queryRows<T>(sql: string, values: unknown[]): Promise<QueryRows<T>> {
  try {
    const result = await db.query(sql, values);
    return { rows: result.rows as T[] };
  } catch {
    return { rows: [] };
  }
}

async function fetchZoneRow(zoneId: string, farmId?: string | null) {
  await ensureZoneSchema();
  const sql = `select k.id::text as id, coalesce(t.ten_trang_trai::text, '') as farm_name, coalesce(nullif(k.ten_khu_vuc::text, ''), '') as name, coalesce(nullif(k.loai_khu_vuc::text, ''), nullif(k.hinh_hoc_geojson->'metadata'->>'kind', ''), nullif(k.hinh_hoc_geojson->'metadata'->>'areaType', ''), nullif(k.hinh_hoc_geojson->'metadata'->>'usage', ''), nullif(loai.ten::text, ''), nullif(k.nguon_tao::text, ''), nullif(k.mo_ta::text, ''), nullif(k.hinh_hoc_geojson->'metadata'->>'farmType', ''), '') as raw_type, case when cardinality(coalesce(k.nhom_luu_tru_kho, '{}'::text[])) > 0 then to_jsonb(k.nhom_luu_tru_kho) else coalesce(k.hinh_hoc_geojson->'metadata'->'warehouseTypes', k.hinh_hoc_geojson->'metadata'->'extra'->'warehouseTypes', '[]'::jsonb) end as warehouse_types, coalesce(k.hinh_hoc_geojson->'metadata'->'extra', '{}'::jsonb) || coalesce(k.thong_tin_loai, '{}'::jsonb) as metadata_extra, coalesce(nullif(k.trang_thai::text, ''), '') as status, coalesce(k.dien_tich_ha::float8, 0)::float8 as area_ha, coalesce(k.chu_vi_m::float8, (k.hinh_hoc_geojson->'metadata'->>'perimeterM')::float8, null) as perimeter_m, nullif(coalesce(k.suc_chua::text, k.hinh_hoc_geojson->'metadata'->>'capacity', k.hinh_hoc_geojson->'metadata'->>'suc_chua'), '') as capacity, nullif(coalesce(k.mo_ta::text, k.hinh_hoc_geojson->'metadata'->>'description', k.hinh_hoc_geojson->'metadata'->>'notes'), '') as description, k.created_at, k.updated_at, k.hinh_hoc_geojson::jsonb as boundary_geojson, coalesce(k.mau_sac, k.hinh_hoc_geojson->'metadata'->>'areaColor', k.hinh_hoc_geojson->'metadata'->>'area_color') as area_color, coalesce(k.hinh_hoc_geojson->'geo', k.hinh_hoc_geojson) as geo from du_lieu.khu_vuc k join du_lieu.trang_trai t on t.id = k.trang_trai_id left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = k.loai_khu_vuc_id where (k.id::text = $1 or k.ma_khu_vuc::text = $1) ${farmId ? "and k.trang_trai_id::text = $2" : ""} limit 1`;
  return queryRows<ZoneRowDetail>(sql, farmId ? [zoneId, farmId] : [zoneId]);
}

async function fetchZoneTypeSpecificData(zoneId: string): Promise<ZoneTypeSpecificData> {
  const [cropRs, pastureRs, storageFoodRs, storageToolRs, parkingRs] = await Promise.all([
    queryRows<CropDetailRow>(
      `select cay_trong, ph_do_dat, do_am_dat, so_gio_nang from du_lieu.khu_vuc_trong_trot where khu_vuc_id::text = $1 order by created_at desc limit 1`,
      [zoneId]
    ),
    queryRows<PastureDetailRow>(
      `select so_ngay_nghi_co, dse_load, ty_le_chan_tha, thuc_an_san_co, so_ngay_chan_tha_con_lai, toc_do_moc_co, trang_thai_co, loai_co, dien_tich_canh_tac_ha from du_lieu.khu_vuc_dong_co where khu_vuc_id::text = $1 order by created_at desc limit 1`,
      [zoneId]
    ),
    queryRows<StorageDetailRow>(
      `select suc_chua, loai_luu_tru, nhiet_do from du_lieu.khu_vuc_kho_luong_thuc where khu_vuc_id::text = $1 order by created_at desc limit 1`,
      [zoneId]
    ),
    queryRows<StorageDetailRow>(
      `select suc_chua, loai_luu_tru, nhiet_do from du_lieu.khu_vuc_kho_dung_cu where khu_vuc_id::text = $1 order by created_at desc limit 1`,
      [zoneId]
    ),
    queryRows<ParkingDetailRow>(
      `select suc_chua, loai_bai_do_xe, nhiet_do from du_lieu.khu_vuc_bai_do_xe where khu_vuc_id::text = $1 order by created_at desc limit 1`,
      [zoneId]
    ),
  ]);

  return {
    crop: cropRs.rows[0] ?? null,
    pasture: pastureRs.rows[0] ?? null,
    storage: storageFoodRs.rows[0] ?? storageToolRs.rows[0] ?? null,
    parking: parkingRs.rows[0] ?? null,
  };
}

async function fetchLinkedZoneData(zoneId: string, farmId?: string | null) {
  await ensureLivestockSchema();
  const zoneRs = await fetchZoneRow(zoneId, farmId);
  const zone = zoneRs.rows[0] as ZoneRowDetail | undefined;
  if (!zone) return null;
  const ownerFilter = farmId ? "and k.trang_trai_id::text = $2" : "";
  const livestockSql = `select v.id::text, v.ma_vat_nuoi, v.ma_qr, v.trang_thai, v.mo_ta from du_lieu.vat_nuoi v join du_lieu.khu_vuc k on k.id = v.khu_vuc_id join du_lieu.trang_trai t on t.id = k.trang_trai_id where k.id::text = $1 ${ownerFilter} order by v.created_at desc limit 6`;
  const countSql = `select coalesce((select count(*) from du_lieu.vat_nuoi v where v.khu_vuc_id = k.id), 0)::int as livestock_count, 0::int as water_asset_count, coalesce((select count(*) from du_lieu.canh_bao w where w.khu_vuc_id = k.id), 0)::int as note_count from du_lieu.khu_vuc k where k.id::text = $1 limit 1`;
  const [livestockRs, countRs, typeSpecific] = await Promise.all([queryRows<LivestockRow>(livestockSql, farmId ? [zoneId, farmId] : [zoneId]), queryRows<CountRow>(countSql, [zoneId]), fetchZoneTypeSpecificData(zone.id)]);
  return { zone, livestock: livestockRs.rows, counts: countRs.rows[0] ?? {}, typeSpecific };
}

export async function getZoneDetail(ownerId: string | null, zoneId: string): Promise<ZoneDetail | null> {
  const farmId = ownerId ? await getAccessibleFarmId(ownerId, "read") : null;
  if (ownerId && !farmId) return null;
  const linked = await fetchLinkedZoneData(zoneId, farmId);
  if (!linked) return null;
  return buildZoneDetail(linked.zone as ZoneRowDetail, linked);
}

const WAREHOUSE_DETAIL_LABELS: Record<string, string> = {
  cong_cu: "Công cụ",
  hoa_chat: "Hóa chất",
  thuc_an: "Thức ăn",
  thanh_pham_vat_nuoi: "Thành phẩm vật nuôi",
};

function assignValue(target: Record<string, string>, key: string, value: unknown) {
  const text = displayText(value);
  if (text) target[key] = text;
}

function buildTypeSpecificValues(typeKey: ZoneTypeKey, data: ZoneTypeSpecificData | undefined, extra: Record<string, unknown> | null | undefined) {
  const values: Record<string, string> = {};

  assignValue(values, "cropType", data?.crop?.cay_trong);
  assignValue(values, "soilPh", data?.crop?.ph_do_dat);
  assignValue(values, "soilMoisture", data?.crop?.do_am_dat);
  assignValue(values, "sunHours", data?.crop?.so_gio_nang);

  assignValue(values, "daysEmpty", data?.pasture?.so_ngay_nghi_co);
  assignValue(values, "dseLoad", data?.pasture?.dse_load);
  assignValue(values, "stockingRate", data?.pasture?.ty_le_chan_tha);
  assignValue(values, "feedOnOffer", data?.pasture?.thuc_an_san_co);
  assignValue(values, "grazingDaysRemaining", data?.pasture?.so_ngay_chan_tha_con_lai);
  assignValue(values, "pastureGrowthRate", data?.pasture?.toc_do_moc_co);
  assignValue(values, "pastureState", data?.pasture?.trang_thai_co);
  assignValue(values, "pastureType", data?.pasture?.loai_co);

  assignValue(values, "capacity", data?.storage?.suc_chua ?? data?.parking?.suc_chua);
  assignValue(values, "temperature", data?.storage?.nhiet_do ?? data?.parking?.nhiet_do);
  assignValue(values, "parkingType", data?.parking?.loai_bai_do_xe);

  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value) || value === null || typeof value === "object") return;
    assignValue(values, key, value);
  });

  return values;
}

function buildTypeSpecificDetails(typeKey: ZoneTypeKey, values: Record<string, string>, warehouseTypes: string[]) {
  const details: Array<{ label: string; value: string }> = [];
  if (typeKey === "storage") {
    const typeLabels = warehouseTypes.map((type) => WAREHOUSE_DETAIL_LABELS[type] ?? type);
    if (typeLabels.length > 0) details.push({ label: "Nhóm lưu trữ", value: typeLabels.join(", ") });
  }

  ZONE_TYPE_FORM_CONFIGS[typeKey].fields.forEach((field) => {
    const value = values[field.key];
    if (!value) return;
    details.push({ label: field.label, value });
  });

  return details;
}

function buildZoneDetail(row: ZoneRowDetail, linked?: LinkedZoneData): ZoneDetail {
  const boundary = row.boundary_geojson ?? {};
  const polygon = normalizePoints(row.geo?.polygon ?? boundary?.geo?.polygon ?? boundary?.polygon);
  const center = centroid(polygon);
  const typeInfo = normalizeZoneType(String(row.raw_type ?? ""), row.warehouse_types);
  const statusInfo = normalizeZoneStatus(row.status);
  const colorHex = /^#[0-9a-f]{6}$/i.test(String(row.area_color ?? "")) ? String(row.area_color) : DEFAULT_COLOR;
  const area = Number(row.area_ha ?? 0);
  const livestockCount = linked?.counts.livestock_count ?? 0;
  const waterAssetCount = linked?.counts.water_asset_count ?? 0;
  const noteCount = linked?.counts.note_count ?? 0;
  const typeSpecific = buildTypeSpecificValues(typeInfo.key, linked?.typeSpecific, row.metadata_extra);
  const warehouseTypes = normalizeWarehouseTypeValues(row.warehouse_types);
  const derivedCapacity = displayText(row.capacity) || typeSpecific.capacity || typeSpecific.herdCapacity;
  const typeDetails = buildTypeSpecificDetails(typeInfo.key, typeSpecific, warehouseTypes);
  return { id: String(row.id), farmName: displayText(row.farm_name), name: displayText(row.name), rawType: displayText(row.raw_type), typeKey: typeInfo.key, typeSlug: typeInfo.slug, typeLabel: typeInfo.label, typeSpecific, warehouseTypes, isVegetationRelevant: typeInfo.isVegetationRelevant, status: statusInfo.key, statusLabel: statusInfo.label, areaHa: area, perimeterM: row.perimeter_m != null ? Number(row.perimeter_m) : null, capacity: derivedCapacity, description: displayText(row.description), createdAt: safeDate(row.created_at), updatedAt: safeDate(row.updated_at), colorHex, polygon, center, metrics: { pointCount: polygon.length, livestockCount, waterAssetCount, noteCount }, details: [{ label: "Tên khu vực", value: displayText(row.name) }, { label: "Loại", value: typeInfo.label }, { label: "Trạng thái", value: statusInfo.label }, { label: "Diện tích", value: area ? `${area.toFixed(2)} ha` : "" }, { label: "Chu vi", value: row.perimeter_m != null ? `${Number(row.perimeter_m).toFixed(2)} m` : "" }, { label: "Sức chứa", value: derivedCapacity }, { label: "Mô tả", value: displayText(row.description) }, { label: "Tạo lúc", value: safeDate(row.created_at) }, { label: "Cập nhật", value: safeDate(row.updated_at) }, ...typeDetails], livestock: (linked?.livestock ?? []).map((item) => ({ label: item.ma_vat_nuoi || item.ma_qr || "Vật nuôi", value: [item.trang_thai, item.mo_ta].filter(Boolean).join(" · ") })), notes: [], activities: [] };
}
