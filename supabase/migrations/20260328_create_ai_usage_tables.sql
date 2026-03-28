-- Migration: 20260328_create_ai_usage_tables
-- Cria tabelas de rastreamento de uso de IA (somente owner)

-- Log granular de cada chamada IA
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module text not null,
  operation text not null,
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  estimated_cost_usd numeric(10,6) not null default 0,
  is_fallback boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.ai_usage_log is 'Log granular de uso de IA por chamada — acesso restrito a owners';

create index if not exists idx_ai_usage_log_company
  on public.ai_usage_log(company_id, created_at desc);
create index if not exists idx_ai_usage_log_module
  on public.ai_usage_log(company_id, module, created_at desc);

-- Resumo diario agregado
create table if not exists public.ai_usage_daily_summary (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  date date not null,
  module text not null,
  model text not null,
  total_calls int not null default 0,
  total_prompt_tokens bigint not null default 0,
  total_completion_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  total_cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now(),
  unique(company_id, date, module, model)
);

comment on table public.ai_usage_daily_summary is 'Resumo diario de uso de IA agregado por modulo e modelo — acesso restrito a owners';

create index if not exists idx_ai_usage_daily_company
  on public.ai_usage_daily_summary(company_id, date desc);

-- RLS
alter table public.ai_usage_log enable row level security;
alter table public.ai_usage_daily_summary enable row level security;

-- Politica: somente owners podem ver logs de uso
create policy ai_usage_log_select_owner on public.ai_usage_log
  for select using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Insert via service role (sem policy = bloqueado para anon/authenticated, liberado para service_role)

create policy ai_usage_daily_summary_select_owner on public.ai_usage_daily_summary
  for select using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role = 'owner'
    )
  );
