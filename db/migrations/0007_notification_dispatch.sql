-- Telegram is delivered by a channel-neutral outbox dispatcher. Claims use a
-- lease so concurrent cron invocations cannot send the same event twice.
alter table public.notification_outbox
  add column if not exists processing_started_at timestamptz,
  add column if not exists provider_message_id text;

alter table public.notification_outbox
  drop constraint if exists notification_outbox_status_check;
alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'processing', 'processed', 'failed'));

create index if not exists notification_outbox_dispatch_idx
  on public.notification_outbox (created_at)
  where status = 'pending' and delivery_attempts < 3;

create or replace function public.claim_pending_notification_outbox(p_limit integer default 25)
returns setof public.notification_outbox
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  update public.notification_outbox
    set status = 'pending', processing_started_at = null
    where status = 'processing' and processing_started_at < now() - interval '15 minutes';

  return query
  with due as (
    select id from public.notification_outbox
    where status = 'pending'
      and event_type = 'golf_watch_matched'
      and delivery_attempts < 3
    order by created_at asc
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  update public.notification_outbox event
    set status = 'processing', processing_started_at = now()
    from due where event.id = due.id
    returning event.*;
end;
$$;

revoke all on function public.claim_pending_notification_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_pending_notification_outbox(integer) to service_role;
