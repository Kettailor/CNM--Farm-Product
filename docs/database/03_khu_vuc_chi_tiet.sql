create table if not exists du_lieu.khu_vuc_chi_tiet (
  id uuid primary key,
  nong_trai_id uuid not null references du_lieu.nong_trai(id),
  khu_vuc_id uuid not null references du_lieu.dong_chan_tha(id),
  ten_hien_thi text not null,
  loai_khu_vuc text not null,
  mo_ta text,
  trang_thai text not null default 'dang_theo_doi',
  dien_tich_ha numeric(12,3) not null default 0,
  dien_tich_kha_dung_ha numeric(12,3) not null default 0,
  chu_vi_m numeric(12,1) not null default 0,
  tam_lat numeric(10,6),
  tam_lng numeric(10,6),
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create table if not exists du_lieu.nhat_ky_nong_duoc_khu_vuc (
  id uuid primary key,
  khu_vuc_chi_tiet_id uuid not null references du_lieu.khu_vuc_chi_tiet(id),
  ngay_ap_dung date not null,
  gio_bat_dau time not null,
  gio_ket_thuc time not null,
  san_pham text not null,
  thiet_bi text not null,
  lieu_luong text not null,
  dien_tich_ha numeric(12,2) not null default 0,
  thoi_gian_cach_ly text,
  loai_cay_trong text,
  toc_do_gio_km_h numeric(8,2),
  huong_gio text,
  nhiet_do_c numeric(6,2),
  do_am_pct numeric(5,2),
  nguoi_van_hanh text,
  nguoi_giam_sat text,
  doi_tuong_ap_dung text,
  ghi_chu text
);

create table if not exists du_lieu.lich_su_ghi_chu_khu_vuc (
  id uuid primary key,
  khu_vuc_chi_tiet_id uuid not null references du_lieu.khu_vuc_chi_tiet(id),
  loai_ban_ghi text not null,
  thoi_diem timestamptz not null default now(),
  noi_dung text not null,
  nguoi_tao text not null,
  tep_dinh_kem text
);
