-- Arquivo: database/migrations/028_social_publisher_improvements.sql
-- Proposito: Melhorias do Social Publisher pos-QStash:
--   - updated_at + trigger em scheduled_posts
--   - RPC claim_due_scheduled_posts (lock atomico para o poller)
--   - remove qstash_message_id (agendamento agora e 100% local)
--   - timezone por empresa
-- Autor: AXIOMIX
-- Data: 2026-04-15

-- 1) Coluna updated_at + trigger generico reutilizavel
create or replace function public.social_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.scheduled_posts
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_scheduled_posts_updated_at on public.scheduled_posts;
create trigger trg_scheduled_posts_updated_at
  before update on public.scheduled_posts
  for each row
  execute function public.social_set_updated_at();

-- 2) Timezone por empresa (default America/Sao_Paulo)
alter table public.companies
  add column if not exists timezone text not null default 'America/Sao_Paulo';

-- 3) Drop qstash_message_id (nao e mais usado)
alter table public.scheduled_posts
  drop column if exists qstash_message_id;

-- 4) Index para o poller (scheduled vencidos + processing travados)
drop index if exists public.scheduled_posts_due_idx;
create index if not exists scheduled_posts_poller_idx
  on public.scheduled_posts (scheduled_at)
  where status in ('scheduled', 'processing');

-- 5) RPC claim_due_scheduled_posts
--    Reserva ate N posts vencidos, marca como 'processing' numa unica transacao,
--    e retorna os claims para o poller publicar.
--    Tambem captura posts travados em 'processing' ha mais de 5 minutos.
create or replace function public.claim_due_scheduled_posts(p_batch_size int default 20)
returns table (
  id uuid,
  company_id uuid,
  attempt_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select sp.id
    from public.scheduled_posts sp
    where
      (sp.status = 'scheduled' and sp.scheduled_at <= now())
      or (sp.status = 'processing' and sp.updated_at < now() - interval '5 minutes')
    order by sp.scheduled_at asc
    limit greatest(p_batch_size, 1)
    for update skip locked
  ),
  claimed as (
    update public.scheduled_posts sp
       set status = 'processing'
      from due
     where sp.id = due.id
     returning sp.id, sp.company_id, sp.attempt_count
  )
  select c.id, c.company_id, c.attempt_count
  from claimed c;
end;
$$;

grant execute on function public.claim_due_scheduled_posts(int) to service_role;
