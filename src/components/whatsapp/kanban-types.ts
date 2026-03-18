/**
 * Arquivo: src/components/whatsapp/kanban-types.ts
 * Propósito: Tipos compartilhados para o pipeline Kanban WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

export type RichKanbanCard = {
  id: string;
  title: string | null;
  description: string | null;
  stage_id: string | null;
  source: string | null;
  contact_id: string | null;
  created_at: string | null;
  assigned_to: string | null;
  value_amount: number | null;
  phone: string | null;
  priority: string | null;
  tags: string[] | null;
  conversation_id: string | null;
};

export type KanbanStage = {
  id: string;
  name: string | null;
  position: number | null;
  cards: RichKanbanCard[] | null;
};

export type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
};
