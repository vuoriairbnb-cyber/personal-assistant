create table public.morning_brief_daily_intelligence (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  morning_brief_id uuid not null references public.morning_briefs(id) on delete cascade,

  input_hash text not null check (char_length(input_hash) = 64),
  generation_version text not null,

  executive_summary_json jsonb not null,
  main_themes_json jsonb not null,
  why_this_matters_json jsonb not null,
  watch_next_json jsonb not null,
  evidence_note text,

  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint morning_brief_daily_intelligence_cache_key
    unique (user_id, morning_brief_id, generation_version),

  constraint morning_brief_daily_intelligence_executive_summary_shape
    check (
      jsonb_typeof(executive_summary_json) = 'array'
      and jsonb_array_length(executive_summary_json) between 3 and 5
    ),

  constraint morning_brief_daily_intelligence_main_themes_shape
    check (
      jsonb_typeof(main_themes_json) = 'array'
      and jsonb_array_length(main_themes_json) = 3
    ),

  constraint morning_brief_daily_intelligence_why_this_matters_shape
    check (
      jsonb_typeof(why_this_matters_json) = 'array'
      and jsonb_array_length(why_this_matters_json) between 2 and 4
    ),

  constraint morning_brief_daily_intelligence_watch_next_shape
    check (
      jsonb_typeof(watch_next_json) = 'array'
      and jsonb_array_length(watch_next_json) = 3
    )
);

create index morning_brief_daily_intelligence_user_cache_idx
  on public.morning_brief_daily_intelligence
    (user_id, morning_brief_id, generation_version);

alter table public.morning_brief_daily_intelligence enable row level security;

create policy "Approved users read own Morning Brief daily intelligence"
  on public.morning_brief_daily_intelligence
  for select
  using (
    public.is_approved(auth.uid())
    and user_id = auth.uid()
  );

create trigger set_morning_brief_daily_intelligence_updated_at
before update on public.morning_brief_daily_intelligence
for each row execute function public.set_updated_at();
