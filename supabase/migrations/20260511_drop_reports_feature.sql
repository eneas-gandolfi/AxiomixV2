-- Arquivo: database/migrations/037_drop_reports_feature.sql
-- Proposito: Remover feature de envio automatico de relatorios (weekly e daily).
--            Dropa as tabelas weekly_reports e daily_reports e remove os
--            job_types correspondentes do enum check constraint de async_jobs.
-- Autor: AXIOMIX
-- Data: 2026-05-11

-- 1) Drop tabelas de historico de relatorios (cascade pega indices, policies, FKs)
drop table if exists public.weekly_reports cascade;
drop table if exists public.daily_reports cascade;

-- 2) Limpar jobs orfaos antes de reduzir o enum check (senao a constraint quebra)
delete from public.async_jobs
where job_type in ('weekly_report', 'daily_report');

-- 3) Atualizar check constraint de job_type pra remover weekly_report e daily_report
alter table public.async_jobs
drop constraint if exists async_jobs_job_type_check;

alter table public.async_jobs
add constraint async_jobs_job_type_check
check (
  job_type in (
    'sofia_crm_sync',
    'evo_crm_sync',
    'competitor_scrape',
    'radar_collect',
    'whatsapp_analyze',
    'rag_process',
    'group_agent_respond',
    'group_rag_batch',
    'group_proactive'
  )
);
