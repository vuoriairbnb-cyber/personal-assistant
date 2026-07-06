-- Personal Assistant — private access control
-- This app is for personal/private use. New signups land as 'pending' and
-- cannot use any module until the owner approves them. Run this after
-- 0001_init.sql.

-- ============================================================================
-- profiles: approval + role fields
-- ============================================================================
alter table public.profiles
  add column if not exists status text not null default 'pending',
  add column if not exists role text not null default 'user',
  add column if not exists approved_by uuid references auth.users (id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz;

alter table public.profiles
  add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));

alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'family', 'user'));

create index if not exists profiles_status_idx on public.profiles (status);

-- ============================================================================
-- Helper functions (security definer: read profiles without recursing RLS)
-- ============================================================================
create or replace function public.is_owner(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'owner' and status = 'approved'
  );
$$;

create or replace function public.is_approved(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and status = 'approved'
  );
$$;

revoke all on function public.is_owner(uuid) from public;
revoke all on function public.is_approved(uuid) from public;
grant execute on function public.is_owner(uuid) to authenticated;
grant execute on function public.is_approved(uuid) to authenticated;

-- ============================================================================
-- Prevent self-escalation: only an owner may change status/role/approval
-- fields on ANY row (including their own). Everyone else's writes to these
-- columns are silently reverted, regardless of what the client sends.
-- ============================================================================
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner(auth.uid()) then
    new.status := old.status;
    new.role := old.role;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.rejected_at := old.rejected_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- ============================================================================
-- profiles RLS: allow the owner to see and manage every profile
-- ============================================================================
create policy "Owner can view all profiles"
  on public.profiles for select
  using (public.is_owner(auth.uid()));

create policy "Owner can update any profile"
  on public.profiles for update
  using (public.is_owner(auth.uid()));

-- ============================================================================
-- Require an approved account for any write that creates or changes data.
-- Row ownership (user_id = auth.uid()) is still enforced by the existing
-- policies from 0001_init.sql — this only adds the approval requirement.
-- ============================================================================
drop policy if exists "Trips are insertable by owner" on public.trips;
create policy "Trips are insertable by owner"
  on public.trips for insert
  with check (auth.uid() = user_id and public.is_approved(auth.uid()));

drop policy if exists "Trips are updatable by owner" on public.trips;
create policy "Trips are updatable by owner"
  on public.trips for update
  using (auth.uid() = user_id and public.is_approved(auth.uid()));

drop policy if exists "Trip outputs are insertable by owner" on public.trip_ai_outputs;
create policy "Trip outputs are insertable by owner"
  on public.trip_ai_outputs for insert
  with check (auth.uid() = user_id and public.is_approved(auth.uid()));

drop policy if exists "Cost logs are insertable by owner" on public.ai_cost_logs;
create policy "Cost logs are insertable by owner"
  on public.ai_cost_logs for insert
  with check (auth.uid() = user_id and public.is_approved(auth.uid()));

drop policy if exists "Settings are insertable by owner" on public.app_settings;
create policy "Settings are insertable by owner"
  on public.app_settings for insert
  with check (auth.uid() = user_id and public.is_approved(auth.uid()));

drop policy if exists "Settings are updatable by owner" on public.app_settings;
create policy "Settings are updatable by owner"
  on public.app_settings for update
  using (auth.uid() = user_id and public.is_approved(auth.uid()));
