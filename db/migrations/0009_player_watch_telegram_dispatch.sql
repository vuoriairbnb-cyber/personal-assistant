-- Player Watch matches use the existing channel-neutral outbox and Telegram
-- dispatcher. The claim lease still guarantees one delivery attempt at a time.
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
      and event_type in ('golf_watch_matched', 'player_watch_match')
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
