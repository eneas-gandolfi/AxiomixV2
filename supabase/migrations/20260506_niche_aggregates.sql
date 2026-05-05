-- =============================================================================
-- Migration: niche_aggregates table + recompute function
-- Date: 2026-05-06
-- Author: AXIOMIX
-- Purpose:
--   Tabela de agregados anonimos por nicho — base do benchmark "Voce vs nicho"
--   no dashboard global. Populada por cron diario chamando
--   recompute_niche_aggregates(). Sem dado pessoal: somente niche_slug,
--   peer_count e medias agregadas.
--
--   Privacidade:
--     - Nao guarda company_id, user_id ou qualquer identificador.
--     - Nao guarda valores per-company. Apenas a media entre tenants do nicho.
--     - Min 5 peers por nicho pra exibir (privacidade + significancia).
-- =============================================================================

create table if not exists public.niche_aggregates (
  niche_slug text primary key,
  peer_count int not null default 0,

  -- Metricas agregadas (media entre tenants ativos do nicho)
  sentiment_positive_pct numeric(5, 2),
  opportunity_pct numeric(5, 2),
  avg_weekly_volume numeric(10, 2),

  -- Janela usada na ultima rodada (em dias)
  window_days int not null default 30,
  computed_at timestamptz not null default now()
);

comment on table public.niche_aggregates is
  'Agregados anonimos por nicho — base do benchmark Voce vs nicho. Sem company_id; min 5 peers.';

-- Sem RLS — leitura permitida a qualquer usuario autenticado, escrita apenas
-- via service role (cron). A natureza agregada e anonima dispensa policies
-- per-tenant.
alter table public.niche_aggregates disable row level security;

-- =============================================================================
-- Funcao: recompute_niche_aggregates()
-- Recalcula todos os nichos com pelo menos 5 tenants ativos. Cada tenant
-- contribui com o seu proprio sentimento positivo %, intent compra %, e
-- volume semanal medio nas ultimas 30 dias. A funcao tira a media desses
-- valores por nicho.
-- =============================================================================

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
    window_days,
    computed_at
  )
  select
    c.niche_slug,
    count(distinct c.id) as peer_count,
    round(avg(per_co.sentiment_positive_pct)::numeric, 2) as sentiment_positive_pct,
    round(avg(per_co.opportunity_pct)::numeric, 2) as opportunity_pct,
    round(avg(per_co.weekly_volume)::numeric, 2) as avg_weekly_volume,
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
    window_days = excluded.window_days,
    computed_at = excluded.computed_at;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

comment on function public.recompute_niche_aggregates() is
  'Recalcula niche_aggregates para todos os nichos com >= 5 tenants ativos. Chamada via cron diario em /api/cron/niche-aggregates.';

-- Permissao explicita pro service role chamar a funcao (anon/authenticated NAO devem chamar)
revoke all on function public.recompute_niche_aggregates() from public, anon, authenticated;
grant execute on function public.recompute_niche_aggregates() to service_role;
