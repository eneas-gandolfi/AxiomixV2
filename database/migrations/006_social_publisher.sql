-- Arquivo: database/migrations/006_social_publisher.sql
-- Proposito: Criar tabelas do modulo Social Publisher com RLS e indices.
-- Autor: AXIOMIX
-- Data: 2026-03-11

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz default now()
);

create index if not exists idx_media_files_company_created
on public.media_files (company_id, created_at desc);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  post_type text not null check (post_type in ('photo', 'video', 'carousel')),
  media_file_ids uuid[] not null,
  caption text,
  platforms jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz not null,
  qstash_message_id text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'published', 'partial', 'failed', 'cancelled')),
  progress jsonb default '{}'::jsonb,
  external_post_ids jsonb default '{}'::jsonb,
  error_details jsonb default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_scheduled_posts_company_created
on public.scheduled_posts (company_id, created_at desc);

create index if not exists idx_scheduled_posts_company_status
on public.scheduled_posts (company_id, status);

create index if not exists idx_scheduled_posts_company_scheduled
on public.scheduled_posts (company_id, scheduled_at desc);

alter table public.media_files enable row level security;
alter table public.scheduled_posts enable row level security;

drop policy if exists media_files_company_isolation on public.media_files;
create policy media_files_company_isolation
on public.media_files
for all
using (
  company_id in (
    select m.company_id
    from public.memberships m
    where m.user_id = auth.uid()
  )
)
with check (
  company_id in (
    select m.company_id
    from public.memberships m
    where m.user_id = auth.uid()
  )
);

drop policy if exists scheduled_posts_company_isolation on public.scheduled_posts;
create policy scheduled_posts_company_isolation
on public.scheduled_posts
for all
using (
  company_id in (
    select m.company_id
    from public.memberships m
    where m.user_id = auth.uid()
  )
)
with check (
  company_id in (
    select m.company_id
    from public.memberships m
    where m.user_id = auth.uid()
  )
);
