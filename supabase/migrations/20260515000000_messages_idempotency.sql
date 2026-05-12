-- Adiciona external_id em messages para idempotência do webhook do Evo CRM.
-- Espelho da migration 036 em /database/migrations/ que nunca foi aplicada via supabase db push.
-- Sem essa coluna, o handler do webhook (route.ts) falha com PGRST204 ao inserir e descarta mensagens silenciosamente.

alter table public.messages
  add column if not exists external_id text;

create unique index if not exists idx_messages_company_external
  on public.messages (company_id, external_id)
  where external_id is not null;

comment on column public.messages.external_id is 'ID da mensagem no Evo CRM — usado para idempotência de webhook';
