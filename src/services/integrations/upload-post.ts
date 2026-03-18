/**
 * Arquivo: src/services/integrations/upload-post.ts
 * Propósito: Criar perfil por empresa e iniciar conexao social na Upload-Post API.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import type { SocialPlatform, UploadPostSocialConnection } from "@/lib/integrations/types";

type UploadPostServerConfig = {
  baseUrl: string;
  apiKey: string;
};

type UploadPostProfileResult = {
  profileId: string;
  profileName: string;
};

type UploadPostConnectionResult = {
  connectionId: string;
  connectUrl: string;
  status: "pending" | "connected";
  accountName?: string | null;
};

type UploadPostAttempt = {
  source: string;
  method: "GET" | "POST" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
};

type UploadPostSyncAccount = {
  connected: boolean;
  accountName?: string | null;
};

type UploadPostListedProfile = {
  username: string;
  name?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function buildUploadPostUrl(baseUrl: string, path: string) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (normalizedBase.endsWith("/api") && path.startsWith("/api/")) {
    return `${normalizedBase}${path.slice(4)}`;
  }
  return `${normalizedBase}${path}`;
}

export function resolveUploadPostServerConfig(input?: { apiKey?: string }): UploadPostServerConfig {
  const baseUrl =
    process.env.UPLOAD_POST_API_URL?.trim() ||
    process.env.UPLOAD_POST_API_BASE_URL?.trim() ||
    "";
  const apiKey = input?.apiKey?.trim() || process.env.UPLOAD_POST_API_KEY?.trim() || "";

  if (!baseUrl || !apiKey) {
    throw new Error(
      "UPLOAD_POST_API_URL (ou UPLOAD_POST_API_BASE_URL) / UPLOAD_POST_API_KEY não configuradas no servidor."
    );
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey,
  };
}

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function callUploadPost(config: UploadPostServerConfig, attempt: UploadPostAttempt) {
  const response = await fetch(attempt.url, {
    method: attempt.method,
    headers: {
      Authorization: `Apikey ${config.apiKey}`,
      "x-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: attempt.body ? JSON.stringify(attempt.body) : undefined,
  });

  return {
    ok: response.ok,
    status: response.status,
    source: attempt.source,
    payload: await readPayload(response),
  };
}

function pickString(payload: unknown, keys: string[]): string | null {
  if (Array.isArray(payload)) {
    for (const value of payload) {
      const nested = pickString(value, keys);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(payload)) {
    if (!isRecord(value)) {
      continue;
    }
    const nested = pickString(value, keys);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function fallbackProfileId(companyId: string) {
  return `axiomix-${companyId.replace(/-/g, "").slice(0, 16)}`;
}

function payloadToText(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

function resolveSocialAccountState(value: unknown): UploadPostSyncAccount {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return {
      connected: trimmed.length > 0,
      accountName: trimmed.length > 0 ? trimmed : null,
    };
  }

  if (!isRecord(value)) {
    return { connected: false };
  }

  if (value.reauth_required === true || value.reauthRequired === true) {
    return { connected: false };
  }

  const accountName = pickString(value, [
    "display_name",
    "displayName",
    "handle",
    "username",
    "name",
    "accountName",
  ]);

  const accountId = pickString(value, ["id", "account_id", "accountId", "user_id", "userId", "pk"]);
  const hasMeaningfulData = Boolean(accountName || accountId || Object.keys(value).length > 0);

  return {
    connected: hasMeaningfulData,
    accountName: accountName ?? null,
  };
}

function readProfilesFromPayload(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) {
    return [];
  }

  const profiles = payload.profiles;
  if (!Array.isArray(profiles)) {
    return [];
  }

  return profiles.filter((item): item is Record<string, unknown> => isRecord(item));
}

function mapUploadPostProfiles(payload: unknown): UploadPostListedProfile[] {
  const rows = readProfilesFromPayload(payload);
  const mapped: UploadPostListedProfile[] = [];

  for (const profile of rows) {
    const username = pickString(profile, ["username", "profile_username", "user", "id"]);
    if (!username) {
      continue;
    }

    mapped.push({
      username,
      name: pickString(profile, ["name", "display_name", "displayName", "profile_name", "profileName"]),
    });
  }

  return mapped;
}

async function listUploadPostProfiles(config: UploadPostServerConfig) {
  const listResult = await callUploadPost(config, {
    source: "users_list",
    method: "GET",
    url: buildUploadPostUrl(config.baseUrl, "/api/uploadposts/users"),
  });

  if (!listResult.ok) {
    return [] as UploadPostListedProfile[];
  }

  return mapUploadPostProfiles(listResult.payload);
}

function hasConnectionChanged(
  current: UploadPostSocialConnection,
  next: UploadPostSocialConnection
) {
  return (
    current.status !== next.status ||
    current.accountName !== next.accountName ||
    current.connectedAt !== next.connectedAt ||
    current.lastError !== next.lastError
  );
}

export async function syncUploadPostConnectionsFromApi(input: {
  config: UploadPostServerConfig;
  profileId: string;
  current: UploadPostSocialConnection[];
  onlyPlatform?: SocialPlatform;
}) {
  if (input.current.length === 0) {
    return {
      changed: false,
      connections: input.current,
    };
  }

  const listResult = await callUploadPost(input.config, {
    source: "users_list",
    method: "GET",
    url: buildUploadPostUrl(input.config.baseUrl, "/api/uploadposts/users"),
  });

  if (!listResult.ok) {
    return {
      changed: false,
      connections: input.current,
    };
  }

  const profiles = readProfilesFromPayload(listResult.payload);
  const targetProfile = profiles.find((profile) => {
    const username = pickString(profile, ["username", "profile_username", "user", "id"]);
    return username === input.profileId;
  });

  if (!targetProfile) {
    return {
      changed: false,
      connections: input.current,
    };
  }

  const socialAccountsRaw =
    (isRecord(targetProfile.social_accounts) ? targetProfile.social_accounts : null) ||
    (isRecord(targetProfile.socialAccounts) ? targetProfile.socialAccounts : null) ||
    {};

  const nowIso = new Date().toISOString();
  let changed = false;

  const updated = input.current.map((connection) => {
    if (input.onlyPlatform && connection.platform !== input.onlyPlatform) {
      return connection;
    }

    const state = resolveSocialAccountState(socialAccountsRaw[connection.platform]);
    const next: UploadPostSocialConnection = {
      ...connection,
      status: state.connected ? "connected" : "pending",
      accountName: state.accountName ?? connection.accountName ?? null,
      connectedAt: state.connected ? connection.connectedAt ?? nowIso : connection.connectedAt ?? null,
      lastError: state.connected ? null : connection.lastError ?? null,
    };

    if (hasConnectionChanged(connection, next)) {
      changed = true;
    }

    return next;
  });

  return {
    changed,
    connections: updated,
  };
}

export async function ensureUploadPostProfile(input: {
  config: UploadPostServerConfig;
  companyId: string;
  companyName: string;
  existingProfileId?: string;
}): Promise<UploadPostProfileResult> {
  const desiredProfileId = input.existingProfileId?.trim() || fallbackProfileId(input.companyId);
  const diagnostics: string[] = [];
  const profilesBeforeCreate = await listUploadPostProfiles(input.config);

  const existingDesiredProfile = profilesBeforeCreate.find(
    (profile) => profile.username === desiredProfileId
  );
  if (existingDesiredProfile) {
    return {
      profileId: existingDesiredProfile.username,
      profileName: existingDesiredProfile.name ?? input.companyName,
    };
  }

  if (input.existingProfileId && profilesBeforeCreate.length > 0) {
    const reusableProfile =
      profilesBeforeCreate.find((profile) => profile.username.startsWith("axiomix-")) ??
      profilesBeforeCreate[0];

    return {
      profileId: reusableProfile.username,
      profileName: reusableProfile.name ?? input.companyName,
    };
  }

  const authAttempts: UploadPostAttempt[] = [
    {
      source: "users_create",
      method: "POST",
      url: buildUploadPostUrl(input.config.baseUrl, "/api/uploadposts/users"),
      body: {
        username: desiredProfileId,
      },
    },
  ];

  for (const attempt of authAttempts) {
    const result = await callUploadPost(input.config, attempt);
    if (result.ok) {
      const returnedUsername = pickString(result.payload, ["username"]);
      return {
        profileId: returnedUsername ?? desiredProfileId,
        profileName: input.companyName,
      };
    }

    const responseText = payloadToText(result.payload).toLowerCase();
    if (responseText.includes("already exists") || responseText.includes("already registered")) {
      return {
        profileId: desiredProfileId,
        profileName: input.companyName,
      };
    }

    if (result.status === 403) {
      const profilesAfterForbidden = await listUploadPostProfiles(input.config);
      const desiredAfterForbidden = profilesAfterForbidden.find(
        (profile) => profile.username === desiredProfileId
      );

      if (desiredAfterForbidden) {
        return {
          profileId: desiredAfterForbidden.username,
          profileName: desiredAfterForbidden.name ?? input.companyName,
        };
      }

      if (input.existingProfileId && profilesAfterForbidden.length > 0) {
        const reusableProfile =
          profilesAfterForbidden.find((profile) => profile.username.startsWith("axiomix-")) ??
          profilesAfterForbidden[0];

        return {
          profileId: reusableProfile.username,
          profileName: reusableProfile.name ?? input.companyName,
        };
      }
    }

    diagnostics.push(`${attempt.source}:${result.status}`);
  }

  const legacyAttempts: UploadPostAttempt[] = [
    {
      source: "legacy_profiles",
      method: "POST",
      url: `${input.config.baseUrl}/profiles`,
      body: {
        companyId: input.companyId,
        companyName: input.companyName,
        source: "axiomix",
      },
    },
    {
      source: "legacy_companies",
      method: "POST",
      url: `${input.config.baseUrl}/companies`,
      body: {
        companyId: input.companyId,
        companyName: input.companyName,
        source: "axiomix",
      },
    },
    {
      source: "legacy_v1_profiles",
      method: "POST",
      url: `${input.config.baseUrl}/v1/profiles`,
      body: {
        externalCompanyId: input.companyId,
        name: input.companyName,
      },
    },
  ];

  for (const attempt of legacyAttempts) {
    const result = await callUploadPost(input.config, attempt);
    if (!result.ok) {
      diagnostics.push(`${attempt.source}:${result.status}`);
      continue;
    }

    const profileId = pickString(result.payload, [
      "profileId",
      "id",
      "companyProfileId",
      "externalProfileId",
    ]);

    if (profileId) {
      const profileName = pickString(result.payload, ["profileName", "name"]) ?? input.companyName;
      return {
        profileId,
        profileName,
      };
    }
  }

  const diagnosticText = diagnostics.length > 0 ? ` Tentativas: ${diagnostics.join(", ")}.` : "";
  const permissionHint = diagnostics.some((entry) => entry.includes(":403"))
    ? " Verifique se a UPLOAD_POST_API_KEY tem permissao para criar perfis (users_create)."
    : "";
  throw new Error(
    `Nao foi possivel criar ou validar perfil na Upload-Post API.${diagnosticText}${permissionHint}`
  );
}

export async function startUploadPostSocialConnection(input: {
  config: UploadPostServerConfig;
  profileId: string;
  companyId: string;
  platform: SocialPlatform;
  redirectUrl?: string;
  redirectButtonText?: string;
  connectTitle?: string;
  connectDescription?: string;
  logoImage?: string;
  showCalendar?: boolean;
  readOnlyCalendar?: boolean;
}): Promise<UploadPostConnectionResult> {
  const jwtPayload: Record<string, unknown> = {
    username: input.profileId,
    platforms: [input.platform],
  };

  if (input.redirectUrl?.trim()) {
    jwtPayload.redirect_url = input.redirectUrl.trim();
  }
  if (input.redirectButtonText?.trim()) {
    jwtPayload.redirect_button_text = input.redirectButtonText.trim();
  }
  if (input.connectTitle?.trim()) {
    jwtPayload.connect_title = input.connectTitle.trim();
  }
  if (input.connectDescription?.trim()) {
    jwtPayload.connect_description = input.connectDescription.trim();
  }
  if (input.logoImage?.trim()) {
    jwtPayload.logo_image = input.logoImage.trim();
  }
  if (typeof input.showCalendar === "boolean") {
    jwtPayload.show_calendar = input.showCalendar;
  }
  if (typeof input.readOnlyCalendar === "boolean") {
    jwtPayload.readonly_calendar = input.readOnlyCalendar;
  }

  const diagnostics: string[] = [];
  const generateJwtAttempt: UploadPostAttempt = {
    source: "generate_jwt",
    method: "POST",
    url: buildUploadPostUrl(input.config.baseUrl, "/api/uploadposts/users/generate-jwt"),
    body: jwtPayload,
  };

  const generateJwtResult = await callUploadPost(input.config, generateJwtAttempt);
  if (generateJwtResult.ok) {
    const connectUrl = pickString(generateJwtResult.payload, [
      "access_url",
      "accessUrl",
      "connectUrl",
      "authUrl",
      "url",
    ]);

    if (!connectUrl) {
      throw new Error("Upload-Post não retornou access_url para autorização da rede social.");
    }

    return {
      connectionId:
        pickString(generateJwtResult.payload, ["connectionId", "id", "externalConnectionId"]) ??
        crypto.randomUUID(),
      connectUrl,
      status: "pending",
    };
  }

  diagnostics.push(`${generateJwtAttempt.source}:${generateJwtResult.status}`);

  const createProfileAttempt: UploadPostAttempt = {
    source: "users_create_before_jwt",
    method: "POST",
    url: buildUploadPostUrl(input.config.baseUrl, "/api/uploadposts/users"),
    body: {
      username: input.profileId,
    },
  };
  const createProfileResult = await callUploadPost(input.config, createProfileAttempt);
  const createProfileText = payloadToText(createProfileResult.payload).toLowerCase();
  const createdOrExisting =
    createProfileResult.ok ||
    createProfileText.includes("already exists") ||
    createProfileText.includes("already registered");

  diagnostics.push(`${createProfileAttempt.source}:${createProfileResult.status}`);

  if (createdOrExisting) {
    const retryResult = await callUploadPost(input.config, {
      ...generateJwtAttempt,
      source: "generate_jwt_retry",
    });

    if (retryResult.ok) {
      const connectUrl = pickString(retryResult.payload, [
        "access_url",
        "accessUrl",
        "connectUrl",
        "authUrl",
        "url",
      ]);

      if (!connectUrl) {
        throw new Error("Upload-Post não retornou access_url para autorização da rede social.");
      }

      return {
        connectionId:
          pickString(retryResult.payload, ["connectionId", "id", "externalConnectionId"]) ??
          crypto.randomUUID(),
        connectUrl,
        status: "pending",
      };
    }

    diagnostics.push(`generate_jwt_retry:${retryResult.status}`);
  }

  const legacyAttempts: UploadPostAttempt[] = [
    {
      source: "legacy_social_connections",
      method: "POST",
      url: `${input.config.baseUrl}/social/connections`,
      body: {
        profileId: input.profileId,
        platform: input.platform,
        companyId: input.companyId,
        source: "axiomix",
      },
    },
    {
      source: "legacy_connections",
      method: "POST",
      url: `${input.config.baseUrl}/connections`,
      body: {
        profileId: input.profileId,
        platform: input.platform,
        companyId: input.companyId,
      },
    },
    {
      source: "legacy_v1_social_connections",
      method: "POST",
      url: `${input.config.baseUrl}/v1/social/connections`,
      body: {
        profileId: input.profileId,
        platform: input.platform,
      },
    },
  ];

  for (const attempt of legacyAttempts) {
    const result = await callUploadPost(input.config, attempt);
    if (!result.ok) {
      diagnostics.push(`${attempt.source}:${result.status}`);
      continue;
    }

    const connectionId =
      pickString(result.payload, ["connectionId", "id", "externalConnectionId"]) ??
      crypto.randomUUID();

    const connectUrl = pickString(result.payload, [
      "access_url",
      "accessUrl",
      "connectUrl",
      "authUrl",
      "url",
    ]);

    if (!connectUrl) {
      diagnostics.push(`${attempt.source}:missing_connect_url`);
      continue;
    }

    const statusRaw = pickString(result.payload, ["status"]);
    const status = statusRaw === "connected" ? "connected" : "pending";
    const accountName = pickString(result.payload, ["accountName", "handle", "username"]);

    return {
      connectionId,
      connectUrl,
      status,
      accountName,
    };
  }

  const diagnosticText = diagnostics.length > 0 ? ` Tentativas: ${diagnostics.join(", ")}.` : "";
  throw new Error(
    `Não foi possível gerar URL de autorização na Upload-Post API.${diagnosticText}`
  );
}

export async function disconnectUploadPostSocialConnection(input: {
  config: UploadPostServerConfig;
  profileId: string;
  platform: SocialPlatform;
}) {
  const result = await callUploadPost(input.config, {
    source: "users_social_delete",
    method: "DELETE",
    url: buildUploadPostUrl(input.config.baseUrl, "/api/uploadposts/users/social"),
    body: {
      profile_username: input.profileId,
      social_platform: input.platform,
    },
  });

  return result.ok;
}

export function upsertSocialConnectionInConfig(input: {
  current: UploadPostSocialConnection[];
  next: UploadPostSocialConnection;
}) {
  const map = new Map<string, UploadPostSocialConnection>();

  for (const item of input.current) {
    map.set(item.platform, item);
  }

  map.set(input.next.platform, input.next);
  return Array.from(map.values());
}
