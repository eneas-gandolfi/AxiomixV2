-- Arquivo: database/migrations/023_group_agent_sessions.sql
-- Proposito: Criar tabela de sessoes multi-turno para o agente de grupo.
-- Autor: AXIOMIX
-- Data: 2026-04-07

-- ============================================================
-- Tabela: group_agent_sessions
-- ============================================================
create table if not exists public.group_agent_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  config_id uuid not null references public.group_agent_configs(id) on delete cascade,
  group_jid text not null,
  sender_jid text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

create index if not exists idx_gas_lookup
  on public.group_agent_sessions(config_id, sender_jid, group_jid, expires_at desc);

create index if not exists idx_gas_expired
  on public.group_agent_sessions(expires_at);

alter table public.group_agent_sessions enable row level security;

create policy group_agent_sessions_company_isolation on public.group_agent_sessions
  for all using (
    company_id in (select company_id from public.memberships where user_id = auth.uid())
  );

create policy group_agent_sessions_service_role on public.group_agent_sessions
  for all using (auth.role() = 'service_role');
