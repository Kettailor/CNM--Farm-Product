-- Hợp nhất dùng 1 schema duy nhất: du_lieu
-- Nguồn legacy: farm.*
-- Đích chuẩn: du_lieu.* (tên tiếng Việt không dấu)

create schema if not exists du_lieu;
create extension if not exists pgcrypto;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT *
    FROM (VALUES
      ('farms','nong_trai_ht'),('farm_users','nguoi_dung_nong_trai'),('device_gateways','cong_thiet_bi'),('sensors','cam_bien'),('cameras','camera_giam_sat'),
      ('paddocks','dong_chan_tha'),('fields','thua_ruong'),('fencing_assets','tai_san_hang_rao'),('energizers','bo_kich_hang_rao'),('grazing_plans','ke_hoach_chan_tha'),
      ('grazing_plan_items','chi_tiet_ke_hoach_chan_tha'),('animal_groups','nhom_vat_nuoi'),('mobs','dan_vat_nuoi'),('animals','vat_nuoi'),('animal_weights','can_nang_vat_nuoi'),
      ('animal_locations','vi_tri_vat_nuoi'),('animal_events','su_kien_vat_nuoi'),('health_treatments','dieu_tri_suc_khoe'),('animal_feed_logs','nhat_ky_cho_an'),('animal_counts','dem_so_vat_nuoi'),
      ('animal_count_details','chi_tiet_dem_vat_nuoi'),('weather_stations','tram_thoi_tiet'),('rainfall_measurements','do_luong_mua'),('soil_sites','diem_do_dat'),('soil_measurements','do_dat'),
      ('air_quality_sites','diem_do_khong_khi'),('air_quality_measurements','do_khong_khi'),('water_assets','tai_san_nuoc'),('water_measurements','do_nuoc'),('storage_units','kho_luu_tru'),
      ('storage_measurements','do_luu_tru'),('vehicles','phuong_tien'),('vehicle_trip_logs','nhat_ky_chuyen_di'),('vehicle_counts','dem_phuong_tien'),('energy_assets','tai_san_nang_luong'),
      ('energy_measurements','do_nang_luong'),('chemical_products','san_pham_hoa_chat'),('spray_operations','phun_xit'),('spray_condition_logs','nhat_ky_dieu_kien_phun'),
      ('chemical_usage_logs','nhat_ky_su_dung_hoa_chat'),('surveillance_zones','vung_giam_sat'),('surveillance_events','su_kien_giam_sat'),('map_layers','lop_ban_do'),('map_features','doi_tuong_ban_do'),
      ('alerts','canh_bao'),('alert_rules','quy_tac_canh_bao'),('notifications','thong_bao'),('tasks','nhiem_vu'),('task_assignments','phan_cong_nhiem_vu'),('work_plans','ke_hoach_cong_viec'),
      ('documents','tai_lieu'),('orchard_blocks','lo_vuon'),('orchard_observations','quan_sat_vuon'),('feed_lots','kho_thuc_an'),('traceability_lots','lo_truy_xuat'),('traceability_events','su_kien_truy_xuat'),
      ('product_catalog','danh_muc_san_pham'),('app_settings','cai_dat_ung_dung')
    ) AS t(old_table, new_table)
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS du_lieu.%I (LIKE farm.%I INCLUDING ALL)', r.new_table, r.old_table);
    EXECUTE format('TRUNCATE TABLE du_lieu.%I RESTART IDENTITY CASCADE', r.new_table);
    EXECUTE format('INSERT INTO du_lieu.%I SELECT * FROM farm.%I', r.new_table, r.old_table);
  END LOOP;
END $$;

-- Bổ sung các bảng lõi app hiện tại (onboarding flow) nếu thiếu
create table if not exists du_lieu.chu_so_huu (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.nong_trai (
  id uuid primary key,
  owner_id uuid not null references du_lieu.chu_so_huu(id) on delete cascade,
  name text not null,
  farm_area_hectare numeric,
  special_factors text,
  other_activity text,
  annual_rainfall numeric,
  carrying_capacity numeric,
  spring_start text,
  created_at timestamptz not null default now()
);

create table if not exists du_lieu.vi_tri_nong_trai (
  farm_id uuid primary key references du_lieu.nong_trai(id) on delete cascade,
  location_name text,
  maps_link text,
  latitude numeric not null,
  longitude numeric not null
);

create table if not exists du_lieu.chan_nuoi_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  livestock_name text not null,
  quantity numeric not null default 0
);

create table if not exists du_lieu.cay_trong_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  crop_name text not null
);

create table if not exists du_lieu.tai_nguyen_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  resource_name text not null
);

create table if not exists du_lieu.nguon_biet_den_nong_trai (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
  channel_name text not null,
  other_note text
);

-- Đồng bộ dữ liệu lõi từ bộ dữ liệu đã hợp nhất
insert into du_lieu.chu_so_huu (id, full_name, email, password_hash, created_at)
select distinct on (lower(trim(email)))
  id,
  coalesce(nullif(trim(full_name), ''), 'Chu so huu'),
  lower(trim(email)),
  md5('12345678'),
  coalesce(created_at, now())
from du_lieu.nguoi_dung_nong_trai
where email is not null and trim(email) <> ''
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;

with owner_pick as (
  select distinct on (farm_id)
    farm_id,
    id as owner_id
  from du_lieu.nguoi_dung_nong_trai
  where email is not null and trim(email) <> ''
  order by farm_id, created_at nulls last
)
insert into du_lieu.nong_trai (id, owner_id, name, special_factors, created_at)
select f.id, op.owner_id, coalesce(nullif(trim(f.name), ''), 'Nong trai'), f.description, coalesce(f.created_at, now())
from du_lieu.nong_trai_ht f
join owner_pick op on op.farm_id = f.id
on conflict (id) do update set owner_id = excluded.owner_id, name = excluded.name, special_factors = excluded.special_factors;

insert into du_lieu.vi_tri_nong_trai (farm_id, location_name, latitude, longitude)
select f.id,
  coalesce(nullif(trim(f.city), ''), nullif(trim(f.state), ''), nullif(trim(f.country), ''), 'Vi tri nong trai'),
  coalesce(f.latitude, 0), coalesce(f.longitude, 0)
from du_lieu.nong_trai_ht f
join du_lieu.nong_trai n on n.id = f.id
on conflict (farm_id) do update set location_name = excluded.location_name, latitude = excluded.latitude, longitude = excluded.longitude;

insert into du_lieu.chan_nuoi_nong_trai (farm_id, livestock_name, quantity)
select farm_id, coalesce(species::text, 'khac'), count(*)::numeric
from du_lieu.vat_nuoi
where farm_id in (select id from du_lieu.nong_trai)
group by farm_id, species
on conflict do nothing;

insert into du_lieu.cay_trong_nong_trai (farm_id, crop_name)
select distinct farm_id, trim(crop_type)
from du_lieu.thua_ruong
where crop_type is not null and trim(crop_type) <> '' and farm_id in (select id from du_lieu.nong_trai)
on conflict do nothing;

insert into du_lieu.tai_nguyen_nong_trai (farm_id, resource_name)
select distinct farm_id, trim(layer_type)
from du_lieu.lop_ban_do
where layer_type is not null and trim(layer_type) <> '' and farm_id in (select id from du_lieu.nong_trai)
on conflict do nothing;

insert into du_lieu.nguon_biet_den_nong_trai (farm_id, channel_name, other_note)
select id, 'du_lieu_cu_farmhub', 'Tu dong tao khi khong co nguon gioi thieu'
from du_lieu.nong_trai n
where not exists (select 1 from du_lieu.nguon_biet_den_nong_trai nb where nb.farm_id = n.id);

-- View chuẩn trong cùng schema du_lieu
drop view if exists du_lieu.v_tong_hop_vat_nuoi;
create view du_lieu.v_tong_hop_vat_nuoi as select * from farm.v_livestock_dashboard;

drop view if exists du_lieu.v_ton_kho_cam_bien;
create view du_lieu.v_ton_kho_cam_bien as select * from farm.v_sensor_inventory;

drop view if exists du_lieu.v_chuoi_truy_xuat;
create view du_lieu.v_chuoi_truy_xuat as select * from farm.v_traceability_chain;

