-- KetKat-EcoFarm: bo nho dem thoi tiet toi uu tai nguyen
create schema if not exists du_lieu;

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

create index if not exists idx_thoi_tiet_bo_nho_dem_het_han_luc
  on du_lieu.thoi_tiet_bo_nho_dem(het_han_luc);

create index if not exists idx_thoi_tiet_bo_nho_dem_cap_nhat_luc
  on du_lieu.thoi_tiet_bo_nho_dem(cap_nhat_luc);
