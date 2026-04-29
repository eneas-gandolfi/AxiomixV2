-- Migration: 036_messages_idempotency
-- Adiciona external_id e message_type para idempotência de webhook e rastreabilidade.

alter table public.messages
  add column if not exists external_id text,
  add column if not exists message_type text;

-- Índice único para idempotência: mesmo external_id + company_id = mesmo registro
create unique index if not exists idx_messages_company_external
  on public.messages (company_id, external_id)
  where external_id is not null;

comment on column public.messages.external_id is 'ID da mensagem no Evo CRM — usado para idempotência de webhook';
comment on column public.messages.message_type is 'Tipo da mensagem: incoming, outgoing, template, etc.';
