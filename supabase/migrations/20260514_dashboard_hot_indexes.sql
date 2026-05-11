-- =============================================================================
-- Migration: indexes compostos para queries quentes do dashboard
-- Date: 2026-05-14
-- Author: AXIOMIX
-- Purpose:
--   Cobre os filtros recorrentes do dashboard (company_id + janela temporal,
--   muitas vezes com um discriminador como intent/sentiment/status). Sem esses
--   indexes, queries com `range` em `generated_at` / `last_message_at` /
--   `created_at` viram seq scan a medida que o tenant cresce.
--
--   Usa CREATE INDEX IF NOT EXISTS (idempotente). Nao usei CONCURRENTLY porque
--   o supabase db push pode quebrar fora de transacao automatica em alguns
--   ambientes. Para tabelas grandes em producao, reaplicar manualmente:
--
--     CREATE INDEX CONCURRENTLY IF NOT EXISTS <name> ON <table> (<cols>);
--
-- =============================================================================

-- conversations: filtros por company_id + last_message_at (range 7d/14d)
create index if not exists conversations_company_last_message_idx
  on public.conversations (company_id, last_message_at);

-- conversation_insights: 3 padroes principais
-- (1) intent='compra' por janela temporal (oportunidades)
create index if not exists conversation_insights_company_intent_generated_idx
  on public.conversation_insights (company_id, intent, generated_at);

-- (2) sentiment='negativo' por janela temporal (alertas/risk)
create index if not exists conversation_insights_company_sentiment_generated_idx
  on public.conversation_insights (company_id, sentiment, generated_at);

-- (3) varredura geral por janela (sentiment trend 30d)
create index if not exists conversation_insights_company_generated_idx
  on public.conversation_insights (company_id, generated_at);

-- messages: ultima mensagem por conversa (DISTINCT ON pattern em live-operation)
create index if not exists messages_conversation_sent_at_desc_idx
  on public.messages (conversation_id, sent_at desc);

-- messages: filtros por company_id (auditoria + scan)
create index if not exists messages_company_sent_at_idx
  on public.messages (company_id, sent_at desc);

-- scheduled_posts: alertas de falha por janela
create index if not exists scheduled_posts_company_status_created_idx
  on public.scheduled_posts (company_id, status, created_at);
