-- Golf Watch: user-owned saved searches, an append-only notification outbox,
-- and small RPCs used by the cron worker to make claims/matches atomic.

create table if not exists public.golf_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  courses jsonb not null default '[]'::jsonb,
  search_all_supported boolean not null default false,
  date date not null,
  time_from time,
  time_to time,
  players integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_checked_at timestamptz,
  next_check_at timestamptz,
  expires_at timestamptz not null,
  processing_started_at timestamptz,
  matched_at timestamptz,
  matched_course text,
  matched_time time,
  matched_available_spots integer,
  matched_payload jsonb,
  constraint golf_watches_players_check check (players between 1 and 4),
  constraint golf_watches_status_check check (status in ('active', 'processing', 'matched', 'expired', 'cancelled')),
  constraint golf_watches_time_range_check check (time_from is null or time_to is null or time_from <= time_to),
  constraint golf_watches_courses_check check (jsonb_typeof(courses) = 'array')
);

create index if not exists golf_watches_user_id_idx on public.golf_watches (user_id);
create index if not exists golf_watches_status_idx on public.golf_watches (status);
create index if not exists golf_watches_next_check_at_idx on public.golf_watches (next_check_at);
create index if not exists golf_watches_expires_at_idx on public.golf_watches (expires_at);
create index if not exists golf_watches_due_active_idx
  on public.golf_watches (next_check_at, expires_at)
  where status = 'active';

alter table public.golf_watches enable row level security;
create policy "Golf watches are selectable by owner" on public.golf_watches for select using (auth.uid() = user_id);
create policy "Golf watches are insertable by owner" on public.golf_watches for insert with check (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Golf watches are updatable by owner" on public.golf_watches for update using (auth.uid() = user_id and public.is_approved(auth.uid()));

-- Enforce the product limit even if two browser requests race each other.
create or replace function public.enforce_active_golf_watch_limit()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.status = 'active' then
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    if (select count(*) from public.golf_watches where user_id = new.user_id and status = 'active') >= 3 then
      raise exception 'active golf watch limit reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_active_golf_watch_limit on public.golf_watches;
create trigger enforce_active_golf_watch_limit before insert on public.golf_watches
  for each row execute function public.enforce_active_golf_watch_limit();

drop trigger if exists set_golf_watches_updated_at on public.golf_watches;
create trigger set_golf_watches_updated_at before update on public.golf_watches for each row execute function public.set_updated_at();

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  source_type text not null,
  source_id uuid not null,
  payload jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  channel text,
  delivery_attempts integer not null default 0,
  last_error text,
  constraint notification_outbox_status_check check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint notification_outbox_delivery_attempts_check check (delivery_attempts >= 0),
  unique (source_type, source_id, event_type)
);

create index if not exists notification_outbox_pending_idx on public.notification_outbox (status, created_at)
  where status = 'pending';

alter table public.notification_outbox enable row level security;
-- The first version writes the outbox only from the service-role cron worker.
revoke all on public.notification_outbox from anon, authenticated;

-- Reset abandoned claims (e.g. a serverless invocation died) and atomically
-- claim a bounded batch. SKIP LOCKED keeps overlapping cron invocations safe.
create or replace function public.claim_due_golf_watches(p_limit integer default 25)
returns setof public.golf_watches
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  update public.golf_watches
    set status = 'active', processing_started_at = null, next_check_at = now()
    where status = 'processing' and processing_started_at < now() - interval '15 minutes';

  update public.golf_watches set status = 'expired', next_check_at = null
    where status = 'active' and expires_at <= now();

  return query
  with due as (
    select id from public.golf_watches
    where status = 'active' and next_check_at <= now() and expires_at > now()
    order by next_check_at asc, created_at asc
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  update public.golf_watches watch
    set status = 'processing', processing_started_at = now()
    from due
    where watch.id = due.id
    returning watch.*;
end;
$$;

-- A match and its future notification event are one database transaction.
create or replace function public.complete_golf_watch_match(
  p_watch_id uuid, p_course text, p_time time, p_available_spots integer, p_payload jsonb
)
returns boolean
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_user_id uuid;
begin
  update public.golf_watches
    set status = 'matched', matched_at = now(), matched_course = p_course,
        matched_time = p_time, matched_available_spots = p_available_spots,
        matched_payload = p_payload, last_checked_at = now(), next_check_at = null,
        processing_started_at = null
    where id = p_watch_id and status = 'processing'
    returning user_id into v_user_id;
  if v_user_id is null then return false; end if;
  insert into public.notification_outbox (user_id, event_type, source_type, source_id, payload)
    values (v_user_id, 'golf_watch_matched', 'golf_watch', p_watch_id, p_payload)
    on conflict (source_type, source_id, event_type) do nothing;
  return true;
end;
$$;

revoke all on function public.claim_due_golf_watches(integer) from public, anon, authenticated;
revoke all on function public.complete_golf_watch_match(uuid, text, time, integer, jsonb) from public, anon, authenticated;
grant execute on function public.claim_due_golf_watches(integer) to service_role;
grant execute on function public.complete_golf_watch_match(uuid, text, time, integer, jsonb) to service_role;
