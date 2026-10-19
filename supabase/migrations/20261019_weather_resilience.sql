-- Weather Resilience (weather-resilience.derbycontrol.co.uk/weather): the system's own tables,
-- prefixed wr_. points_winter_log (the Killfrost log) is unchanged. RLS on with anon policies, as
-- the estate standard asks for new tables; the browser writes with the anon key like the points log.

-- One row per drop-in of the National CRT RAG Report export; the newest is read. Rail Day 1 of
-- the export is the day it was dropped in.
create table if not exists public.wr_crt_imports (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  day1_date date not null,
  row_count integer not null,
  source_name text,
  sites jsonb not null
);
create index if not exists wr_crt_imports_imported_at_idx on public.wr_crt_imports (imported_at desc);

-- One row per Hot Rail Forecast PDF dropped in; areas holds the parsed panels.
create table if not exists public.wr_hotrail_forecasts (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  issued_at timestamptz,
  issued_by text,
  valid_from date,
  valid_to date,
  source_name text,
  areas jsonb not null
);
create index if not exists wr_hotrail_forecasts_imported_at_idx on public.wr_hotrail_forecasts (imported_at desc);

-- A check at a flood site (site_key from src/lib/weather/sites.ts).
create table if not exists public.wr_flood_checks (
  id uuid primary key default gen_random_uuid(),
  site_key text not null,
  checked_at timestamptz not null default now(),
  checked_by text,
  finding text not null check (finding in ('clear', 'high_water', 'flooding')),
  notes text
);
create index if not exists wr_flood_checks_checked_at_idx on public.wr_flood_checks (checked_at desc);

-- Chainsaw-competent operations staff.
create table if not exists public.wr_chainsaw_staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  expiry_date date,
  comments text,
  course_booked text,
  course_dates text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.wr_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create or replace trigger wr_chainsaw_staff_touch before update on public.wr_chainsaw_staff for each row execute function public.wr_touch_updated_at();

alter table public.wr_crt_imports enable row level security;
alter table public.wr_hotrail_forecasts enable row level security;
alter table public.wr_flood_checks enable row level security;
alter table public.wr_chainsaw_staff enable row level security;

do $$
declare t text;
begin
  foreach t in array array['wr_crt_imports', 'wr_hotrail_forecasts', 'wr_flood_checks', 'wr_chainsaw_staff'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_anon_all') then
      execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', t || '_anon_all', t);
    end if;
  end loop;
end $$;
