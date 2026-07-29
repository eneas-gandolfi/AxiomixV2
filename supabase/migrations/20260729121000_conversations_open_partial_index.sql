-- =============================================================================
-- Migration: indice parcial para conversas abertas
-- Date: 2026-07-29
-- Author: AXIOMIX
-- Purpose:
--   A query da Operacao/dashboard filtra `company_id` +
--   `(status is null or status not in ('resolved','closed'))` e ordena por
--   `last_message_at`. O filtro com `status is null` em OR impede o uso do
--   indice conversations_company_last_message_idx (btree simples), causando
--   seq scan em tenants com volume. Este indice parcial casa exatamente o
--   predicado da query (getLiveOperationData) e mantem a ordenacao usada.
-- =============================================================================

create index if not exists conversations_open_by_company_idx
  on public.conversations (company_id, last_message_at asc)
  where (status is null or (status <> 'resolved' and status <> 'closed'));

comment on index public.conversations_open_by_company_idx is
  'Indice parcial pras conversas abertas (status null ou fora de resolved/closed), usado pela Operacao ao vivo e pelo hero do dashboard (getLiveOperationData).';
