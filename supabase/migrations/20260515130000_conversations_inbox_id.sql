-- =============================================================================
-- Migration: adicionar inbox_id em conversations
-- Date: 2026-05-14
-- Author: AXIOMIX
-- Purpose:
--   Persistir o canal/inbox de origem de cada conversa (vindo do Evo CRM)
--   para permitir filtro por Canal no painel Inteligência > Conversas.
--   Sem esse campo, conversas de inboxes diferentes ficam misturadas sem
--   forma de segmentar — e o filtro "Canal" da UI do Evo CRM não tem
--   equivalente local. Coluna nullable para compatibilidade com linhas
--   já sincronizadas (back-fill acontece no próximo sync/webhook).
-- =============================================================================

alter table public.conversations
  add column if not exists inbox_id text;

create index if not exists conversations_company_inbox_idx
  on public.conversations (company_id, inbox_id);
