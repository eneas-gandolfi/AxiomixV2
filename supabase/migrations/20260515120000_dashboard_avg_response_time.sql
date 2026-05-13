-- =====================================================================
-- Migration: dashboard_avg_response_time RPC
-- Data: 2026-05-13 (Fase 2.5 — KPI "Tempo médio de resposta")
-- =====================================================================
-- Calcula tempo médio entre uma mensagem inbound do cliente e a próxima
-- mensagem outbound do agente, dentro de uma janela. Usado pelo KPI
-- "Tempo médio de resposta" no dashboard.
--
-- Estratégia: window function LAG() por conversation_id ordenando por
-- sent_at. Para cada outbound, calcula delta com a inbound imediatamente
-- anterior (na mesma conversa, dentro da janela).
--
-- Index reutilizado: idx_messages_conversation_sent
--   (conversation_id, sent_at asc) — definido em 003_whatsapp_intelligence
-- =====================================================================

create or replace function public.dashboard_avg_response_time(
  p_company_id uuid,
  p_window_days int default 7
)
returns table (
  avg_seconds numeric,
  sample_size bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ordered as (
    select
      conversation_id,
      direction,
      sent_at,
      lag(sent_at) over (
        partition by conversation_id
        order by sent_at asc
      ) as prev_sent_at,
      lag(direction) over (
        partition by conversation_id
        order by sent_at asc
      ) as prev_direction
    from public.messages
    where company_id = p_company_id
      and sent_at >= now() - (p_window_days || ' days')::interval
      and sent_at is not null
  ),
  response_times as (
    select extract(epoch from (sent_at - prev_sent_at)) as response_seconds
    from ordered
    where direction = 'outbound'
      and prev_direction = 'inbound'
      and prev_sent_at is not null
      -- Sanity check: ignora pares com mais de 7 dias de gap (ruído).
      and sent_at - prev_sent_at <= interval '7 days'
  )
  select
    avg(response_seconds)::numeric as avg_seconds,
    count(*)::bigint as sample_size
  from response_times;
$$;

comment on function public.dashboard_avg_response_time(uuid, int) is
'Tempo médio de resposta (segundos) entre inbound do cliente e outbound do agente, na janela em dias. Retorna avg_seconds=NULL e sample_size=0 quando não há pares.';

-- RLS: a função é SECURITY DEFINER e filtra explicitamente por company_id no
-- argumento. O caller já deve ter validado o companyId via auth/membership
-- antes de chamar (padrão do dashboard, ver getDashboardBootstrap).
grant execute on function public.dashboard_avg_response_time(uuid, int)
  to authenticated, service_role;
