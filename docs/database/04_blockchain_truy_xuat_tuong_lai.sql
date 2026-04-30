create schema if not exists du_lieu;

create table if not exists du_lieu.chuoi_khoi_mang (
  id uuid primary key default gen_random_uuid(),
  ma_mang varchar(80) not null unique,
  ten_mang varchar(200) not null,
  nen_tang varchar(120) not null default 'hyperledger_fabric',
  kenh_mac_dinh varchar(120),
  hop_dong_thong_minh varchar(200),
  trang_thai varchar(40) not null default 'khoi_tao',
  cau_hinh jsonb not null default '{}'::jsonb,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create table if not exists du_lieu.truy_xuat_san_pham_chuoi_khoi (
  id uuid primary key default gen_random_uuid(),
  ma_truy_xuat varchar(120) not null unique,
  ma_san_pham varchar(120) not null,
  loai_san_pham varchar(80) not null,
  nguon_goc varchar(120) not null,
  khu_vuc_id uuid,
  vat_nuoi_id uuid,
  nong_trai_id uuid,
  ma_bam_du_lieu varchar(128) not null,
  ma_giao_dich_chuoi_khoi varchar(180),
  khoi_so bigint,
  trang_thai_dong_bo varchar(40) not null default 'cho_dong_bo',
  du_lieu_truy_xuat jsonb not null default '{}'::jsonb,
  siu_du_lieu jsonb not null default '{}'::jsonb,
  ngay_su_kien timestamptz not null default now(),
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create index if not exists idx_truy_xuat_san_pham_chuoi_khoi_ma_san_pham
  on du_lieu.truy_xuat_san_pham_chuoi_khoi(ma_san_pham);

create index if not exists idx_truy_xuat_san_pham_chuoi_khoi_trang_thai
  on du_lieu.truy_xuat_san_pham_chuoi_khoi(trang_thai_dong_bo);

create table if not exists du_lieu.nhat_ky_dong_bo_chuoi_khoi (
  id uuid primary key default gen_random_uuid(),
  truy_xuat_id uuid not null references du_lieu.truy_xuat_san_pham_chuoi_khoi(id) on delete cascade,
  hanh_dong varchar(80) not null,
  ket_qua varchar(40) not null,
  thong_diep text,
  du_lieu_phan_hoi jsonb not null default '{}'::jsonb,
  ngay_ghi_nhan timestamptz not null default now()
);

