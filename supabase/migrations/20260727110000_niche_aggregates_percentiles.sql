-- =============================================================================
-- Migration: percentis (p25/p50/p75) em niche_aggregates
-- Date: 2026-07-27
-- Author: AXIOMIX
-- Purpose:
--   Evolucao da Intelligence Layer: alem da media, guardar os percentis 25/50/75
--   de cada metrica entre os tenants do nicho. Habilita o badge "Voce esta no
--   top X% do nicho" no NicheBenchmarkCard sem nenhum dado identificavel —
--   mesmas garantias de privacidade (min 5 peers, sem company_id, so agregados).
--   Custo inalterado: 1 chamada/dia via cron /api/cron/niche-aggregates.
-- =============================================================================

alter table public.niche_aggregates
  add column if not exists sentiment_positive_p25 numeric(5, 2),
  add column if not exists sentiment_positive_p50 numeric(5, 2),
  add column if not exists sentiment_positive_p75 numeric(5, 2),
  add column if not exists opportunity_p25 numeric(5, 2),
  add column if not exists opportunity_p50 numeric(5, 2),
  add column if not exists opportunity_p75 numeric(5, 2),
  add column if not exists weekly_volume_p25 numeric(10, 2),
  add column if not exists weekly_volume_p50 numeric(10, 2),
  add column if not exists weekly_volume_p75 numeric(10, 2);

create or replace function public.recompute_niche_aggregates()
  returns int
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  affected_rows int;
begin
  insert into public.niche_aggregates (
    niche_slug,
    peer_count,
    sentiment_positive_pct,
    opportunity_pct,
    avg_weekly_volume,
    sentiment_positive_p25,
    sentiment_positive_p50,
    sentiment_positive_p75,
    opportunity_p25,
    opportunity_p50,
    opportunity_p75,
    weekly_volume_p25,
    weekly_volume_p50,
    weekly_volume_p75,
    window_days,
    computed_at
  )
  select
    c.niche_slug,
    count(distinct c.id) as peer_count,
    round(avg(per_co.sentiment_positive_pct)::numeric, 2) as sentiment_positive_pct,
    round(avg(per_co.opportunity_pct)::numeric, 2) as opportunity_pct,
    round(avg(per_co.weekly_volume)::numeric, 2) as avg_weekly_volume,
    round((percentile_cont(0.25) within group (order by per_co.sentiment_positive_pct))::numeric, 2),
    round((percentile_cont(0.50) within group (order by per_co.sentiment_positive_pct))::numeric, 2),
    round((percentile_cont(0.75) within group (order by per_co.sentiment_positive_pct))::numeric, 2),
    round((percentile_cont(0.25) within group (order by per_co.opportunity_pct))::numeric, 2),
    round((percentile_cont(0.50) within group (order by per_co.opportunity_pct))::numeric, 2),
    round((percentile_cont(0.75) within group (order by per_co.opportunity_pct))::numeric, 2),
    round((percentile_cont(0.25) within group (order by per_co.weekly_volume))::numeric, 2),
    round((percentile_cont(0.50) within group (order by per_co.weekly_volume))::numeric, 2),
    round((percentile_cont(0.75) within group (order by per_co.weekly_volume))::numeric, 2),
    30 as window_days,
    now() as computed_at
  from public.companies c
  join lateral (
    select
      ci.company_id,
      count(*) as total,
      (count(*) filter (where ci.sentiment = 'positivo'))::numeric
        / nullif(count(*), 0) * 100 as sentiment_positive_pct,
      (count(*) filter (where ci.intent = 'compra'))::numeric
        / nullif(count(*), 0) * 100 as opportunity_pct,
      count(*)::numeric / (30.0 / 7.0) as weekly_volume
    from public.conversation_insights ci
    where ci.company_id = c.id
      and ci.generated_at >= now() - interval '30 days'
    group by ci.company_id
    having count(*) >= 5
  ) per_co on true
  where c.niche_slug is not null
  group by c.niche_slug
  having count(distinct c.id) >= 5
  on conflict (niche_slug) do update set
    peer_count = excluded.peer_count,
    sentiment_positive_pct = excluded.sentiment_positive_pct,
    opportunity_pct = excluded.opportunity_pct,
    avg_weekly_volume = excluded.avg_weekly_volume,
    sentiment_positive_p25 = excluded.sentiment_positive_p25,
    sentiment_positive_p50 = excluded.sentiment_positive_p50,
    sentiment_positive_p75 = excluded.sentiment_positive_p75,
    opportunity_p25 = excluded.opportunity_p25,
    opportunity_p50 = excluded.opportunity_p50,
    opportunity_p75 = excluded.opportunity_p75,
    weekly_volume_p25 = excluded.weekly_volume_p25,
    weekly_volume_p50 = excluded.weekly_volume_p50,
    weekly_volume_p75 = excluded.weekly_volume_p75,
    window_days = excluded.window_days,
    computed_at = excluded.computed_at;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

-- A recriacao da funcao preserva owner/grants, mas re-aplica por seguranca.
revoke all on function public.recompute_niche_aggregates() from public, anon, authenticated;
grant execute on function public.recompute_niche_aggregates() to service_role;
