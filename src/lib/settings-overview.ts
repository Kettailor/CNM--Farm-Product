import { db } from "@/lib/db";
import { ensureFarmSettingsDefaults, ensureSettingsSchema } from "@/lib/settings-schema";
import type { PoolClient } from "pg";

export type SettingsSummary = {
  farmCount: number;
  paddockCount: number;
  assetCount: number;
  animalCount: number;
  userCount: number;
  activeUserCount: number;
  roleCount: number;
  inviteCount: number;
  pendingInviteCount: number;
  documentCount: number;
  pendingDocumentCount: number;
  expiringDocumentCount: number;
  currentRoleName: string | null;
};

export type SettingsMapPoint = {
  lat: number;
  lng: number;
};

export type SettingsMapZone = {
  id: string;
  label: string;
  color: string | null;
  polygon: SettingsMapPoint[];
  kind: string | null;
};

export type SettingsStandardUnits = {
  animal_load?: string | null;
  area?: string | null;
  length?: string | null;
  mass?: string | null;
  spring?: string | null;
  temperature?: string | null;
  preferred_units?: string | null;
  volume?: string | null;
};

export type SettingsUserAccount = {
  member_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  language: string | null;
  status: string;
  joined_at: string | null;
  base_role: string | null;
  farm_role: string | null;
  role_code: string | null;
  role_name: string | null;
  role_permissions: Record<string, unknown>;
  is_owner: boolean;
  is_current_user: boolean;
};

export type SettingsProfile = {
  owner_id: string;
  full_name: string | null;
  email: string | null;
  farm_id: string | null;
  farm_code: string | null;
  farm_name: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postal_code: string | null;
  state: string | null;
  country: string | null;
  farm_area_hectare: number | null;
  special_factors: string | null;
  other_activity: string | null;
  annual_rainfall: number | null;
  carrying_capacity: number | null;
  spring_start: string | null;
  location_name: string | null;
  maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
  is_map_shared: boolean;
  standard_units: SettingsStandardUnits;
  map_zones: SettingsMapZone[];
  users: SettingsUserAccount[];
  settings_summary: SettingsSummary;
};

type DeleteSettingsFarmOptions = {
  confirmFarmDeletion: boolean;
  confirmAccountDeletion: boolean;
};

export type DeleteSettingsFarmResult = {
  deletedFarmId: string;
  deletedAccount: boolean;
  wasFinalFarm: boolean;
};

const ZERO_SUMMARY: SettingsSummary = {
  farmCount: 0,
  paddockCount: 0,
  assetCount: 0,
  animalCount: 0,
  userCount: 0,
  activeUserCount: 0,
  roleCount: 0,
  inviteCount: 0,
  pendingInviteCount: 0,
  documentCount: 0,
  pendingDocumentCount: 0,
  expiringDocumentCount: 0,
  currentRoleName: null,
};

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const cleanStringOrNull = (value: unknown) => {
  if (typeof value !== "string") return null;
  const cleanValue = value.trim();
  return cleanValue ? cleanValue : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const DEFAULT_STANDARD_UNITS: SettingsStandardUnits = {
  animal_load: "DSE",
  area: "Hectare",
  length: "Metric",
  mass: "Metric",
  spring: "1-Sep",
  temperature: "Celsius",
  preferred_units: "Metric",
  volume: "Metric",
};

function normalizeStandardUnits(value: unknown): SettingsStandardUnits {
  if (!isRecord(value)) return DEFAULT_STANDARD_UNITS;
  return {
    animal_load: typeof value.animal_load === "string" ? value.animal_load : DEFAULT_STANDARD_UNITS.animal_load,
    area: typeof value.area === "string" ? value.area : DEFAULT_STANDARD_UNITS.area,
    length: typeof value.length === "string" ? value.length : DEFAULT_STANDARD_UNITS.length,
    mass: typeof value.mass === "string" ? value.mass : DEFAULT_STANDARD_UNITS.mass,
    spring: typeof value.spring === "string" ? value.spring : DEFAULT_STANDARD_UNITS.spring,
    temperature: typeof value.temperature === "string" ? value.temperature : DEFAULT_STANDARD_UNITS.temperature,
    preferred_units: typeof value.preferred_units === "string" ? value.preferred_units : DEFAULT_STANDARD_UNITS.preferred_units,
    volume: typeof value.volume === "string" ? value.volume : DEFAULT_STANDARD_UNITS.volume,
  };
}

function metadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getAddressMetadata(value: unknown) {
  const metadata = isRecord(value) ? value : {};
  return {
    address_line_2: metadataText(metadata.address_line_2),
    city: metadataText(metadata.city),
    postal_code: metadataText(metadata.postal_code),
    state: metadataText(metadata.state),
    country: metadataText(metadata.country),
  };
}

function buildAddressMetadataPatch(body: Record<string, unknown>) {
  const patch: Record<string, string | null> = {};
  for (const key of ["address_line_2", "city", "postal_code", "state", "country"] as const) {
    if (key in body) patch[key] = cleanStringOrNull(body[key]);
  }
  return patch;
}

function buildStandardUnitsPatch(value: unknown) {
  if (!isRecord(value)) return null;
  return {
    ...DEFAULT_STANDARD_UNITS,
    animal_load: cleanStringOrNull(value.animal_load) ?? DEFAULT_STANDARD_UNITS.animal_load,
    area: cleanStringOrNull(value.area) ?? DEFAULT_STANDARD_UNITS.area,
    length: cleanStringOrNull(value.length) ?? DEFAULT_STANDARD_UNITS.length,
    mass: cleanStringOrNull(value.mass) ?? DEFAULT_STANDARD_UNITS.mass,
    spring: cleanStringOrNull(value.spring) ?? DEFAULT_STANDARD_UNITS.spring,
    temperature: cleanStringOrNull(value.temperature) ?? DEFAULT_STANDARD_UNITS.temperature,
    preferred_units: cleanStringOrNull(value.preferred_units) ?? DEFAULT_STANDARD_UNITS.preferred_units,
    volume: cleanStringOrNull(value.volume) ?? DEFAULT_STANDARD_UNITS.volume,
  };
}

async function deleteIfTablesExist(client: PoolClient, tableNames: string[], sql: string, params: unknown[]) {
  const result = await client.query(
    `select bool_and(to_regclass(table_name) is not null) as all_exist
     from unnest($1::text[]) as tables(table_name)`,
    [tableNames]
  );
  if (result.rows[0]?.all_exist) {
    await client.query(sql, params);
  }
}

async function deleteFarmBlockingData(client: PoolClient, farmId: string) {
  await deleteIfTablesExist(
    client,
    ["du_lieu.dieu_tri_vat_nuoi_ca_the", "du_lieu.dieu_tri_vat_nuoi"],
    `delete from du_lieu.dieu_tri_vat_nuoi_ca_the
     where dieu_tri_id in (select id from du_lieu.dieu_tri_vat_nuoi where trang_trai_id = $1)`,
    [farmId]
  );
  await deleteIfTablesExist(
    client,
    ["du_lieu.su_kien_vat_nuoi_ca_the", "du_lieu.su_kien_vat_nuoi"],
    `delete from du_lieu.su_kien_vat_nuoi_ca_the
     where su_kien_id in (select id from du_lieu.su_kien_vat_nuoi where trang_trai_id = $1)`,
    [farmId]
  );
  await deleteIfTablesExist(
    client,
    ["du_lieu.ke_hoach_chan_tha_khu_vuc", "du_lieu.ke_hoach_chan_tha"],
    `delete from du_lieu.ke_hoach_chan_tha_khu_vuc
     where ke_hoach_id in (select id from du_lieu.ke_hoach_chan_tha where trang_trai_id = $1)`,
    [farmId]
  );
  await deleteIfTablesExist(
    client,
    ["du_lieu.ke_hoach_chan_tha_nhom_vat_nuoi", "du_lieu.ke_hoach_chan_tha"],
    `delete from du_lieu.ke_hoach_chan_tha_nhom_vat_nuoi
     where ke_hoach_id in (select id from du_lieu.ke_hoach_chan_tha where trang_trai_id = $1)`,
    [farmId]
  );
  await deleteIfTablesExist(
    client,
    ["du_lieu.su_kien_chan_tha", "du_lieu.ke_hoach_chan_tha"],
    `delete from du_lieu.su_kien_chan_tha
     where ke_hoach_id in (select id from du_lieu.ke_hoach_chan_tha where trang_trai_id = $1)`,
    [farmId]
  );
  await deleteIfTablesExist(client, ["du_lieu.kho_vat_tu_giao_dich"], `delete from du_lieu.kho_vat_tu_giao_dich where trang_trai_id = $1`, [farmId]);
  await deleteIfTablesExist(client, ["du_lieu.dieu_tri_vat_nuoi"], `delete from du_lieu.dieu_tri_vat_nuoi where trang_trai_id = $1`, [farmId]);
  await deleteIfTablesExist(client, ["du_lieu.su_kien_vat_nuoi"], `delete from du_lieu.su_kien_vat_nuoi where trang_trai_id = $1`, [farmId]);
  await deleteIfTablesExist(client, ["du_lieu.ke_hoach_chan_tha"], `delete from du_lieu.ke_hoach_chan_tha where trang_trai_id = $1`, [farmId]);
  await deleteIfTablesExist(client, ["du_lieu.thanh_vien_trang_trai"], `delete from du_lieu.thanh_vien_trang_trai where trang_trai_id = $1`, [farmId]);
}

function extractPolygon(value: unknown): SettingsMapPoint[] {
  if (!isRecord(value)) return [];
  const geo = isRecord(value.geo) ? value.geo : value;
  const rawPolygon = Array.isArray(geo.polygon) ? geo.polygon : [];
  return rawPolygon
    .map((point) => {
      if (!isRecord(point)) return null;
      const lat = toNumberOrNull(point.lat);
      const lng = toNumberOrNull(point.lng);
      return lat === null || lng === null ? null : { lat, lng };
    })
    .filter((point): point is SettingsMapPoint => Boolean(point));
}

async function getSettingsMapZones(farmId: string): Promise<SettingsMapZone[]> {
  const zones = await db.query(
    `select id::text,
            coalesce(nullif(ten_khu_vuc, ''), ma_khu_vuc, 'Khu vực trang trại') as label,
            coalesce(mau_sac, hinh_hoc_geojson->'metadata'->>'areaColor', hinh_hoc_geojson->'metadata'->>'area_color') as color,
            coalesce(nullif(loai_khu_vuc, ''), hinh_hoc_geojson->'metadata'->>'kind', hinh_hoc_geojson->'metadata'->>'areaType') as kind,
            hinh_hoc_geojson
     from du_lieu.khu_vuc
     where trang_trai_id = $1
       and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
     order by created_at asc
     limit 80`,
    [farmId]
  );

  return zones.rows
    .map((row) => ({
      id: String(row.id),
      label: String(row.label ?? "Khu vực trang trại"),
      color: row.color ? String(row.color) : null,
      polygon: extractPolygon(row.hinh_hoc_geojson),
      kind: row.kind ? String(row.kind) : null,
    }))
    .filter((zone) => zone.polygon.length >= 3);
}

async function getSettingsUsers(ownerId: string, farmId: string): Promise<SettingsUserAccount[]> {
  const users = await db.query(
    `select
       tv.id::text as member_id,
       u.id::text as user_id,
       u.ho_ten as full_name,
       u.email,
       u.anh_dai_dien_url as avatar_url,
       u.so_dien_thoai as phone,
       u.ngon_ngu as language,
       tv.trang_thai as status,
       tv.ngay_tham_gia as joined_at,
       tv.metadata_json as member_metadata,
       vt.ma_vai_tro as role_code,
       vt.ten_vai_tro as role_name,
       vt.quyen as role_permissions,
       (u.id = t.chu_so_huu_id) as is_owner,
       (u.id = $2::uuid) as is_current_user
     from du_lieu.thanh_vien_trang_trai tv
     join du_lieu.nguoi_dung u on u.id = tv.nguoi_dung_id
     join du_lieu.trang_trai t on t.id = tv.trang_trai_id
     left join du_lieu.vai_tro_trang_trai vt on vt.id = tv.vai_tro_id
     where tv.trang_trai_id = $1
     order by
       case
         when u.id = $2::uuid then 0
         when u.id = t.chu_so_huu_id then 1
         else 2
       end,
       tv.ngay_tham_gia asc nulls last,
       u.ho_ten asc nulls last`,
    [farmId, ownerId]
  );

  return users.rows.map((row) => {
    const metadata = isRecord(row.member_metadata) ? row.member_metadata : {};
    const baseRole = typeof metadata.base_role === "string" ? metadata.base_role : null;
    const farmRole = typeof metadata.farm_role === "string" ? metadata.farm_role : null;

    return {
      member_id: String(row.member_id),
      user_id: String(row.user_id),
      full_name: row.full_name ? String(row.full_name) : null,
      email: row.email ? String(row.email) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      phone: row.phone ? String(row.phone) : null,
      language: row.language ? String(row.language) : null,
      status: row.status ? String(row.status) : "active",
      joined_at: row.joined_at ? new Date(row.joined_at).toISOString() : null,
      base_role: baseRole,
      farm_role: farmRole,
      role_code: row.role_code ? String(row.role_code) : null,
      role_name: row.role_name ? String(row.role_name) : null,
      role_permissions: isRecord(row.role_permissions) ? row.role_permissions : {},
      is_owner: Boolean(row.is_owner),
      is_current_user: Boolean(row.is_current_user),
    };
  });
}

async function getSettingsStats(ownerId: string, farmId: string): Promise<SettingsSummary> {
  const stats = await db.query(
    `select
       (select count(*)::int from du_lieu.trang_trai where chu_so_huu_id = $1) as farm_count,
       (select count(*)::int from du_lieu.khu_vuc where trang_trai_id = $2 and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')) as paddock_count,
       (select count(*)::int from du_lieu.tai_san_rao where trang_trai_id = $2) as asset_count,
       (select count(*)::int from du_lieu.vat_nuoi where trang_trai_id = $2) as animal_count,
       (select count(*)::int from du_lieu.thanh_vien_trang_trai where trang_trai_id = $2) as user_count,
       (select count(*)::int from du_lieu.thanh_vien_trang_trai where trang_trai_id = $2 and lower(trang_thai) = 'active') as active_user_count,
       (select count(*)::int from du_lieu.vai_tro_trang_trai where trang_trai_id = $2) as role_count,
       (select count(*)::int from du_lieu.loi_moi_trang_trai where trang_trai_id = $2) as invite_count,
       (select count(*)::int from du_lieu.loi_moi_trang_trai where trang_trai_id = $2 and lower(trang_thai) = 'pending') as pending_invite_count,
       (select count(*)::int from du_lieu.chung_tu_trang_trai where trang_trai_id = $2) as document_count,
       (select count(*)::int from du_lieu.chung_tu_trang_trai where trang_trai_id = $2 and lower(trang_thai) in ('pending', 'cho_duyet')) as pending_document_count,
       (select count(*)::int from du_lieu.chung_tu_trang_trai where trang_trai_id = $2 and ngay_het_han between current_date and current_date + interval '30 days') as expiring_document_count,
       (
         select vt.ten_vai_tro
         from du_lieu.thanh_vien_trang_trai tv
         join du_lieu.vai_tro_trang_trai vt on vt.id = tv.vai_tro_id
         where tv.trang_trai_id = $2 and tv.nguoi_dung_id = $1
         limit 1
       ) as current_role_name`,
    [ownerId, farmId]
  );

  const row = stats.rows[0] ?? {};
  return {
    farmCount: Number(row.farm_count ?? 0),
    paddockCount: Number(row.paddock_count ?? 0),
    assetCount: Number(row.asset_count ?? 0),
    animalCount: Number(row.animal_count ?? 0),
    userCount: Number(row.user_count ?? 0),
    activeUserCount: Number(row.active_user_count ?? 0),
    roleCount: Number(row.role_count ?? 0),
    inviteCount: Number(row.invite_count ?? 0),
    pendingInviteCount: Number(row.pending_invite_count ?? 0),
    documentCount: Number(row.document_count ?? 0),
    pendingDocumentCount: Number(row.pending_document_count ?? 0),
    expiringDocumentCount: Number(row.expiring_document_count ?? 0),
    currentRoleName: row.current_role_name ? String(row.current_role_name) : null,
  };
}

export async function loadSettingsProfile(ownerId: string): Promise<SettingsProfile | null> {
  await ensureSettingsSchema();

  const profileResult = await db.query(
    `select
       u.id as owner_id,
       u.ho_ten as full_name,
       u.email,
       t.id as farm_id,
       t.ma_trang_trai as farm_code,
       t.ten_trang_trai as farm_name,
       t.dia_chi as address_line_1,
       t.is_map_shared,
       s.dien_tich_ha as farm_area_hectare,
       s.yeu_to_dac_biet as special_factors,
       s.hoat_dong_khac as other_activity,
       s.luong_mua_hang_nam as annual_rainfall,
       s.suc_tai_chan_tha as carrying_capacity,
       s.mua_xuan_bat_dau as spring_start,
       s.don_vi_tieu_chuan as standard_units,
       s.metadata_json as settings_metadata,
       v.ten_dia_diem as location_name,
       v.maps_link,
       v.vi_do as latitude,
       v.kinh_do as longitude
     from du_lieu.nguoi_dung u
     left join lateral (
       select *
       from du_lieu.trang_trai
       where chu_so_huu_id = u.id
       order by created_at desc nulls last, id desc
       limit 1
     ) t on true
     left join du_lieu.cai_dat_trang_trai s on s.trang_trai_id = t.id
     left join lateral (
       select *
       from du_lieu.vi_tri_trang_trai
       where trang_trai_id = t.id
       order by created_at desc nulls last, id desc
       limit 1
     ) v on true
     where u.id = $1
     limit 1`,
    [ownerId]
  );

  const row = profileResult.rows[0];
  if (!row) return null;

  if (row.farm_id) {
    await ensureFarmSettingsDefaults(String(row.farm_id), ownerId);
  }

  const farmId = row.farm_id ? String(row.farm_id) : null;
  const [summary, mapZones, users] = farmId
    ? await Promise.all([getSettingsStats(ownerId, farmId), getSettingsMapZones(farmId), getSettingsUsers(ownerId, farmId)])
    : [ZERO_SUMMARY, [] as SettingsMapZone[], [] as SettingsUserAccount[]];
  const addressMetadata = getAddressMetadata(row.settings_metadata);

  return {
    owner_id: String(row.owner_id),
    full_name: row.full_name ? String(row.full_name) : null,
    email: row.email ? String(row.email) : null,
    farm_id: row.farm_id ? String(row.farm_id) : null,
    farm_code: row.farm_code ? String(row.farm_code) : null,
    farm_name: row.farm_name ? String(row.farm_name) : null,
    address_line_1: row.address_line_1 ? String(row.address_line_1) : row.location_name ? String(row.location_name) : null,
    ...addressMetadata,
    farm_area_hectare: toNumberOrNull(row.farm_area_hectare),
    special_factors: row.special_factors ? String(row.special_factors) : null,
    other_activity: row.other_activity ? String(row.other_activity) : null,
    annual_rainfall: toNumberOrNull(row.annual_rainfall),
    carrying_capacity: toNumberOrNull(row.carrying_capacity),
    spring_start: row.spring_start ? String(row.spring_start) : null,
    location_name: row.location_name ? String(row.location_name) : null,
    maps_link: row.maps_link ? String(row.maps_link) : null,
    latitude: toNumberOrNull(row.latitude),
    longitude: toNumberOrNull(row.longitude),
    is_map_shared: Boolean(row.is_map_shared),
    standard_units: normalizeStandardUnits(row.standard_units),
    map_zones: mapZones,
    users,
    settings_summary: summary,
  };
}

export async function updateSettingsProfile(ownerId: string, body: Record<string, unknown>) {
  await ensureSettingsSchema();

  const client = await db.connect();
  try {
    await client.query("begin");

    await client.query(
      `update du_lieu.nguoi_dung
       set ho_ten = coalesce(nullif($2, ''), ho_ten),
           email = coalesce(nullif($3, ''), email),
           updated_at = now()
       where id = $1`,
      [ownerId, typeof body.full_name === "string" ? body.full_name.trim() : null, typeof body.email === "string" ? body.email.trim() : null]
    );

    const nextLatitude = toNumberOrNull(body.latitude);
    const nextLongitude = toNumberOrNull(body.longitude);
    const addressLine1 = cleanStringOrNull(body.address_line_1) ?? cleanStringOrNull(body.location_name);
    const standardUnitsPatch = buildStandardUnitsPatch(body.standard_units);
    const addressMetadataPatch = buildAddressMetadataPatch(body);
    const addressMetadataJson = JSON.stringify(addressMetadataPatch);

    let farmId = typeof body.farm_id === "string" ? body.farm_id : null;
    if (!farmId) {
      const existing = await client.query(
        `select id from du_lieu.trang_trai where chu_so_huu_id = $1 order by created_at desc nulls last limit 1`,
        [ownerId]
      );
      farmId = existing.rows[0]?.id ? String(existing.rows[0].id) : null;
    }

    if (!farmId) {
      const created = await client.query(
        `insert into du_lieu.trang_trai (chu_so_huu_id, ma_trang_trai, ten_trang_trai, dia_chi, kinh_do, vi_do, is_map_shared)
         values ($1, 'FARM-' || substr(gen_random_uuid()::text, 1, 8), coalesce(nullif($2, ''), 'Trang trai'), $3, $4, $5, coalesce($6, false))
         returning id`,
        [
          ownerId,
          typeof body.farm_name === "string" ? body.farm_name.trim() : null,
          addressLine1,
          nextLongitude,
          nextLatitude,
          typeof body.is_map_shared === "boolean" ? body.is_map_shared : false,
        ]
      );
      farmId = String(created.rows[0].id);
    } else {
      await client.query(
        `update du_lieu.trang_trai
         set ten_trang_trai = coalesce(nullif($2, ''), ten_trang_trai),
             dia_chi = coalesce($3, dia_chi),
             kinh_do = coalesce($4, kinh_do),
             vi_do = coalesce($5, vi_do),
             is_map_shared = coalesce($6, is_map_shared),
             updated_at = now()
         where id = $1 and chu_so_huu_id = $7`,
        [
          farmId,
          typeof body.farm_name === "string" ? body.farm_name.trim() : null,
          addressLine1,
          nextLongitude,
          nextLatitude,
          typeof body.is_map_shared === "boolean" ? body.is_map_shared : null,
          ownerId,
        ]
      );
    }

    await client.query(
      `insert into du_lieu.cai_dat_trang_trai
        (trang_trai_id, dien_tich_ha, yeu_to_dac_biet, hoat_dong_khac, luong_mua_hang_nam, suc_tai_chan_tha, mua_xuan_bat_dau, don_vi_tieu_chuan, metadata_json)
       values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::jsonb, '${JSON.stringify(DEFAULT_STANDARD_UNITS)}'::jsonb), $9::jsonb)
       on conflict (trang_trai_id) do update
       set dien_tich_ha = excluded.dien_tich_ha,
           yeu_to_dac_biet = excluded.yeu_to_dac_biet,
           hoat_dong_khac = excluded.hoat_dong_khac,
           luong_mua_hang_nam = excluded.luong_mua_hang_nam,
           suc_tai_chan_tha = excluded.suc_tai_chan_tha,
           mua_xuan_bat_dau = excluded.mua_xuan_bat_dau,
           don_vi_tieu_chuan = case
             when $8::jsonb is null then du_lieu.cai_dat_trang_trai.don_vi_tieu_chuan
             else excluded.don_vi_tieu_chuan
           end,
           metadata_json = coalesce(du_lieu.cai_dat_trang_trai.metadata_json, '{}'::jsonb) || excluded.metadata_json,
           updated_at = now()`,
      [
        farmId,
        toNumberOrNull(body.farm_area_hectare),
        typeof body.special_factors === "string" ? body.special_factors : null,
        typeof body.other_activity === "string" ? body.other_activity : null,
        toNumberOrNull(body.annual_rainfall),
        toNumberOrNull(body.carrying_capacity),
        typeof body.spring_start === "string" ? body.spring_start : null,
        standardUnitsPatch ? JSON.stringify(standardUnitsPatch) : null,
        addressMetadataJson,
      ]
    );

    const locationUpdate = await client.query(
      `update du_lieu.vi_tri_trang_trai
       set ten_dia_diem = $2,
           maps_link = $3,
           kinh_do = $4,
           vi_do = $5,
           updated_at = now()
       where id = (
         select id from du_lieu.vi_tri_trang_trai
         where trang_trai_id = $1
         order by created_at desc nulls last, id desc
         limit 1
       )`,
      [
        farmId,
        addressLine1,
        typeof body.maps_link === "string" ? body.maps_link : null,
        nextLongitude,
        nextLatitude,
      ]
    );

    if (locationUpdate.rowCount === 0) {
      await client.query(
        `insert into du_lieu.vi_tri_trang_trai (trang_trai_id, ten_dia_diem, maps_link, kinh_do, vi_do)
         values ($1, $2, $3, $4, $5)`,
        [
          farmId,
          addressLine1,
          typeof body.maps_link === "string" ? body.maps_link : null,
          nextLongitude,
          nextLatitude,
        ]
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSettingsFarm(ownerId: string, farmId: string | null, options: DeleteSettingsFarmOptions): Promise<DeleteSettingsFarmResult> {
  await ensureSettingsSchema();

  const client = await db.connect();
  try {
    await client.query("begin");

    const farmResult = await client.query(
      `select id::text
       from du_lieu.trang_trai
       where chu_so_huu_id = $1
         and ($2::uuid is null or id = $2::uuid)
       order by created_at desc nulls last, id desc
       limit 1
       for update`,
      [ownerId, farmId]
    );
    const targetFarmId = farmResult.rows[0]?.id ? String(farmResult.rows[0].id) : null;
    if (!targetFarmId) {
      throw new Error("Không tìm thấy trang trại để xóa.");
    }

    const farmCountResult = await client.query(
      `select count(*)::int as farm_count
       from du_lieu.trang_trai
       where chu_so_huu_id = $1`,
      [ownerId]
    );
    const farmCount = Number(farmCountResult.rows[0]?.farm_count ?? 0);
    const wasFinalFarm = farmCount <= 1;

    if (!options.confirmFarmDeletion) {
      throw new Error("Cần xác nhận xóa trang trại trước khi tiếp tục.");
    }
    if (wasFinalFarm && !options.confirmAccountDeletion) {
      throw new Error("Đây là trang trại cuối cùng. Cần xác nhận xóa tài khoản trước khi tiếp tục.");
    }

    await deleteFarmBlockingData(client, targetFarmId);

    const deletedFarm = await client.query(
      `delete from du_lieu.trang_trai
       where id = $1 and chu_so_huu_id = $2
       returning id`,
      [targetFarmId, ownerId]
    );
    if (deletedFarm.rowCount === 0) {
      throw new Error("Không tìm thấy trang trại để xóa.");
    }

    if (wasFinalFarm) {
      const deletedAccount = await client.query(`delete from du_lieu.nguoi_dung where id = $1 returning id`, [ownerId]);
      if (deletedAccount.rowCount === 0) {
        throw new Error("Không thể xóa tài khoản sau khi xóa trang trại cuối cùng.");
      }
    }

    await client.query("commit");

    return {
      deletedFarmId: targetFarmId,
      deletedAccount: wasFinalFarm,
      wasFinalFarm,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
