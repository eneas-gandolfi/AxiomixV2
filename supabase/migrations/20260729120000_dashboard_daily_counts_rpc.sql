-- =============================================================================
-- Migration: dashboard_daily_counts RPC
-- Date: 2026-07-29
-- Author: AXIOMIX
-- Purpose:
--   Substitui as duas queries do dashboard que puxavam linha a linha 7 dias de
--   `conversations.last_message_at` e `conversation_insights.generated_at`
--   (payload cru so pra montar sparkline em JS) por uma agregacao server-side
--   por dia. day_offset 0 = hoje em BRT (America/Sao_Paulo), crescendo pro
--   passado. Retorna sempre p_window_days linhas, com zeros nos dias sem dado.
--
--   SECURITY INVOKER preserva RLS; p_company_id explicito pelo mesmo motivo da
--   dashboard_sentiment_trend_30d (plano de query + cache-key deterministico).
-- =============================================================================

create or replace function public.dashboard_daily_counts(
  p_company_id uuid,
  p_window_days int default 7
)
returns table (
  day_offset int,
  conversation_count bigint,
  opportunity_count bigint
)
language sql
security invoker
stable
set search_path = public
as $$
  with days as (
    select g as day_offset
    from generate_series(0, greatest(p_window_days, 1) - 1) as g
  ),
  conv as (
    select
      ((now() at time zone 'America/Sao_Paulo')::date
        - (last_message_at at time zone 'America/Sao_Paulo')::date) as day_offset,
      count(*)::bigint as conversation_count
    from conversations
    where company_id = p_company_id
      and last_message_at >= now() - make_interval(days => greatest(p_window_days, 1))
      and last_message_at is not null
    group by 1
  ),
  opp as (
    select
      ((now() at time zone 'America/Sao_Paulo')::date
        - (generated_at at time zone 'America/Sao_Paulo')::date) as day_offset,
      count(*)::bigint as opportunity_count
    from conversation_insights
    where company_id = p_company_id
      and intent = 'compra'
      and generated_at >= now() - make_interval(days => greatest(p_window_days, 1))
    group by 1
  )
  select
    d.day_offset,
    coalesce(c.conversation_count, 0) as conversation_count,
    coalesce(o.opportunity_count, 0) as opportunity_count
  from days d
  left join conv c on c.day_offset = d.day_offset
  left join opp o on o.day_offset = d.day_offset
  order by d.day_offset asc;
$$;

comment on function public.dashboard_daily_counts(uuid, int) is
  'Contagem por dia (BRT) de conversas ativas e insights de compra na janela informada. day_offset 0 = hoje. Substitui o fetch linha-a-linha de 7 dias para sparklines do dashboard.';

grant execute on function public.dashboard_daily_counts(uuid, int) to authenticated;
