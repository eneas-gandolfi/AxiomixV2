/**
 * Arquivo: src/services/evo-crm/auth.ts
 * Propósito: Login programático no Evo Auth Service e cache de JWT em memória.
 *
 * O Evo CRM tem 4 microsserviços com autenticação distinta:
 *   - CRM Service        → aceita api_access_token UUID (usado em conversations, contacts, etc)
 *   - Core Service       → exige Bearer JWT do evo-auth-service (agentes, tools, MCP)
 *   - Knowledge Service  → segundo a doc original exigia JWT, mas a implementação
 *                          atual em `knowledge-base.ts` usa api_access_token UUID e
 *                          tem funcionado em chamadas reais. Manter como UUID até
 *                          alguém validar contra produção; se mover pra JWT, usar
 *                          `fetchWithJwtRefresh` de `./jwt-fetch.ts`.
 *   - Processor Service  → exige Bearer JWT (idem Core)
 *
 * Este módulo cuida do auth para os serviços que exigem JWT.
 *
 * Env vars necessárias:
 *   - EVO_AUTH_BASE_URL   (default: https://api.getlead.capital)
 *   - EVO_AUTH_LOGIN_PATH (default: /api/v1/auth/login)
 *   - EVO_AUTH_EMAIL      (obrigatório)
 *   - EVO_AUTH_PASSWORD   (obrigatório)
 *
 * Autor: AXIOMIX
 * Data: 2026-05-04
 */

const TIMEOUT_MS = 15_000;
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // renova 5min antes do exp do JWT

type CachedToken = { jwt: string; expiresAt: number };

let cachedToken: CachedToken | null = null;
let inflightLogin: Promise<string> | null = null;

function decodeJwtExpMs(jwt: string): number {
  const parts = jwt.split(".");
  if (parts.length !== 3) return 0;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function looksLikeJwt(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0 && /^[A-Za-z0-9_-]+$/.test(p));
}

function extractTokenDeep(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;
  if (looksLikeJwt(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractTokenDeep(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const found = extractTokenDeep(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function extractToken(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;

  // Tenta múltiplos formatos comuns de resposta de auth services
  const directKeys = [
    "access_token", "token", "jwt", "id_token",
    "auth_token", "accessToken", "authToken", "bearer", "bearerToken",
  ];
  for (const key of directKeys) {
    const value = root[key];
    if (typeof value === "string" && value.length > 0) return value;
  }

  // Envelope { success, data: { ... } }
  if (root.success === true && typeof root.data === "object" && root.data !== null) {
    const fromData = extractToken(root.data);
    if (fromData) return fromData;
  }

  // Fallback: procura recursivamente qualquer string que pareça JWT (3 partes base64url)
  return extractTokenDeep(json);
}

async function performLogin(): Promise<string> {
  const baseUrl = (process.env.EVO_AUTH_BASE_URL ?? "https://api.getlead.capital").replace(/\/+$/, "");
  const loginPath = process.env.EVO_AUTH_LOGIN_PATH ?? "/api/v1/auth/login";
  const email = process.env.EVO_AUTH_EMAIL;
  const password = process.env.EVO_AUTH_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Credenciais do Evo Auth Service ausentes — defina EVO_AUTH_EMAIL e EVO_AUTH_PASSWORD."
    );
  }

  const url = `${baseUrl}${loginPath.startsWith("/") ? loginPath : `/${loginPath}`}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(
        `Evo Auth Service login falhou (${res.status}): ${text.slice(0, 200)}`
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Evo Auth Service retornou resposta não-JSON.");
    }

    const token = extractToken(json);
    if (!token) {
      console.error(
        "[evo-auth] token não encontrado no payload — chaves de topo:",
        json && typeof json === "object" ? Object.keys(json as Record<string, unknown>) : typeof json,
        "preview:",
        JSON.stringify(json).slice(0, 500)
      );
      throw new Error(
        "Evo Auth Service respondeu OK mas sem token reconhecível no payload."
      );
    }

    return token;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Tempo esgotado ao autenticar no Evo Auth Service (>${TIMEOUT_MS}ms).`);
    }
    if (err instanceof Error && (err.name === "TypeError" || err.message === "fetch failed")) {
      throw new Error(`Falha de rede ao autenticar no Evo Auth Service (${url}).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retorna um JWT válido. Faz login e cacheia em memória até 5min antes do expiry.
 * Coalesce chamadas concorrentes (single-flight).
 */
export async function getEvoAuthJwt(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + REFRESH_BUFFER_MS) {
    return cachedToken.jwt;
  }

  if (inflightLogin) return inflightLogin;

  inflightLogin = (async () => {
    try {
      const jwt = await performLogin();
      const expMs = decodeJwtExpMs(jwt);
      // Fallback: se não conseguiu decodificar exp, assume 90min
      const expiresAt = expMs > 0 ? expMs : now + 90 * 60 * 1000;
      cachedToken = { jwt, expiresAt };
      return jwt;
    } finally {
      inflightLogin = null;
    }
  })();

  return inflightLogin;
}

/** Limpa o cache — chamar após receber 401 do Core Service para forçar re-login. */
export function clearEvoAuthCache(): void {
  cachedToken = null;
}
