-- Migration: 20260504_drop_campaigns_tables
-- Remove o módulo "Campanhas em Massa" (tabelas, RLS, índices, triggers).
-- CASCADE cobre as colunas adicionadas em 20260329_add_delivery_tracking.

drop table if exists public.campaign_recipients cascade;
drop table if exists public.campaigns cascade;
