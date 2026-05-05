-- =============================================================================
-- Migration: operator_nudges
-- Date: 2026-05-07
-- Author: AXIOMIX
-- Purpose:
--   Tabela de "cutucadas" do gestor pro atendente. Quando o gestor clica
--   "Avisar [Operador]" no painel ao vivo da Operacao, uma linha entra aqui
--   e o atendente ve o aviso na proxima vez que abre o Axiomix.
--
--   Nao usa push browser nem WhatsApp Business pra v1 — fluxo end-to-end
--   simples baseado em polling do client.
-- =============================================================================

create table if not exists public.operator_nudges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text,
  wait_seconds integer,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.operator_nudges is
  'Notificacoes in-app do gestor pro atendente. Criadas pelo botao "Avisar" no painel da Operacao. Lidas pelo atendente via /api/whatsapp/operator-nudges.';

create index if not exists operator_nudges_to_user_unread_idx
  on public.operator_nudges (to_user_id, read_at, created_at desc)
  where read_at is null;

create index if not exists operator_nudges_company_idx
  on public.operator_nudges (company_id, created_at desc);

-- =============================================================================
-- RLS — leitura: destinatario ve as proprias. Insercao: membros da mesma
-- empresa do destinatario. Update (mark as read): apenas o destinatario.
-- =============================================================================

alter table public.operator_nudges enable row level security;

-- SELECT: usuario ve nudges destinadas a ele
drop policy if exists operator_nudges_select_to_recipient on public.operator_nudges;
create policy operator_nudges_select_to_recipient
on public.operator_nudges
for select
to authenticated
using (to_user_id = auth.uid());

-- INSERT: from_user_id deve ser auth.uid() E ambos (from/to) devem pertencer
-- a mesma empresa do nudge.
drop policy if exists operator_nudges_insert_same_company on public.operator_nudges;
create policy operator_nudges_insert_same_company
on public.operator_nudges
for insert
to authenticated
with check (
  from_user_id = auth.uid()
  and exists (
    select 1 from public.memberships m_from
    where m_from.user_id = auth.uid()
      and m_from.company_id = operator_nudges.company_id
  )
  and exists (
    select 1 from public.memberships m_to
    where m_to.user_id = operator_nudges.to_user_id
      and m_to.company_id = operator_nudges.company_id
  )
);

-- UPDATE: apenas o destinatario pode marcar como lido
drop policy if exists operator_nudges_update_recipient on public.operator_nudges;
create policy operator_nudges_update_recipient
on public.operator_nudges
for update
to authenticated
using (to_user_id = auth.uid())
with check (to_user_id = auth.uid());
