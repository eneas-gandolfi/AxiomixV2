-- =============================================================================
-- Migration: messages.raw_payload (webhook discovery)
-- Date: 2026-05-08
-- Author: AXIOMIX
-- Purpose:
--   Adiciona coluna jsonb pra capturar o payload bruto do webhook do Evo CRM
--   junto com cada mensagem. Foi notado durante o discovery (bloco 16):
--   sem isso, todos os campos extras (sender, participant, agent_id,
--   pushName, etc) sao descartados na ingestao e ficam invisiveis pra debug
--   e pra implementacao futura de multi-atendente.
--
--   Quando >=5 mensagens reais entrarem, da pra rodar:
--     SELECT raw_payload FROM messages
--     WHERE company_id = '...' ORDER BY sent_at DESC LIMIT 5;
--   E inspecionar a estrutura pra identificar o campo de autor.
-- =============================================================================

alter table public.messages
  add column if not exists raw_payload jsonb;

comment on column public.messages.raw_payload is
  'Payload bruto recebido do webhook (envelope.data). Usado pra discovery do campo de autor da mensagem em conversas multi-atendente. Pode ser NULL pra mensagens criadas via sync ou antes desta migration.';
