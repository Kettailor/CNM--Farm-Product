create extension if not exists pgcrypto;
create schema if not exists du_lieu;

-- =========================================================
-- USERS / FARMS
-- =========================================================

create table if not exists du_lieu.nguoi_dung (
  id uuid primary key default gen_random_uuid(),
  ho_ten text not null,
  email text not null unique,
  mat_khau_hash text not null,
  anh_dai_dien_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.chu_so_huu (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.trang_trai (
  id uuid primary key default gen_random_uuid(),
  chu_so_huu_id uuid not null references du_lieu.nguoi_dung(id) on delete cascade,
  ma_trang_trai text unique,
  ten_trang_trai text not null,
  dia_chi text,
  kinh_do numeric,
  vi_do numeric,
  is_map_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.vi_tri_trang_trai (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ten_dia_diem text,
  maps_link text,
  kinh_do numeric,
  vi_do numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.nong_trai (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references du_lieu.chu_so_huu(id) on delete cascade,
  name text not null,
  farm_area_hectare numeric,
  special_factors text,
  other_activity text,
  annual_rainfall numeric,
  carrying_capacity numeric,
  spring_start text,
  is_map_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.vi_tri_nong_trai (
  farm_id uuid primary key references du_lieu.nong_trai(id) on delete cascade,
  location_name text,
  maps_link text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.chan_nuoi_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  livestock_name text not null,
  quantity numeric,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.cay_trong_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  crop_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.tai_nguyen_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  resource_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.nguon_biet_den_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  channel_name text not null,
  other_note text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ZONES / MAP
-- =========================================================

create table if not exists du_lieu.danh_muc_loai_khu_vuc (
  id uuid primary key default gen_random_uuid(),
  ten text not null unique,
  mo_ta text,
  created_at timestamptz not null default now()
);

insert into du_lieu.danh_muc_loai_khu_vuc (ten, mo_ta)
values
  ('cropping', 'Trong trot'),
  ('pasture', 'Dong co / chan tha'),
  ('storage', 'Kho luu tru'),
  ('parking', 'Bai do xe')
on conflict (ten) do nothing;

create table if not exists du_lieu.khu_vuc (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ma_khu_vuc text,
  ten_khu_vuc text not null,
  loai_khu_vuc_id uuid references du_lieu.danh_muc_loai_khu_vuc(id) on delete set null,
  trang_thai text not null default 'dang hoat dong',
  dien_tich_ha numeric,
  chu_vi_m numeric,
  suc_chua numeric,
  tam_vi_do numeric,
  tam_kinh_do numeric,
  hinh_hoc_geojson jsonb not null default '{}'::jsonb,
  mo_ta text,
  mau_sac text,
  nguon_tao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_khu_vuc)
);

create table if not exists du_lieu.khu_vuc_trong_trot (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid not null references du_lieu.khu_vuc(id) on delete cascade,
  cay_trong text,
  ph_do_dat numeric,
  do_am_dat numeric,
  so_gio_nang numeric,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.khu_vuc_dong_co (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid not null references du_lieu.khu_vuc(id) on delete cascade,
  so_ngay_nghi_co numeric,
  dse_load numeric,
  ty_le_chan_tha numeric,
  thuc_an_san_co numeric,
  so_ngay_chan_tha_con_lai numeric,
  toc_do_moc_co numeric,
  trang_thai_co text,
  loai_co text,
  dien_tich_canh_tac_ha numeric,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.khu_vuc_kho_luong_thuc (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid not null references du_lieu.khu_vuc(id) on delete cascade,
  suc_chua numeric,
  loai_luu_tru text,
  nhiet_do numeric,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.khu_vuc_kho_dung_cu (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid not null references du_lieu.khu_vuc(id) on delete cascade,
  suc_chua numeric,
  loai_luu_tru text,
  nhiet_do numeric,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.khu_vuc_bai_do_xe (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid not null references du_lieu.khu_vuc(id) on delete cascade,
  suc_chua numeric,
  loai_bai_do_xe text,
  nhiet_do numeric,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.dong_chan_tha (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references du_lieu.nong_trai(id) on delete cascade,
  name text,
  crop_type text,
  status text,
  area_ha numeric,
  boundary_geojson jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.ghi_chu_khu_vuc (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references du_lieu.dong_chan_tha(id) on delete cascade,
  note_type text,
  content text,
  author text,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.lich_su_khu_vuc (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references du_lieu.dong_chan_tha(id) on delete cascade,
  action text,
  details text,
  actor text,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.doi_tuong_ban_do (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ten_doi_tuong text,
  loai_doi_tuong text not null,
  hinh_hoc_geojson jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.tai_san_rao (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ten_tai_san text,
  loai_tai_san text,
  hinh_hoc_geojson jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- FARM OPERATIONS
-- =========================================================

create table if not exists du_lieu.nhom_vat_nuoi (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete set null,
  ma_nhom text not null,
  ten_nhom text not null,
  loai_vat_nuoi text not null,
  mo_ta text,
  cach_tao text,
  giong text,
  so_luong integer not null default 0 check (so_luong >= 0),
  gioi_tinh text,
  giai_doan_sinh_truong text,
  trang_thai_suc_khoe text,
  muc_dich_san_xuat text,
  ghi_chu_dan text,
  nguon_goc text,
  gia_tri_mua numeric,
  tai_khoan_chi_phi text,
  ngay_sinh date,
  kieu_thu_thai text,
  trong_luong_so_sinh_kg numeric,
  ghi_chu_sinh text,
  van_de_suc_khoe text,
  ma_me text,
  ma_bo text,
  mau_long text,
  mau_mat text,
  kieu_tai text,
  kieu_sung text,
  tinh_trang_mieng text,
  diem_the_trang numeric,
  ghi_chu_dac_diem text,
  nhan_dien_chinh text,
  trang_thai_sinh_san text,
  kha_nang_sinh_san text,
  tang_trong_binh_quan_ngay numeric,
  nang_luong_megajoule_ngay numeric,
  trong_luong_muc_tieu_kg numeric,
  ngay_can_muc_tieu date,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_nhom)
);

create table if not exists du_lieu.vat_nuoi (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete set null,
  nhom_vat_nuoi_id uuid references du_lieu.nhom_vat_nuoi(id) on delete set null,
  ma_vat_nuoi text,
  the_nhan_dien text,
  trang_thai text,
  mo_ta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table du_lieu.vat_nuoi
  add column if not exists nhom_vat_nuoi_id uuid references du_lieu.nhom_vat_nuoi(id) on delete set null;

create table if not exists du_lieu.nhan_dien_nhom_vat_nuoi (
  id uuid primary key default gen_random_uuid(),
  nhom_vat_nuoi_id uuid not null references du_lieu.nhom_vat_nuoi(id) on delete cascade,
  loai_the text,
  ma_nhan_dien text,
  mau_sac text,
  vi_tri text,
  la_chinh boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.cam_bien (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete cascade,
  loai_cam_bien text,
  don_vi text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.dem_dong_vat (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete cascade,
  so_luong integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.canh_bao (
  id uuid primary key default gen_random_uuid(),
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete cascade,
  tieu_de text,
  noi_dung text,
  trang_thai text,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.nguon_nuoc (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ten_nguon_nuoc text,
  loai_nguon_nuoc text,
  trang_thai text,
  muc_nuoc numeric,
  chat_luong text,
  vi_tri text,
  ghi_chu text,
  cap_nhat timestamptz,
  hinh_hoc_geojson jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists du_lieu.truy_xuat_san_pham_chuoi_khoi (
  id uuid primary key default gen_random_uuid(),
  ma_truy_xuat text not null unique,
  ma_san_pham text not null,
  loai_san_pham text not null,
  nguon_goc text not null,
  ma_bam_du_lieu text not null,
  trang_thai_dong_bo text not null,
  du_lieu_truy_xuat jsonb not null default '{}'::jsonb,
  siu_du_lieu jsonb not null default '{}'::jsonb,
  ngay_tao timestamptz not null default now()
);

create table if not exists du_lieu.thoi_tiet_bo_nho_dem (
  vi_tri_ma text primary key,
  vi_do numeric(9,3) not null,
  kinh_do numeric(9,3) not null,
  du_lieu_hien_tai jsonb not null,
  du_lieu_du_bao jsonb not null,
  nguon_du_lieu text not null,
  cap_nhat_luc timestamptz not null,
  het_han_luc timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- AUDIT / LOG
-- =========================================================

create table if not exists du_lieu.nhat_ky_chinh_sua_khu_vuc (
  id bigserial primary key,
  khu_vuc_id uuid not null references du_lieu.khu_vuc(id) on delete cascade,
  nguoi_dung_id uuid references du_lieu.nguoi_dung(id) on delete set null,
  hanh_dong varchar(120) not null,
  du_lieu_cu jsonb not null default '{}'::jsonb,
  du_lieu_moi jsonb not null default '{}'::jsonb,
  ghi_luc_vao timestamptz not null default now()
);

create index if not exists idx_trang_trai_chu_so_huu_id on du_lieu.trang_trai(chu_so_huu_id);
create index if not exists idx_vi_tri_trang_trai_trang_trai_id on du_lieu.vi_tri_trang_trai(trang_trai_id);
create index if not exists idx_khu_vuc_trang_trai_id on du_lieu.khu_vuc(trang_trai_id);
create index if not exists idx_khu_vuc_created_at on du_lieu.khu_vuc(created_at desc);
create index if not exists idx_nhom_vat_nuoi_trang_trai_id on du_lieu.nhom_vat_nuoi(trang_trai_id);
create index if not exists idx_nhom_vat_nuoi_khu_vuc_id on du_lieu.nhom_vat_nuoi(khu_vuc_id);
create index if not exists idx_vat_nuoi_trang_trai_id on du_lieu.vat_nuoi(trang_trai_id);
create index if not exists idx_vat_nuoi_nhom_vat_nuoi_id on du_lieu.vat_nuoi(nhom_vat_nuoi_id);
create index if not exists idx_nhan_dien_nhom_vat_nuoi_id on du_lieu.nhan_dien_nhom_vat_nuoi(nhom_vat_nuoi_id);
create index if not exists idx_cam_bien_khu_vuc_id on du_lieu.cam_bien(khu_vuc_id);
create index if not exists idx_nguon_nuoc_trang_trai_id on du_lieu.nguon_nuoc(trang_trai_id);
create index if not exists idx_nhat_ky_chinh_sua_khu_vuc_khu_vuc_id on du_lieu.nhat_ky_chinh_sua_khu_vuc(khu_vuc_id);
create index if not exists idx_nhat_ky_chinh_sua_khu_vuc_ghi_luc_vao on du_lieu.nhat_ky_chinh_sua_khu_vuc(ghi_luc_vao desc);
