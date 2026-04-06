/**
 * Arquivo: src/lib/integrations/service.ts
 * Propósito: Validar, serializar e testar integrações por empresa.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import type { Json, Database } from "@/database/types/database.types";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import type {
  EvolutionApiConfig,
  EvolutionVendor,
  IntegrationConfigByType,
  IntegrationType,
  OpenRouterConfig,
  SofiaCrmConfig,
  UploadPostConfig,
  UploadPostSocialConnection,
} from "@/lib/integrations/types";

const baseUrlSchema = z
  .string()
  .trim()
  .url("Informe uma URL válida.")
  .transform((value) => value.replace(/\/+$/, ""));

const requiredSecretSchema = z.string().trim().min(1, "Campo obrigatório.");

const sofiaCrmSchema: z.ZodType<SofiaCrmConfig> = z.object({
  baseUrl: baseUrlSchema,
  apiToken: requiredSecretSchema,
  inboxId: z.string().trim().min(1).optional(),
});

const evolutionVendorSchema: z.ZodType<EvolutionVendor> = z.object({
  id: z.string().trim().min(1),
  vendorName: z.string().trim().min(2),
  instanceName: z.string().trim().min(2),
  status: z.enum(["pending", "connected", "error"]),
  qrCodeSource: z.string().trim().optional().nullable(),
  lastQrAt: z.string().trim().optional().nullable(),
  connectedAt: z.string().trim().optional().nullable(),
  lastError: z.string().trim().optional().nullable(),
});

const evolutionApiSchema: z.ZodType<EvolutionApiConfig> = z.object({
  managerPhone: z
    .string()
    .trim()
    .min(8, "Número do gestor inválido.")
    .transform((value) => normalizeWhatsAppPhone(value)),
  baseUrl: baseUrlSchema.optional(),
  apiKey: requiredSecretSchema.optional(),
  vendors: z.array(evolutionVendorSchema).optional(),
});

const uploadPostConnectionSchema: z.ZodType<UploadPostSocialConnection> = z.object({
  id: z.string().trim().min(1),
  platform: z.enum(["instagram", "linkedin", "tiktok"]),
  status: z.enum(["pending", "connected", "error"]),
  externalConnectionId: z.string().trim().optional().nullable(),
  accountName: z.string().trim().optional().nullable(),
  connectUrl: z.string().trim().optional().nullable(),
  connectedAt: z.string().trim().optional().nullable(),
  lastError: z.string().trim().optional().nullable(),
});

const uploadPostSchema: z.ZodType<UploadPostConfig> = z.object({
  apiKey: requiredSecretSchema.optional(),
  profileId: z.string().trim().min(1).optional(),
  profileName: z.string().trim().min(2).optional(),
  profileStatus: z.enum(["pending", "connected", "error"]).optional(),
  profileCreatedAt: z.string().trim().optional(),
  socialConnections: z.array(uploadPostConnectionSchema).optional(),
});

const openRouterSchema: z.ZodType<OpenRouterConfig> = z.object({
  apiKey: requiredSecretSchema,
  model: z.string().trim().min(3, "Modelo inválido.").default("openai/gpt-5-nano"),
});

function assertObjectPayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("Payload inválido para integração.");
  }

  return payload as Record<string, unknown>;
}

type IntegrationPublicConfig = {
  [key: string]: string | number | null;
};

type IntegrationTestResult = {
  ok: boolean;
  detail: string;
  detectedConfig?: Partial<Record<string, string>>;
};

function parseVendors(raw: unknown): EvolutionVendor[] {
  const parsed = z.array(evolutionVendorSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function parseSocialConnections(raw: unknown): UploadPostSocialConnection[] {
  const parsed = z.array(uploadPostConnectionSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function decryptIfEncrypted(payload: unknown) {
  if (typeof payload !== "string" || payload.trim().length === 0) {
    return "";
  }

  const normalized = payload.trim();
  if (!normalized.startsWith("enc:v1:")) {
    return normalized;
  }

  return decryptSecret(normalized);
}

function resolveSofiaBaseUrl(configBaseUrl?: string) {
  const source = configBaseUrl?.trim() || "";
  const normalized = source.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

function resolveEvolutionBaseUrl(configBaseUrl?: string) {
  const envVar =
    process.env.EVOLUTION_API_URL?.trim() || process.env.EVOLUTION_API_BASE_URL?.trim();
  const source = envVar || configBaseUrl?.trim() || "";
  return source.replace(/\/+$/, "");
}

function resolveEvolutionApiKey(configApiKey?: string) {
  return configApiKey?.trim() || process.env.EVOLUTION_API_KEY?.trim() || "";
}

function resolveUploadPostApiKey(configApiKey?: string) {
  return configApiKey?.trim() || process.env.UPLOAD_POST_API_KEY?.trim() || "";
}

function resolveUploadPostBaseUrl(configBaseUrl?: string) {
  const fallback =
    process.env.UPLOAD_POST_API_URL?.trim() || process.env.UPLOAD_POST_API_BASE_URL?.trim();
  const source = configBaseUrl?.trim() || fallback || "";
  return source.replace(/\/+$/, "");
}

function buildUploadPostApiUrl(baseUrl: string, path: string) {
  if (!baseUrl) {
    return "";
  }

  const normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/api") && path.startsWith("/api/")) {
    return `${normalized}${path.slice(4)}`;
  }

  return `${normalized}${path}`;
}

export function parseIntegrationType(value: string): IntegrationType {
  const schema = z.enum(["sofia_crm", "evolution_api", "upload_post", "openrouter"]);
  return schema.parse(value);
}

export function parseIntegrationConfig<T extends IntegrationType>(
  type: T,
  payload: unknown
): IntegrationConfigByType[T] {
  const objectPayload = assertObjectPayload(payload);

  switch (type) {
    case "sofia_crm":
      return sofiaCrmSchema.parse(objectPayload) as IntegrationConfigByType[T];
    case "evolution_api":
      return evolutionApiSchema.parse(objectPayload) as IntegrationConfigByType[T];
    case "upload_post":
      return uploadPostSchema.parse(objectPayload) as IntegrationConfigByType[T];
    case "openrouter":
      return openRouterSchema.parse(objectPayload) as IntegrationConfigByType[T];
    default:
      throw new Error("Tipo de integração não suportado.");
  }
}

export function encodeIntegrationConfig<T extends IntegrationType>(
  type: T,
  config: IntegrationConfigByType[T]
): Json {
  switch (type) {
    case "sofia_crm": {
      const data = config as SofiaCrmConfig;
      const encoded: Record<string, Json> = {
        base_url: data.baseUrl,
        api_token_encrypted: encryptSecret(data.apiToken),
      };
      if (data.inboxId) {
        encoded.inbox_id = data.inboxId;
      }
      return encoded;
    }
    case "evolution_api": {
      const data = config as EvolutionApiConfig;
      const payload: Record<string, Json> = {
        manager_phone: normalizeWhatsAppPhone(data.managerPhone),
      };

      if (data.baseUrl) {
        payload.base_url = data.baseUrl;
      }

      if (data.apiKey) {
        payload.api_key_encrypted = encryptSecret(data.apiKey);
      }

      if (Array.isArray(data.vendors)) {
        payload.vendors = data.vendors as unknown as Json;
      }

      return payload;
    }
    case "upload_post": {
      const data = config as UploadPostConfig;
      const payload: Record<string, Json> = {};

      if (data.apiKey) {
        payload.api_key_encrypted = encryptSecret(data.apiKey);
      }
      if (data.profileId) {
        payload.profile_id = data.profileId;
      }
      if (data.profileName) {
        payload.profile_name = data.profileName;
      }
      if (data.profileStatus) {
        payload.profile_status = data.profileStatus;
      }
      if (data.profileCreatedAt) {
        payload.profile_created_at = data.profileCreatedAt;
      }
      if (Array.isArray(data.socialConnections)) {
        payload.social_connections = data.socialConnections as unknown as Json;
      }

      return payload;
    }
    case "openrouter": {
      const data = config as OpenRouterConfig;
      return {
        model: data.model,
        api_key_encrypted: encryptSecret(data.apiKey),
      };
    }
    default:
      throw new Error("Tipo de integração não suportado.");
  }
}

export function decodeIntegrationConfig<T extends IntegrationType>(
  type: T,
  payload: Json | null
): IntegrationConfigByType[T] {
  const config = assertObjectPayload(payload ?? {});

  switch (type) {
    case "sofia_crm": {
      const inboxId = typeof config.inbox_id === "string" ? config.inbox_id : undefined;
      return {
        baseUrl: String(config.base_url ?? ""),
        apiToken: decryptIfEncrypted(config.api_token_encrypted ?? config.api_token),
        inboxId: inboxId || undefined,
      } as IntegrationConfigByType[T];
    }
    case "evolution_api": {
      let decrypted = "";
      try {
        decrypted = decryptIfEncrypted(config.api_key_encrypted ?? config.api_key);
      } catch (err) {
        console.warn(
          "[decodeIntegrationConfig] Falha ao decriptar api_key da Evolution API, usando fallback env var:",
          err instanceof Error ? err.message : err
        );
      }
      const apiKey = resolveEvolutionApiKey(decrypted);
      const baseUrl = resolveEvolutionBaseUrl(
        typeof config.base_url === "string" ? config.base_url : undefined
      );

      return {
        baseUrl: baseUrl || undefined,
        managerPhone: normalizeWhatsAppPhone(String(config.manager_phone ?? "")),
        apiKey: apiKey || undefined,
        vendors: parseVendors(config.vendors),
      } as IntegrationConfigByType[T];
    }
    case "upload_post": {
      const decrypted = decryptIfEncrypted(config.api_key_encrypted ?? config.api_key);
      const apiKey = resolveUploadPostApiKey(decrypted);

      return {
        apiKey: apiKey || undefined,
        profileId: typeof config.profile_id === "string" ? config.profile_id : undefined,
        profileName: typeof config.profile_name === "string" ? config.profile_name : undefined,
        profileStatus:
          config.profile_status === "pending" ||
          config.profile_status === "connected" ||
          config.profile_status === "error"
            ? config.profile_status
            : undefined,
        profileCreatedAt:
          typeof config.profile_created_at === "string" ? config.profile_created_at : undefined,
        socialConnections: parseSocialConnections(config.social_connections),
      } as IntegrationConfigByType[T];
    }
    case "openrouter":
      return {
        model: String(config.model ?? "openai/gpt-5-nano"),
        apiKey: decryptIfEncrypted(config.api_key_encrypted ?? config.api_key),
      } as IntegrationConfigByType[T];
    default:
      throw new Error("Tipo de integração não suportado.");
  }
}

export function sanitizeIntegrationConfig(type: IntegrationType, payload: Json | null): IntegrationPublicConfig {
  const config = assertObjectPayload(payload ?? {});

  switch (type) {
    case "sofia_crm":
      return {
        baseUrl: typeof config.base_url === "string" ? config.base_url : null,
        inboxId: typeof config.inbox_id === "string" ? config.inbox_id : null,
        apiToken:
          typeof config.api_token_encrypted === "string" || typeof config.api_token === "string"
            ? "********"
            : null,
      };
    case "evolution_api": {
      const vendors = parseVendors(config.vendors);
      const connected = vendors.filter((vendor) => vendor.status === "connected").length;

      return {
        baseUrl:
          typeof config.base_url === "string"
            ? config.base_url
            : resolveEvolutionBaseUrl() || null,
        managerPhone:
          typeof config.manager_phone === "string"
            ? normalizeWhatsAppPhone(config.manager_phone)
            : null,
        apiKey:
          typeof config.api_key_encrypted === "string" ||
          typeof config.api_key === "string" ||
          Boolean(process.env.EVOLUTION_API_KEY?.trim())
            ? "********"
            : null,
        vendorsCount: vendors.length,
        connectedVendors: connected,
      };
    }
    case "upload_post": {
      const socialConnections = parseSocialConnections(config.social_connections);
      const connected = socialConnections.filter((connection) => connection.status === "connected").length;

      return {
        apiKey:
          typeof config.api_key_encrypted === "string" ||
          typeof config.api_key === "string" ||
          Boolean(process.env.UPLOAD_POST_API_KEY?.trim())
            ? "********"
            : null,
        profileId: typeof config.profile_id === "string" ? config.profile_id : null,
        profileStatus:
          config.profile_status === "pending" ||
          config.profile_status === "connected" ||
          config.profile_status === "error"
            ? config.profile_status
            : null,
        socialConnections: socialConnections.length,
        connectedSocial: connected,
      };
    }
    case "openrouter":
      return {
        model: typeof config.model === "string" ? config.model : "openai/gpt-5-nano",
        apiKey:
          typeof config.api_key_encrypted === "string" || typeof config.api_key === "string"
            ? "********"
            : null,
      };
    default:
      return {};
  }
}

export function buildIntegrationPublicItem(
  row: Database["public"]["Tables"]["integrations"]["Row"]
) {
  return {
    id: row.id,
    type: row.type,
    isActive: Boolean(row.is_active),
    testStatus: row.test_status,
    lastTestedAt: row.last_tested_at,
    config: sanitizeIntegrationConfig(row.type, row.config),
  };
}

function isTlsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const mainMsg = (error.message || "").toUpperCase();
  const cause = (error as Error & { cause?: Error & { code?: string } }).cause;
  const causeMsg = cause ? ((cause.message || "") + (cause.code || "")).toUpperCase() : "";
  
  const combined = `${mainMsg} | ${causeMsg}`;

  // Catch standard node TLS errors and OpenSSL internal alerts (like EPROTO with SSL alert)
  return combined.includes("ERR_SSL") || combined.includes("ERR_TLS") || 
         combined.includes("EPROTO") || combined.includes("SSL") ||
         combined.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
         combined.includes("CERT_HAS_EXPIRED") ||
         combined.includes("DEPTH_ZERO_SELF_SIGNED_CERT") ||
         combined.includes("SELF_SIGNED_CERT_IN_CHAIN");
}

/**
 * Fallback to Node's native https module instead of fetch (undici).
 * Bypasses undici's strict TLS/ALPN negotiation that causes "SSL alert 80" errors
 * with some servers (e.g. crm.getlead.capital). Uses rejectUnauthorized: false
 * because these are external third-party integration endpoints that may use
 * self-signed or incompatible certificates.
 */
function fetchWithHttps(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const https = require("node:https") as typeof import("node:https");

  const parsed = new URL(url);
  const headers = init.headers as Record<string, string> | undefined;

  return new Promise<Response>((resolve, reject) => {
    const req = https.request(
      parsed,
      {
        method: init.method ?? "GET",
        headers,
        timeout: timeoutMs,
        // Allow servers with self-signed or incompatible TLS certs (external integrations)
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve(new Response(body, {
            status: res.statusCode ?? 500,
            statusText: res.statusMessage ?? "",
            headers: res.headers as Record<string, string>,
          }));
        });
      }
    );

    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.on("error", reject);

    if (init.body && typeof init.body === "string") {
      req.write(init.body);
    }
    req.end();
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (isTlsError(error)) {
      console.warn("[fetchWithTimeout] TLS/SSL error via fetch, retentando com https nativo (rejectUnauthorized:false)…");

      try {
        return await fetchWithHttps(url, init, timeoutMs);
      } catch (httpsError) {
        // HTTP downgrade removido por segurança — credenciais não devem trafegar em texto plano.
        throw httpsError;
      }
    }

    throw error;
  }
}

async function readFailureDetail(response: Response) {
  const text = await response.text();
  if (!text) {
    return `HTTP ${response.status}`;
  }

  return `${response.status}: ${text.slice(0, 160)}`;
}

function extractNetworkErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro inesperado";
  }

  // Node.js fetch wraps network errors as TypeError with a `.cause`
  const cause = (error as Error & { cause?: unknown }).cause;

  if (cause instanceof Error) {
    const code = (cause as Error & { code?: string }).code;

    // SSL/TLS errors
    if (code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "CERT_HAS_EXPIRED" ||
        code === "DEPTH_ZERO_SELF_SIGNED_CERT" || code === "SELF_SIGNED_CERT_IN_CHAIN" ||
        code === "ERR_TLS_CERT_ALTNAME_INVALID" || code?.startsWith("ERR_TLS")) {
      return `Certificado SSL inválido (${code}). Verifique o certificado do servidor.`;
    }

    if (code === "EPROTO" || cause.message?.includes("SSL") || code === "ECONNRESET") {
      if (code === "EPROTO" || cause.message?.includes("SSL")) {
        return `Erro de protocolo SSL/TLS (${code || "SSL"}). O servidor pode não suportar a conexão exigida.`;
      }
    }

    // DNS errors
    if (code === "ENOTFOUND") {
      return `DNS não resolvido — o host não foi encontrado. Verifique a URL.`;
    }

    // Connection refused / reset
    if (code === "ECONNREFUSED") {
      return `Conexão recusada pelo servidor. Verifique se o serviço está ativo.`;
    }
    if (code === "ECONNRESET" || code === "EPIPE") {
      return `Conexão interrompida (${code}). Tente novamente.`;
    }

    // Timeout via AbortController
    if (cause.name === "AbortError" || code === "UND_ERR_CONNECT_TIMEOUT") {
      return `Timeout — o servidor não respondeu a tempo.`;
    }

    // Fallback: use cause message + code when available
    return code ? `${cause.message} (${code})` : cause.message;
  }

  // AbortError directly on the error (timeout from our AbortController)
  if (error.name === "AbortError") {
    return "Timeout — o servidor não respondeu a tempo.";
  }

  return error.message;
}

export async function testIntegrationConnection<T extends IntegrationType>(
  type: T,
  config: IntegrationConfigByType[T]
): Promise<IntegrationTestResult> {
  try {
    switch (type) {
      case "sofia_crm": {
        const sofia = config as SofiaCrmConfig;
        const baseUrl = resolveSofiaBaseUrl(sofia.baseUrl);

        if (!baseUrl) {
          return { ok: false, detail: "URL base do Sofia CRM não configurada." };
        }

        const authHeaders = {
          Authorization: `Bearer ${sofia.apiToken}`,
          "Content-Type": "application/json",
        };

        const response = await fetchWithTimeout(`${baseUrl}/api/conversations?limit=1`, {
          method: "GET",
          headers: authHeaders,
        });

        if (!response.ok) {
          return { ok: false, detail: `Sofia CRM falhou: ${await readFailureDetail(response)}` };
        }

        // Auto-detectar inbox WhatsApp
        let detectedInboxId: string | undefined;
        try {
          const inboxesResponse = await fetchWithTimeout(`${baseUrl}/api/inboxes`, {
            method: "GET",
            headers: authHeaders,
          });

          if (inboxesResponse.ok) {
            const inboxesPayload = await inboxesResponse.json() as unknown;
            const inboxes = Array.isArray(inboxesPayload) ? inboxesPayload : [];
            const whatsappInbox = inboxes.find(
              (inbox: Record<string, unknown>) =>
                typeof inbox.type === "string" && inbox.type.startsWith("whatsapp")
            );
            if (whatsappInbox && typeof whatsappInbox.id !== "undefined") {
              detectedInboxId = String(whatsappInbox.id);
            }
          }
        } catch {
          // Inbox auto-detection is optional — sync still works without it.
        }

        return {
          ok: true,
          detail: detectedInboxId
            ? `Conexão validada. Inbox WhatsApp detectado: ${detectedInboxId}.`
            : "Conexão validada. Nenhum inbox WhatsApp detectado.",
          detectedConfig: detectedInboxId ? { inboxId: detectedInboxId } : undefined,
        };
      }
      case "evolution_api": {
        const evolution = config as EvolutionApiConfig;
        const baseUrl = resolveEvolutionBaseUrl(evolution.baseUrl);
        const apiKey = resolveEvolutionApiKey(evolution.apiKey);

        if (!baseUrl || !apiKey) {
          return {
            ok: false,
            detail: "Credenciais da Evolution API não encontradas no servidor.",
          };
        }

        const response = await fetchWithTimeout(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: {
            apikey: apiKey,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          return {
            ok: false,
            detail: `Evolution API falhou: ${await readFailureDetail(response)}`,
          };
        }

        return { ok: true, detail: "Conexão com Evolution API validada." };
      }
      case "upload_post": {
        const uploadPost = config as UploadPostConfig;
        const uploadPostApiUrl = resolveUploadPostBaseUrl();
        const apiKey = resolveUploadPostApiKey(uploadPost.apiKey);

        if (!uploadPostApiUrl) {
          return {
            ok: false,
            detail:
              "UPLOAD_POST_API_URL (ou UPLOAD_POST_API_BASE_URL) não configurada para teste de conexão.",
          };
        }

        if (!apiKey) {
          return {
            ok: false,
            detail: "UPLOAD_POST_API_KEY não configurada para teste de conexão.",
          };
        }

        const response = await fetchWithTimeout(
          buildUploadPostApiUrl(uploadPostApiUrl, "/api/uploadposts/me"),
          {
            method: "GET",
            headers: {
              Authorization: `Apikey ${apiKey}`,
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          return {
            ok: false,
            detail: `Upload-Post API falhou: ${await readFailureDetail(response)}`,
          };
        }

        return { ok: true, detail: "Conexão com Upload-Post API validada." };
      }
      case "openrouter": {
        const openrouter = config as OpenRouterConfig;
        const response = await fetchWithTimeout("https://openrouter.ai/api/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${openrouter.apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          return {
            ok: false,
            detail: `OpenRouter falhou: ${await readFailureDetail(response)}`,
          };
        }

        return { ok: true, detail: "Conexão com OpenRouter validada." };
      }
      default:
        return { ok: false, detail: "Tipo de integração não suportado." };
    }
  } catch (error) {
    console.error("[testIntegrationConnection] Erro de rede:", error);
    const detail = extractNetworkErrorDetail(error);
    return { ok: false, detail: `Falha ao testar integração: ${detail}` };
  }
}
