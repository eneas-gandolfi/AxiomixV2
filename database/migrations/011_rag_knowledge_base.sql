-- Arquivo: database/migrations/011_rag_knowledge_base.sql
-- Proposito: Criar tabelas e funcoes para RAG (Retrieval-Augmented Generation) com pgvector.
-- Autor: AXIOMIX
-- Data: 2026-03-14

-- Habilitar pgvector
create extension if not exists vector;

-- ============================================================
-- Tabela: rag_documents
-- ============================================================
create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  file_size bigint not null,
  file_type text not null default 'application/pdf',
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','failed')),
  total_chunks integer default 0,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Tabela: rag_document_chunks
-- ============================================================
create table if not exists public.rag_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer default 0,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================================
-- Indices
-- ============================================================
create index if not exists idx_rag_documents_company
  on public.rag_documents(company_id);

create index if not exists idx_rag_chunks_document
  on public.rag_document_chunks(document_id);

create index if not exists idx_rag_chunks_company
  on public.rag_document_chunks(company_id);

create index if not exists idx_rag_chunks_embedding
  on public.rag_document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- RLS
-- ============================================================
alter table public.rag_documents enable row level security;
alter table public.rag_document_chunks enable row level security;

create policy rag_documents_company_isolation on public.rag_documents
  for all using (company_id in (
    select company_id from public.memberships where user_id = auth.uid()
  ));

create policy rag_chunks_company_isolation on public.rag_document_chunks
  for all using (company_id in (
    select company_id from public.memberships where user_id = auth.uid()
  ));

-- Bypass para service_role
create policy rag_documents_service_role on public.rag_documents
  for all using (auth.role() = 'service_role');

create policy rag_chunks_service_role on public.rag_document_chunks
  for all using (auth.role() = 'service_role');

-- ============================================================
-- Expandir job_type do async_jobs
-- ============================================================
alter table public.async_jobs
drop constraint if exists async_jobs_job_type_check;

alter table public.async_jobs
add constraint async_jobs_job_type_check
check (
  job_type in (
    'sofia_crm_sync',
    'competitor_scrape',
    'radar_collect',
    'weekly_report',
    'whatsapp_analyze',
    'rag_process'
  )
);

-- ============================================================
-- Funcao de busca vetorial
-- ============================================================
create or replace function match_rag_chunks(
  query_embedding vector(1536),
  match_company_id uuid,
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity float
)
language plpgsql
as $$
begin
  -- Aumentar probes para melhorar recall em datasets pequenos (IVFFlat)
  perform set_config('ivfflat.probes', '10', true);

  return query
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.rag_document_chunks c
  where c.company_id = match_company_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
