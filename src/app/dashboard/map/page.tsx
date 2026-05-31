import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getZoneTypeInfo, normalizeText } from "@/lib/zone-type-utils";
import { redirect } from "next/navigation";
import FarmMapDashboardClient, {
  type FarmMapAssetRow,
  type FarmMapObject,
  type FarmMapStats,
  type FarmMapZone,
} from "./farm-map-dashboard-client";

const isHexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(String(value ?? "").trim());
const ACTIVE_ZONE_SQL =
  "coalesce(lower(kv.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')";

type KhuLoai =
  | "cropping"
  | "grazing"
  | "hay"
  | "resting"
  | "nguon_nuoc"
  | "phuong_tien"
  | "chan_nuoi"
  | "dung_cu"
  | "nha_kho";

type FarmMapInfo = {
  farm_name: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
};

type MapObjectRow = {
  id: string | number;
  ten_doi_tuong?: string | null;
  loai_doi_tuong?: string | null;
  hinh_hoc_geojson?: {
    lat?: number | string;
    lng?: number | string;
    coordinates?: [number, number] | number[];
    geo?: {
      lat?: number | string;
      lng?: number | string;
      coordinates?: [number, number] | number[];
    };
  } | null;
};

type KhuVucRow = {
  id: string | number;
  ten_khu_vuc?: string | null;
  crop_type?: string | null;
  status?: string | null;
  created_at?: string | Date | null;
  hinh_hoc_geojson?: {
    metadata?: {
      kind?: string;
      areaType?: string;
      usage?: string;
      notes?: string;
      farmType?: string;
      areaColor?: string;
      area_color?: string;
      warehouseTypes?: unknown;
      storageGroups?: unknown;
      extra?: {
        warehouseTypes?: unknown;
      };
    };
    geo?: {
      polygon?: Array<{ lat?: number | string; lng?: number | string }>;
    };
  } | null;
};
type KhuVucMetadata = NonNullable<NonNullable<KhuVucRow["hinh_hoc_geojson"]>["metadata"]>;

const defaultColorByType: Record<KhuLoai, string> = {
  cropping: "#2e7d32",
  grazing: "#43a047",
  hay: "#c48a00",
  resting: "#8d6e63",
  nguon_nuoc: "#1e88e5",
  phuong_tien: "#546e7a",
  chan_nuoi: "#fb8c00",
  dung_cu: "#8e24aa",
  nha_kho: "#6d4c41",
};

const typeLabelByKey: Record<KhuLoai, string> = {
  cropping: "Trồng trọt",
  grazing: "Chăn thả",
  hay: "Cỏ khô",
  resting: "Nghỉ đất",
  nguon_nuoc: "Nguồn nước",
  phuong_tien: "Phương tiện",
  chan_nuoi: "Chăn nuôi",
  dung_cu: "Dụng cụ",
  nha_kho: "Nhà kho",
};

const detectAreaType = (raw: string): KhuLoai => {
  if (raw.includes("cropping") || raw.includes("trong trot") || raw.includes("cay trong")) return "cropping";
  if (raw.includes("grazing") || raw.includes("pasture") || raw.includes("dong co") || raw.includes("chan tha")) return "grazing";
  if (raw.includes("hay") || raw.includes("co kho")) return "hay";
  if (raw.includes("resting") || raw.includes("nghi dat")) return "resting";
  if (raw.includes("nguon nuoc") || raw.includes("water")) return "nguon_nuoc";
  if (raw.includes("parking") || raw.includes("bai do xe") || raw.includes("phuong tien") || raw.includes("vehicle")) return "phuong_tien";
  if (raw.includes("chan nuoi") || raw.includes("vat nuoi") || raw.includes("cattle") || raw.includes("livestock")) return "chan_nuoi";
  if (raw.includes("dung cu") || raw.includes("tool")) return "dung_cu";
  if (raw.includes("storage") || raw.includes("nha kho") || raw.includes("warehouse") || raw.includes("kho")) return "nha_kho";
  return "cropping";
};

const warehouseTypesFromMetadata = (metadata?: KhuVucMetadata) =>
  metadata?.warehouseTypes ?? metadata?.storageGroups ?? metadata?.extra?.warehouseTypes;

const displayTypeLabel = (kind: KhuLoai, canonicalLabel: string) =>
  kind === "hay" || kind === "resting" || kind === "dung_cu" || kind === "nha_kho" || kind === "phuong_tien"
    ? typeLabelByKey[kind]
    : canonicalLabel;

const isInternalTypeText = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  const normalized = normalizeText(raw);
  return [
    "parking",
    "storage",
    "cropping",
    "crop",
    "livestock",
    "cattle",
    "grazing",
    "pasture",
    "water",
    "warehouse",
    "vehicle",
    "tool",
    "hay",
    "resting",
  ].includes(normalized);
};

const displayTypeFromRaw = (rawType: unknown, kind: KhuLoai, canonicalLabel: string) => {
  const raw = String(rawType ?? "").trim();
  if (raw && !isInternalTypeText(raw)) return raw;
  return displayTypeLabel(kind, canonicalLabel);
};

async function getLatestFarmMap(ownerId: string): Promise<FarmMapInfo | null> {
  try {
    const result = await db.query(
      `select t.ten_trang_trai as farm_name, v.vi_do as latitude, v.kinh_do as longitude, v.ten_dia_diem as location_name
       from du_lieu.trang_trai t
       left join du_lieu.vi_tri_trang_trai v on v.trang_trai_id = t.id
       where t.chu_so_huu_id = $1
       order by t.created_at desc
       limit 1`,
      [ownerId]
    );
    return (result.rows[0] as FarmMapInfo) || null;
  } catch {
    return null;
  }
}

async function getFarmMapStats(ownerId: string): Promise<FarmMapStats> {
  try {
    const [employeeRows, livestockRows, zoneRows, grazingPlanRows] = await Promise.all([
      db.query(
        `select count(*)::int as c
         from du_lieu.thanh_vien_trang_trai tv
         join du_lieu.trang_trai t on t.id = tv.trang_trai_id
         where t.chu_so_huu_id = $1
           and coalesce(lower(tv.trang_thai), '') not in ('inactive', 'da_huy', 'da huy', 'đã hủy', 'cancelled')`,
        [ownerId]
      ),
      db.query(
        `select count(*)::int as c
         from du_lieu.vat_nuoi vn
         join du_lieu.trang_trai t on t.id = vn.trang_trai_id
         where t.chu_so_huu_id = $1`,
        [ownerId]
      ),
      db.query(
        `select count(*)::int as c
         from du_lieu.khu_vuc kv
         join du_lieu.trang_trai t on t.id = kv.trang_trai_id
         where t.chu_so_huu_id = $1 and ${ACTIVE_ZONE_SQL}`,
        [ownerId]
      ),
      db.query(
        `select count(*)::int as c
         from du_lieu.ke_hoach_chan_tha kh
         join du_lieu.trang_trai t on t.id = kh.trang_trai_id
         where t.chu_so_huu_id = $1
           and coalesce(lower(kh.trang_thai), '') not in ('cancelled', 'da_huy', 'da huy', 'đã hủy')`,
        [ownerId]
      ),
    ]);

    return {
      employees: employeeRows.rows[0]?.c ?? 0,
      livestock: livestockRows.rows[0]?.c ?? 0,
      paddocks: zoneRows.rows[0]?.c ?? 0,
      grazingPlans: grazingPlanRows.rows[0]?.c ?? 0,
    };
  } catch {
    return { employees: 0, livestock: 0, paddocks: 0, grazingPlans: 0 };
  }
}

async function getMapObjects(ownerId: string): Promise<{ mapObjects: FarmMapObject[]; rows: FarmMapAssetRow[] }> {
  try {
    const result = await db.query(
      `select dt.id, dt.ten_doi_tuong, dt.loai_doi_tuong, dt.hinh_hoc_geojson
       from du_lieu.doi_tuong_ban_do dt
       join du_lieu.trang_trai t on t.id = dt.trang_trai_id
       where t.chu_so_huu_id = $1
         and coalesce(dt.loai_doi_tuong, '') <> 'sensor'
       order by dt.created_at desc
       limit 200`,
      [ownerId]
    );

    const rows = result.rows as MapObjectRow[];
    return {
      mapObjects: rows.flatMap((row) => {
        const geo = row.hinh_hoc_geojson ?? {};
        const point = Array.isArray(geo.coordinates)
          ? geo.coordinates
          : Array.isArray(geo.geo?.coordinates)
            ? geo.geo.coordinates
            : null;
        const lat = Number(geo.lat ?? geo.geo?.lat ?? point?.[1] ?? NaN);
        const lng = Number(geo.lng ?? geo.geo?.lng ?? point?.[0] ?? NaN);

        return Number.isFinite(lat) && Number.isFinite(lng)
          ? [
              {
                id: String(row.id),
                label: String(row.ten_doi_tuong ?? row.loai_doi_tuong ?? "Đối tượng"),
                color: "#2563eb",
                kind: String(row.loai_doi_tuong ?? "doi_tuong_ban_do"),
                geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
              },
            ]
          : [];
      }),
      rows: rows.map((row) => ({
        id: String(row.id),
        farm: "Trang trại",
        name: row.ten_doi_tuong ?? "Đối tượng chưa đặt tên",
        category: "Tài sản",
        type: row.loai_doi_tuong ?? "Đối tượng bản đồ",
        description: "Đối tượng được ghi nhận trên bản đồ trang trại.",
        color: "#2563eb",
      })),
    };
  } catch {
    return { mapObjects: [], rows: [] };
  }
}

async function getZones(ownerId: string): Promise<{ zones: FarmMapZone[]; rows: FarmMapAssetRow[] }> {
  try {
    const result = await db.query(
      `select kv.id, kv.ten_khu_vuc, coalesce(kv.loai_khu_vuc, loai.ten) as crop_type, kv.trang_thai as status, kv.created_at, kv.hinh_hoc_geojson
       from du_lieu.khu_vuc kv
       join du_lieu.trang_trai t on t.id = kv.trang_trai_id
       left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = kv.loai_khu_vuc_id
       where t.chu_so_huu_id = $1
         and ${ACTIVE_ZONE_SQL}
       order by kv.created_at desc
       limit 100`,
      [ownerId]
    );

    const rows = (result.rows as KhuVucRow[]).map((row) => {
      const geoJson = row.hinh_hoc_geojson ?? {};
      const rawType = normalizeText(geoJson.metadata?.areaType);
      const kindText = normalizeText(
        [row.crop_type, geoJson.metadata?.kind, geoJson.metadata?.usage, geoJson.metadata?.notes, geoJson.metadata?.farmType].join(" ")
      );
      const kind = rawType ? detectAreaType(rawType) : detectAreaType(kindText);
      const typeInfo = getZoneTypeInfo(
        row.crop_type ?? geoJson.metadata?.kind ?? geoJson.metadata?.areaType ?? geoJson.metadata?.usage ?? kind,
        warehouseTypesFromMetadata(geoJson.metadata)
      );
      const typeLabel = displayTypeFromRaw(row.crop_type ?? geoJson.metadata?.areaType ?? geoJson.metadata?.kind ?? geoJson.metadata?.usage, kind, typeInfo.label);
      const color = isHexColor(geoJson.metadata?.areaColor ?? geoJson.metadata?.area_color)
        ? String(geoJson.metadata?.areaColor ?? geoJson.metadata?.area_color)
        : defaultColorByType[kind];
      const polygon = Array.isArray(geoJson.geo?.polygon)
        ? geoJson.geo.polygon
            .filter((point): point is { lat?: number | string; lng?: number | string } => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)))
            .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
        : [];

      return {
        id: String(row.id),
        name: row.ten_khu_vuc ?? "Khu vực chưa đặt tên",
        type: typeLabel,
        status: row.status ?? "Chưa có trạng thái",
        updatedAt: row.created_at ? new Date(row.created_at).toLocaleString("vi-VN") : "-",
        kind,
        color,
        polygon,
      };
    });

    return {
      zones: rows,
      rows: rows.map((row) => ({
        id: row.id,
        farm: "Trang trại",
        name: row.name,
        category: row.kind === "grazing" ? "Chăn nuôi" : "Khu vực",
        type: row.type,
        description: `${row.status}. Cập nhật: ${row.updatedAt}`,
        color: row.color,
      })),
    };
  } catch {
    return { zones: [], rows: [] };
  }
}

export default async function DashboardMapPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/map");

  const [mapData, stats, zoneData, objectData] = await Promise.all([
    getLatestFarmMap(ownerId),
    getFarmMapStats(ownerId),
    getZones(ownerId),
    getMapObjects(ownerId),
  ]);

  const farmName = mapData?.farm_name || "Trang trại";
  const lat = mapData?.latitude ?? 10.762622;
  const lng = mapData?.longitude ?? 106.660172;

  return (
    <DashboardShell farmName={farmName} activePath="/dashboard/map">
      <FarmMapDashboardClient
        farmName={farmName}
        locationName={mapData?.location_name || `${lat}, ${lng}`}
        lat={lat}
        lng={lng}
        stats={stats}
        zones={zoneData.zones}
        objects={objectData.mapObjects}
        assetRows={[...zoneData.rows, ...objectData.rows]}
      />
    </DashboardShell>
  );
}
