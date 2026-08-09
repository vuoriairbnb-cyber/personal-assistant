-- Personal Assistant — Calendar module (real persistence + external sync)
-- Modules covered: manual calendar events, Airbnb iCal sync (Google Calendar
-- follows later once OAuth credentials exist — schema already allows for it).
-- Run this after 0001_init.sql, 0002_approval_gate.sql, 0003_fix_owner_bootstrap.sql.

-- ============================================================================
-- calendar_connections
-- One row per (user, provider). The Airbnb iCal URL itself is a single
-- server-side env var (AIRBNB_ICAL_URL), not stored per-row — this table only
-- tracks each approved user's own connect/sync state for it.
-- ============================================================================
create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'airbnb')),
  status text not null default 'disconnected'
    check (status in ('connected', 'syncing', 'error', 'disconnected')),
  last_synced_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.calendar_connections enable row level security;

create index if not exists calendar_connections_user_id_idx
  on public.calendar_connections (user_id);

create policy "Calendar connections are selectable by owner"
  on public.calendar_connections for select
  using (auth.uid() = user_id);

create policy "Calendar connections are insertable by owner"
  on public.calendar_connections for insert
  with check (auth.uid() = user_id and public.is_approved(auth.uid()));

create policy "Calendar connections are updatable by owner"
  on public.calendar_connections for update
  using (auth.uid() = user_id and public.is_approved(auth.uid()));

create policy "Calendar connections are deletable by owner"
  on public.calendar_connections for delete
  using (auth.uid() = user_id);

drop trigger if exists set_calendar_connections_updated_at on public.calendar_connections;
create trigger set_calendar_connections_updated_at
  before update on public.calendar_connections
  for each row execute function public.set_updated_at();

-- ============================================================================
-- calendar_events
-- Manual events (source = 'manual') are user-authored and fully editable.
-- Synced events (source = 'airbnb' | 'google') are owned by their
-- connection and only ever written by the sync server actions — external_id
-- is the provider's stable UID, used to upsert/prune on every re-sync.
-- 'trip' is intentionally not a valid source here: trip-derived calendar
-- blocks are read live from the trips table, never duplicated into this one.
-- ============================================================================
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid references public.calendar_connections (id) on delete cascade,
  source text not null check (source in ('manual', 'airbnb', 'google')),
  external_id text,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  trip_id uuid references public.trips (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_synced_needs_connection
    check (source = 'manual' or connection_id is not null),
  -- Idempotent upsert key for synced events. A plain (non-partial) unique
  -- constraint works for manual rows too: Postgres treats every
  -- (null, null) pair as distinct, so manual events never collide here.
  unique (connection_id, external_id)
);

alter table public.calendar_events enable row level security;

create index if not exists calendar_events_user_id_idx on public.calendar_events (user_id);
create index if not exists calendar_events_connection_id_idx on public.calendar_events (connection_id);
create index if not exists calendar_events_trip_id_idx on public.calendar_events (trip_id);
create index if not exists calendar_events_start_at_idx on public.calendar_events (start_at);

create policy "Calendar events are selectable by owner"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create policy "Calendar events are insertable by owner"
  on public.calendar_events for insert
  with check (auth.uid() = user_id and public.is_approved(auth.uid()));

create policy "Calendar events are updatable by owner"
  on public.calendar_events for update
  using (auth.uid() = user_id and public.is_approved(auth.uid()));

create policy "Calendar events are deletable by owner"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();
