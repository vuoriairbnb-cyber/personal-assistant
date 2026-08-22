create table public.player_watches (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null, player_name_normalized text not null, courses jsonb not null default '[]'::jsonb,
  search_all_supported boolean not null default true, date_from date not null, date_to date not null,
  status text not null default 'active' check (status in ('active','processing','expired','cancelled')),
  consent_status text not null default 'confirmed' check (consent_status = 'confirmed'), consent_reference text, consented_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  last_checked_at timestamptz, next_check_at timestamptz, expires_at timestamptz not null, processing_started_at timestamptz,
  check (date_to >= date_from and date_to <= date_from + 13)
);
create table public.player_watch_matches (
  id uuid primary key default gen_random_uuid(), watch_id uuid not null references public.player_watches(id) on delete cascade,
  course text not null, date date not null, tee_time time not null, player_name text not null, player_name_normalized text not null,
  first_seen_at timestamptz not null default now(), notified_at timestamptz,
  unique (watch_id, course, date, tee_time, player_name_normalized)
);
create index player_watches_due_idx on public.player_watches(next_check_at, expires_at) where status='active';
create index player_watches_user_idx on public.player_watches(user_id);
alter table public.player_watches enable row level security;
alter table public.player_watch_matches enable row level security;
create policy "Player watches owner select" on public.player_watches for select using (auth.uid()=user_id);
create policy "Player watches owner insert" on public.player_watches for insert with check (auth.uid()=user_id and public.is_approved(auth.uid()));
create policy "Player watches owner update" on public.player_watches for update using (auth.uid()=user_id and public.is_approved(auth.uid()));
drop trigger if exists set_player_watches_updated_at on public.player_watches;
create trigger set_player_watches_updated_at before update on public.player_watches for each row execute function public.set_updated_at();

create or replace function public.claim_due_player_watches(p_limit integer default 25) returns setof public.player_watches language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 update public.player_watches set status='active',processing_started_at=null,next_check_at=now() where status='processing' and processing_started_at < now()-interval '15 minutes';
 update public.player_watches set status='expired',next_check_at=null where status='active' and expires_at<=now();
 return query with due as (select id from public.player_watches where status='active' and next_check_at<=now() and expires_at>now() order by next_check_at limit greatest(1,least(p_limit,100)) for update skip locked)
 update public.player_watches watch set status='processing',processing_started_at=now() from due where watch.id=due.id returning watch.*;
end; $$;

create or replace function public.record_player_watch_match(p_watch_id uuid,p_course text,p_date date,p_time time,p_player_name text,p_player_name_normalized text) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_match_id uuid; v_user_id uuid;
begin
 insert into public.player_watch_matches(watch_id,course,date,tee_time,player_name,player_name_normalized) values(p_watch_id,p_course,p_date,p_time,p_player_name,p_player_name_normalized)
 on conflict(watch_id,course,date,tee_time,player_name_normalized) do nothing returning id into v_match_id;
 if v_match_id is null then return null; end if;
 select user_id into v_user_id from public.player_watches where id=p_watch_id;
 insert into public.notification_outbox(user_id,event_type,source_type,source_id,payload) values(v_user_id,'player_watch_match','player_watch_match',v_match_id,jsonb_build_object('watch_id',p_watch_id,'player_name',p_player_name,'course',p_course,'date',p_date,'time',p_time));
 return v_match_id;
end; $$;
revoke all on function public.claim_due_player_watches(integer) from public,anon,authenticated;
revoke all on function public.record_player_watch_match(uuid,text,date,time,text,text) from public,anon,authenticated;
grant execute on function public.claim_due_player_watches(integer) to service_role;
grant execute on function public.record_player_watch_match(uuid,text,date,time,text,text) to service_role;
