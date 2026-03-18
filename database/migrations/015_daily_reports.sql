-- Arquivo: database/migrations/015_daily_reports.sql
-- Proposito: Expandir async_jobs para daily_report e criar tabela daily_reports.
-- Autor: AXIOMIX
-- Data: 2026-03-17

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
    'daily_report'
  )
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  job_id uuid references public.async_jobs (id) on delete set null,
  report_date date not null,
  report_text text not null,
  sent_to text,
  delivery_status text not null default 'sent' check (delivery_status in ('sent', 'failed')),
  delivery_response jsonb default '{}'::jsonb,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_daily_reports_company_sent
on public.daily_reports (company_id, sent_at desc);

create unique index if not exists idx_daily_reports_company_date
on public.daily_reports (company_id, report_date);

alter table public.daily_reports enable row level security;

drop policy if exists daily_reports_company_isolation on public.daily_reports;
create policy daily_reports_company_isolation
on public.daily_reports
for all
using (
  company_id in (
    select m.company_id
    from public.memberships m
    where m.user_id = auth.uid()
  )
)
with check (
  company_id in (
    select m.company_id
    from public.memberships m
    where m.user_id = auth.uid()
  )
);
