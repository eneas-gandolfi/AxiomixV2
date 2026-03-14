-- ============================================================
-- Migration 010: Alertas WhatsApp em Tempo Real
-- Tabelas: alert_preferences, alert_log
-- ============================================================

-- 1. Preferencias de alertas por empresa
create table if not exists public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  alert_type text not null check (
    alert_type in ('purchase_intent', 'negative_sentiment', 'failed_post', 'viral_content')
  ),
  is_enabled boolean not null default false,
  recipient_phone text,
  cooldown_minutes int not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, alert_type)
);

create index if not exists idx_alert_preferences_company
on public.alert_preferences (company_id);

alter table public.alert_preferences enable row level security;

-- Select: qualquer membro da empresa pode visualizar
create policy alert_preferences_select_by_membership
on public.alert_preferences
for select
using (
  exists (
    select 1 from public.memberships m
    where m.company_id = alert_preferences.company_id
      and m.user_id = auth.uid()
  )
);

-- Insert/Update/Delete: apenas owner ou admin
create policy alert_preferences_modify_owner_admin
on public.alert_preferences
for all
using (
  exists (
    select 1 from public.memberships m
    where m.company_id = alert_preferences.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.memberships m
    where m.company_id = alert_preferences.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

-- Service role bypass (para jobs internos)
create policy alert_preferences_service_role
on public.alert_preferences
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');


-- 2. Log de alertas enviados
create table if not exists public.alert_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  alert_type text not null check (
    alert_type in ('purchase_intent', 'negative_sentiment', 'failed_post', 'viral_content')
  ),
  source_id text,
  recipient_phone text not null,
  message_preview text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error_detail text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_alert_log_company_type_sent
on public.alert_log (company_id, alert_type, sent_at desc);

create index if not exists idx_alert_log_dedup
on public.alert_log (company_id, alert_type, source_id, sent_at desc);

alter table public.alert_log enable row level security;

-- Select: qualquer membro da empresa pode visualizar
create policy alert_log_select_by_membership
on public.alert_log
for select
using (
  exists (
    select 1 from public.memberships m
    where m.company_id = alert_log.company_id
      and m.user_id = auth.uid()
  )
);

-- Insert: service role apenas (alertas sao inseridos pelo backend)
create policy alert_log_insert_service_role
on public.alert_log
for insert
with check (auth.role() = 'service_role');

-- Service role bypass para todas as operacoes
create policy alert_log_service_role
on public.alert_log
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
