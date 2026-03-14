-- Arquivo: database/migrations/002_integrations.sql
-- Propósito: Criar tabela de integrações por empresa com RLS para Task 3.
-- Autor: AXIOMIX
-- Data: 2026-03-11

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  type text not null check (
    type in ('sofia_crm', 'evolution_api', 'upload_post', 'openrouter')
  ),
  config jsonb default '{}'::jsonb,
  is_active boolean default false,
  last_tested_at timestamptz,
  test_status text check (test_status in ('ok', 'error')),
  created_at timestamptz default now(),
  unique (company_id, type)
);

create index if not exists idx_integrations_company_type
on public.integrations (company_id, type);

alter table public.integrations enable row level security;

drop policy if exists integrations_select_by_membership on public.integrations;
create policy integrations_select_by_membership
on public.integrations
for select
using (
  exists (
    select 1
    from public.memberships m
    where m.company_id = integrations.company_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists integrations_insert_owner_admin on public.integrations;
create policy integrations_insert_owner_admin
on public.integrations
for insert
with check (
  exists (
    select 1
    from public.memberships m
    where m.company_id = integrations.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists integrations_update_owner_admin on public.integrations;
create policy integrations_update_owner_admin
on public.integrations
for update
using (
  exists (
    select 1
    from public.memberships m
    where m.company_id = integrations.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.company_id = integrations.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists integrations_delete_owner_admin on public.integrations;
create policy integrations_delete_owner_admin
on public.integrations
for delete
using (
  exists (
    select 1
    from public.memberships m
    where m.company_id = integrations.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);
