-- Farmdeck full platform schema (PostgreSQL)
create schema if not exists core;
create schema if not exists geo;
create schema if not exists iot;
create schema if not exists ops;
create schema if not exists agronomy;
create extension if not exists pgcrypto;

-- Identity & tenancy
create table if not exists core.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text,
  created_at timestamptz not null default now()
);

create table if not exists core.users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references core.organizations(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists core.farms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  owner_user_id uuid not null references core.users(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists core.onboarding_profiles (
  farm_id uuid primary key references core.farms(id) on delete cascade,
  location_name text,
  maps_link text,
  latitude numeric not null,
  longitude numeric not null,
  special_factors text,
  other_activity text,
  annual_rainfall numeric,
  carrying_capacity numeric,
  spring_start text,
  referral_other_note text,
  completed_at timestamptz
);

-- Geospatial structure
create table if not exists geo.zones (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references core.farms(id) on delete cascade,
  zone_type text not null, -- paddock, orchard, block, boundary
  name text not null,
  area_ha numeric,
  geometry_geojson jsonb,
  created_at timestamptz not null default now()
);

-- Production catalog + selections
create table if not exists agronomy.production_types (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- livestock, crop, resource
  code text not null unique,
  display_name text not null
);

create table if not exists agronomy.farm_production (
  farm_id uuid not null references core.farms(id) on delete cascade,
  production_type_id uuid not null references agronomy.production_types(id),
  quantity numeric,
  unit text,
  primary key (farm_id, production_type_id)
);

create table if not exists agronomy.referral_channels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null
);

create table if not exists agronomy.farm_referrals (
  farm_id uuid not null references core.farms(id) on delete cascade,
  referral_channel_id uuid not null references agronomy.referral_channels(id),
  note text,
  primary key (farm_id, referral_channel_id)
);

-- IoT devices (supports weather, water, pump, fence, fuel, soil, energy, microclimate...)
create table if not exists iot.device_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  module_name text not null
);

create table if not exists iot.devices (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references core.farms(id) on delete cascade,
  zone_id uuid references geo.zones(id) on delete set null,
  device_type_id uuid not null references iot.device_types(id),
  name text not null,
  serial_number text,
  status text not null default 'active',
  installed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists iot.telemetry_events (
  id bigserial primary key,
  device_id uuid not null references iot.devices(id) on delete cascade,
  captured_at timestamptz not null,
  metric_code text not null,
  metric_value numeric,
  metric_unit text,
  payload jsonb
);
create index if not exists idx_telemetry_device_time on iot.telemetry_events(device_id, captured_at desc);

-- Operations: tasks, alerts, compliance, activities
create table if not exists ops.tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references core.farms(id) on delete cascade,
  zone_id uuid references geo.zones(id) on delete set null,
  title text not null,
  task_type text not null,
  due_at timestamptz,
  status text not null default 'open',
  assigned_user_id uuid references core.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists ops.alerts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references core.farms(id) on delete cascade,
  source_type text not null, -- telemetry, satellite, rule-engine
  source_id text,
  severity text not null,
  title text not null,
  details text,
  acknowledged_by uuid references core.users(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists ops.chemical_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references core.farms(id) on delete cascade,
  zone_id uuid references geo.zones(id) on delete set null,
  product_name text not null,
  active_ingredient text,
  dose numeric,
  dose_unit text,
  applied_at timestamptz not null,
  operator_user_id uuid references core.users(id) on delete set null,
  notes text
);

-- Satellite outputs: pasture, weeds, yield estimation
create table if not exists agronomy.satellite_observations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references core.farms(id) on delete cascade,
  zone_id uuid references geo.zones(id) on delete set null,
  observed_at date not null,
  product_type text not null, -- pasture, weed, yield
  index_name text,
  index_value numeric,
  raster_url text,
  metadata jsonb not null default '{}'::jsonb
);

