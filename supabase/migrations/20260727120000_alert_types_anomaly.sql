-- =============================================================================
-- Migration: novos alert_types de anomalia (tfr_anomaly, sentiment_drop)
-- Date: 2026-07-27
-- Author: AXIOMIX
-- Purpose:
--   Alertas proativos da Intelligence Layer: o cron diario anomaly-scan
--   compara a janela 7d vs baseline 21d do proprio tenant e despacha via
--   dispatchAlert (cooldown/dedup ja resolvidos pelo dispatcher).
--   As tabelas alert_preferences/alert_log foram criadas na migration legada
--   010_whatsapp_alerts (pasta /database, aplicada manualmente) com check
--   constraints auto-nomeadas — recriamos os checks incluindo os novos tipos.
-- =============================================================================

alter table public.alert_preferences
  drop constraint if exists alert_preferences_alert_type_check;
alter table public.alert_preferences
  add constraint alert_preferences_alert_type_check check (
    alert_type in (
      'purchase_intent',
      'negative_sentiment',
      'failed_post',
      'viral_content',
      'tfr_anomaly',
      'sentiment_drop'
    )
  );

alter table public.alert_log
  drop constraint if exists alert_log_alert_type_check;
alter table public.alert_log
  add constraint alert_log_alert_type_check check (
    alert_type in (
      'purchase_intent',
      'negative_sentiment',
      'failed_post',
      'viral_content',
      'tfr_anomaly',
      'sentiment_drop'
    )
  );
