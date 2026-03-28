-- Migration: 20260329_add_delivery_tracking
-- Adiciona campos de rastreamento de entrega em campaign_recipients

alter table public.campaign_recipients
  add column if not exists delivery_status text default null
    check (delivery_status in ('sent_to_provider', 'delivered', 'read', 'failed_delivery')),
  add column if not exists delivery_updated_at timestamptz,
  add column if not exists provider_message_id text;

create index if not exists idx_cr_provider_msg
  on public.campaign_recipients(provider_message_id)
  where provider_message_id is not null;
