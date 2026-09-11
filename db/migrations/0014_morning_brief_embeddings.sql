-- Article-level semantic vectors. User preferences remain derived at read time.
create extension if not exists vector;

create table public.morning_brief_article_embeddings (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.morning_brief_articles(id) on delete cascade,
  embedding vector(1536) not null,
  embedding_model text not null,
  embedding_version text not null,
  input_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, embedding_model, embedding_version, input_hash)
);

create index morning_brief_article_embeddings_article_idx on public.morning_brief_article_embeddings(article_id);

alter table public.morning_brief_article_embeddings enable row level security;
-- Vectors are service-managed and are intentionally not exposed to browser clients.
create trigger set_morning_brief_article_embeddings_updated_at before update on public.morning_brief_article_embeddings for each row execute function public.set_updated_at();
