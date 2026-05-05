-- =============================================================================
-- Migration: Company niche config (niche_slug, business_hours, vocabulary_overrides)
-- Date: 2026-05-05
-- Author: AXIOMIX
-- Purpose:
--   Adiciona configuracao por nicho na tabela companies para suportar:
--     - Lista curada de nichos (niche_slug) com defaults inteligentes
--     - Horario de atendimento (business_hours) usado pra exclusao de janela do TFR
--     - Vocabulario customizavel por tenant (vocabulary_overrides)
--
--   Mantem coluna `niche` (text livre) por compatibilidade com tenants ja
--   cadastrados. niche_slug e a referencia canonica daqui em diante.
-- =============================================================================

alter table public.companies
  add column if not exists niche_slug text,
  add column if not exists business_hours jsonb,
  add column if not exists vocabulary_overrides jsonb;

comment on column public.companies.niche_slug is
  'Slug canonico do nicho (varejo, ecommerce, saude, ...). Validado em src/lib/niches.ts. NULL = onboarding antigo (free text em niche).';

comment on column public.companies.business_hours is
  'Horario de atendimento por dia da semana. Schema: {mon: {open, close} | null, tue: ..., sun: ...}. NULL = sem janela definida (cronometro nao pausa).';

comment on column public.companies.vocabulary_overrides is
  'Customizacao opcional do vocabulario do nicho. Schema: {operatorSingular?, operatorPlural?, customerSingular?, customerPlural?, primaryKpiLabel?}. NULL = usa defaults do niche_slug.';

create index if not exists companies_niche_slug_idx
  on public.companies (niche_slug)
  where niche_slug is not null;

-- =============================================================================
-- Constraint leve: niche_slug deve ser um dos valores conhecidos OU NULL.
-- Lista canonica vem de src/lib/niches.ts. Se a lista mudar, atualizar aqui
-- via nova migration. NAO usar enum Postgres (rigidez bloqueia evolucao).
-- =============================================================================

alter table public.companies
  drop constraint if exists companies_niche_slug_check;

alter table public.companies
  add constraint companies_niche_slug_check
  check (
    niche_slug is null or niche_slug in (
      'varejo',
      'ecommerce',
      'restaurante',
      'imobiliario',
      'saude',
      'beleza',
      'educacao',
      'juridico',
      'servicos',
      'b2b_saas',
      'outro'
    )
  );
