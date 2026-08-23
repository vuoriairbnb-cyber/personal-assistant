create table public.kide_agent_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table public.kide_agent_pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pairing_code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.kide_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  event_url text,
  event_name text,
  target_mode text not null check (target_mode in ('exact_variant', 'first_available_under_price')),
  exact_variant_name text,
  max_price_cents integer,
  quantity integer not null default 1 check (quantity = 1),
  sale_start_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > sale_start_at),
  status text not null default 'draft' check (status in ('draft', 'armed', 'waiting_for_sale', 'waiting_for_variant', 'attempting', 'reserved', 'verification_required', 'reservation_result_unknown', 'expired', 'disarmed', 'failed')),
  armed_at timestamptz,
  disarmed_at timestamptz,
  reservation_attempted boolean not null default false,
  selected_variant_name text,
  selected_price_cents integer,
  last_agent_update_at timestamptz,
  safe_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((target_mode = 'exact_variant' and exact_variant_name is not null and max_price_cents is null) or (target_mode = 'first_available_under_price' and exact_variant_name is null and max_price_cents is not null and max_price_cents >= 0))
);

create unique index kide_one_active_watch_per_user on public.kide_watches(user_id) where status in ('armed', 'waiting_for_sale', 'waiting_for_variant', 'attempting');

alter table public.kide_agent_devices enable row level security;
alter table public.kide_agent_pairings enable row level security;
alter table public.kide_watches enable row level security;

create policy "users manage own kide devices" on public.kide_agent_devices for all using (auth.uid() = user_id and public.is_approved(auth.uid())) with check (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "users manage own kide pairings" on public.kide_agent_pairings for all using (auth.uid() = user_id and public.is_approved(auth.uid())) with check (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "users manage own kide watches" on public.kide_watches for all using (auth.uid() = user_id and public.is_approved(auth.uid())) with check (auth.uid() = user_id and public.is_approved(auth.uid()));

create or replace function public.consume_kide_agent_pairing(p_pairing_code_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid;
begin
  update public.kide_agent_pairings set used_at = now()
  where pairing_code_hash = p_pairing_code_hash and used_at is null and expires_at > now()
  returning user_id into v_user_id;
  return v_user_id;
end;
$$;
revoke all on function public.consume_kide_agent_pairing(text) from public, anon, authenticated;
grant execute on function public.consume_kide_agent_pairing(text) to service_role;
