-- Arquivo: database/migrations/024_group_agent_proactive.sql
-- Proposito: Adicionar suporte a proatividade no agente de grupo + novo job type.
-- Autor: AXIOMIX
-- Data: 2026-04-07

-- ============================================================
-- Colunas de proatividade em group_agent_configs
-- ============================================================
alter table public.group_agent_configs
  add column if not exists proactive_summary boolean not null default false,
  add column if not exists proactive_summary_hour int not null default 18,
  add column if not exists proactive_sales_alert boolean not null default false;

-- ============================================================
-- Expandir job_type do async_jobs
-- ============================================================
alter table public.async_jobs
  drop constraint if exists async_jobs_job_type_check;

alter table public.async_jobs
  add constraint async_jobs_job_type_check
  check (
    job_type in (
      'sofia_crm_sync',
      'competitor_scrape',
      'radar_collect',
      'weekly_report',
      'whatsapp_analyze',
      'rag_process',
      'daily_report',
      'group_agent_respond',
      'group_rag_batch',
      'group_proactive'
    )
  );

-- ============================================================
-- Expandir response_type do group_agent_responses
-- ============================================================
alter table public.group_agent_responses
  drop constraint if exists group_agent_responses_response_type_check;

alter table public.group_agent_responses
  add constraint group_agent_responses_response_type_check
  check (
    response_type in (
      'reply', 'summary', 'rag_query', 'sales_data', 'report', 'error',
      'proactive_summary', 'proactive_alert'
    )
  );
