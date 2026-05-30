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
  so_dien_thoai text,
  ngon_ngu text,
  trang_thai text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table du_lieu.nguoi_dung
  add column if not exists so_dien_thoai text,
  add column if not exists ngon_ngu text,
  add column if not exists trang_thai text not null default 'active';

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

create table if not exists du_lieu.thong_tin_chan_nuoi_trang_trai (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  loai_chan_nuoi text not null,
  created_at timestamptz not null default now(),
  unique (trang_trai_id, loai_chan_nuoi)
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
  ('storage', 'Kho luu tru'),
  ('parking', 'Bai do xe'),
  ('livestock', 'Chan nuoi'),
  ('grazing', 'Dong co chan tha'),
  ('water', 'Nguon nuoc')
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
  loai_khu_vuc text,
  thong_tin_loai jsonb not null default '{}'::jsonb,
  nhom_luu_tru_kho text[] not null default '{}'::text[],
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
  nhom_luu_tru text[] not null default '{}'::text[],
  nhiet_do numeric,
  thong_tin_kho jsonb not null default '{}'::jsonb,
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

alter table du_lieu.nhom_vat_nuoi
  add column if not exists khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete set null;

create table if not exists du_lieu.vat_nuoi (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete set null,
  nhom_vat_nuoi_id uuid references du_lieu.nhom_vat_nuoi(id) on delete set null,
  ma_vat_nuoi text,
  ma_qr text,
  the_nhan_dien text,
  loai_vat_nuoi text,
  giong text,
  gioi_tinh text,
  giai_doan_sinh_truong text,
  ngay_sinh date,
  nguon_goc text,
  ma_me text,
  ma_bo text,
  mau_long text,
  trang_thai_sinh_san text,
  trang_thai text,
  mo_ta text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table du_lieu.vat_nuoi
  add column if not exists khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete set null;

alter table du_lieu.vat_nuoi
  add column if not exists nhom_vat_nuoi_id uuid references du_lieu.nhom_vat_nuoi(id) on delete set null;

alter table du_lieu.vat_nuoi
  add column if not exists ma_qr text;

alter table du_lieu.vat_nuoi
  add column if not exists loai_vat_nuoi text,
  add column if not exists giong text,
  add column if not exists gioi_tinh text,
  add column if not exists giai_doan_sinh_truong text,
  add column if not exists ngay_sinh date,
  add column if not exists nguon_goc text,
  add column if not exists ma_me text,
  add column if not exists ma_bo text,
  add column if not exists mau_long text,
  add column if not exists trang_thai_sinh_san text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

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

create table if not exists du_lieu.kho_vat_tu (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete set null,
  ma_vat_tu text not null,
  ten_vat_tu text not null,
  loai_kho text not null check (loai_kho in ('cong_cu', 'hoa_chat', 'thuc_an', 'thanh_pham_vat_nuoi')),
  nhom_hang text,
  so_luong numeric not null default 0 check (so_luong >= 0),
  don_vi text not null default 'cai',
  nguong_toi_thieu numeric not null default 0 check (nguong_toi_thieu >= 0),
  vi_tri_luu_tru text,
  trang_thai text not null default 'binh_thuong',
  ngay_nhap date,
  han_su_dung date,
  nha_cung_cap text,
  nguoi_phu_trach text,
  gia_tri_uoc_tinh numeric,
  ghi_chu text,
  ten_rut_gon text,
  phan_loai_san_pham text,
  whp_ngay integer check (whp_ngay is null or whp_ngay >= 0),
  esi_ngay integer check (esi_ngay is null or esi_ngay >= 0),
  mo_ta_san_pham text,
  so_don_vi numeric check (so_don_vi is null or so_don_vi >= 0),
  dung_tich_moi_don_vi numeric check (dung_tich_moi_don_vi is null or dung_tich_moi_don_vi >= 0),
  don_vi_dung_tich text,
  tong_dung_tich numeric check (tong_dung_tich is null or tong_dung_tich >= 0),
  don_gia numeric check (don_gia is null or don_gia >= 0),
  tong_chi_phi numeric check (tong_chi_phi is null or tong_chi_phi >= 0),
  so_lo text,
  ngay_mua date,
  ngay_san_xuat date,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_vat_tu)
);

create table if not exists du_lieu.dieu_tri_vat_nuoi (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  nhom_vat_nuoi_id uuid references du_lieu.nhom_vat_nuoi(id) on delete set null,
  kho_vat_tu_id uuid not null references du_lieu.kho_vat_tu(id) on delete restrict,
  ma_dieu_tri text not null,
  loai_dieu_tri text not null check (loai_dieu_tri in ('footrot', 'vaccination', 'supplement', 'dehorn', 'parasite', 'dry_off', 'custom')),
  ten_dieu_tri text not null,
  ngay_dieu_tri date not null default current_date,
  pham_vi_dieu_tri text not null default 'nhom' check (pham_vi_dieu_tri in ('nhom', 'ca_the', 'nhap_tay')),
  so_luong_vat_nuoi integer not null default 0 check (so_luong_vat_nuoi >= 0),
  lieu_luong_moi_con numeric not null default 0 check (lieu_luong_moi_con >= 0),
  don_vi_lieu_luong text not null default 'don_vi/con',
  tong_luong_dung numeric not null default 0 check (tong_luong_dung >= 0),
  don_vi_ton_kho text not null default 'don_vi',
  lo_san_xuat text,
  phuong_phap text,
  nguoi_thuc_hien text,
  thoi_gian_ngung_su_dung_ngay integer check (thoi_gian_ngung_su_dung_ngay is null or thoi_gian_ngung_su_dung_ngay >= 0),
  thoi_gian_esi_ngay integer check (thoi_gian_esi_ngay is null or thoi_gian_esi_ngay >= 0),
  ngay_ket_thuc_cach_ly date,
  ngay_nhac_lai date,
  trang_thai text not null default 'hoan_tat',
  ghi_chu text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_dieu_tri)
);

create table if not exists du_lieu.dieu_tri_vat_nuoi_ca_the (
  dieu_tri_id uuid not null references du_lieu.dieu_tri_vat_nuoi(id) on delete cascade,
  vat_nuoi_id uuid not null references du_lieu.vat_nuoi(id) on delete cascade,
  primary key (dieu_tri_id, vat_nuoi_id)
);

create table if not exists du_lieu.su_kien_vat_nuoi (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  nhom_vat_nuoi_id uuid references du_lieu.nhom_vat_nuoi(id) on delete set null,
  khu_vuc_nguon_id uuid references du_lieu.khu_vuc(id) on delete set null,
  khu_vuc_dich_id uuid references du_lieu.khu_vuc(id) on delete set null,
  ma_su_kien text not null,
  loai_su_kien text not null check (loai_su_kien in ('adjustment', 'reproduction', 'health', 'move', 'weight', 'grouping')),
  tieu_de text not null,
  ngay_su_kien date not null default current_date,
  pham_vi_su_kien text not null default 'ca_the' check (pham_vi_su_kien in ('nhom', 'ca_the')),
  so_luong_vat_nuoi integer not null default 0 check (so_luong_vat_nuoi >= 0),
  gia_tri_so numeric,
  don_vi text,
  nguoi_thuc_hien text,
  ngay_nhac_lai date,
  ghi_chu text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_su_kien)
);

update du_lieu.su_kien_vat_nuoi
   set loai_su_kien = 'health',
       metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('migratedFromEventType', 'treatment'),
       updated_at = now()
 where loai_su_kien = 'treatment';

alter table du_lieu.su_kien_vat_nuoi
  drop constraint if exists su_kien_vat_nuoi_loai_su_kien_check;

alter table du_lieu.su_kien_vat_nuoi
  add constraint su_kien_vat_nuoi_loai_su_kien_check
  check (loai_su_kien in ('adjustment', 'reproduction', 'health', 'move', 'weight', 'grouping'));

create table if not exists du_lieu.su_kien_vat_nuoi_ca_the (
  su_kien_id uuid not null references du_lieu.su_kien_vat_nuoi(id) on delete cascade,
  vat_nuoi_id uuid not null references du_lieu.vat_nuoi(id) on delete cascade,
  gia_tri_so numeric,
  don_vi text,
  ghi_chu text,
  metadata_json jsonb not null default '{}'::jsonb,
  primary key (su_kien_id, vat_nuoi_id)
);

alter table du_lieu.su_kien_vat_nuoi_ca_the
  add column if not exists gia_tri_so numeric,
  add column if not exists don_vi text,
  add column if not exists ghi_chu text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create table if not exists du_lieu.ke_hoach_chan_tha (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  ma_ke_hoach text not null,
  ten_ke_hoach text not null,
  kieu_ke_hoach text not null check (kieu_ke_hoach in ('perpetual', 'seasonal', 'off_season')),
  trang_thai text not null default 'active',
  ngay_bat_dau date,
  ngay_ket_thuc date,
  mua_vu text,
  nguoi_phu_trach text,
  ghi_chu text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trang_trai_id, ma_ke_hoach)
);

create table if not exists du_lieu.ke_hoach_chan_tha_khu_vuc (
  ke_hoach_id uuid not null references du_lieu.ke_hoach_chan_tha(id) on delete cascade,
  khu_vuc_id uuid not null references du_lieu.khu_vuc(id) on delete cascade,
  do_uu_tien integer not null default 5,
  danh_gia integer not null default 5,
  dien_tich_ha numeric,
  metadata_json jsonb not null default '{}'::jsonb,
  primary key (ke_hoach_id, khu_vuc_id)
);

create table if not exists du_lieu.ke_hoach_chan_tha_nhom_vat_nuoi (
  ke_hoach_id uuid not null references du_lieu.ke_hoach_chan_tha(id) on delete cascade,
  nhom_vat_nuoi_id uuid not null references du_lieu.nhom_vat_nuoi(id) on delete cascade,
  so_luong_du_kien integer check (so_luong_du_kien is null or so_luong_du_kien >= 0),
  metadata_json jsonb not null default '{}'::jsonb,
  primary key (ke_hoach_id, nhom_vat_nuoi_id)
);

create table if not exists du_lieu.su_kien_chan_tha (
  id uuid primary key default gen_random_uuid(),
  ke_hoach_id uuid not null references du_lieu.ke_hoach_chan_tha(id) on delete cascade,
  khu_vuc_id uuid references du_lieu.khu_vuc(id) on delete set null,
  nhom_vat_nuoi_id uuid references du_lieu.nhom_vat_nuoi(id) on delete set null,
  loai_su_kien text not null check (loai_su_kien in ('grazing', 'resting', 'burning', 'clipping', 'compacting', 'cultivating', 'cutting', 'deferred', 'feeding', 'fertilising', 'grooming', 'harrowing', 'harvesting', 'hoeing', 'levelling', 'maintenance', 'mowing', 'move', 'other', 'pest_management', 'plowing', 'repairing', 'reseeding', 'rolling', 'scarifying', 'seeding', 'smoothing', 'soil_testing', 'sowing', 'spell_grazing', 'spraying', 'subsoiling', 'tilling', 'thinning', 'top_cutting', 'weeding', 'watering', 'withholding')),
  tieu_de text not null,
  trang_thai text not null default 'active',
  ngay_bat_dau date,
  ngay_ket_thuc date,
  ghi_chu text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table du_lieu.su_kien_chan_tha
  drop constraint if exists su_kien_chan_tha_loai_su_kien_check;

alter table du_lieu.su_kien_chan_tha
  add constraint su_kien_chan_tha_loai_su_kien_check
  check (loai_su_kien in ('grazing', 'resting', 'burning', 'clipping', 'compacting', 'cultivating', 'cutting', 'deferred', 'feeding', 'fertilising', 'grooming', 'harrowing', 'harvesting', 'hoeing', 'levelling', 'maintenance', 'mowing', 'move', 'other', 'pest_management', 'plowing', 'repairing', 'reseeding', 'rolling', 'scarifying', 'seeding', 'smoothing', 'soil_testing', 'sowing', 'spell_grazing', 'spraying', 'subsoiling', 'tilling', 'thinning', 'top_cutting', 'weeding', 'watering', 'withholding'));

create table if not exists du_lieu.kho_vat_tu_giao_dich (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  kho_vat_tu_id uuid not null references du_lieu.kho_vat_tu(id) on delete cascade,
  loai_giao_dich text not null,
  nguon_nghiep_vu text,
  nguon_ban_ghi_id uuid,
  so_luong numeric not null check (so_luong >= 0),
  so_luong_truoc numeric,
  so_luong_sau numeric,
  don_vi text,
  ghi_chu text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
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
create index if not exists idx_vai_tro_trang_trai_id on du_lieu.vai_tro_trang_trai(trang_trai_id);
create index if not exists idx_thanh_vien_trang_trai_id on du_lieu.thanh_vien_trang_trai(trang_trai_id);
create index if not exists idx_thanh_vien_nguoi_dung_id on du_lieu.thanh_vien_trang_trai(nguoi_dung_id);
create index if not exists idx_loi_moi_trang_trai_id on du_lieu.loi_moi_trang_trai(trang_trai_id);
create index if not exists idx_loi_moi_trang_thai on du_lieu.loi_moi_trang_trai(trang_thai);
create index if not exists idx_chung_tu_trang_trai_id on du_lieu.chung_tu_trang_trai(trang_trai_id);
create index if not exists idx_chung_tu_trang_thai on du_lieu.chung_tu_trang_trai(trang_thai);
create index if not exists idx_chung_tu_ngay_het_han on du_lieu.chung_tu_trang_trai(ngay_het_han);
create index if not exists idx_thong_tin_chan_nuoi_trang_trai_id on du_lieu.thong_tin_chan_nuoi_trang_trai(trang_trai_id);
create index if not exists idx_khu_vuc_trang_trai_id on du_lieu.khu_vuc(trang_trai_id);
create index if not exists idx_khu_vuc_created_at on du_lieu.khu_vuc(created_at desc);
create index if not exists idx_khu_vuc_loai_khu_vuc on du_lieu.khu_vuc(loai_khu_vuc);
create index if not exists idx_khu_vuc_nhom_luu_tru_kho on du_lieu.khu_vuc using gin(nhom_luu_tru_kho);
create index if not exists idx_nhom_vat_nuoi_trang_trai_id on du_lieu.nhom_vat_nuoi(trang_trai_id);
create index if not exists idx_nhom_vat_nuoi_khu_vuc_id on du_lieu.nhom_vat_nuoi(khu_vuc_id);
create index if not exists idx_vat_nuoi_trang_trai_id on du_lieu.vat_nuoi(trang_trai_id);
create index if not exists idx_vat_nuoi_khu_vuc_id on du_lieu.vat_nuoi(khu_vuc_id);
create index if not exists idx_vat_nuoi_nhom_vat_nuoi_id on du_lieu.vat_nuoi(nhom_vat_nuoi_id);
create index if not exists idx_vat_nuoi_loai_vat_nuoi on du_lieu.vat_nuoi(loai_vat_nuoi);
create unique index if not exists idx_vat_nuoi_ma_qr_unique on du_lieu.vat_nuoi(ma_qr) where ma_qr is not null;
create index if not exists idx_kho_vat_tu_trang_trai_id on du_lieu.kho_vat_tu(trang_trai_id);
create index if not exists idx_kho_vat_tu_khu_vuc_id on du_lieu.kho_vat_tu(khu_vuc_id);
create index if not exists idx_kho_vat_tu_loai_kho on du_lieu.kho_vat_tu(loai_kho);
create index if not exists idx_kho_vat_tu_han_su_dung on du_lieu.kho_vat_tu(han_su_dung);
create index if not exists idx_dieu_tri_vat_nuoi_trang_trai_id on du_lieu.dieu_tri_vat_nuoi(trang_trai_id);
create index if not exists idx_dieu_tri_vat_nuoi_nhom_id on du_lieu.dieu_tri_vat_nuoi(nhom_vat_nuoi_id);
create index if not exists idx_dieu_tri_vat_nuoi_kho_id on du_lieu.dieu_tri_vat_nuoi(kho_vat_tu_id);
create index if not exists idx_dieu_tri_vat_nuoi_ngay on du_lieu.dieu_tri_vat_nuoi(ngay_dieu_tri);
create index if not exists idx_dieu_tri_ca_the_vat_nuoi_id on du_lieu.dieu_tri_vat_nuoi_ca_the(vat_nuoi_id);
create index if not exists idx_su_kien_vat_nuoi_trang_trai_id on du_lieu.su_kien_vat_nuoi(trang_trai_id);
create index if not exists idx_su_kien_vat_nuoi_nhom_id on du_lieu.su_kien_vat_nuoi(nhom_vat_nuoi_id);
create index if not exists idx_su_kien_vat_nuoi_loai on du_lieu.su_kien_vat_nuoi(loai_su_kien);
create index if not exists idx_su_kien_vat_nuoi_ngay on du_lieu.su_kien_vat_nuoi(ngay_su_kien);
create index if not exists idx_su_kien_ca_the_vat_nuoi_id on du_lieu.su_kien_vat_nuoi_ca_the(vat_nuoi_id);
create index if not exists idx_ke_hoach_chan_tha_trang_trai_id on du_lieu.ke_hoach_chan_tha(trang_trai_id);
create index if not exists idx_ke_hoach_chan_tha_trang_thai on du_lieu.ke_hoach_chan_tha(trang_thai);
create index if not exists idx_ke_hoach_chan_tha_ngay on du_lieu.ke_hoach_chan_tha(ngay_bat_dau, ngay_ket_thuc);
create index if not exists idx_chan_tha_khu_vuc_khu_vuc_id on du_lieu.ke_hoach_chan_tha_khu_vuc(khu_vuc_id);
create index if not exists idx_chan_tha_nhom_nhom_id on du_lieu.ke_hoach_chan_tha_nhom_vat_nuoi(nhom_vat_nuoi_id);
create index if not exists idx_su_kien_chan_tha_ke_hoach_id on du_lieu.su_kien_chan_tha(ke_hoach_id);
create index if not exists idx_su_kien_chan_tha_khu_vuc_id on du_lieu.su_kien_chan_tha(khu_vuc_id);
create index if not exists idx_su_kien_chan_tha_nhom_id on du_lieu.su_kien_chan_tha(nhom_vat_nuoi_id);
create index if not exists idx_su_kien_chan_tha_ngay on du_lieu.su_kien_chan_tha(ngay_bat_dau, ngay_ket_thuc);
create index if not exists idx_kho_vat_tu_giao_dich_kho_id on du_lieu.kho_vat_tu_giao_dich(kho_vat_tu_id);
create index if not exists idx_kho_vat_tu_giao_dich_nguon on du_lieu.kho_vat_tu_giao_dich(nguon_nghiep_vu, nguon_ban_ghi_id);
create index if not exists idx_nhat_ky_chinh_sua_khu_vuc_khu_vuc_id on du_lieu.nhat_ky_chinh_sua_khu_vuc(khu_vuc_id);
create index if not exists idx_nhat_ky_chinh_sua_khu_vuc_ghi_luc_vao on du_lieu.nhat_ky_chinh_sua_khu_vuc(ghi_luc_vao desc);
