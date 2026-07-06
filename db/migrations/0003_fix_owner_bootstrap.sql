-- Fix: protect_profile_privileged_fields (from 0002_approval_gate.sql) reverted
-- privileged-field updates made via the service role key or the Supabase SQL
-- editor, because those contexts have no JWT, so auth.uid() is NULL and
-- is_owner(NULL) is always false. That silently blocked the documented
-- first-owner bootstrap SQL snippet in SETUP.md.
--
-- Service-role/SQL-editor access already bypasses RLS entirely and has
-- unrestricted access to every table — this trigger was only ever meant to
-- stop a signed-in end user from escalating their own privileges through the
-- app's normal (anon-key + session) request path, where auth.uid() is always
-- present. So: only enforce the guard when auth.uid() is not null.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_owner(auth.uid()) then
    new.status := old.status;
    new.role := old.role;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.rejected_at := old.rejected_at;
  end if;
  return new;
end;
$$;
