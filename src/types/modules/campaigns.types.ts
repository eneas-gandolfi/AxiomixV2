/**
 * Arquivo: src/types/modules/campaigns.types.ts
 * Propósito: Tipos compartilhados do modulo Campanhas em Massa.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "completed"
  | "failed"
  | "paused";

export type RecipientStatus = "pending" | "sent" | "failed" | "skipped";

export type DeliveryStatus = "sent_to_provider" | "delivered" | "read" | "failed_delivery";

export type CampaignStats = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  delivered?: number;
  read?: number;
};

export type CampaignFilters = {
  labelIds?: string[];
  gender?: string;
  createdAfter?: string;
  createdBefore?: string;
  importedPhones?: string[];
};

export type Campaign = {
  id: string;
  company_id: string;
  name: string;
  template_name: string;
  language: string;
  body_params_template: string[];
  header_params_template: string[];
  inbox_id: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: CampaignStats;
  filters: CampaignFilters;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  qstash_message_id: string | null;
};

export type CampaignRecipient = {
  id: string;
  campaign_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_phone: string;
  status: RecipientStatus;
  sent_at: string | null;
  error_message: string | null;
  variables: Record<string, string>;
  created_at: string;
  delivery_status: DeliveryStatus | null;
  delivery_updated_at: string | null;
  provider_message_id: string | null;
};

export type CreateCampaignInput = {
  company_id: string;
  name: string;
  template_name: string;
  language?: string;
  body_params_template?: string[];
  header_params_template?: string[];
  inbox_id: string;
  filters?: CampaignFilters;
  scheduled_at?: string | null;
  created_by?: string | null;
};

export type UpdateCampaignInput = Partial<
  Pick<
    Campaign,
    | "name"
    | "template_name"
    | "language"
    | "body_params_template"
    | "header_params_template"
    | "inbox_id"
    | "filters"
    | "scheduled_at"
  >
>;

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  running: "Enviando",
  completed: "Concluída",
  failed: "Falhou",
  paused: "Pausada",
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "#8A8A8A",
  scheduled: "#1677FF",
  running: "#FA8C16",
  completed: "#52C41A",
  failed: "#FF4D4F",
  paused: "#FADB14",
};

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhou",
  skipped: "Ignorado",
};

export const RECIPIENT_STATUS_COLORS: Record<RecipientStatus, string> = {
  pending: "#8A8A8A",
  sent: "#52C41A",
  failed: "#FF4D4F",
  skipped: "#FADB14",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  sent_to_provider: "Enviado",
  delivered: "Entregue",
  read: "Lido",
  failed_delivery: "Falha na entrega",
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  sent_to_provider: "#1677FF",
  delivered: "#52C41A",
  read: "var(--module-accent)",
  failed_delivery: "#FF4D4F",
};

export const DEFAULT_CAMPAIGN_STATS: CampaignStats = {
  total: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  delivered: 0,
  read: 0,
};
