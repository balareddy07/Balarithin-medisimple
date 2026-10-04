-- ─────────────────────────────────────────
-- ASK MY REPORTS (RAG)
-- pgvector + report_chunks + similarity-match RPC
-- Deploy: supabase db push
-- ─────────────────────────────────────────

create extension if not exists vector;

-- One row per text chunk of an uploaded report.
-- Chunks are embedded with all-MiniLM-L6-v2 (384 dims) at ingest time
-- by the ingest-report edge function.
create table if not exists report_chunks (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid references reports(id) on delete cascade not null,
  user_id      uuid references profiles(id) on delete cascade not null,
  chunk_index  integer not null,
  content      text not null,
  embedding    vector(384),
  created_at   timestamptz default now()
);

create index if not exists report_chunks_report_idx on report_chunks(report_id);
create index if not exists report_chunks_user_idx   on report_chunks(user_id);

-- HNSW works well even on small per-user chunk sets (unlike ivfflat,
-- which needs enough rows to train its lists).
drop index if exists report_chunks_embedding_idx;
create index if not exists report_chunks_embedding_idx on report_chunks
  using hnsw (embedding vector_cosine_ops);

alter table report_chunks enable row level security;

drop policy if exists "Own chunks" on report_chunks;
create policy "Own chunks" on report_chunks
  for all using (auth.uid() = user_id);

-- Cosine-similarity search over a single user's chunks.
-- Called by the ask-reports edge function (service role).
create or replace function match_report_chunks(
  query_embedding vector(384),
  match_user_id uuid,
  match_count int default 6,
  min_similarity float default 0.30
)
returns table (
  report_id        uuid,
  patient_name     text,
  report_created_at timestamptz,
  chunk_index      int,
  content          text,
  similarity       float
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    c.report_id,
    r.patient_name,
    r.created_at,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from report_chunks c
  join reports r on r.id = c.report_id
  where c.user_id = match_user_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
