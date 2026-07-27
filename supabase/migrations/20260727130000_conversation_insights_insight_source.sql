-- =============================================================================
-- Migration: conversation_insights.insight_source (observabilidade F3)
-- Date: 2026-07-27
-- Author: AXIOMIX
-- Purpose:
--   Rastrear a origem de cada insight durante a transição F3 (fim da análise
--   automática recorrente de LLM): 'local_llm' (analyzer sob demanda),
--   'batch' (bulk-analyze), 'evo_agent' (delegado à stack Evo, futuro),
--   'fallback'. Linhas históricas ficam null (tratadas como local_llm na
--   leitura). Base pra validar a janela de 2 semanas antes das deleções da
--   fase F.
-- =============================================================================

alter table public.conversation_insights
  add column if not exists insight_source text
  check (insight_source in ('local_llm', 'evo_agent', 'fallback', 'batch'));
