-- Migration: 009_content_demands.sql
-- Propósito: Criar tabelas para workflow de aprovação de conteúdo (demandas)
-- Autor: AXIOMIX
-- Data: 2026-03-13

CREATE TABLE IF NOT EXISTS public.content_demands (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title                     text NOT NULL,
  description               text,
  assigned_to               uuid REFERENCES public.users(id) ON DELETE SET NULL,
  platforms                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_date                  timestamptz,
  status                    text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','em_revisao','alteracoes_solicitadas','aprovado','agendado','publicado')),
  media_file_ids            uuid[] NOT NULL DEFAULT '{}',
  caption                   text,
  scheduled_post_id         uuid REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  approval_token            text UNIQUE,
  approval_token_expires_at timestamptz,
  created_by                uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX idx_content_demands_company ON public.content_demands(company_id);
CREATE INDEX idx_content_demands_status ON public.content_demands(status);
CREATE INDEX idx_content_demands_assigned ON public.content_demands(assigned_to);
CREATE INDEX idx_content_demands_token ON public.content_demands(approval_token);

CREATE TABLE IF NOT EXISTS public.demand_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id   uuid NOT NULL REFERENCES public.content_demands(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_name text,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_demand_comments_demand ON public.demand_comments(demand_id);

CREATE TABLE IF NOT EXISTS public.demand_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id   uuid NOT NULL REFERENCES public.content_demands(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  from_status text NOT NULL,
  to_status   text NOT NULL,
  comment     text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_demand_history_demand ON public.demand_history(demand_id);

-- RLS
ALTER TABLE public.content_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage demands"
  ON public.content_demands FOR ALL
  USING (company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY "Company members can manage comments"
  ON public.demand_comments FOR ALL
  USING (demand_id IN (
    SELECT id FROM public.content_demands WHERE company_id IN (
      SELECT company_id FROM public.memberships WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Company members can read history"
  ON public.demand_history FOR SELECT
  USING (demand_id IN (
    SELECT id FROM public.content_demands WHERE company_id IN (
      SELECT company_id FROM public.memberships WHERE user_id = auth.uid()
    )
  ));

-- Service role bypass
CREATE POLICY "Service role on content_demands" ON public.content_demands FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role on demand_comments" ON public.demand_comments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role on demand_history" ON public.demand_history FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.handle_content_demands_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_demands_updated_at
  BEFORE UPDATE ON public.content_demands
  FOR EACH ROW EXECUTE FUNCTION public.handle_content_demands_updated_at();
