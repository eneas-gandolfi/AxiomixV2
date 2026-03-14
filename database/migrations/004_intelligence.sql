-- Arquivo: database/migrations/004_intelligence.sql
-- Proposito: Criar tabelas do modulo Intelligence (concorrentes + radar) com RLS.
-- Autor: AXIOMIX
-- Data: 2026-03-11

create table if not exists public.competitor_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  name text not null,
  website_url text,
  instagram_url text,
  linkedin_url text,
  created_at timestamptz default now()
);

create index if not exists idx_competitor_profiles_company_created
on public.competitor_profiles (company_id, created_at desc);

create table if not exists public.collected_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  source_type text not null check (source_type in ('competitor', 'radar')),
  competitor_id uuid references public.competitor_profiles (id) on delete set null,
  platform text check (platform in ('instagram', 'linkedin', 'tiktok')),
  post_url text,
  content text,
  likes_count int default 0,
  comments_count int default 0,
  shares_count int default 0,
  engagement_score int default 0,
  posted_at timestamptz,
  collected_at timestamptz default now()
);

create index if not exists idx_collected_posts_company_collected
on public.collected_posts (company_id, collected_at desc);

create index if not exists idx_collected_posts_company_source
on public.collected_posts (company_id, source_type);

create index if not exists idx_collected_posts_company_platform
on public.collected_posts (company_id, platform);

create index if not exists idx_collected_posts_company_engagement
on public.collected_posts (company_id, engagement_score desc);

create table if not exists public.intelligence_insights (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  source_type text not null check (source_type in ('competitor', 'radar')),
  competitor_id uuid references public.competitor_profiles (id) on delete set null,
  analysis_type text,
  content text,
  top_themes jsonb default '[]'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  generated_at timestamptz default now()
);

create index if not exists idx_intelligence_insights_company_generated
on public.intelligence_insights (company_id, generated_at desc);

create index if not exists idx_intelligence_insights_company_source
on public.intelligence_insights (company_id, source_type);

alter table public.competitor_profiles enable row level security;
alter table public.collected_posts enable row level security;
alter table public.intelligence_insights enable row level security;

drop policy if exists competitor_profiles_company_isolation on public.competitor_profiles;
create policy competitor_profiles_company_isolation
on public.competitor_profiles
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

drop policy if exists collected_posts_company_isolation on public.collected_posts;
create policy collected_posts_company_isolation
on public.collected_posts
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

drop policy if exists intelligence_insights_company_isolation on public.intelligence_insights;
create policy intelligence_insights_company_isolation
on public.intelligence_insights
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
