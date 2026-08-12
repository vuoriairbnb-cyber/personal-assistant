-- Distributed, privacy-preserving counters for the ElevenLabs golf tool.
create table if not exists public.golf_rate_limit_buckets (
  bucket_key text primary key,
  count integer not null check (count >= 0),
  window_expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists golf_rate_limit_buckets_expires_idx
  on public.golf_rate_limit_buckets (window_expires_at);

alter table public.golf_rate_limit_buckets enable row level security;
revoke all on table public.golf_rate_limit_buckets from public, anon, authenticated;

create or replace function public.take_golf_rate_limit(p_user_hash text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := now();
  v_global_key text := 'golf:rl:global:1m';
  v_user_minute_key text := 'golf:rl:user:' || p_user_hash || ':1m';
  v_user_ten_key text := 'golf:rl:user:' || p_user_hash || ':10m';
  v_global_count integer := 0;
  v_user_minute_count integer := 0;
  v_user_ten_count integer := 0;
  v_retry integer := 60;
begin
  if p_user_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rate limit subject';
  end if;

  -- Fixed lock order prevents deadlocks; the entire decision and increment is atomic.
  perform pg_advisory_xact_lock(hashtext(v_global_key));
  perform pg_advisory_xact_lock(hashtext(v_user_minute_key));
  perform pg_advisory_xact_lock(hashtext(v_user_ten_key));

  -- Bounded opportunistic cleanup uses the expiry index; no full-table scan.
  delete from public.golf_rate_limit_buckets
  where ctid in (
    select ctid from public.golf_rate_limit_buckets
    where window_expires_at < v_now - interval '1 hour'
    order by window_expires_at
    limit 25
  );

  select case when window_expires_at > v_now then count else 0 end into v_global_count
    from public.golf_rate_limit_buckets where bucket_key = v_global_key;
  select case when window_expires_at > v_now then count else 0 end into v_user_minute_count
    from public.golf_rate_limit_buckets where bucket_key = v_user_minute_key;
  select case when window_expires_at > v_now then count else 0 end into v_user_ten_count
    from public.golf_rate_limit_buckets where bucket_key = v_user_ten_key;

  if coalesce(v_global_count, 0) >= 60 or coalesce(v_user_minute_count, 0) >= 10 or coalesce(v_user_ten_count, 0) >= 30 then
    return query select false, v_retry;
    return;
  end if;

  insert into public.golf_rate_limit_buckets (bucket_key, count, window_expires_at, updated_at)
  values
    (v_global_key, coalesce(v_global_count, 0) + 1, v_now + interval '1 minute', v_now),
    (v_user_minute_key, coalesce(v_user_minute_count, 0) + 1, v_now + interval '1 minute', v_now),
    (v_user_ten_key, coalesce(v_user_ten_count, 0) + 1, v_now + interval '10 minutes', v_now)
  on conflict (bucket_key) do update
    set count = excluded.count,
        window_expires_at = case
          when public.golf_rate_limit_buckets.window_expires_at > v_now
            then public.golf_rate_limit_buckets.window_expires_at
          else excluded.window_expires_at
        end,
        updated_at = excluded.updated_at;

  return query select true, 0;
end;
$$;

revoke all on function public.take_golf_rate_limit(text) from public, anon, authenticated;
grant execute on function public.take_golf_rate_limit(text) to service_role;
