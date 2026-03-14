-- Arquivo: database/migrations/001_auth_multi_tenant.sql
-- Propósito: Criar base de autenticação e multi-tenancy com RLS para o Task 2.
-- Autor: AXIOMIX
-- Data: 2026-03-11

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text,
  sub_niche text,
  website_url text,
  slug text unique not null,
  logo_url text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  unique (user_id, company_id)
);

create index if not exists idx_memberships_user_id on public.memberships (user_id);
create index if not exists idx_memberships_company_id on public.memberships (company_id);
create index if not exists idx_memberships_role on public.memberships (role);

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.memberships enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop policy if exists companies_select_by_membership on public.companies;
create policy companies_select_by_membership
on public.companies
for select
using (
  exists (
    select 1
    from public.memberships m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
  )
);

drop policy if exists companies_insert_authenticated on public.companies;
create policy companies_insert_authenticated
on public.companies
for insert
with check (auth.role() = 'authenticated');

drop policy if exists companies_update_owner_admin on public.companies;
create policy companies_update_owner_admin
on public.companies
for update
using (
  exists (
    select 1
    from public.memberships m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.company_id = companies.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists users_select_self on public.users;
create policy users_select_self
on public.users
for select
using (id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists memberships_select_self on public.memberships;
create policy memberships_select_self
on public.memberships
for select
using (user_id = auth.uid());

drop policy if exists memberships_insert_owner_self on public.memberships;
create policy memberships_insert_owner_self
on public.memberships
for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
);

drop policy if exists memberships_update_owner_admin on public.memberships;
create policy memberships_update_owner_admin
on public.memberships
for update
using (
  exists (
    select 1
    from public.memberships m
    where m.company_id = memberships.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.company_id = memberships.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists memberships_delete_owner_admin on public.memberships;
create policy memberships_delete_owner_admin
on public.memberships
for delete
using (
  exists (
    select 1
    from public.memberships m
    where m.company_id = memberships.company_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);
