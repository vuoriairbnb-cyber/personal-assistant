-- Personal Assistant — initial schema
-- Modules covered: profiles/auth, Travel Planner (trips + AI outputs), AI cost logging, app settings.
-- Run this in the Supabase SQL editor, or via `supabase db push` / the CLI migration workflow.

-- ============================================================================
-- profiles
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at trigger, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- trips
-- ============================================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  destination text not null,
  departure_city text,
  date_window text,
  duration_days integer,
  travelers integer not null default 1,
  budget_min numeric,
  budget_max numeric,
  currency text not null default 'EUR',
  interests text[] not null default '{}',
  travel_style text,
  notes text,
  raw_plan text,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'booked', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create index if not exists trips_user_id_idx on public.trips (user_id);

create policy "Trips are selectable by owner"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "Trips are insertable by owner"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "Trips are updatable by owner"
  on public.trips for update
  using (auth.uid() = user_id);

create policy "Trips are deletable by owner"
  on public.trips for delete
  using (auth.uid() = user_id);

drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ============================================================================
-- trip_ai_outputs
-- Saved, structured AI outputs (brief, itinerary, budget, email draft, ...).
-- Every AI action writes one row here; content is versioned by inserting new
-- rows rather than overwriting, so past drafts stay recoverable.
-- ============================================================================
create table if not exists public.trip_ai_outputs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in (
      'structured_plan',
      'brief',
      'itinerary',
      'budget',
      'email_draft',
      'accommodation_ideas',
      'activity_ideas',
      'flight_notes'
    )
  ),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trip_ai_outputs enable row level security;

create index if not exists trip_ai_outputs_trip_id_idx on public.trip_ai_outputs (trip_id);
create index if not exists trip_ai_outputs_user_id_idx on public.trip_ai_outputs (user_id);

create policy "Trip outputs are selectable by owner"
  on public.trip_ai_outputs for select
  using (auth.uid() = user_id);

create policy "Trip outputs are insertable by owner"
  on public.trip_ai_outputs for insert
  with check (auth.uid() = user_id);

create policy "Trip outputs are updatable by owner"
  on public.trip_ai_outputs for update
  using (auth.uid() = user_id);

create policy "Trip outputs are deletable by owner"
  on public.trip_ai_outputs for delete
  using (auth.uid() = user_id);

drop trigger if exists set_trip_ai_outputs_updated_at on public.trip_ai_outputs;
create trigger set_trip_ai_outputs_updated_at
  before update on public.trip_ai_outputs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ai_cost_logs
-- One row per Claude API call, written server-side only.
-- ============================================================================
create table if not exists public.ai_cost_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  feature text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ai_cost_logs enable row level security;

create index if not exists ai_cost_logs_user_id_idx on public.ai_cost_logs (user_id);
create index if not exists ai_cost_logs_created_at_idx on public.ai_cost_logs (created_at desc);

create policy "Cost logs are selectable by owner"
  on public.ai_cost_logs for select
  using (auth.uid() = user_id);

create policy "Cost logs are insertable by owner"
  on public.ai_cost_logs for insert
  with check (auth.uid() = user_id);

-- No update/delete policy: cost logs are an append-only audit trail.

-- ============================================================================
-- app_settings
-- ============================================================================
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  default_model text not null default 'claude-sonnet-5-20251001',
  currency text not null default 'EUR',
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Settings are selectable by owner"
  on public.app_settings for select
  using (auth.uid() = user_id);

create policy "Settings are insertable by owner"
  on public.app_settings for insert
  with check (auth.uid() = user_id);

create policy "Settings are updatable by owner"
  on public.app_settings for update
  using (auth.uid() = user_id);

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();
