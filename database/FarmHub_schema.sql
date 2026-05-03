-- =========================================================
-- AUDIT / LOG
-- =========================================================

create table if not exists nhat_ky_chinh_sua_khu_vuc (
  id bigserial primary key,
  khu_vuc_id uuid not null references khu_vuc(id) on delete cascade,
  nguoi_dung_id uuid references nguoi_dung(id) on delete set null,
  hanh_dong varchar(120) not null,
  du_lieu_cu jsonb not null default '{}'::jsonb,
  du_lieu_moi jsonb not null default '{}'::jsonb,
  ghi_luc_vao timestamptz not null default now()
);

create index if not exists idx_nhat_ky_chinh_sua_khu_vuc_khu_vuc_id on nhat_ky_chinh_sua_khu_vuc(khu_vuc_id);
create index if not exists idx_nhat_ky_chinh_sua_khu_vuc_ghi_luc_vao on nhat_ky_chinh_sua_khu_vuc(ghi_luc_vao desc);
