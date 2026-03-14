-- Arquivo: database/migrations/003_whatsapp_intelligence.sql
-- Proposito: Criar tabelas do modulo WhatsApp Intelligence com RLS.
-- Autor: AXIOMIX
-- Data: 2026-03-11

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  external_id text,
  remote_jid text not null,
  contact_name text,
  contact_phone text,
  status text default 'open',
  last_message_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists idx_conversations_company_external
on public.conversations (company_id, external_id)
where external_id is not null;

create index if not exists idx_conversations_company_created
on public.conversations (company_id, created_at desc);

create index if not exists idx_conversations_company_status
on public.conversations (company_id, status);

create index if not exists idx_conversations_company_last_message
on public.conversations (company_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  content text,
  direction text check (direction in ('inbound', 'outbound')),
  sent_at timestamptz default now()
);

create index if not exists idx_messages_company_sent
on public.messages (company_id, sent_at desc);

create index if not exists idx_messages_conversation_sent
on public.messages (conversation_id, sent_at asc);

create table if not exists public.conversation_insights (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  sentiment text check (sentiment in ('positivo', 'neutro', 'negativo')),
  intent text,
  summary text,
  action_items jsonb default '[]'::jsonb,
  generated_at timestamptz default now()
);

create unique index if not exists idx_conversation_insights_unique_conversation
on public.conversation_insights (conversation_id);

create index if not exists idx_conversation_insights_company_generated
on public.conversation_insights (company_id, generated_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_insights enable row level security;

drop policy if exists conversations_company_isolation on public.conversations;
create policy conversations_company_isolation
on public.conversations
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

drop policy if exists messages_company_isolation on public.messages;
create policy messages_company_isolation
on public.messages
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

drop policy if exists conversation_insights_company_isolation on public.conversation_insights;
create policy conversation_insights_company_isolation
on public.conversation_insights
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
