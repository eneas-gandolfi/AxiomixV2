/**
 * Arquivo: src/services/integrations/evolution.ts
 * Propósito: Operações de QR Code e status de instâncias na Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import type { EvolutionVendor, EvolutionVendorStatus } from "@/lib/integrations/types";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";

type EvolutionCredentials = {
  baseUrl: string;
  apiKey: string;
};

type EvolutionAttempt = {
  source: string;
  method: "GET" | "POST" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
};

type FetchResult = {
  ok: boolean;
  status: number;
  source: string;
  payload: unknown;
  text: string;
};

type EvolutionQrResult = {
  instanceName: string;
  source: string;
  qrCodeDataUrl: string;
};

type EvolutionSendTextResult = {
  providerStatus: number;
  providerBody: string;
  source: string;
};

type EvolutionInstanceStatus = {
  instanceName: string;
  connected: boolean;
  rawStatus: string | null;
};

export class EvolutionApiRequestError extends Error {
  status: number;
  source: string;

  constructor(message: string, status: number, source: string) {
    super(message);
    this.name = "EvolutionApiRequestError";
    this.status = status;
    this.source = source;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function resolveEvolutionCredentials(input?: {
  baseUrl?: string;
  apiKey?: string;
}): EvolutionCredentials {
  const baseUrl =
    input?.baseUrl?.trim() ||
    process.env.EVOLUTION_API_URL?.trim() ||
    process.env.EVOLUTION_API_BASE_URL?.trim() ||
    "";
  const apiKey = input?.apiKey?.trim() || process.env.EVOLUTION_API_KEY?.trim() || "";

  if (!baseUrl || !apiKey) {
    throw new Error("Credenciais da Evolution API não configuradas no servidor.");
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey,
  };
}

function normalizeQrValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/^data:image\/\w+;base64,/, "");
  const base64Pattern = /^[A-Za-z0-9+/=\r\n]+$/;

  if (!base64Pattern.test(cleaned) || cleaned.length < 120) {
    return null;
  }

  return `data:image/png;base64,${cleaned}`;
}

function extractQrFromPayload(payload: unknown): string | null {
  const visited = new Set<unknown>();

  const walk = (node: unknown): string | null => {
    if (node === null || node === undefined) {
      return null;
    }

    if (typeof node === "string") {
      return normalizeQrValue(node);
    }

    if (typeof node !== "object") {
      return null;
    }

    if (visited.has(node)) {
      return null;
    }
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const candidate = walk(item);
        if (candidate) {
          return candidate;
        }
      }
      return null;
    }

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string") {
        const keyIsQr = /(qr|qrcode|base64|image)/i.test(key);
        if (keyIsQr) {
          const candidate = normalizeQrValue(value);
          if (candidate) {
            return candidate;
          }
        }
      }

      const nested = walk(value);
      if (nested) {
        return nested;
      }
    }

    return null;
  };

  return walk(payload);
}

function extractInstanceName(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.instanceName === "string" && payload.instanceName.trim()) {
    return payload.instanceName;
  }

  if (typeof payload.name === "string" && payload.name.trim()) {
    return payload.name;
  }

  if (isRecord(payload.instance) && typeof payload.instance.instanceName === "string") {
    return payload.instance.instanceName;
  }

  return null;
}

function extractStatusString(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates = [
    payload.connectionStatus,
    payload.status,
    payload.state,
    isRecord(payload.instance) ? payload.instance.status : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function isConnectedStatus(rawStatus: string | null) {
  if (!rawStatus) {
    return false;
  }

  const normalized = rawStatus.toLowerCase();
  return (
    normalized.includes("open") ||
    normalized.includes("connected") ||
    normalized.includes("online") ||
    normalized.includes("ready")
  );
}

async function readResponsePayload(response: Response): Promise<{ payload: unknown; text: string }> {
  const text = await response.text();
  if (!text) {
    return { payload: null, text: "" };
  }

  try {
    return {
      payload: JSON.parse(text) as unknown,
      text,
    };
  } catch {
    return {
      payload: text,
      text,
    };
  }
}

function describeNetworkError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro de rede desconhecido ao conectar com a Evolution API.";
  }

  if (error.name === "AbortError") {
    return "Evolution API timeout: o servidor não respondeu em 30 s.";
  }

  const message = error.message.toLowerCase();
  const cause = (error as NodeJS.ErrnoException).cause;
  const code =
    (error as NodeJS.ErrnoException).code ??
    (cause instanceof Error ? (cause as NodeJS.ErrnoException).code : undefined) ??
    "";

  if (code === "ECONNREFUSED" || message.includes("econnrefused")) {
    return "Conexão recusada pela Evolution API. Verifique se o serviço está ativo.";
  }
  if (code === "ENOTFOUND" || message.includes("enotfound")) {
    return "Servidor da Evolution API não encontrado. Verifique a URL configurada.";
  }
  if (code === "ECONNRESET" || code === "EPIPE" || message.includes("econnreset")) {
    return "Conexão com a Evolution API foi interrompida. Tente novamente.";
  }
  if (message.includes("ssl") || message.includes("tls") || message.includes("certificate")) {
    return "Erro de certificado SSL ao conectar com a Evolution API.";
  }
  if (message.includes("timeout")) {
    return "Evolution API timeout: o servidor não respondeu a tempo.";
  }

  if (message.includes("fetch failed")) {
    const baseUrl = process.env.EVOLUTION_API_BASE_URL ?? process.env.EVOLUTION_API_URL ?? "";
    console.error(`[Evolution] fetch failed — URL base configurada: ${baseUrl}`);
    return "Falha de rede ao conectar com a Evolution API. Verifique se a URL base está correta e acessível pelo servidor.";
  }

  return `Falha de rede ao conectar com a Evolution API: ${error.message}`;
}

async function callEvolution(credentials: EvolutionCredentials, attempt: EvolutionAttempt): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(attempt.url, {
      method: attempt.method,
      headers: {
        apikey: credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: attempt.body ? JSON.stringify(attempt.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    throw new EvolutionApiRequestError(describeNetworkError(error), 0, attempt.source);
  }
  clearTimeout(timeoutId);

  const parsed = await readResponsePayload(response);
  return {
    ok: response.ok,
    status: response.status,
    source: attempt.source,
    payload: parsed.payload,
    text: parsed.text,
  };
}

function formatEvolutionFailure(result: FetchResult) {
  const detail = result.text.slice(0, 180);
  return detail ? `Falha no envio WhatsApp: ${result.status} ${detail}` : `Falha no envio WhatsApp: HTTP ${result.status}`;
}

function normalizeInstanceName(vendorName: string, companyId: string) {
  const base = vendorName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  const suffix = companyId.replace(/-/g, "").slice(0, 8);
  return `${base || "vendedor"}-${suffix}`;
}

export function createEvolutionVendor(input: {
  companyId: string;
  vendorName: string;
  instanceName?: string;
}): EvolutionVendor {
  const nowIso = new Date().toISOString();
  const instanceName =
    input.instanceName?.trim() || normalizeInstanceName(input.vendorName, input.companyId);

  return {
    id: crypto.randomUUID(),
    vendorName: input.vendorName.trim(),
    instanceName,
    status: "pending",
    lastQrAt: nowIso,
    connectedAt: null,
    lastError: null,
    qrCodeSource: null,
  };
}

export async function generateEvolutionQrCode(input: {
  credentials: EvolutionCredentials;
  instanceName: string;
}): Promise<EvolutionQrResult> {
  const attempts: EvolutionAttempt[] = [
    {
      source: "create_instance",
      method: "POST",
      url: `${input.credentials.baseUrl}/instance/create`,
      body: {
        instanceName: input.instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      },
    },
    {
      source: "connect_instance",
      method: "GET",
      url: `${input.credentials.baseUrl}/instance/connect/${encodeURIComponent(input.instanceName)}`,
    },
    {
      source: "qrcode_endpoint",
      method: "GET",
      url: `${input.credentials.baseUrl}/instance/qrcode/${encodeURIComponent(input.instanceName)}`,
    },
    {
      source: "fetch_instances",
      method: "GET",
      url: `${input.credentials.baseUrl}/instance/fetchInstances`,
    },
  ];

  let lastFailure: string | null = null;

  for (const attempt of attempts) {
    let result: FetchResult;
    try {
      result = await callEvolution(input.credentials, attempt);
    } catch (error) {
      lastFailure =
        error instanceof EvolutionApiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : `${attempt.source}: erro de rede`;
      continue;
    }

    if (!result.ok) {
      lastFailure = `${attempt.source}: HTTP ${result.status}`;
      continue;
    }

    const payload =
      attempt.source === "fetch_instances" && Array.isArray(result.payload)
        ? result.payload.find((entry) => extractInstanceName(entry) === input.instanceName) ??
          result.payload
        : result.payload;

    const qr = extractQrFromPayload(payload);
    if (!qr) {
      continue;
    }

    return {
      instanceName: input.instanceName,
      source: attempt.source,
      qrCodeDataUrl: qr,
    };
  }

  throw new Error(
    lastFailure ??
      "Não foi possível gerar QR Code automaticamente para esta instância na Evolution API."
  );
}

export async function fetchEvolutionInstanceStatuses(input: {
  credentials: EvolutionCredentials;
}): Promise<EvolutionInstanceStatus[]> {
  const result = await callEvolution(input.credentials, {
    source: "fetch_instances",
    method: "GET",
    url: `${input.credentials.baseUrl}/instance/fetchInstances`,
  });

  if (!result.ok) {
    throw new Error(`Falha ao listar instâncias na Evolution API: HTTP ${result.status}`);
  }

  const rows = Array.isArray(result.payload)
    ? result.payload
    : isRecord(result.payload) && Array.isArray(result.payload.instances)
      ? result.payload.instances
      : [];

  const statuses: EvolutionInstanceStatus[] = [];
  for (const row of rows) {
    const instanceName = extractInstanceName(row);
    if (!instanceName) {
      continue;
    }

    const rawStatus = extractStatusString(row);
    statuses.push({
      instanceName,
      connected: isConnectedStatus(rawStatus),
      rawStatus,
    });
  }

  return statuses;
}

export async function deleteEvolutionInstance(input: {
  credentials: EvolutionCredentials;
  instanceName: string;
}): Promise<{ instanceName: string; source: string }> {
  const result = await callEvolution(input.credentials, {
    source: "delete_instance",
    method: "DELETE",
    url: `${input.credentials.baseUrl}/instance/delete/${encodeURIComponent(input.instanceName)}`,
  });

  if (!result.ok) {
    throw new EvolutionApiRequestError(
      `Falha ao excluir instância na Evolution API: HTTP ${result.status}`,
      result.status,
      result.source
    );
  }

  return {
    instanceName: input.instanceName,
    source: result.source,
  };
}

export async function sendEvolutionTextMessage(input: {
  credentials: EvolutionCredentials;
  instanceName: string;
  number: string;
  text: string;
}): Promise<EvolutionSendTextResult> {
  const instanceName = input.instanceName.trim();
  if (!instanceName) {
    throw new Error("Nenhuma instância conectada na Evolution API.");
  }

  const normalizedNumber = normalizeWhatsAppPhone(input.number);
  if (normalizedNumber.replace(/\D/g, "").length < 8) {
    throw new Error("Número de destino inválido para envio WhatsApp.");
  }

  const attempts: EvolutionAttempt[] = [
    {
      source: "message_send_text_instance",
      method: "POST",
      url: `${input.credentials.baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`,
      body: {
        number: normalizedNumber,
        text: input.text,
      },
    },
    {
      source: "message_send_text_instance_name_body",
      method: "POST",
      url: `${input.credentials.baseUrl}/message/sendText`,
      body: {
        instanceName,
        number: normalizedNumber,
        text: input.text,
      },
    },
    {
      source: "message_send_text_instance_body",
      method: "POST",
      url: `${input.credentials.baseUrl}/message/sendText`,
      body: {
        instance: instanceName,
        number: normalizedNumber,
        text: input.text,
      },
    },
  ];

  const firstAttempt = await callEvolution(input.credentials, attempts[0]);
  if (firstAttempt.ok) {
    return {
      providerStatus: firstAttempt.status,
      providerBody: firstAttempt.text.slice(0, 500),
      source: firstAttempt.source,
    };
  }

  if (firstAttempt.status !== 404) {
    throw new Error(formatEvolutionFailure(firstAttempt));
  }

  const statuses = await fetchEvolutionInstanceStatuses({
    credentials: input.credentials,
  }).catch(() => null);

  if (statuses && !statuses.some((status) => status.instanceName === instanceName)) {
    throw new Error(`Instância ${instanceName} não encontrada na Evolution API.`);
  }

  let lastFailure = firstAttempt;
  for (const attempt of attempts.slice(1)) {
    const result = await callEvolution(input.credentials, attempt);
    if (result.ok) {
      return {
        providerStatus: result.status,
        providerBody: result.text.slice(0, 500),
        source: result.source,
      };
    }
    lastFailure = result;
  }

  throw new Error(formatEvolutionFailure(lastFailure));
}

function toIsoDateOrZero(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function resolvePreferredEvolutionInstance(vendors?: EvolutionVendor[]): string | null {
  if (!Array.isArray(vendors) || vendors.length === 0) {
    return null;
  }

  const validVendors = vendors.filter(
    (vendor) => typeof vendor.instanceName === "string" && vendor.instanceName.trim().length > 0
  );

  if (validVendors.length === 0) {
    return null;
  }

  const connectedVendors = validVendors
    .filter((vendor) => vendor.status === "connected")
    .sort((left, right) => {
      const rightScore = toIsoDateOrZero(right.connectedAt) || toIsoDateOrZero(right.lastQrAt);
      const leftScore = toIsoDateOrZero(left.connectedAt) || toIsoDateOrZero(left.lastQrAt);
      return rightScore - leftScore;
    });

  if (connectedVendors.length > 0) {
    return connectedVendors[0]?.instanceName.trim() ?? null;
  }

  return validVendors[0]?.instanceName.trim() ?? null;
}

export function mergeVendorStatuses(input: {
  vendors: EvolutionVendor[];
  statuses: EvolutionInstanceStatus[];
}): EvolutionVendor[] {
  const statusMap = new Map(input.statuses.map((status) => [status.instanceName, status]));
  const nowIso = new Date().toISOString();

  return input.vendors.map((vendor) => {
    const current = statusMap.get(vendor.instanceName);
    if (!current) {
      return vendor;
    }

    const status: EvolutionVendorStatus = current.connected ? "connected" : "pending";
    return {
      ...vendor,
      status,
      connectedAt: current.connected ? vendor.connectedAt ?? nowIso : vendor.connectedAt ?? null,
      lastError: current.connected ? null : vendor.lastError ?? null,
    };
  });
}
