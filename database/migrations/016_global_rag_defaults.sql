-- Arquivo: database/migrations/016_global_rag_defaults.sql
-- Proposito: Permitir documentos RAG globais e reutilizaveis entre tenants.
-- Autor: AXIOMIX
-- Data: 2026-03-17

alter table public.rag_documents
alter column company_id drop not null;

alter table public.rag_document_chunks
alter column company_id drop not null;

alter table public.rag_documents
add column if not exists scope text;

update public.rag_documents
set scope = case
  when company_id is null then 'global'
  else 'company'
end
where scope is null;

alter table public.rag_documents
alter column scope set default 'company';

alter table public.rag_documents
alter column scope set not null;

alter table public.rag_documents
drop constraint if exists rag_documents_scope_check;

alter table public.rag_documents
add constraint rag_documents_scope_check
check (scope in ('company', 'global'));

alter table public.rag_documents
add column if not exists source_key text;

alter table public.rag_documents
drop constraint if exists rag_documents_scope_company_check;

alter table public.rag_documents
add constraint rag_documents_scope_company_check
check (
  (scope = 'company' and company_id is not null)
  or (scope = 'global' and company_id is null)
);

alter table public.rag_document_chunks
add column if not exists scope text;

update public.rag_document_chunks c
set scope = coalesce(
  d.scope,
  case
    when c.company_id is null then 'global'
    else 'company'
  end
)
from public.rag_documents d
where d.id = c.document_id
  and c.scope is null;

update public.rag_document_chunks
set scope = case
  when company_id is null then 'global'
  else 'company'
end
where scope is null;

alter table public.rag_document_chunks
alter column scope set default 'company';

alter table public.rag_document_chunks
alter column scope set not null;

alter table public.rag_document_chunks
drop constraint if exists rag_document_chunks_scope_check;

alter table public.rag_document_chunks
add constraint rag_document_chunks_scope_check
check (scope in ('company', 'global'));

alter table public.rag_document_chunks
drop constraint if exists rag_chunks_scope_company_check;

alter table public.rag_document_chunks
add constraint rag_chunks_scope_company_check
check (
  (scope = 'company' and company_id is not null)
  or (scope = 'global' and company_id is null)
);

create index if not exists idx_rag_documents_scope_created
  on public.rag_documents (scope, created_at desc);

create unique index if not exists idx_rag_documents_global_source_key
  on public.rag_documents (source_key)
  where scope = 'global' and source_key is not null;

create index if not exists idx_rag_chunks_scope_created
  on public.rag_document_chunks (scope, created_at desc);

drop policy if exists rag_documents_company_isolation on public.rag_documents;
drop policy if exists rag_chunks_company_isolation on public.rag_document_chunks;
drop policy if exists rag_documents_company_mutation on public.rag_documents;
drop policy if exists rag_chunks_company_mutation on public.rag_document_chunks;
drop policy if exists rag_documents_select_scope on public.rag_documents;
drop policy if exists rag_chunks_select_scope on public.rag_document_chunks;
drop policy if exists rag_documents_service_role on public.rag_documents;
drop policy if exists rag_chunks_service_role on public.rag_document_chunks;

create policy rag_documents_select_scope on public.rag_documents
  for select
  using (
    scope = 'global'
    or company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

create policy rag_documents_company_mutation on public.rag_documents
  for all
  using (
    scope = 'company'
    and company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  )
  with check (
    scope = 'company'
    and company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

create policy rag_chunks_select_scope on public.rag_document_chunks
  for select
  using (
    scope = 'global'
    or company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

create policy rag_chunks_company_mutation on public.rag_document_chunks
  for all
  using (
    scope = 'company'
    and company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  )
  with check (
    scope = 'company'
    and company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

create policy rag_documents_service_role on public.rag_documents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy rag_chunks_service_role on public.rag_document_chunks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function match_rag_chunks(
  query_embedding vector(1536),
  match_company_id uuid,
  include_global boolean default false,
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
  return query
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.rag_document_chunks c
  where c.embedding is not null
    and (
      c.company_id = match_company_id
      or (include_global and c.scope = 'global')
    )
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by
    c.embedding <=> query_embedding,
    case when c.scope = 'company' then 0 else 1 end,
    c.chunk_index asc
  limit match_count;
end;
$$;
