-- Arquivo: database/migrations/027_scheduled_posts_attempts.sql
-- Proposito: Adicionar contador de tentativas para retry do poller local de publicacoes sociais.
-- Autor: AXIOMIX
-- Data: 2026-04-15

alter table public.scheduled_posts
  add column if not exists attempt_count integer not null default 0;

create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts (scheduled_at)
  where status = 'scheduled';
