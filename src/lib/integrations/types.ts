/**
 * Arquivo: src/lib/integrations/types.ts
 * Propósito: Definir tipos das integracoes suportadas e seus metadados de conexao.
 * Autor: AXIOMIX
 * Data: 2026-04-17
 */

export const integrationTypes = ["evo_crm", "evolution_api", "upload_post", "openrouter"] as const;

export type IntegrationType = (typeof integrationTypes)[number];
export type IntegrationTestStatus = "ok" | "error";

export type EvoCrmConfig = {
  /** URL base da API Rails do Evo CRM (ex: https://api.getlead.capital) — sem trailing /api. */
  baseUrl: string;
  /** Token enviado no header `apikey` em todas as chamadas. */
  apiToken: string;
  /** Inbox padrão usada ao iniciar novas conversas. */
  inboxId?: string;
  /** IDs de inboxes a sincronizar. Vazio = todas. */
  syncInboxIds?: string[];
  /** Secret usado para validar webhooks entrantes (HMAC-SHA256 sobre o body). */
  webhookSecret?: string;
};

export type EvolutionVendorStatus = "pending" | "connected" | "error";

export type EvolutionVendor = {
  id: string;
  vendorName: string;
  instanceName: string;
  status: EvolutionVendorStatus;
  qrCodeSource?: string | null;
  lastQrAt?: string | null;
  connectedAt?: string | null;
  lastError?: string | null;
};

export type EvolutionApiConfig = {
  managerPhone: string;
  baseUrl?: string;
  apiKey?: string;
  vendors?: EvolutionVendor[];
};

export type SocialPlatform = "instagram" | "linkedin" | "tiktok" | "facebook";
export type SocialConnectionStatus = "pending" | "connected" | "error";

export type UploadPostSocialConnection = {
  id: string;
  platform: SocialPlatform;
  status: SocialConnectionStatus;
  externalConnectionId?: string | null;
  accountName?: string | null;
  connectUrl?: string | null;
  connectedAt?: string | null;
  lastError?: string | null;
};

export type UploadPostConfig = {
  apiKey?: string;
  profileId?: string;
  profileName?: string;
  profileStatus?: SocialConnectionStatus;
  profileCreatedAt?: string;
  socialConnections?: UploadPostSocialConnection[];
};

export type OpenRouterConfig = {
  apiKey: string;
  model: string;
};

export type IntegrationConfigByType = {
  evo_crm: EvoCrmConfig;
  evolution_api: EvolutionApiConfig;
  upload_post: UploadPostConfig;
  openrouter: OpenRouterConfig;
};
