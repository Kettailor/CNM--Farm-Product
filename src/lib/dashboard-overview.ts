import { db } from "@/lib/db";
import { getAccessibleFarm } from "@/lib/farm-access";

export type DashboardOverview = {
  farmId: string | null;
  farmName: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  isMapShared: boolean;
  createdAt: string | null;
  ownerName: string | null;
  metrics: {
    assets: number;
    livestock: number;
    zones: number;
    waterSources: number;
    totalAreaHa: number;
    members: number;
    activeWork: number;
    overdueWork: number;
    activeGrazingPlans: number;
  };
  latestZones: Array<{
    id: string;
    name: string;
    status: string | null;
    areaHa: number;
  }>;
  access: {
    roleCode: string | null;
    roleName: string | null;
    canRead: boolean;
    canWrite: boolean;
    canManageSettings: boolean;
    canManageUsers: boolean;
    canManageDocuments: boolean;
    isOwner: boolean;
  };
};

const DEFAULT_COORD = { latitude: 10.762622, longitude: 106.660172 };
const ACTIVE_ZONE_SQL =
  "coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'cancelled')";
const ZERO_METRICS: DashboardOverview["metrics"] = {
  assets: 0,
  livestock: 0,
  zones: 0,
  waterSources: 0,
  totalAreaHa: 0,
  members: 0,
  activeWork: 0,
  overdueWork: 0,
  activeGrazingPlans: 0,
};

const ZERO_OVERVIEW: DashboardOverview = {
  farmId: null,
  farmName: "KetKat-EcoFarm",
  locationName: null,
  latitude: DEFAULT_COORD.latitude,
  longitude: DEFAULT_COORD.longitude,
  isMapShared: false,
  createdAt: null,
  ownerName: null,
  metrics: ZERO_METRICS,
  latestZones: [],
  access: {
    roleCode: null,
    roleName: null,
    canRead: false,
    canWrite: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageDocuments: false,
    isOwner: false,
  },
};

type CountRow = { c?: number | string | null };

function isOptionalMetricError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
  return code === "42P01" || code === "42703";
}

async function getCount(tableSql: string, whereSql = "", params: unknown[] = []) {
  const rs = await db.query<CountRow>(`select count(*)::int as c from ${tableSql} ${whereSql}`, params);
  return Number(rs.rows[0]?.c ?? 0);
}

async function getOptionalCount(query: string, params: unknown[] = []) {
  try {
    const rs = await db.query<CountRow>(query, params);
    return Number(rs.rows[0]?.c ?? 0);
  } catch (error) {
    if (isOptionalMetricError(error)) return 0;
    throw error;
  }
}

async function loadDuLieuOverview(ownerId: string): Promise<DashboardOverview> {
  const access = await getAccessibleFarm(ownerId);
  if (!access?.farmId) return ZERO_OVERVIEW;

  const farmRs = await db.query(
    `select n.id, n.ten_trang_trai as farm_name, n.created_at, c.ho_ten as owner_name,
            n.is_map_shared,
            v.vi_do as latitude, v.kinh_do as longitude, v.ten_dia_diem as location_name
     from du_lieu.trang_trai n
     left join du_lieu.nguoi_dung c on c.id = n.chu_so_huu_id
     left join du_lieu.vi_tri_trang_trai v on v.trang_trai_id = n.id
     where n.id = $1
     limit 1`,
    [access.farmId]
  );

  const farm = farmRs.rows[0] as
    | {
        id?: string;
        farm_name?: string;
        created_at?: string | Date | null;
        owner_name?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        location_name?: string | null;
        is_map_shared?: boolean | null;
      }
    | undefined;

  if (!farm?.id) return ZERO_OVERVIEW;

  const [assets, livestock, zoneSummaryRs, members, activeWork, overdueWork, activeGrazingPlans, latestZones] =
    await Promise.all([
      getCount("du_lieu.tai_san_rao", "where trang_trai_id = $1", [farm.id]),
      getCount("du_lieu.vat_nuoi", "where trang_trai_id = $1", [farm.id]),
      db.query<{
        zone_count?: number | string | null;
        total_area_ha?: number | string | null;
        water_count?: number | string | null;
      }>(
        `select count(*)::int as zone_count,
                coalesce(sum(coalesce(dien_tich_ha, 0)), 0)::float8 as total_area_ha,
                count(*) filter (
                  where lower(coalesce(loai_khu_vuc, '')) in ('water', 'nguon_nuoc')
                     or lower(coalesce(hinh_hoc_geojson->'metadata'->>'kind', '')) in ('water', 'nguon_nuoc')
                     or lower(coalesce(hinh_hoc_geojson->'metadata'->>'areaType', '')) in ('water', 'nguon_nuoc')
                )::int as water_count
         from du_lieu.khu_vuc
         where trang_trai_id = $1
           and ${ACTIVE_ZONE_SQL}`,
        [farm.id]
      ),
      getOptionalCount(
        `select count(distinct member_id)::int as c
         from (
           select chu_so_huu_id::text as member_id
           from du_lieu.trang_trai
           where id = $1
           union
           select nguoi_dung_id::text as member_id
           from du_lieu.thanh_vien_trang_trai
           where trang_trai_id = $1
             and lower(coalesce(trang_thai, 'active')) = 'active'
         ) members`,
        [farm.id]
      ),
      getOptionalCount(
        `select count(*)::int as c
         from du_lieu.cong_viec
         where trang_trai_id = $1
           and coalesce(lower(trang_thai), '') not in ('hoan_thanh', 'da_huy', 'cancelled')`,
        [farm.id]
      ),
      getOptionalCount(
        `select count(*)::int as c
         from du_lieu.cong_viec
         where trang_trai_id = $1
           and coalesce(lower(trang_thai), '') not in ('hoan_thanh', 'da_huy', 'cancelled')
           and (trang_thai = 'qua_han' or ngay_het_han < current_date)`,
        [farm.id]
      ),
      getOptionalCount(
        `select count(*)::int as c
         from du_lieu.ke_hoach_chan_tha
         where trang_trai_id = $1
           and coalesce(lower(trang_thai), '') not in ('hoan_thanh', 'da_huy', 'cancelled', 'inactive')`,
        [farm.id]
      ),
      db.query(
        `select id, ten_khu_vuc as name, trang_thai as status, coalesce(dien_tich_ha, 0)::float8 as area_ha
         from du_lieu.khu_vuc
         where trang_trai_id = $1
           and ${ACTIVE_ZONE_SQL}
         order by created_at desc nulls last, id desc
         limit 8`,
        [farm.id]
      ),
    ]);

  const zoneSummary = zoneSummaryRs.rows[0];

  return {
    farmId: farm.id ?? null,
    farmName: farm.farm_name || "KetKat-EcoFarm",
    locationName: farm.location_name ?? null,
    latitude: Number(farm.latitude ?? DEFAULT_COORD.latitude),
    longitude: Number(farm.longitude ?? DEFAULT_COORD.longitude),
    isMapShared: Boolean(farm.is_map_shared),
    createdAt: farm.created_at ? new Date(farm.created_at).toISOString() : null,
    ownerName: farm.owner_name ?? null,
    metrics: {
      assets,
      livestock,
      zones: Number(zoneSummary?.zone_count ?? 0),
      waterSources: Number(zoneSummary?.water_count ?? 0),
      totalAreaHa: Number(zoneSummary?.total_area_ha ?? 0),
      members,
      activeWork,
      overdueWork,
      activeGrazingPlans,
    },
    latestZones: latestZones.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? "Khu vực chưa đặt tên"),
      status: row.status ? String(row.status) : null,
      areaHa: Number(row.area_ha ?? 0),
    })),
    access: {
      roleCode: access.roleCode,
      roleName: access.roleName,
      canRead: access.canRead,
      canWrite: access.canWrite,
      canManageSettings: access.canManageSettings,
      canManageUsers: access.canManageUsers,
      canManageDocuments: access.canManageDocuments,
      isOwner: access.isOwner,
    },
  };
}

export async function getDashboardOverview(ownerId: string): Promise<DashboardOverview> {
  return loadDuLieuOverview(ownerId);
}
