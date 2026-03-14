-- Arquivo: database/migrations/006_whatsapp_jobs.sql
-- Proposito: Adicionar tipos de job para WhatsApp Intelligence.
-- Autor: AXIOMIX
-- Data: 2026-03-12

-- Expandir os tipos de job permitidos para incluir jobs do WhatsApp
alter table public.async_jobs
drop constraint if exists async_jobs_job_type_check;

alter table public.async_jobs
add constraint async_jobs_job_type_check
check (job_type in (
  'competitor_scrape',
  'radar_collect',
  'weekly_report',
  'sofia_crm_sync',
  'whatsapp_analyze'
));
