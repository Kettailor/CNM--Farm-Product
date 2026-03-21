-- PostgreSQL schema for a smart farm management and traceability system.
-- Covers livestock, paddocks, grazing, water, weather, storage, soil,
-- vehicles, fencing, energy, alerts, chemicals, surveillance, air quality,
-- animal counting, BLE tracking, and end-to-end product traceability.

create extension if not exists pgcrypto;

create schema if not exists farm;
set search_path to farm;

-- =========================
-- ENUMS
-- =========================
create type asset_status as enum ('draft', 'active', 'inactive', 'maintenance', 'retired');
create type severity_level as enum ('info', 'warning', 'critical');
create type alert_status as enum ('open', 'acknowledged', 'resolved', 'disabled');
create type sensor_source as enum ('manual', 'iot', 'camera', 'gateway', 'ble', 'system', 'api');
create type animal_sex as enum ('male', 'female', 'unknown');
create type animal_stage as enum ('newborn', 'juvenile', 'adult', 'breeding', 'fattening', 'retired', 'sold', 'deceased');
create type species_type as enum ('cattle', 'sheep', 'goat', 'pig', 'poultry', 'horse', 'buffalo', 'other');
create type animal_event_type as enum (
  'birth', 'weight', 'health', 'vaccination', 'treatment', 'breeding', 'pregnancy_check',
  'calving', 'movement', 'grazing', 'counting', 'ble_location', 'sale', 'purchase', 'death', 'note'
);
create type plan_status as enum ('planned', 'active', 'completed', 'cancelled');
create type storage_zone_type as enum ('chiller', 'fridge', 'freezer', 'meat_locker', 'dry_storage', 'warehouse');
create type vehicle_type as enum ('ute', 'truck', 'tractor', 'car', 'motorbike', 'atv', 'trailer', 'other');
create type energy_source_type as enum ('grid', 'solar', 'generator', 'battery', 'mixed');
create type chemical_category as enum ('agricultural', 'livestock', 'veterinary', 'cleaning', 'fuel', 'other');
create type traceability_stage as enum (
  'farm_input', 'breeding', 'raising', 'feeding', 'treatment', 'harvest', 'processing', 'packaging', 'storage', 'transport', 'sale'
);
create type document_type as enum ('certificate', 'invoice', 'delivery_note', 'inspection', 'lab_result', 'policy', 'image', 'other');
create type counting_method as enum ('video', 'ble', 'manual');
create type boundary_type as enum ('fence', 'gate', 'corridor', 'paddock_border');

-- =========================
-- CORE MASTER DATA
-- =========================
create table farms (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) not null unique,
  name varchar(255) not null,
  description text,
  timezone varchar(100) not null default 'UTC',
  latitude numeric(9,6),
  longitude numeric(9,6),
  address_line1 varchar(255),
  address_line2 varchar(255),
  city varchar(120),
  state varchar(120),
  country varchar(120),
  postal_code varchar(20),
  status asset_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table farm_users (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  full_name varchar(255) not null,
  email varchar(255) unique,
  phone varchar(40),
  role_name varchar(120) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table device_gateways (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  gateway_code varchar(50) not null unique,
  name varchar(255) not null,
  manufacturer varchar(255),
  model varchar(255),
  firmware_version varchar(50),
  ip_address inet,
  installed_at timestamptz,
  last_seen_at timestamptz,
  status asset_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb
);

create table sensors (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  gateway_id uuid references device_gateways(id) on delete set null,
  sensor_code varchar(50) not null unique,
  name varchar(255) not null,
  sensor_type varchar(120) not null,
  source sensor_source not null,
  unit varchar(30),
  manufacturer varchar(255),
  model varchar(255),
  installed_at timestamptz,
  last_seen_at timestamptz,
  status asset_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb
);

create table cameras (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  camera_code varchar(50) not null unique,
  name varchar(255) not null,
  stream_url text,
  location_description text,
  resolution varchar(50),
  installed_at timestamptz,
  status asset_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb
);

-- =========================
-- LAND / PADDOCKS / FENCING / GRAZING
-- =========================
create table paddocks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  paddock_code varchar(50) not null unique,
  name varchar(255) not null,
  area_ha numeric(10,2),
  carrying_capacity integer,
  crop_type varchar(120),
  grazing_status varchar(50),
  rest_days_target integer,
  water_access boolean not null default false,
  notes text,
  boundary_geojson jsonb,
  status asset_status not null default 'active',
  created_at timestamptz not null default now()
);

create table fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  field_code varchar(50) not null unique,
  name varchar(255) not null,
  area_ha numeric(10,2),
  crop_type varchar(120),
  planting_date date,
  expected_harvest_date date,
  soil_type varchar(120),
  notes text,
  boundary_geojson jsonb,
  status asset_status not null default 'active'
);

create table fencing_assets (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  asset_code varchar(50) not null unique,
  name varchar(255) not null,
  boundary_type boundary_type not null,
  paddock_id uuid references paddocks(id) on delete set null,
  length_m numeric(12,2),
  energizer_id uuid,
  sensor_count integer not null default 0,
  installed_at date,
  condition_score integer,
  status asset_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb
);

create table energizers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  energizer_code varchar(50) not null unique,
  name varchar(255) not null,
  output_voltage numeric(10,2),
  power_source energy_source_type,
  last_service_date date,
  status asset_status not null default 'active'
);

alter table fencing_assets
  add constraint fk_fencing_energizer
  foreign key (energizer_id) references energizers(id) on delete set null;

create table grazing_plans (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  plan_name varchar(255) not null,
  season_name varchar(120),
  start_date date not null,
  end_date date,
  status plan_status not null default 'planned',
  priority integer not null default 1,
  notes text,
  created_by uuid references farm_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table grazing_plan_items (
  id uuid primary key default gen_random_uuid(),
  grazing_plan_id uuid not null references grazing_plans(id) on delete cascade,
  paddock_id uuid not null references paddocks(id) on delete restrict,
  mob_id uuid,
  planned_start timestamptz not null,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  rest_days integer,
  occupancy_days numeric(8,2),
  target_dry_matter_kg numeric(14,2),
  actual_dry_matter_kg numeric(14,2),
  notes text
);

-- =========================
-- LIVESTOCK / TRACKING / COUNTING
-- =========================
create table animal_groups (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  group_code varchar(50) not null unique,
  name varchar(255) not null,
  species species_type not null,
  breed varchar(120),
  production_purpose varchar(120),
  status asset_status not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table mobs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  mob_code varchar(50) not null unique,
  name varchar(255) not null,
  group_id uuid references animal_groups(id) on delete set null,
  current_paddock_id uuid references paddocks(id) on delete set null,
  headcount integer not null default 0,
  status asset_status not null default 'active',
  notes text
);

alter table grazing_plan_items
  add constraint fk_grazing_plan_mob
  foreign key (mob_id) references mobs(id) on delete set null;

create table animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  animal_code varchar(50) not null unique,
  visual_tag varchar(50),
  eid_tag varchar(50),
  nfc_tag varchar(50),
  ble_tag varchar(50),
  species species_type not null,
  breed varchar(120),
  sex animal_sex not null default 'unknown',
  birth_date date,
  stage animal_stage not null default 'juvenile',
  sire_id uuid references animals(id) on delete set null,
  dam_id uuid references animals(id) on delete set null,
  group_id uuid references animal_groups(id) on delete set null,
  mob_id uuid references mobs(id) on delete set null,
  current_paddock_id uuid references paddocks(id) on delete set null,
  purchase_date date,
  disposal_date date,
  lifecycle_status asset_status not null default 'active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table animal_weights (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(10,2) not null,
  source sensor_source not null default 'manual',
  sensor_id uuid references sensors(id) on delete set null,
  notes text
);

create table animal_locations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id) on delete cascade,
  recorded_at timestamptz not null,
  paddock_id uuid references paddocks(id) on delete set null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  source counting_method not null,
  gateway_id uuid references device_gateways(id) on delete set null,
  signal_strength integer,
  battery_level numeric(5,2),
  confidence_score numeric(5,2),
  raw_payload jsonb
);

create table animal_counts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  counted_at timestamptz not null,
  method counting_method not null,
  camera_id uuid references cameras(id) on delete set null,
  sensor_id uuid references sensors(id) on delete set null,
  gateway_id uuid references device_gateways(id) on delete set null,
  paddock_id uuid references paddocks(id) on delete set null,
  group_id uuid references animal_groups(id) on delete set null,
  mob_id uuid references mobs(id) on delete set null,
  total_count integer not null,
  in_count integer,
  out_count integer,
  difference_count integer,
  tag_count integer,
  duplicate_count integer,
  confidence_score numeric(5,2),
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table animal_count_details (
  id uuid primary key default gen_random_uuid(),
  animal_count_id uuid not null references animal_counts(id) on delete cascade,
  animal_id uuid references animals(id) on delete set null,
  tag_code varchar(50),
  counted_at timestamptz not null,
  direction varchar(20),
  confidence_score numeric(5,2),
  raw_payload jsonb
);

create table animal_events (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id) on delete cascade,
  event_type animal_event_type not null,
  event_time timestamptz not null,
  paddock_id uuid references paddocks(id) on delete set null,
  related_count_id uuid references animal_counts(id) on delete set null,
  user_id uuid references farm_users(id) on delete set null,
  notes text,
  event_data jsonb not null default '{}'::jsonb
);

-- =========================
-- WATER / RAINFALL / AIR / SOIL
-- =========================
create table water_assets (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  asset_code varchar(50) not null unique,
  name varchar(255) not null,
  asset_type varchar(50) not null,
  capacity_liters numeric(14,2),
  current_level_percent numeric(5,2),
  latitude numeric(9,6),
  longitude numeric(9,6),
  linked_paddock_id uuid references paddocks(id) on delete set null,
  linked_field_id uuid references fields(id) on delete set null,
  status asset_status not null default 'active',
  notes text
);

create table water_measurements (
  id uuid primary key default gen_random_uuid(),
  water_asset_id uuid not null references water_assets(id) on delete cascade,
  sensor_id uuid references sensors(id) on delete set null,
  measured_at timestamptz not null,
  water_level_percent numeric(5,2),
  volume_liters numeric(14,2),
  flow_rate_lpm numeric(12,2),
  pressure_kpa numeric(12,2),
  temperature_c numeric(6,2),
  ph numeric(4,2),
  salinity_ds_m numeric(8,2),
  turbidity_ntu numeric(10,2),
  quality_status severity_level,
  raw_payload jsonb
);

create table weather_stations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  station_code varchar(50) not null unique,
  name varchar(255) not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  elevation_m numeric(8,2),
  status asset_status not null default 'active'
);

create table rainfall_measurements (
  id uuid primary key default gen_random_uuid(),
  weather_station_id uuid not null references weather_stations(id) on delete cascade,
  sensor_id uuid references sensors(id) on delete set null,
  measured_at timestamptz not null,
  rainfall_mm numeric(10,2) not null,
  rolling_day_mm numeric(10,2),
  rolling_week_mm numeric(10,2),
  rolling_month_mm numeric(10,2),
  rolling_year_mm numeric(10,2),
  notes text
);

create table soil_sites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  site_code varchar(50) not null unique,
  name varchar(255) not null,
  paddock_id uuid references paddocks(id) on delete set null,
  field_id uuid references fields(id) on delete set null,
  depth_cm numeric(8,2),
  latitude numeric(9,6),
  longitude numeric(9,6),
  notes text,
  status asset_status not null default 'active'
);

create table soil_measurements (
  id uuid primary key default gen_random_uuid(),
  soil_site_id uuid not null references soil_sites(id) on delete cascade,
  sensor_id uuid references sensors(id) on delete set null,
  measured_at timestamptz not null,
  moisture_percent numeric(6,2),
  temperature_c numeric(6,2),
  salinity_ds_m numeric(8,2),
  ph numeric(4,2),
  ec_us_cm numeric(10,2),
  nitrogen_ppm numeric(10,2),
  phosphorus_ppm numeric(10,2),
  potassium_ppm numeric(10,2),
  raw_payload jsonb
);

create table air_quality_sites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  site_code varchar(50) not null unique,
  name varchar(255) not null,
  location_description text,
  linked_paddock_id uuid references paddocks(id) on delete set null,
  linked_storage_id uuid,
  status asset_status not null default 'active'
);

create table air_quality_measurements (
  id uuid primary key default gen_random_uuid(),
  air_quality_site_id uuid not null references air_quality_sites(id) on delete cascade,
  sensor_id uuid references sensors(id) on delete set null,
  measured_at timestamptz not null,
  methane_ppm numeric(10,2),
  ammonia_ppm numeric(10,2),
  carbon_dioxide_ppm numeric(10,2),
  pm10_ug_m3 numeric(10,2),
  humidity_percent numeric(6,2),
  temperature_c numeric(6,2),
  raw_payload jsonb
);

-- =========================
-- COLD STORAGE / CHEMICALS / ENERGY
-- =========================
create table storage_units (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  storage_code varchar(50) not null unique,
  name varchar(255) not null,
  zone_type storage_zone_type not null,
  capacity_kg numeric(14,2),
  target_temp_min_c numeric(6,2),
  target_temp_max_c numeric(6,2),
  target_humidity_min numeric(6,2),
  target_humidity_max numeric(6,2),
  condition_status severity_level,
  power_status severity_level,
  last_service_at date,
  status asset_status not null default 'active',
  notes text
);

alter table air_quality_sites
  add constraint fk_air_quality_storage
  foreign key (linked_storage_id) references storage_units(id) on delete set null;

create table storage_measurements (
  id uuid primary key default gen_random_uuid(),
  storage_unit_id uuid not null references storage_units(id) on delete cascade,
  sensor_id uuid references sensors(id) on delete set null,
  measured_at timestamptz not null,
  temperature_c numeric(6,2),
  humidity_percent numeric(6,2),
  door_open boolean,
  power_voltage numeric(10,2),
  current_amp numeric(10,2),
  fault_code varchar(50),
  severity severity_level,
  raw_payload jsonb
);

create table chemical_products (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  product_code varchar(50) not null unique,
  name varchar(255) not null,
  category chemical_category not null,
  subcategory varchar(120),
  active_ingredient varchar(255),
  concentration varchar(100),
  manufacturer varchar(255),
  unit_of_measure varchar(30) not null,
  withholding_period_days integer,
  expiry_date date,
  stock_quantity numeric(14,2) not null default 0,
  reorder_level numeric(14,2),
  storage_location varchar(255),
  safety_notes text,
  status asset_status not null default 'active'
);

create table chemical_usage_logs (
  id uuid primary key default gen_random_uuid(),
  chemical_product_id uuid not null references chemical_products(id) on delete cascade,
  used_at timestamptz not null,
  quantity numeric(14,2) not null,
  unit_of_measure varchar(30) not null,
  target_type varchar(50) not null,
  target_animal_id uuid references animals(id) on delete set null,
  target_paddock_id uuid references paddocks(id) on delete set null,
  target_field_id uuid references fields(id) on delete set null,
  applied_by uuid references farm_users(id) on delete set null,
  purpose text,
  notes text
);

create table energy_assets (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  asset_code varchar(50) not null unique,
  name varchar(255) not null,
  asset_type varchar(50) not null,
  source_type energy_source_type not null,
  parent_asset_id uuid references energy_assets(id) on delete set null,
  phase varchar(30),
  rated_capacity_kw numeric(10,2),
  location_description text,
  status asset_status not null default 'active'
);

create table energy_measurements (
  id uuid primary key default gen_random_uuid(),
  energy_asset_id uuid not null references energy_assets(id) on delete cascade,
  sensor_id uuid references sensors(id) on delete set null,
  measured_at timestamptz not null,
  power_kw numeric(12,3),
  energy_kwh numeric(14,3),
  voltage numeric(10,2),
  current_amp numeric(10,2),
  power_factor numeric(5,3),
  daily_kwh numeric(14,3),
  weekly_kwh numeric(14,3),
  monthly_kwh numeric(14,3),
  yearly_kwh numeric(14,3),
  raw_payload jsonb
);

-- =========================
-- VEHICLES / SURVEILLANCE
-- =========================
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  vehicle_code varchar(50) not null unique,
  name varchar(255) not null,
  vehicle_type vehicle_type not null,
  plate_number varchar(30),
  vin varchar(60),
  manufacturer varchar(255),
  model varchar(255),
  year_manufactured integer,
  default_driver_id uuid references farm_users(id) on delete set null,
  telematics_device_id uuid references sensors(id) on delete set null,
  status asset_status not null default 'active',
  notes text
);

create table vehicle_trip_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  origin varchar(255),
  destination varchar(255),
  purpose text,
  distance_km numeric(12,2),
  engine_hours numeric(12,2),
  fuel_used_liters numeric(12,2),
  related_traceability_lot_id uuid,
  driver_id uuid references farm_users(id) on delete set null,
  notes text
);

create table vehicle_counts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  counted_at timestamptz not null,
  camera_id uuid references cameras(id) on delete set null,
  sensor_id uuid references sensors(id) on delete set null,
  location_name varchar(255),
  total_count integer not null,
  ute_count integer,
  truck_count integer,
  tractor_count integer,
  car_count integer,
  large_vehicle_count integer,
  four_wd_count integer,
  irrigation_count integer,
  confidence_score numeric(5,2),
  notes text
);

create table surveillance_zones (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  zone_code varchar(50) not null unique,
  name varchar(255) not null,
  location_description text,
  camera_count integer not null default 0,
  feed_count integer not null default 0,
  detection_enabled boolean not null default true,
  thermal_enabled boolean not null default false,
  status asset_status not null default 'active'
);

create table surveillance_events (
  id uuid primary key default gen_random_uuid(),
  surveillance_zone_id uuid not null references surveillance_zones(id) on delete cascade,
  camera_id uuid references cameras(id) on delete set null,
  event_time timestamptz not null,
  event_type varchar(80) not null,
  object_type varchar(80),
  object_count integer,
  confidence_score numeric(5,2),
  media_url text,
  metadata jsonb not null default '{}'::jsonb
);

-- =========================
-- ALERTS / NOTIFICATIONS / DOCUMENTS
-- =========================
create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  rule_name varchar(255) not null,
  source_type varchar(80) not null,
  source_id uuid,
  metric_name varchar(120) not null,
  operator varchar(20) not null,
  threshold_value numeric(14,4),
  severity severity_level not null,
  is_enabled boolean not null default true,
  notification_channels jsonb not null default '["dashboard"]'::jsonb,
  created_at timestamptz not null default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  alert_rule_id uuid references alert_rules(id) on delete set null,
  source_type varchar(80) not null,
  source_id uuid,
  alert_time timestamptz not null,
  title varchar(255) not null,
  message text,
  severity severity_level not null,
  status alert_status not null default 'open',
  acknowledged_by uuid references farm_users(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references alerts(id) on delete cascade,
  recipient_user_id uuid references farm_users(id) on delete set null,
  channel varchar(50) not null,
  sent_at timestamptz,
  delivery_status varchar(30) not null default 'pending',
  external_reference varchar(255)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  document_type document_type not null,
  title varchar(255) not null,
  file_url text not null,
  issued_at date,
  expires_at date,
  linked_entity_type varchar(50),
  linked_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- TRACEABILITY / INVENTORY / SALES
-- =========================
create table product_catalog (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  sku varchar(50) not null unique,
  product_name varchar(255) not null,
  product_type varchar(80) not null,
  unit_of_measure varchar(30) not null,
  is_livestock_based boolean not null default false,
  is_crop_based boolean not null default false,
  status asset_status not null default 'active'
);

create table traceability_lots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  lot_code varchar(50) not null unique,
  product_id uuid not null references product_catalog(id) on delete restrict,
  source_animal_id uuid references animals(id) on delete set null,
  source_group_id uuid references animal_groups(id) on delete set null,
  source_field_id uuid references fields(id) on delete set null,
  source_paddock_id uuid references paddocks(id) on delete set null,
  parent_lot_id uuid references traceability_lots(id) on delete set null,
  quantity numeric(14,2) not null,
  unit_of_measure varchar(30) not null,
  stage traceability_stage not null,
  produced_at timestamptz not null,
  expiry_date date,
  qr_code varchar(255),
  blockchain_hash varchar(255),
  status asset_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb
);

alter table vehicle_trip_logs
  add constraint fk_trip_trace_lot
  foreign key (related_traceability_lot_id) references traceability_lots(id) on delete set null;

create table traceability_events (
  id uuid primary key default gen_random_uuid(),
  traceability_lot_id uuid not null references traceability_lots(id) on delete cascade,
  event_time timestamptz not null,
  stage traceability_stage not null,
  event_type varchar(80) not null,
  source_entity_type varchar(50),
  source_entity_id uuid,
  destination_entity_type varchar(50),
  destination_entity_id uuid,
  quantity numeric(14,2),
  unit_of_measure varchar(30),
  verified_by uuid references farm_users(id) on delete set null,
  notes text,
  payload jsonb not null default '{}'::jsonb
);

create table feed_lots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  lot_code varchar(50) not null unique,
  feed_name varchar(255) not null,
  supplier_name varchar(255),
  quantity numeric(14,2) not null,
  unit_of_measure varchar(30) not null,
  received_at timestamptz not null,
  expiry_date date,
  storage_unit_id uuid references storage_units(id) on delete set null,
  quality_status severity_level,
  metadata jsonb not null default '{}'::jsonb
);

create table animal_feed_logs (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animals(id) on delete cascade,
  mob_id uuid references mobs(id) on delete cascade,
  paddock_id uuid references paddocks(id) on delete set null,
  feed_lot_id uuid not null references feed_lots(id) on delete restrict,
  fed_at timestamptz not null,
  quantity numeric(14,2) not null,
  unit_of_measure varchar(30) not null,
  notes text,
  check ((animal_id is not null) or (mob_id is not null))
);

create table health_treatments (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id) on delete cascade,
  chemical_product_id uuid references chemical_products(id) on delete set null,
  treatment_time timestamptz not null,
  treatment_type varchar(120) not null,
  diagnosis text,
  dosage varchar(120),
  veterinarian_name varchar(255),
  withholding_end_date date,
  notes text
);


-- =========================
-- FARM MAP / PLANNER / TASKS / SPRAYING / ORCHARD / SETTINGS
-- =========================
create table map_layers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  layer_code varchar(50) not null unique,
  layer_name varchar(255) not null,
  layer_type varchar(50) not null, -- paddock, field, water, fence, road, sensor, custom
  is_enabled boolean not null default true,
  style_json jsonb not null default '{}'::jsonb,
  display_order integer not null default 100,
  created_by uuid references farm_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table map_features (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  layer_id uuid not null references map_layers(id) on delete cascade,
  feature_code varchar(50) not null unique,
  feature_name varchar(255),
  geometry_geojson jsonb not null,
  centroid_latitude numeric(9,6),
  centroid_longitude numeric(9,6),
  linked_entity_type varchar(50),
  linked_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table spray_condition_logs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  field_id uuid references fields(id) on delete set null,
  paddock_id uuid references paddocks(id) on delete set null,
  weather_station_id uuid references weather_stations(id) on delete set null,
  measured_at timestamptz not null,
  wind_speed_kmh numeric(8,2),
  wind_direction_deg numeric(6,2),
  temperature_c numeric(6,2),
  humidity_percent numeric(6,2),
  rain_forecast_mm numeric(10,2),
  inversion_risk severity_level,
  spray_window_status varchar(30), -- good, caution, blocked
  notes text
);

create table spray_operations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  operation_code varchar(50) not null unique,
  field_id uuid references fields(id) on delete set null,
  paddock_id uuid references paddocks(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  operator_id uuid references farm_users(id) on delete set null,
  chemical_usage_log_id uuid references chemical_usage_logs(id) on delete set null,
  condition_log_id uuid references spray_condition_logs(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  area_ha numeric(10,2),
  water_volume_liters numeric(14,2),
  status plan_status not null default 'planned',
  notes text
);

create table orchard_blocks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  block_code varchar(50) not null unique,
  block_name varchar(255) not null,
  field_id uuid references fields(id) on delete set null,
  crop_variety varchar(120),
  planting_year integer,
  row_spacing_m numeric(8,2),
  tree_spacing_m numeric(8,2),
  total_rows integer,
  estimated_tree_count integer,
  irrigation_type varchar(80),
  status asset_status not null default 'active',
  notes text
);

create table orchard_observations (
  id uuid primary key default gen_random_uuid(),
  orchard_block_id uuid not null references orchard_blocks(id) on delete cascade,
  observed_at timestamptz not null,
  observer_id uuid references farm_users(id) on delete set null,
  phenology_stage varchar(80),
  pest_pressure_level severity_level,
  disease_pressure_level severity_level,
  canopy_health_score numeric(5,2),
  fruit_set_percent numeric(6,2),
  estimated_yield_kg numeric(14,2),
  notes text,
  payload jsonb not null default '{}'::jsonb
);

create table work_plans (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  plan_code varchar(50) not null unique,
  plan_name varchar(255) not null,
  start_date date not null,
  end_date date,
  status plan_status not null default 'planned',
  created_by uuid references farm_users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  work_plan_id uuid references work_plans(id) on delete set null,
  task_code varchar(50) not null unique,
  task_name varchar(255) not null,
  task_type varchar(80) not null,
  related_entity_type varchar(50),
  related_entity_id uuid,
  priority integer not null default 2,
  status plan_status not null default 'planned',
  due_at timestamptz,
  completed_at timestamptz,
  notes text
);

create table task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  assignee_user_id uuid not null references farm_users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  is_primary boolean not null default false,
  unique(task_id, assignee_user_id)
);

create table app_settings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  setting_key varchar(120) not null,
  setting_value jsonb not null default '{}'::jsonb,
  is_encrypted boolean not null default false,
  updated_by uuid references farm_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(farm_id, setting_key)
);
-- =========================
-- INDEXES
-- =========================
create index idx_sensors_farm_type on sensors(farm_id, sensor_type);
create index idx_animals_farm_species on animals(farm_id, species);
create index idx_animals_tags on animals(visual_tag, eid_tag, ble_tag);
create index idx_animal_locations_time on animal_locations(animal_id, recorded_at desc);
create index idx_animal_counts_time on animal_counts(farm_id, counted_at desc);
create index idx_water_measurements_time on water_measurements(water_asset_id, measured_at desc);
create index idx_rainfall_measurements_time on rainfall_measurements(weather_station_id, measured_at desc);
create index idx_soil_measurements_time on soil_measurements(soil_site_id, measured_at desc);
create index idx_air_quality_measurements_time on air_quality_measurements(air_quality_site_id, measured_at desc);
create index idx_storage_measurements_time on storage_measurements(storage_unit_id, measured_at desc);
create index idx_energy_measurements_time on energy_measurements(energy_asset_id, measured_at desc);
create index idx_vehicle_trip_logs_time on vehicle_trip_logs(vehicle_id, started_at desc);
create index idx_alerts_status_time on alerts(farm_id, status, alert_time desc);
create index idx_traceability_events_lot_time on traceability_events(traceability_lot_id, event_time desc);

-- =========================
-- ANALYTICAL VIEWS
-- =========================
create view v_livestock_dashboard as
select
  f.id as farm_id,
  count(a.id) as animals,
  count(distinct a.group_id) as groups,
  count(*) filter (where a.species = 'cattle') as cattle,
  count(*) filter (where a.species = 'sheep') as sheep,
  count(*) filter (where a.species = 'pig') as pigs,
  count(*) filter (where a.species = 'goat') as goats
from farms f
left join animals a on a.farm_id = f.id and a.lifecycle_status = 'active'
group by f.id;

create view v_sensor_inventory as
select
  f.id as farm_id,
  count(distinct s.id) as sensors,
  count(distinct c.id) as cameras,
  count(distinct g.id) as gateways
from farms f
left join sensors s on s.farm_id = f.id and s.status = 'active'
left join cameras c on c.farm_id = f.id and c.status = 'active'
left join device_gateways g on g.farm_id = f.id and g.status = 'active'
group by f.id;

create view v_traceability_chain as
select
  tl.id,
  tl.farm_id,
  tl.lot_code,
  pc.product_name,
  tl.stage,
  tl.quantity,
  tl.unit_of_measure,
  tl.produced_at,
  tl.qr_code,
  count(te.id) as event_count,
  max(te.event_time) as last_event_time
from traceability_lots tl
join product_catalog pc on pc.id = tl.product_id
left join traceability_events te on te.traceability_lot_id = tl.id
group by tl.id, pc.product_name;
