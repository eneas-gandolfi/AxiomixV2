-- Arquivo: database/migrations/005_intelligence_async_jobs.sql
-- Proposito: Criar fila async_jobs para workers de intelligence com retry e RLS.
-- Autor: AXIOMIX
-- Data: 2026-03-11

create table if not exists public.async_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  job_type text not null
    check (job_type in ('competitor_scrape', 'radar_collect')),
  payload jsonb default '{}'::jsonb,
  status text default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  attempts int default 0,
  max_attempts int default 3,
  error_message text,
  result jsonb,
  scheduled_for timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_async_jobs_status_scheduled
on public.async_jobs (status, scheduled_for)
where status = 'pending';

create index if not exists idx_async_jobs_company_created
on public.async_jobs (company_id, created_at desc);

alter table public.async_jobs enable row level security;

drop policy if exists async_jobs_company_isolation on public.async_jobs;
create policy async_jobs_company_isolation
on public.async_jobs
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
