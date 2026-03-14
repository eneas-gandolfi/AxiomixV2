-- Migration: 008_hashtag_groups.sql
-- Propósito: Criar tabela de grupos de hashtags para o Social Publisher
-- Autor: AXIOMIX
-- Data: 2026-03-13

CREATE TABLE IF NOT EXISTS public.hashtag_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  hashtags    text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_hashtag_groups_company_id ON public.hashtag_groups(company_id);

ALTER TABLE public.hashtag_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage hashtag groups"
  ON public.hashtag_groups FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access on hashtag_groups"
  ON public.hashtag_groups FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.handle_hashtag_groups_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hashtag_groups_updated_at
  BEFORE UPDATE ON public.hashtag_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_hashtag_groups_updated_at();
