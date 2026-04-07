-- Arquivo: database/migrations/025_rag_default_false.sql
-- Proposito: Alterar default de feed_to_rag para false (evitar custos de embeddings em grupos nao utilizados).
-- Autor: AXIOMIX
-- Data: 2026-04-07

-- Alterar default para novos grupos
alter table public.group_agent_configs
  alter column feed_to_rag set default false;

-- Desligar RAG em grupos inativos que nunca foram configurados manualmente
update public.group_agent_configs
  set feed_to_rag = false
  where is_active = false and feed_to_rag = true;
