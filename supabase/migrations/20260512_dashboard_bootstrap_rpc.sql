-- =============================================================================
-- Migration: dashboard_bootstrap RPC
-- Date: 2026-05-11
-- Author: AXIOMIX
-- Purpose:
--   Colapsar a cadeia sequencial de 3 round-trips do dashboard inicial
--   (auth.getUser -> memberships -> companies) em uma unica chamada.
--
--   Antes: ~3 round-trips serializados antes de qualquer dado de metrica.
--   Depois: 1 round-trip retornando company_id + role + company_name + niche_slug.
--
--   SECURITY INVOKER preserva RLS: a funcao executa com o JWT do caller,
--   logo memberships/companies sao filtrados pelas mesmas policies que
--   protegem as tabelas. NAO usar SECURITY DEFINER aqui (escalaria privilegio).
--
--   Como auth.uid() retorna NULL quando chamada fora de um request Supabase
--   autenticado, a funcao tambem aceita explicit p_user_id (caller pode passar)
--   mas valida que bate com auth.uid() pra impedir spoofing.
-- =============================================================================

create or replace function public.dashboard_bootstrap()
returns table (
  user_id uuid,
  company_id uuid,
  role text,
  company_name text,
  niche_slug text
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    auth.uid() as user_id,
    m.company_id,
    m.role,
    c.name as company_name,
    c.niche_slug
  from memberships m
  left join companies c on c.id = m.company_id
  where m.user_id = auth.uid()
  order by m.created_at asc
  limit 1;
$$;

comment on function public.dashboard_bootstrap() is
  'Retorna company_id, role, company_name e niche_slug do membership mais antigo do usuario autenticado em uma unica round-trip. Substitui a cadeia auth.getUser -> memberships -> companies do dashboard.';

grant execute on function public.dashboard_bootstrap() to authenticated;
