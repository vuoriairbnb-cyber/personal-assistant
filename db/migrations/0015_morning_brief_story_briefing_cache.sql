-- User-specific, on-demand Morning Brief intelligence cache.
-- Legacy shared/mock rows intentionally remain nullable and readable only as
-- legacy data; live lookup requires both user_id and input_hash.

alter table public.morning_brief_story_briefings
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists input_hash text,
  add column if not exists evidence_note text;

-- The original migration created an unnamed-by-us unique constraint on
-- (story_cluster_id, generation_version). Find its actual catalog name rather
-- than assuming a generated PostgreSQL name.
do $$
declare old_constraint text;
begin
  select tc.constraint_name into old_constraint
  from information_schema.table_constraints tc
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'morning_brief_story_briefings'
    and tc.constraint_type = 'UNIQUE'
  group by tc.constraint_name
  having array_agg(ccu.column_name::text order by ccu.column_name) = array['generation_version', 'story_cluster_id']::text[]
  limit 1;

  if old_constraint is not null then
    execute format('alter table public.morning_brief_story_briefings drop constraint %I', old_constraint);
  end if;
end $$;

alter table public.morning_brief_story_briefings
  add constraint morning_brief_story_briefings_user_cache_key
  unique (story_cluster_id, user_id, generation_version);

create index if not exists morning_brief_story_briefings_user_cache_idx
  on public.morning_brief_story_briefings (user_id, story_cluster_id, generation_version);

drop policy if exists "Approved users read Morning Brief story briefings" on public.morning_brief_story_briefings;
create policy "Approved users read own Morning Brief story briefings"
  on public.morning_brief_story_briefings for select
  using (public.is_approved(auth.uid()) and (user_id = auth.uid() or user_id is null));
