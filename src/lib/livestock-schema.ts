import { db } from "@/lib/db";

export const LIVESTOCK_GROUP_SCHEMA_SQL = `
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

create index if not exists idx_nhom_vat_nuoi_trang_trai_id on du_lieu.nhom_vat_nuoi(trang_trai_id);
create index if not exists idx_nhom_vat_nuoi_khu_vuc_id on du_lieu.nhom_vat_nuoi(khu_vuc_id);
create index if not exists idx_vat_nuoi_nhom_vat_nuoi_id on du_lieu.vat_nuoi(nhom_vat_nuoi_id);
create index if not exists idx_nhan_dien_nhom_vat_nuoi_id on du_lieu.nhan_dien_nhom_vat_nuoi(nhom_vat_nuoi_id);
`;

let ensurePromise: Promise<void> | null = null;

export async function ensureLivestockSchema() {
  if (!process.env.DATABASE_URL) return;
  ensurePromise ??= db.query(LIVESTOCK_GROUP_SCHEMA_SQL).then(() => undefined);
  return ensurePromise;
}
