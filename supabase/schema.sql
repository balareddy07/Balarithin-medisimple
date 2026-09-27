-- MediSimple Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES (one per auth user)
-- ─────────────────────────────────────────
create table if not exists profiles (
  id                 uuid references auth.users on delete cascade primary key,
  name               text,
  age                integer check (age > 0 and age < 130),
  phone              text,
  preferred_language text default 'en',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────
-- FAMILY MEMBERS
-- ─────────────────────────────────────────
create table if not exists family_members (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade not null,
  name       text not null,
  age        integer check (age > 0 and age < 130),
  relation   text,
  created_at timestamptz default now()
);

create index if not exists family_members_user_id_idx on family_members(user_id);

-- ─────────────────────────────────────────
-- REPORTS (encrypted content stored)
-- ─────────────────────────────────────────
create table if not exists reports (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references profiles(id) on delete cascade not null,
  family_member_id uuid references family_members(id) on delete set null,
  patient_name     text,
  original_content text,    -- AES-GCM encrypted by client
  summary          text,    -- AES-GCM encrypted by client
  language         text default 'en',
  created_at       timestamptz default now()
);

create index if not exists reports_user_id_idx     on reports(user_id);
create index if not exists reports_created_at_idx  on reports(created_at desc);

-- ─────────────────────────────────────────
-- DOCTOR SHARES (encrypted links)
-- ─────────────────────────────────────────
create table if not exists doctor_shares (
  id              uuid primary key default uuid_generate_v4(),
  report_id       uuid references reports(id) on delete cascade not null,
  encrypted_token text not null unique,
  expires_at      timestamptz not null,
  accessed_at     timestamptz,
  created_at      timestamptz default now()
);

create index if not exists doctor_shares_token_idx on doctor_shares(encrypted_token);

-- ─────────────────────────────────────────
-- HOSPITALS (admin accounts)
-- ─────────────────────────────────────────
create table if not exists hospitals (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  email               text not null unique,
  country             text default 'IN',   -- 'IN' or 'US'
  subscription_status text default 'active',
  plan                text default 'Professional',
  razorpay_sub_id     text,               -- India billing
  stripe_sub_id       text,               -- USA billing
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- API USAGE LOG (for hospital billing)
-- ─────────────────────────────────────────
create table if not exists api_usage_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete set null,
  tokens_used integer default 0,
  created_at  timestamptz default now()
);

create index if not exists api_usage_log_created_idx on api_usage_log(created_at desc);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

-- Profiles: users see only their own
alter table profiles enable row level security;
create policy "Own profile only" on profiles
  for all using (auth.uid() = id);

-- Family members: users see only their own
alter table family_members enable row level security;
create policy "Own family members" on family_members
  for all using (auth.uid() = user_id);

-- Reports: users see only their own
alter table reports enable row level security;
create policy "Own reports" on reports
  for all using (auth.uid() = user_id);

-- Doctor shares: owner can create; anyone with token can read (handled in edge function)
alter table doctor_shares enable row level security;
create policy "Report owner can manage shares" on doctor_shares
  for all using (
    report_id in (select id from reports where user_id = auth.uid())
  );

-- Hospitals: hospital admins see only their own record
alter table hospitals enable row level security;
create policy "Hospital own record" on hospitals
  for select using (email = auth.email());

-- API usage: edge function inserts (service role), users read own
alter table api_usage_log enable row level security;
create policy "Own usage" on api_usage_log
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- HEALTH METRICS (extracted from every report)
-- ─────────────────────────────────────────
create table if not exists health_metrics (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade not null,
  report_id     uuid references reports(id) on delete cascade,
  name          text not null,
  value         text not null,
  unit          text,
  status        text default 'normal', -- normal|high|low|critical
  normal_range  text,
  recorded_date date default current_date,
  created_at    timestamptz default now()
);

create index if not exists health_metrics_user_id_idx on health_metrics(user_id);
create index if not exists health_metrics_name_idx    on health_metrics(name);

alter table health_metrics enable row level security;
create policy "Own health metrics" on health_metrics
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- MEDICATIONS (extracted from reports)
-- ─────────────────────────────────────────
create table if not exists medications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade not null,
  report_id       uuid references reports(id) on delete set null,
  name            text not null,
  dose            text,
  frequency       text,
  prescribed_date date,
  doctor_name     text,
  status          text default 'active', -- active|stopped
  created_at      timestamptz default now()
);

create index if not exists medications_user_id_idx on medications(user_id);

alter table medications enable row level security;
create policy "Own medications" on medications
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- CARDIAC RECORDS (angiogram / ECG findings)
-- ─────────────────────────────────────────
create table if not exists cardiac_records (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade not null,
  report_id     uuid references reports(id) on delete cascade,
  artery        text,
  finding_text  text not null,
  has_stent     boolean default false,
  recorded_date date default current_date,
  created_at    timestamptz default now()
);

create index if not exists cardiac_records_user_id_idx on cardiac_records(user_id);

alter table cardiac_records enable row level security;
create policy "Own cardiac records" on cardiac_records
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- PHARMACY ORDERS
-- ─────────────────────────────────────────
create table if not exists pharmacy_orders (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references profiles(id) on delete cascade not null,
  report_id      uuid references reports(id) on delete set null,
  pharmacy_name  text not null,
  medications    jsonb,
  payment_method text default 'cash',
  status         text default 'Sent',
  estimated_time text,
  notes          text,
  created_at     timestamptz default now()
);

create index if not exists pharmacy_orders_user_id_idx on pharmacy_orders(user_id);

alter table pharmacy_orders enable row level security;
create policy "Own pharmacy orders" on pharmacy_orders
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- FULL RECORD SHARES (doctor sees all history)
-- ─────────────────────────────────────────
create table if not exists full_record_shares (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade not null,
  encrypted_token text not null unique,
  expires_at      timestamptz not null,
  accessed_at     timestamptz,
  created_at      timestamptz default now()
);

create index if not exists full_record_shares_token_idx on full_record_shares(encrypted_token);

alter table full_record_shares enable row level security;
create policy "Own full shares" on full_record_shares
  for all using (auth.uid() = user_id);

-- Allow anonymous read of full_record_shares for doctor link verification
create policy "Public read full shares by token" on full_record_shares
  for select using (true);

-- ─────────────────────────────────────────
-- VITAL READINGS (continuous monitor — wearable + manual)
-- ─────────────────────────────────────────
create table if not exists vital_readings (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references profiles(id) on delete cascade not null,
  metric_type  text not null,   -- glucose|heart_rate|blood_pressure|spo2|sleep_hours|steps|weight|temperature
  value        numeric not null,
  value_extra  numeric,          -- BP diastolic, sleep REM hours
  unit         text,
  source       text default 'manual', -- manual|fitbit|dexcom|apple_health|garmin
  recorded_at  timestamptz default now(),
  created_at   timestamptz default now()
);

create index if not exists vital_readings_user_metric_idx on vital_readings(user_id, metric_type);
create index if not exists vital_readings_recorded_idx    on vital_readings(recorded_at desc);

alter table vital_readings enable row level security;
create policy "Own vital readings" on vital_readings
  for all using (auth.uid() = user_id);

-- Allow family monitoring (read-only via family_access)
create policy "Family monitor read" on vital_readings
  for select using (
    user_id in (
      select parent_user_id from family_access
      where monitor_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- HEALTH ALERTS (spike events auto-generated)
-- ─────────────────────────────────────────
create table if not exists health_alerts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade not null,
  metric_type   text,
  value         numeric,
  unit          text,
  severity      text default 'warning',  -- info|warning|critical
  message       text,
  baseline_low  numeric,
  baseline_high numeric,
  resolved      boolean default false,
  created_at    timestamptz default now()
);

create index if not exists health_alerts_user_idx on health_alerts(user_id, created_at desc);

alter table health_alerts enable row level security;
create policy "Own alerts" on health_alerts
  for all using (auth.uid() = user_id);
create policy "Family monitor alerts" on health_alerts
  for select using (
    user_id in (
      select parent_user_id from family_access where monitor_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- FAMILY ACCESS (kids monitoring parents remotely)
-- ─────────────────────────────────────────
create table if not exists family_access (
  id              uuid primary key default uuid_generate_v4(),
  parent_user_id  uuid references profiles(id) on delete cascade not null,
  monitor_email   text,
  monitor_user_id uuid references profiles(id) on delete cascade,
  access_token    text unique default encode(gen_random_bytes(24), 'hex'),
  nickname        text,
  created_at      timestamptz default now()
);

alter table family_access enable row level security;
create policy "Parent manages access" on family_access
  for all using (auth.uid() = parent_user_id);
create policy "Monitor reads own access" on family_access
  for select using (auth.uid() = monitor_user_id);
