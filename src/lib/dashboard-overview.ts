import { db } from "@/lib/db";

export type DashboardOverview = {
  farmName: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  metrics: {
    assets: number;
    sensors: number;
    livestock: number;
    zones: number;
    waterSources: number;
  };
  latestZones: Array<{
    id: string;
    name: string;
    status: string | null;
    areaHa: number;
  }>;
};

const DEFAULT_COORD = { latitude: 10.762622, longitude: 106.660172 };

const ZERO_OVERVIEW: DashboardOverview = {
  farmName: "KetKat-EcoFarm",
  locationName: null,
  latitude: DEFAULT_COORD.latitude,
  longitude: DEFAULT_COORD.longitude,
  metrics: { assets: 0, sensors: 0, livestock: 0, zones: 0, waterSources: 0 },
  latestZones: [],
};

async function tableExists(schema: string, table: string): Promise<boolean> {
  try {
    const rs = await db.query(`select to_regclass($1) is not null as exists`, [`${schema}.${table}`]);
    return Boolean(rs.rows[0]?.exists);
  } catch {
    return false;
  }
}

async function getCount(tableSql: string, whereSql = "", params: unknown[] = []) {
  try {
    const rs = await db.query(`select count(*)::int as c from ${tableSql} ${whereSql}`, params);
    return Number(rs.rows[0]?.c ?? 0);
  } catch {
    return 0;
  }
}

async function loadDuLieuOverview(ownerId: string): Promise<DashboardOverview> {
  const farmRs = await db.query(
    `select n.id, n.name as farm_name, v.latitude, v.longitude, v.location_name
     from du_lieu.nong_trai n
     left join du_lieu.vi_tri_nong_trai v on v.farm_id = n.id
     where n.owner_id = $1
     order by n.created_at desc
     limit 1`,
    [ownerId]
  );

  const farm = farmRs.rows[0] as
    | { id?: string; farm_name?: string; latitude?: number | null; longitude?: number | null; location_name?: string | null }
    | undefined;

  if (!farm?.id) return ZERO_OVERVIEW;

  const [assets, sensors, livestock, zones, waterSources, latestZones] = await Promise.all([
    getCount("du_lieu.tai_nguyen_nong_trai", "where farm_id = $1", [farm.id]),
    getCount("du_lieu.cam_bien", "where farm_id = $1", [farm.id]),
    getCount("du_lieu.vat_nuoi", "where farm_id = $1", [farm.id]),
    getCount("du_lieu.dong_chan_tha", "where farm_id = $1", [farm.id]),
    getCount("du_lieu.nguon_nuoc", "where farm_id = $1", [farm.id]),
    db.query(
      `select id, coalesce(name, 'Khu vực chưa đặt tên') as name, status, coalesce(area_ha, 0)::float8 as area_ha
       from du_lieu.dong_chan_tha
       where farm_id = $1
       order by created_at desc nulls last, id desc
       limit 8`,
      [farm.id]
    ),
  ]);

  return {
    farmName: farm.farm_name || "KetKat-EcoFarm",
    locationName: farm.location_name ?? null,
    latitude: Number(farm.latitude ?? DEFAULT_COORD.latitude),
    longitude: Number(farm.longitude ?? DEFAULT_COORD.longitude),
    metrics: { assets, sensors, livestock, zones, waterSources },
    latestZones: latestZones.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? "Khu vực chưa đặt tên"),
      status: row.status ? String(row.status) : null,
      areaHa: Number(row.area_ha ?? 0),
    })),
  };
}

async function loadFarmOverview(ownerId: string): Promise<DashboardOverview> {
  const farmRs = await db.query(
    `select f.id, f.name as farm_name, f.latitude, f.longitude,
            coalesce(f.address_line1, f.city, f.state, f.country) as location_name
     from farm.farms f
     where f.id in (
       select farm_id from farm.farm_users where id = $1 or email is not null limit 1
     )
     order by f.created_at desc
     limit 1`,
    [ownerId]
  );

  const farm = farmRs.rows[0] as
    | { id?: string; farm_name?: string; latitude?: number | null; longitude?: number | null; location_name?: string | null }
    | undefined;

  if (!farm?.id) return ZERO_OVERVIEW;

  const [assets, sensors, livestock, zones, waterSources, latestZones] = await Promise.all([
    getCount("farm.fencing_assets", "where farm_id = $1", [farm.id]),
    getCount("farm.sensors", "where farm_id = $1", [farm.id]),
    getCount("farm.animals", "where farm_id = $1 and lifecycle_status = 'active'", [farm.id]),
    getCount("farm.paddocks", "where farm_id = $1", [farm.id]),
    getCount("farm.water_assets", "where farm_id = $1", [farm.id]),
    db.query(
      `select p.id, p.name, p.status, coalesce(p.area_ha, 0)::float8 as area_ha
       from farm.paddocks p
       where p.farm_id = $1
       order by p.created_at desc
       limit 8`,
      [farm.id]
    ),
  ]);

  return {
    farmName: farm.farm_name || "KetKat-EcoFarm",
    locationName: farm.location_name ?? null,
    latitude: Number(farm.latitude ?? DEFAULT_COORD.latitude),
    longitude: Number(farm.longitude ?? DEFAULT_COORD.longitude),
    metrics: { assets, sensors, livestock, zones, waterSources },
    latestZones: latestZones.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? "Khu vực chưa đặt tên"),
      status: row.status ? String(row.status) : null,
      areaHa: Number(row.area_ha ?? 0),
    })),
  };
}

export async function getDashboardOverview(ownerId: string): Promise<DashboardOverview> {
  const duLieuExists = await tableExists("du_lieu", "nong_trai");
  if (duLieuExists) return loadDuLieuOverview(ownerId);

  const farmExists = await tableExists("farm", "farms");
  if (farmExists) return loadFarmOverview(ownerId);

  return ZERO_OVERVIEW;
}
