-- Arquivo: database/migrations/013_rag_fix_vector_search.sql
-- Proposito: Corrigir busca vetorial RAG — remover indice IVFFlat criado sobre tabela vazia.
-- Autor: AXIOMIX
-- Data: 2026-03-14

-- ============================================================
-- Problema: O indice IVFFlat foi criado na migration 011 sobre
-- uma tabela vazia. IVFFlat requer dados para treinar centroids.
-- Sem dados, os vetores inseridos depois ficam em listas incorretas
-- e a busca com probes=1 nao encontra nada.
--
-- Solucao: Remover o indice. Para datasets pequenos (< 10k chunks)
-- o sequential scan e rapido e retorna resultados exatos.
-- ============================================================

-- Remover indice IVFFlat quebrado
drop index if exists idx_rag_chunks_embedding;

-- Atualizar funcao de busca com threshold default menor
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
