-- Migration: 035_bridge_events.sql
-- Propósito: Event bus para ponte bidirecional Group Agent ↔ Evo CRM
-- Data: 2026-04-29

-- Tabela de eventos da ponte
CREATE TABLE IF NOT EXISTS bridge_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type    text NOT NULL,
  source        text NOT NULL,       -- 'group_agent' | 'evo_crm'
  target        text NOT NULL,       -- 'evo_crm' | 'group_agent'
  payload       jsonb NOT NULL DEFAULT '{}',
  status        text NOT NULL DEFAULT 'pending',
  attempts      int NOT NULL DEFAULT 0,
  last_error    text,
  scheduled_at  timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bridge_events_pending
  ON bridge_events (scheduled_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_bridge_events_company
  ON bridge_events (company_id, created_at DESC);

-- Coluna labels na tabela conversations (para sync de labels do Evo CRM)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'labels'
  ) THEN
    ALTER TABLE conversations ADD COLUMN labels text[] DEFAULT '{}';
  END IF;
END $$;

-- Coluna pipeline_stage na tabela conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'pipeline_stage'
  ) THEN
    ALTER TABLE conversations ADD COLUMN pipeline_stage text;
  END IF;
END $$;

-- RLS
ALTER TABLE bridge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bridge_events_service_role"
  ON bridge_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
