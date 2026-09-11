-- Morning Brief domain foundation. This migration intentionally contains no
-- source fetching, ranking, AI generation, embeddings, or scheduled work.

create table public.morning_brief_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9_-]*$'),
  name text not null,
  base_url text,
  source_type text not null check (source_type in ('rss', 'api', 'web_metadata', 'manual', 'official', 'other')),
  default_language text,
  enabled boolean not null default true,
  default_content_type text check (default_content_type in ('breaking_news', 'news', 'analysis', 'opinion', 'explainer', 'long_read')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.morning_brief_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.morning_brief_sources(id) on delete restrict,
  source_article_id text,
  title text not null,
  subtitle text,
  excerpt text,
  body_text text,
  canonical_url text not null,
  author text,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  language text,
  content_type text not null default 'news' check (content_type in ('breaking_news', 'news', 'analysis', 'opinion', 'explainer', 'long_read')),
  access_type text not null default 'unknown' check (access_type in ('public', 'subscription', 'unknown')),
  image_url text,
  image_alt text,
  image_source text,
  raw_metadata_json jsonb not null default '{}'::jsonb,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_article_id),
  unique (source_id, canonical_url)
);

create table public.morning_brief_article_classifications (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.morning_brief_articles(id) on delete cascade,
  countries text[] not null default '{}', regions text[] not null default '{}', categories text[] not null default '{}',
  topics text[] not null default '{}', sectors text[] not null default '{}', companies text[] not null default '{}',
  people text[] not null default '{}', asset_classes text[] not null default '{}', funds text[] not null default '{}',
  event_type text,
  significance integer, consequence integer, scope integer, confidence integer,
  primary_section text,
  summary text,
  why_it_matters text,
  classification_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, classification_version),
  check (significance is null or significance between 0 and 100),
  check (consequence is null or consequence between 0 and 100),
  check (scope is null or scope between 0 and 100),
  check (confidence is null or confidence between 0 and 100)
);

create table public.morning_brief_story_clusters (
  id uuid primary key default gen_random_uuid(),
  primary_article_id uuid references public.morning_brief_articles(id) on delete set null,
  canonical_headline text,
  canonical_summary text,
  event_key text,
  display_image_url text,
  display_image_alt text,
  display_image_source text,
  first_published_at timestamptz,
  latest_published_at timestamptz,
  source_count integer not null default 0 check (source_count >= 0),
  cluster_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.morning_brief_cluster_articles (
  cluster_id uuid not null references public.morning_brief_story_clusters(id) on delete cascade,
  article_id uuid not null references public.morning_brief_articles(id) on delete cascade,
  relation_type text not null check (relation_type in ('primary', 'same_event', 'analysis', 'local_perspective', 'follow_up')),
  similarity numeric(5,4) check (similarity is null or similarity between 0 and 1),
  source_priority integer,
  created_at timestamptz not null default now(),
  primary key (cluster_id, article_id)
);

create table public.morning_brief_story_briefings (
  id uuid primary key default gen_random_uuid(),
  story_cluster_id uuid not null references public.morning_brief_story_clusters(id) on delete cascade,
  paragraphs_json jsonb not null default '[]'::jsonb,
  why_it_matters text not null,
  key_takeaways_json jsonb not null default '[]'::jsonb,
  exposure_path_json jsonb,
  generated_from_article_ids uuid[] not null default '{}',
  generation_version text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (story_cluster_id, generation_version),
  check (jsonb_typeof(paragraphs_json) = 'array'),
  check (jsonb_typeof(key_takeaways_json) = 'array'),
  check (exposure_path_json is null or jsonb_typeof(exposure_path_json) = 'array')
);

create table public.morning_brief_portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  asset_type text not null check (asset_type in ('fund', 'equity', 'bond', 'loan_fund', 'credit_strategy', 'other')),
  priority integer not null default 50 check (priority between 0 and 100),
  active boolean not null default true,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.morning_brief_portfolio_exposures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_asset_id uuid not null references public.morning_brief_portfolio_assets(id) on delete cascade,
  exposure_type text not null check (exposure_type in ('country', 'company', 'sector', 'asset_class', 'topic', 'region')),
  exposure_key text not null,
  weight numeric(6,3) check (weight is null or weight between 0 and 100),
  relevance_strength integer not null default 50 check (relevance_strength between 0 and 100),
  valid_from date,
  valid_to date,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  unique (portfolio_asset_id, exposure_type, exposure_key)
);

create table public.morning_brief_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dimension_type text not null check (dimension_type in ('category', 'topic', 'country', 'region', 'sector', 'source', 'content_type')),
  dimension_key text not null,
  explicit_weight integer not null default 50 check (explicit_weight between 0 and 100),
  pinned boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dimension_type, dimension_key)
);

create table public.morning_brief_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.morning_brief_articles(id) on delete set null,
  story_cluster_id uuid references public.morning_brief_story_clusters(id) on delete set null,
  event_type text not null check (event_type in ('impression', 'open', 'like', 'unlike', 'save', 'unsave', 'not_relevant', 'show_fewer_like_this', 'import')),
  signal_strength integer check (signal_strength is null or signal_strength between 0 and 100),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (article_id is not null or story_cluster_id is not null)
);

create table public.morning_brief_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null,
  normalized_url text not null,
  linked_article_id uuid references public.morning_brief_articles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  import_strength integer check (import_strength is null or import_strength between 0 and 100),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.morning_brief_learned_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dimension_type text not null,
  dimension_key text not null,
  affinity_score integer not null check (affinity_score between 0 and 100),
  positive_signal_count integer not null default 0 check (positive_signal_count >= 0),
  negative_signal_count integer not null default 0 check (negative_signal_count >= 0),
  last_signal_at timestamptz,
  model_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dimension_type, dimension_key)
);

create table public.morning_brief_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid references public.morning_brief_articles(id) on delete set null,
  story_cluster_id uuid references public.morning_brief_story_clusters(id) on delete set null,
  portfolio_relevance integer not null default 0 check (portfolio_relevance between 0 and 100),
  learned_preference integer not null default 0 check (learned_preference between 0 and 100),
  importance_score integer not null default 0 check (importance_score between 0 and 100),
  explicit_interest integer not null default 0 check (explicit_interest between 0 and 100),
  freshness_score integer not null default 0 check (freshness_score between 0 and 100),
  source_fit integer not null default 0 check (source_fit between 0 and 100),
  liked_similarity integer not null default 0 check (liked_similarity between 0 and 100),
  novelty_score integer not null default 0 check (novelty_score between 0 and 100),
  exploration_score integer not null default 0 check (exploration_score between 0 and 100),
  final_score integer not null check (final_score between 0 and 100),
  score_explanation_json jsonb not null default '{}'::jsonb,
  algorithm_version text not null,
  created_at timestamptz not null default now(),
  check (article_id is not null or story_cluster_id is not null)
);

create table public.morning_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_date date not null,
  brief_version integer not null default 1 check (brief_version > 0),
  generated_at timestamptz not null default now(),
  status text not null default 'ready' check (status in ('generating', 'ready', 'failed', 'archived')),
  summary_text text,
  algorithm_version text not null,
  classification_version text,
  estimated_read_minutes integer check (estimated_read_minutes is null or estimated_read_minutes >= 0),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_date, brief_version)
);

create table public.morning_brief_items (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.morning_briefs(id) on delete cascade,
  story_cluster_id uuid references public.morning_brief_story_clusters(id) on delete set null,
  article_id uuid references public.morning_brief_articles(id) on delete set null,
  section text not null check (section in ('top_5', 'vietnam', 'credit', 'finland', 'markets', 'politics', 'emerging_frontier', 'vc_pe', 'world', 'worth_reading')),
  rank integer not null check (rank > 0),
  score integer check (score is null or score between 0 and 100),
  score_explanation_json jsonb,
  created_at timestamptz not null default now(),
  check (article_id is not null or story_cluster_id is not null),
  unique (brief_id, section, rank)
);

create index morning_brief_articles_source_id_idx on public.morning_brief_articles(source_id);
create index morning_brief_articles_published_at_idx on public.morning_brief_articles(published_at desc);
create index morning_brief_articles_canonical_url_idx on public.morning_brief_articles(canonical_url);
create index morning_brief_articles_content_hash_idx on public.morning_brief_articles(content_hash) where content_hash is not null;
create index morning_brief_article_classifications_article_id_idx on public.morning_brief_article_classifications(article_id);
create index morning_brief_clusters_primary_article_id_idx on public.morning_brief_story_clusters(primary_article_id);
create index morning_brief_clusters_latest_published_at_idx on public.morning_brief_story_clusters(latest_published_at desc);
create index morning_brief_cluster_articles_article_id_idx on public.morning_brief_cluster_articles(article_id);
create index morning_brief_portfolio_assets_user_id_idx on public.morning_brief_portfolio_assets(user_id);
create index morning_brief_portfolio_exposures_user_id_idx on public.morning_brief_portfolio_exposures(user_id);
create index morning_brief_portfolio_exposures_lookup_idx on public.morning_brief_portfolio_exposures(exposure_type, exposure_key);
create index morning_brief_preferences_user_id_idx on public.morning_brief_user_preferences(user_id);
create index morning_brief_feedback_user_article_idx on public.morning_brief_feedback(user_id, article_id) where article_id is not null;
create index morning_brief_feedback_user_cluster_idx on public.morning_brief_feedback(user_id, story_cluster_id) where story_cluster_id is not null;
create index morning_brief_feedback_created_at_idx on public.morning_brief_feedback(created_at desc);
create index morning_brief_learned_interests_user_id_idx on public.morning_brief_learned_interests(user_id);
create index morning_brief_scores_user_final_idx on public.morning_brief_scores(user_id, final_score desc);
create index morning_brief_scores_article_id_idx on public.morning_brief_scores(article_id) where article_id is not null;
create index morning_brief_scores_cluster_id_idx on public.morning_brief_scores(story_cluster_id) where story_cluster_id is not null;
create index morning_brief_scores_created_at_idx on public.morning_brief_scores(created_at desc);
create index morning_briefs_user_date_idx on public.morning_briefs(user_id, brief_date desc);
create index morning_brief_items_brief_section_rank_idx on public.morning_brief_items(brief_id, section, rank);

alter table public.morning_brief_sources enable row level security;
alter table public.morning_brief_articles enable row level security;
alter table public.morning_brief_article_classifications enable row level security;
alter table public.morning_brief_story_clusters enable row level security;
alter table public.morning_brief_cluster_articles enable row level security;
alter table public.morning_brief_story_briefings enable row level security;
alter table public.morning_brief_portfolio_assets enable row level security;
alter table public.morning_brief_portfolio_exposures enable row level security;
alter table public.morning_brief_user_preferences enable row level security;
alter table public.morning_brief_feedback enable row level security;
alter table public.morning_brief_imports enable row level security;
alter table public.morning_brief_learned_interests enable row level security;
alter table public.morning_brief_scores enable row level security;
alter table public.morning_briefs enable row level security;
alter table public.morning_brief_items enable row level security;

create policy "Approved users read Morning Brief sources" on public.morning_brief_sources for select using (public.is_approved(auth.uid()));
create policy "Approved users read Morning Brief articles" on public.morning_brief_articles for select using (public.is_approved(auth.uid()));
create policy "Approved users read Morning Brief classifications" on public.morning_brief_article_classifications for select using (public.is_approved(auth.uid()));
create policy "Approved users read Morning Brief clusters" on public.morning_brief_story_clusters for select using (public.is_approved(auth.uid()));
create policy "Approved users read Morning Brief cluster articles" on public.morning_brief_cluster_articles for select using (public.is_approved(auth.uid()));
create policy "Approved users read Morning Brief story briefings" on public.morning_brief_story_briefings for select using (public.is_approved(auth.uid()));

create policy "Users manage own Morning Brief portfolio assets" on public.morning_brief_portfolio_assets for all using (auth.uid() = user_id and public.is_approved(auth.uid())) with check (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users manage own Morning Brief portfolio exposures" on public.morning_brief_portfolio_exposures for all using (auth.uid() = user_id and public.is_approved(auth.uid())) with check (auth.uid() = user_id and public.is_approved(auth.uid()) and exists (select 1 from public.morning_brief_portfolio_assets a where a.id = portfolio_asset_id and a.user_id = auth.uid()));
create policy "Users manage own Morning Brief preferences" on public.morning_brief_user_preferences for all using (auth.uid() = user_id and public.is_approved(auth.uid())) with check (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users add and read own Morning Brief feedback" on public.morning_brief_feedback for select using (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users record own Morning Brief feedback" on public.morning_brief_feedback for insert with check (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users manage own Morning Brief imports" on public.morning_brief_imports for all using (auth.uid() = user_id and public.is_approved(auth.uid())) with check (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users read own Morning Brief learned interests" on public.morning_brief_learned_interests for select using (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users read own Morning Brief scores" on public.morning_brief_scores for select using (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users read own Morning Briefs" on public.morning_briefs for select using (auth.uid() = user_id and public.is_approved(auth.uid()));
create policy "Users read own Morning Brief items" on public.morning_brief_items for select using (public.is_approved(auth.uid()) and exists (select 1 from public.morning_briefs b where b.id = brief_id and b.user_id = auth.uid()));

create trigger set_morning_brief_sources_updated_at before update on public.morning_brief_sources for each row execute function public.set_updated_at();
create trigger set_morning_brief_articles_updated_at before update on public.morning_brief_articles for each row execute function public.set_updated_at();
create trigger set_morning_brief_article_classifications_updated_at before update on public.morning_brief_article_classifications for each row execute function public.set_updated_at();
create trigger set_morning_brief_story_clusters_updated_at before update on public.morning_brief_story_clusters for each row execute function public.set_updated_at();
create trigger set_morning_brief_portfolio_assets_updated_at before update on public.morning_brief_portfolio_assets for each row execute function public.set_updated_at();
create trigger set_morning_brief_portfolio_exposures_updated_at before update on public.morning_brief_portfolio_exposures for each row execute function public.set_updated_at();
create trigger set_morning_brief_user_preferences_updated_at before update on public.morning_brief_user_preferences for each row execute function public.set_updated_at();
create trigger set_morning_brief_imports_updated_at before update on public.morning_brief_imports for each row execute function public.set_updated_at();
create trigger set_morning_brief_learned_interests_updated_at before update on public.morning_brief_learned_interests for each row execute function public.set_updated_at();
create trigger set_morning_briefs_updated_at before update on public.morning_briefs for each row execute function public.set_updated_at();
