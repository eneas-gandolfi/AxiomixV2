-- Migration: 20260327_create_campaigns_tables
-- Cria tabelas campaigns e campaign_recipients para o modulo Campanhas em Massa

-- Tabela de campanhas
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  template_name text not null,
  language text not null default 'pt_BR',
  body_params_template jsonb not null default '[]'::jsonb,
  header_params_template jsonb not null default '[]'::jsonb,
  inbox_id text not null,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'running', 'completed', 'failed', 'paused')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  stats jsonb not null default '{"total":0,"sent":0,"failed":0,"skipped":0}'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  qstash_message_id text
);

comment on table public.campaigns is 'Campanhas de envio em massa de templates WhatsApp via Sofia CRM';

create index if not exists idx_campaigns_company_id on public.campaigns(company_id);
create index if not exists idx_campaigns_status on public.campaigns(company_id, status);

-- Tabela de destinatarios da campanha
create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id text not null,
  contact_name text,
  contact_phone text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz,
  error_message text,
  variables jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.campaign_recipients is 'Destinatarios individuais de cada campanha com status de envio';

create index if not exists idx_campaign_recipients_campaign on public.campaign_recipients(campaign_id, status);
create unique index if not exists idx_campaign_recipients_unique_phone
  on public.campaign_recipients(campaign_id, contact_phone);

-- RLS
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;

-- Politica: usuarios podem ver campanhas da propria empresa
create policy campaigns_select_policy on public.campaigns
  for select using (
    company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

-- Politica: usuarios podem inserir campanhas na propria empresa
create policy campaigns_insert_policy on public.campaigns
  for insert with check (
    company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

-- Politica: usuarios podem atualizar campanhas da propria empresa
create policy campaigns_update_policy on public.campaigns
  for update using (
    company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

-- Politica: usuarios podem deletar campanhas da propria empresa
create policy campaigns_delete_policy on public.campaigns
  for delete using (
    company_id in (
      select company_id from public.memberships where user_id = auth.uid()
    )
  );

-- Recipients herdam acesso via campaign
create policy campaign_recipients_select_policy on public.campaign_recipients
  for select using (
    campaign_id in (
      select id from public.campaigns where company_id in (
        select company_id from public.memberships where user_id = auth.uid()
      )
    )
  );

create policy campaign_recipients_insert_policy on public.campaign_recipients
  for insert with check (
    campaign_id in (
      select id from public.campaigns where company_id in (
        select company_id from public.memberships where user_id = auth.uid()
      )
    )
  );

create policy campaign_recipients_update_policy on public.campaign_recipients
  for update using (
    campaign_id in (
      select id from public.campaigns where company_id in (
        select company_id from public.memberships where user_id = auth.uid()
      )
    )
  );

create policy campaign_recipients_delete_policy on public.campaign_recipients
  for delete using (
    campaign_id in (
      select id from public.campaigns where company_id in (
        select company_id from public.memberships where user_id = auth.uid()
      )
    )
  );
