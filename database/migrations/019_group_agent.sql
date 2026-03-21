-- Arquivo: database/migrations/019_group_agent.sql
-- Proposito: Criar tabelas para Agente IA de grupo WhatsApp e expandir async_jobs.
-- Autor: AXIOMIX
-- Data: 2026-03-21

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
    'group_rag_batch'
  )
);

-- ============================================================
-- Tabela: group_agent_configs
-- ============================================================
create table if not exists public.group_agent_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  group_jid text not null,
  group_name text,
  is_active boolean not null default true,
  trigger_keywords text[] not null default array['@axiomix', '/ia'],
  agent_name text not null default 'Axiomix IA',
  agent_tone text not null default 'profissional'
    check (agent_tone in ('profissional', 'casual', 'tecnico')),
  feed_to_rag boolean not null default true,
  rag_min_message_length int not null default 50,
  rag_batch_interval_minutes int not null default 30,
  max_responses_per_hour int not null default 20,
  cooldown_seconds int not null default 10,
  evolution_instance_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, group_jid)
);

create index if not exists idx_gac_company
  on public.group_agent_configs(company_id);

create index if not exists idx_gac_group_jid
  on public.group_agent_configs(group_jid);

alter table public.group_agent_configs enable row level security;

create policy group_agent_configs_company_isolation on public.group_agent_configs
  for all using (
    company_id in (select company_id from public.memberships where user_id = auth.uid())
  );

create policy group_agent_configs_service_role on public.group_agent_configs
  for all using (auth.role() = 'service_role');

-- ============================================================
-- Tabela: group_messages
-- ============================================================
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  config_id uuid not null references public.group_agent_configs(id) on delete cascade,
  group_jid text not null,
  sender_jid text not null,
  sender_name text,
  message_id text not null,
  content text,
  message_type text default 'text',
  is_trigger boolean not null default false,
  agent_responded boolean not null default false,
  rag_processed boolean not null default false,
  sent_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique(company_id, message_id)
);

create index if not exists idx_gm_config_sent
  on public.group_messages(config_id, sent_at desc);

create index if not exists idx_gm_rag_pending
  on public.group_messages(company_id) where rag_processed = false;

alter table public.group_messages enable row level security;

create policy group_messages_company_isolation on public.group_messages
  for all using (
    company_id in (select company_id from public.memberships where user_id = auth.uid())
  );

create policy group_messages_service_role on public.group_messages
  for all using (auth.role() = 'service_role');

-- ============================================================
-- Tabela: group_agent_responses
-- ============================================================
create table if not exists public.group_agent_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  config_id uuid not null references public.group_agent_configs(id) on delete cascade,
  trigger_message_id uuid references public.group_messages(id),
  group_jid text not null,
  response_text text not null,
  response_type text not null default 'reply'
    check (response_type in ('reply', 'summary', 'rag_query', 'sales_data', 'report', 'error')),
  rag_sources_used int default 0,
  model_used text,
  processing_time_ms int,
  evolution_status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gar_rate
  on public.group_agent_responses(config_id, created_at desc);

alter table public.group_agent_responses enable row level security;

create policy group_agent_responses_company_isolation on public.group_agent_responses
  for all using (
    company_id in (select company_id from public.memberships where user_id = auth.uid())
  );

create policy group_agent_responses_service_role on public.group_agent_responses
  for all using (auth.role() = 'service_role');
