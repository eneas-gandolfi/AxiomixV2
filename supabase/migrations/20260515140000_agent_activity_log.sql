-- Migration: 20260515140000_agent_activity_log
-- Audit imutavel de eventos por agente IA (Evo CRM): ativacao, edicao,
-- vinculacao a inbox, mensagens atendidas, erros. Le-se na pagina de detalhe.

create table if not exists public.agent_activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  agent_id text not null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.agent_activity_log is 'Eventos imutaveis por agente IA: toggle, config_updated, inbox_linked/unlinked, message_handled, error, created/deleted.';
comment on column public.agent_activity_log.agent_id is 'UUID do agente no Evo CRM (recurso externo, mantido como text).';
comment on column public.agent_activity_log.event_type is 'Tipo do evento (string enum-like) — validado pelo helper logAgentActivity.';
comment on column public.agent_activity_log.details is 'Payload especifico do evento (changed[], inbox_id, message_id, error code, etc.).';
comment on column public.agent_activity_log.actor_user_id is 'Usuario que disparou (NULL para eventos de sistema, webhook).';

create index if not exists idx_agent_activity_log_timeline
  on public.agent_activity_log (company_id, agent_id, created_at desc);
create index if not exists idx_agent_activity_log_event_type
  on public.agent_activity_log (company_id, agent_id, event_type, created_at desc);

alter table public.agent_activity_log enable row level security;

-- SELECT: membros da company podem ler timeline propria
create policy agent_activity_log_select_member on public.agent_activity_log
  for select using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: sem policy = bloqueado para anon/authenticated.
-- Writes acontecem via service_role (createSupabaseAdminClient) a partir
-- do helper src/lib/whatsapp/agent-activity.ts. Eventos sao imutaveis por design.
