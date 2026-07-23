-- Corrige a idempotência de messages: o índice parcial (where external_id is not null)
-- não é reconhecido pelo ON CONFLICT (company_id, external_id) do PostgREST (erro 42P10),
-- o que fazia o sync do Evo CRM descartar TODAS as mensagens novas
-- ("Falha ao salvar mensagens sincronizadas" em syncMessages).
-- Índice único cheio resolve: NULLs não conflitam entre si (NULLS DISTINCT, default do Postgres).
-- Verificado em 23/07/2026 que não há duplicatas (company_id, external_id) não-nulas em produção.

drop index if exists idx_messages_company_external;

create unique index if not exists idx_messages_company_external
  on public.messages (company_id, external_id);
