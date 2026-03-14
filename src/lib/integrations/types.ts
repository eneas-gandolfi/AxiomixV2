/**
 * Arquivo: src/lib/integrations/types.ts
 * Proposito: Definir tipos das integracoes suportadas e seus metadados de conexao.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

export const integrationTypes = ["sofia_crm", "evolution_api", "upload_post", "openrouter"] as const;

export type IntegrationType = (typeof integrationTypes)[number];
export type IntegrationTestStatus = "ok" | "error";

export type SofiaCrmConfig = {
  baseUrl: string;
  apiToken: string;
  inboxId: string;
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
  sofia_crm: SofiaCrmConfig;
  evolution_api: EvolutionApiConfig;
  upload_post: UploadPostConfig;
  openrouter: OpenRouterConfig;
};
