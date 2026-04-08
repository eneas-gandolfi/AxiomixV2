-- Arquivo: database/migrations/022_group_hidden.sql
-- Proposito: Adicionar coluna is_hidden para ocultar grupos da lista principal.
-- Autor: AXIOMIX
-- Data: 2026-04-07

ALTER TABLE public.group_agent_configs
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
