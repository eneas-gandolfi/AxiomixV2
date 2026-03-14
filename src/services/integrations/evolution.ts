/**
 * Arquivo: src/services/integrations/evolution.ts
 * Proposito: Operacoes de QR Code e status de instancias na Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import type { EvolutionVendor, EvolutionVendorStatus } from "@/lib/integrations/types";

type EvolutionCredentials = {
  baseUrl: string;
  apiKey: string;
};

type EvolutionAttempt = {
  source: string;
  method: "GET" | "POST";
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

type EvolutionInstanceStatus = {
  instanceName: string;
  connected: boolean;
  rawStatus: string | null;
};

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
    throw new Error("Credenciais da Evolution API nao configuradas no servidor.");
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

async function callEvolution(credentials: EvolutionCredentials, attempt: EvolutionAttempt): Promise<FetchResult> {
  const response = await fetch(attempt.url, {
    method: attempt.method,
    headers: {
      apikey: credentials.apiKey,
      "Content-Type": "application/json",
    },
    body: attempt.body ? JSON.stringify(attempt.body) : undefined,
  });

  const parsed = await readResponsePayload(response);
  return {
    ok: response.ok,
    status: response.status,
    source: attempt.source,
    payload: parsed.payload,
    text: parsed.text,
  };
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
    const result = await callEvolution(input.credentials, attempt);
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
      "Nao foi possivel gerar QR Code automaticamente para esta instancia na Evolution API."
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
    throw new Error(`Falha ao listar instancias na Evolution API: HTTP ${result.status}`);
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
