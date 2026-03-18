-- Arquivo: database/migrations/016_conversation_digests.sql
-- Proposito: Criar tabela conversation_digests para resumos horarios agregados.
-- Autor: AXIOMIX
-- Data: 2026-03-17

create table if not exists public.conversation_digests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  conversations_analyzed int not null default 0,
  purchase_intents int not null default 0,
  negative_sentiments int not null default 0,
  summary_text text not null,
  created_at timestamptz default now()
);

create index if not exists idx_conversation_digests_company_period
on public.conversation_digests (company_id, period_end desc);

alter table public.conversation_digests enable row level security;

drop policy if exists conversation_digests_company_isolation on public.conversation_digests;
create policy conversation_digests_company_isolation
on public.conversation_digests
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
