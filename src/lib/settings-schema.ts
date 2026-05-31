import { db } from "@/lib/db";

export const SETTINGS_SCHEMA_SQL = `
create table if not exists du_lieu.cai_dat_trang_trai (
  trang_trai_id uuid primary key references du_lieu.trang_trai(id) on delete cascade,
  dien_tich_ha numeric,
  yeu_to_dac_biet text,
  hoat_dong_khac text,
  luong_mua_hang_nam numeric,
  suc_tai_chan_tha numeric,
  mua_xuan_bat_dau text,
  don_vi_tieu_chuan jsonb not null default '{
    "animal_load": "DSE",
    "area": "Hectare",
    "length": "Metric",
    "mass": "Metric",
    "spring": "1-Sep",
    "temperature": "Celsius",
    "preferred_units": "Metric",
    "volume": "Metric"
  }'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table du_lieu.cai_dat_trang_trai
  add column if not exists don_vi_tieu_chuan jsonb not null default '{
    "animal_load": "DSE",
    "area": "Hectare",
    "length": "Metric",
    "mass": "Metric",
    "spring": "1-Sep",
    "temperature": "Celsius",
    "preferred_units": "Metric",
    "volume": "Metric"
  }'::jsonb;

alter table du_lieu.cai_dat_trang_trai
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

alter table du_lieu.nguoi_dung
  add column if not exists so_dien_thoai text,
  add column if not exists ngon_ngu text,
  add column if not exists trang_thai text not null default 'active';

create table if not exists du_lieu.vai_tro_trang_trai (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ma_vai_tro text not null,
  ten_vai_tro text not null,
  mo_ta text,
  quyen jsonb not null default '{}'::jsonb,
  la_mac_dinh boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_vai_tro)
);

create table if not exists du_lieu.thanh_vien_trang_trai (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  nguoi_dung_id uuid not null references du_lieu.nguoi_dung(id) on delete cascade,
  vai_tro_id uuid not null references du_lieu.vai_tro_trang_trai(id) on delete restrict,
  trang_thai text not null default 'active',
  ngay_tham_gia timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, nguoi_dung_id)
);

alter table du_lieu.thanh_vien_trang_trai
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create table if not exists du_lieu.loi_moi_trang_trai (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  email text not null,
  vai_tro_id uuid references du_lieu.vai_tro_trang_trai(id) on delete set null,
  trang_thai text not null default 'pending',
  token text unique,
  nguoi_moi_id uuid references du_lieu.nguoi_dung(id) on delete set null,
  het_han_luc timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.chung_tu_trang_trai (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ma_chung_tu text not null,
  ten_chung_tu text not null,
  loai_chung_tu text,
  so_chung_tu text,
  ngay_ban_hanh date,
  ngay_het_han date,
  trang_thai text not null default 'draft',
  tep_dinh_kem_url text,
  ghi_chu text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_chung_tu)
);

create index if not exists idx_vai_tro_trang_trai_id on du_lieu.vai_tro_trang_trai(trang_trai_id);
create index if not exists idx_thanh_vien_trang_trai_id on du_lieu.thanh_vien_trang_trai(trang_trai_id);
create index if not exists idx_thanh_vien_nguoi_dung_id on du_lieu.thanh_vien_trang_trai(nguoi_dung_id);
create index if not exists idx_loi_moi_trang_trai_id on du_lieu.loi_moi_trang_trai(trang_trai_id);
create index if not exists idx_loi_moi_trang_thai on du_lieu.loi_moi_trang_trai(trang_thai);
create index if not exists idx_chung_tu_trang_trai_id on du_lieu.chung_tu_trang_trai(trang_trai_id);
create index if not exists idx_chung_tu_trang_thai on du_lieu.chung_tu_trang_trai(trang_thai);
create index if not exists idx_chung_tu_ngay_het_han on du_lieu.chung_tu_trang_trai(ngay_het_han);
`;

let ensurePromise: Promise<void> | null = null;

export async function ensureSettingsSchema() {
  ensurePromise ??= db.query(SETTINGS_SCHEMA_SQL).then(() => undefined);
  return ensurePromise;
}

export async function ensureFarmSettingsDefaults(farmId: string, ownerId: string) {
  await ensureSettingsSchema();

  await db.query(
    `insert into du_lieu.cai_dat_trang_trai (trang_trai_id)
     values ($1)
     on conflict (trang_trai_id) do nothing`,
    [farmId]
  );

  await db.query(
    `insert into du_lieu.vai_tro_trang_trai
       (trang_trai_id, ma_vai_tro, ten_vai_tro, mo_ta, quyen, la_mac_dinh)
     values
       ($1, 'owner', 'Chủ trang trại', 'Toàn quyền cấu hình và quản trị trang trại.', '{"settings": true, "users": true, "documents": true, "farm": true}'::jsonb, false),
       ($1, 'admin', 'Quản trị', 'Quản trị vận hành và dữ liệu trang trại.', '{"settings": true, "users": true, "documents": true, "farm": true}'::jsonb, true),
       ($1, 'editor', 'Biên tập', 'Xem và chỉnh sửa dữ liệu trang trại được phân quyền.', '{"settings": false, "users": false, "documents": true, "farm": true, "write": true}'::jsonb, false),
       ($1, 'viewer', 'Chỉ xem', 'Chỉ xem dữ liệu được phân quyền.', '{"settings": false, "users": false, "documents": false, "farm": true, "write": false}'::jsonb, false)
     on conflict (trang_trai_id, ma_vai_tro) do update
     set ten_vai_tro = excluded.ten_vai_tro,
         mo_ta = excluded.mo_ta,
         quyen = excluded.quyen,
         la_mac_dinh = excluded.la_mac_dinh,
         updated_at = now()`,
    [farmId]
  );

  const ownerRole = await db.query(
    `select id
     from du_lieu.vai_tro_trang_trai
     where trang_trai_id = $1 and ma_vai_tro = 'owner'
     limit 1`,
    [farmId]
  );

  const ownerRoleId = ownerRole.rows[0]?.id;
  if (!ownerRoleId) return;

  await db.query(
    `insert into du_lieu.thanh_vien_trang_trai (trang_trai_id, nguoi_dung_id, vai_tro_id, trang_thai)
     values ($1, $2, $3, 'active')
     on conflict (trang_trai_id, nguoi_dung_id) do update
     set vai_tro_id = excluded.vai_tro_id,
         trang_thai = 'active',
         updated_at = now()`,
    [farmId, ownerId, ownerRoleId]
  );
}
