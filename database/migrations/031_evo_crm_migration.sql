-- ==========================================================
-- Migration 031: Sofia CRM → Evo CRM (substituição total)
-- Data: 2026-04-17
--
-- Executar MANUALMENTE no SQL Editor do Supabase após backup
-- completo e validação em staging. NÃO rodar via CI.
-- ==========================================================

-- FASE 1: DELETE filtrado ANTES da nova constraint.
-- Se deixarmos para depois, o ALTER da CHECK falha com 23514
-- ("check constraint violated by some row") porque linhas
-- com type='sofia_crm' / job_type='sofia_crm_sync' ainda existem.

DELETE FROM public.async_jobs WHERE job_type = 'sofia_crm_sync';
DELETE FROM public.integrations WHERE type = 'sofia_crm';

-- FASE 2: atualizar CHECK constraints (tabela agora sem linhas violadoras)

ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_type_check;
ALTER TABLE public.integrations ADD CONSTRAINT integrations_type_check
  CHECK (type IN ('evo_crm', 'evolution_api', 'upload_post', 'openrouter'));

ALTER TABLE public.async_jobs DROP CONSTRAINT IF EXISTS async_jobs_job_type_check;
ALTER TABLE public.async_jobs ADD CONSTRAINT async_jobs_job_type_check
  CHECK (job_type IN (
    'evo_crm_sync',
    'competitor_scrape',
    'radar_collect',
    'weekly_report',
    'whatsapp_analyze',
    'rag_process',
    'daily_report',
    'group_agent_respond',
    'group_rag_batch',
    'group_proactive'
  ));

-- FASE 3: TRUNCATE dos dados sincronizados (resync Evo repopula tudo)

TRUNCATE TABLE
  public.alert_log,
  public.alert_preferences,
  public.weekly_reports,
  public.daily_reports,
  public.conversation_digests,
  public.conversation_notes,
  public.conversation_insights,
  public.campaign_recipients,
  public.campaigns,
  public.messages,
  public.conversations
CASCADE;

COMMENT ON COLUMN public.integrations.type IS
  'Tipos: evo_crm (CRM via Evolution Foundation), evolution_api (WhatsApp), upload_post (social), openrouter (LLM)';
