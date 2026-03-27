-- Migration: 021_conversation_contact_enrichment
-- Propósito: Adicionar campos de enriquecimento de contato do Sofia CRM
-- Autor: AXIOMIX
-- Data: 2026-03-27

-- ID externo do contato no Sofia CRM (para chamadas de API como labels/kanban)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_external_id text;

-- Email do contato (vem na resposta de conversas do Sofia CRM, sem API call extra)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_email text;

-- Labels do contato no Sofia CRM (sync bidirecional futuro)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_labels jsonb DEFAULT '[]';

-- Índice para buscar por contact_external_id
CREATE INDEX IF NOT EXISTS idx_conversations_contact_external_id
  ON conversations (contact_external_id)
  WHERE contact_external_id IS NOT NULL;
