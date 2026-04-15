-- Arquivo: database/migrations/030_group_proactive_last_sent.sql
-- Proposito: Rastrear ultimo envio de resumo/alerta proativo para permitir
--            janela tolerante (recuperar disparos perdidos) e dedupe diario.
-- Autor: AXIOMIX
-- Data: 2026-04-15

alter table public.group_agent_configs
  add column if not exists last_summary_sent_at timestamptz,
  add column if not exists last_sales_alert_sent_at timestamptz;
