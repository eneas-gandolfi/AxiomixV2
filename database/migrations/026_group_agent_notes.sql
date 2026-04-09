-- ============================================================
-- Migration: 026_group_agent_notes
-- Propósito: Tabela de notas/memória persistente do agente de grupo.
-- O agente extrai fatos-chave das conversas e armazena aqui.
-- Data: 2026-04-09
-- ============================================================

-- Tabela de notas do agente (memória de longo prazo)
create table if not exists public.group_agent_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  config_id uuid not null references public.group_agent_configs(id) on delete cascade,
  group_jid text not null,
  category text not null default 'fact'
    check (category in ('fact', 'preference', 'decision', 'action_item', 'contact_info')),
  content text not null,
  source_sender text,
  relevance_score float not null default 0.8
    check (relevance_score >= 0 and relevance_score <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_gan_lookup
  on public.group_agent_notes(config_id, is_active, relevance_score desc);

create index if not exists idx_gan_company
  on public.group_agent_notes(company_id);

-- RLS
alter table public.group_agent_notes enable row level security;

create policy "group_agent_notes_company_read"
  on public.group_agent_notes for select
  using (company_id = auth.uid());

create policy "group_agent_notes_service_all"
  on public.group_agent_notes for all
  using (auth.role() = 'service_role');
