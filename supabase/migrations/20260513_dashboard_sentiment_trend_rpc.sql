-- =============================================================================
-- Migration: dashboard_sentiment_trend_30d RPC
-- Date: 2026-05-13
-- Author: AXIOMIX
-- Purpose:
--   Substitui o pattern de "puxar 5000 linhas de conversation_insights e
--   agregar em JS" por uma agregacao server-side de 30 dias. Retorna sempre
--   30 linhas (uma por dia), preenchidas com zeros nos dias sem dado.
--
--   SECURITY INVOKER preserva RLS — o caller so ve agregados das suas
--   proprias linhas (RLS de conversation_insights cuida do company_id).
--   Mesmo assim, recebemos p_company_id explicitamente pra:
--     (a) Permitir tunning de plano (idx (company_id, generated_at) eh hot)
--     (b) Tornar o cache-key da chamada (no client) deterministico.
-- =============================================================================

create or replace function public.dashboard_sentiment_trend_30d(
  p_company_id uuid
)
returns table (
  day date,
  positivo int,
  neutro int,
  negativo int
)
language sql
security invoker
stable
set search_path = public
as $$
  with days as (
    select (current_date - g)::date as day
    from generate_series(0, 29) as g
  ),
  agg as (
    select
      (generated_at at time zone 'UTC')::date as day,
      sum(case when sentiment = 'positivo' then 1 else 0 end)::int as positivo,
      sum(case when sentiment = 'neutro' then 1 else 0 end)::int as neutro,
      sum(case when sentiment = 'negativo' then 1 else 0 end)::int as negativo
    from conversation_insights
    where company_id = p_company_id
      and generated_at >= (current_date - 29)::timestamp
      and generated_at < (current_date + 1)::timestamp
    group by 1
  )
  select
    d.day,
    coalesce(a.positivo, 0) as positivo,
    coalesce(a.neutro, 0) as neutro,
    coalesce(a.negativo, 0) as negativo
  from days d
  left join agg a on a.day = d.day
  order by d.day asc;
$$;

comment on function public.dashboard_sentiment_trend_30d(uuid) is
  'Retorna 30 linhas (uma por dia) com contagem de sentiment positivo/neutro/negativo dos ultimos 30 dias para o company_id. Substitui a varredura JS de 5000 rows.';

grant execute on function public.dashboard_sentiment_trend_30d(uuid) to authenticated;
