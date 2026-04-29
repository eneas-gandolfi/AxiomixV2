/**
 * Arquivo: src/services/evo-crm/client.ts
 * Propósito: Cliente tipado do Evo CRM (Evolution Foundation, v4.2.0) com credenciais por company_id.
 * Autor: AXIOMIX
 * Data: 2026-04-17
 *
 * Notas (validado 2026-04-29 contra https://api.getlead.capital, Evo CRM v4.2.0):
 * - Header de auth: `api_access_token: <token>` (NÃO Bearer — Bearer retorna INVALID_TOKEN)
 * - Path: `/api/v1/{resource}` direto, SEM accountId no path
 * - Envelope de resposta: `{success, data, error: {code, message}, meta: {timestamp, pagination, ...}, message?}`
 * - Labels usam `title` (não `name`) como campo de texto
 * - Contatos usam `phone_number` (não `phone` ou `phone_e164`)
 * - Timestamps são Unix epoch (números), não ISO strings
 * - Messages usam `message_type: "incoming"|"outgoing"` (não `from_me` boolean)
 * - Conversations incluem `display_id`, `inbox_id`, `last_activity_at`, `pipelines[]`, `labels[]`
 *
 * Endpoints verificados: conversations, messages, contacts, labels, pipelines, teams, inboxes.
 * Endpoints ainda UNVERIFIED: sendTemplate, kanban card CRUD sub-routes.
 */

import type { Json } from "@/database/types/database.types";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EvoCrmNotConfiguredError } from "./errors";
import { getCachedEvoCrmClient } from "./factory";

import type {
  EvoConversationApi,
  EvoMessageApi,
  EvoContactApi,
  EvoLabelApi,
  EvoSessionStatus,
  EvoKanbanBoard,
  EvoKanbanStage,
  EvoKanbanCard,
  EvoUserApi,
  EvoTeamApi,
  EvoInboxApi,
  EvoPipelineApi,
  EvoPipelineStageApi,
  EvoMacroApi,
  EvoWebhookApi,
  EvoRequestOptions,
  EvoCrmClient,
} from "./types";

// Re-exportar tipos para manter compatibilidade com imports existentes
export type {
  EvoConversationApi,
  EvoMessageApi,
  EvoContactApi,
  EvoLabelApi,
  EvoSessionStatus,
  EvoKanbanBoard,
  EvoKanbanStage,
  EvoKanbanCard,
  EvoUserApi,
  EvoTeamApi,
  EvoInboxApi,
  EvoPipelineApi,
  EvoPipelineStageApi,
  EvoMacroApi,
  EvoWebhookApi,
  EvoCrmClient,
} from "./types";
const EVO_HTTP_TIMEOUT_MS = 15_000;

function describeFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return "erro desconhecido de rede.";
  }

  if (error.name === "AbortError") {
    return "timeout ao conectar com o Evo CRM.";
  }

  const cause =
    typeof error.cause === "object" && error.cause !== null
      ? (error.cause as Record<string, unknown>)
      : null;

  const code = cause && typeof cause.code === "string" ? cause.code : null;
  const causeMessage = cause && typeof cause.message === "string" ? cause.message : null;

  if (code === "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" || code === "EPROTO") {
    return "falha TLS no servidor. Verifique o certificado do domínio da API.";
  }

  if (code === "ENOTFOUND") {
    return "host não encontrado (DNS).";
  }

  if (code === "ECONNREFUSED") {
    return "conexão recusada pelo servidor.";
  }

  if (code === "UND_ERR_CONNECT_TIMEOUT") {
    return "timeout de conexão com o servidor.";
  }

  if (code && causeMessage) {
    return `${code}: ${causeMessage}`;
  }

  if (causeMessage) {
    return causeMessage;
  }

  return error.message || "erro desconhecido de rede.";
}

function normalizeEvoBaseUrl(rawBaseUrl: string) {
  const normalized = rawBaseUrl.trim().replace(/\/+$/, "");
  if (normalized.endsWith("/api/v1")) return normalized.slice(0, -"/api/v1".length);
  if (normalized.endsWith("/api")) return normalized.slice(0, -"/api".length);
  return normalized;
}

/**
 * Extrai `data` do envelope padrão Evo CRM `{success, data, error, meta}`.
 * Se o backend retorna payload sem envelope (ex: array direto), retorna como está.
 */
function unwrap<T = unknown>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (record.success === false) {
      const err = (record.error as Record<string, unknown> | undefined) ?? {};
      const code = typeof err.code === "string" ? err.code : "UNKNOWN";
      const message = typeof err.message === "string" ? err.message : "Erro desconhecido";
      throw new Error(`Evo CRM [${code}]: ${message}`);
    }
    if (record.success === true && "data" in record) {
      return record.data as T;
    }
  }
  return payload as T;
}

function assertArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return [];
}

function toExternalId(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }
  return null;
}

function parseConversationsResponse(payload: unknown): EvoConversationApi[] {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rawList = Array.isArray(record.conversations)
    ? record.conversations
    : Array.isArray(record.data)
      ? record.data
      : assertArrayPayload(payload);

  const parsed: EvoConversationApi[] = [];

  for (const item of rawList) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const row = item as Record<string, unknown>;
    const id = toExternalId(row.id);
    if (!id) {
      continue;
    }

    const contactRaw =
      typeof row.contact === "object" && row.contact !== null
        ? (row.contact as Record<string, unknown>)
        : null;

    const contactName =
      typeof row.contact_name === "string" && row.contact_name.trim().length > 0
        ? row.contact_name
        : contactRaw && typeof contactRaw.name === "string"
          ? contactRaw.name
          : null;

    const contactId =
      typeof row.contact_id === "string" || typeof row.contact_id === "number"
        ? String(row.contact_id)
        : contactRaw && (typeof contactRaw.id === "string" || typeof contactRaw.id === "number")
          ? String(contactRaw.id)
          : null;

    const contactPhone =
      contactRaw && typeof contactRaw.phone_number === "string"
        ? contactRaw.phone_number
        : typeof row.phone_e164 === "string"
          ? row.phone_e164
          : contactRaw && typeof contactRaw.phone_e164 === "string"
            ? contactRaw.phone_e164
            : contactRaw && typeof contactRaw.phone === "string"
              ? contactRaw.phone
              : null;

    const profilePicture =
      typeof row.profile_picture === "string" && row.profile_picture.trim().length > 0
        ? row.profile_picture
        : typeof row.profilePicture === "string" && row.profilePicture.trim().length > 0
          ? row.profilePicture
          : contactRaw && typeof contactRaw.profile_picture === "string" && contactRaw.profile_picture.trim().length > 0
            ? contactRaw.profile_picture
            : null;

    const metaRaw =
      typeof row.meta === "object" && row.meta !== null
        ? (row.meta as Record<string, unknown>)
        : null;
    const metaAssigneeRaw =
      metaRaw && typeof metaRaw.assignee === "object" && metaRaw.assignee !== null
        ? (metaRaw.assignee as Record<string, unknown>)
        : null;
    const assigneeRaw =
      typeof row.assignee === "object" && row.assignee !== null
        ? (row.assignee as Record<string, unknown>)
        : null;

    const assigneeId =
      toExternalId(row.assignee_id) ??
      toExternalId(row.assigned_to) ??
      (assigneeRaw ? toExternalId(assigneeRaw.id) : null) ??
      (metaAssigneeRaw ? toExternalId(metaAssigneeRaw.id) : null) ??
      toExternalId(row.assigneeId) ??
      null;

    const epochToIso = (v: unknown): string | null => {
      if (typeof v === "string") return v;
      if (typeof v === "number" && v > 0) return new Date(v * 1000).toISOString();
      return null;
    };

    parsed.push({
      id,
      phone_e164: typeof row.phone_e164 === "string" ? row.phone_e164 : contactPhone,
      remote_jid: typeof row.remote_jid === "string" ? row.remote_jid : null,
      status: typeof row.status === "string" ? row.status : null,
      last_message_at:
        epochToIso(row.last_message_at) ?? epochToIso(row.lastMessageAt) ?? epochToIso(row.last_activity_at) ?? null,
      last_customer_message_at:
        epochToIso(row.last_customer_message_at) ?? epochToIso(row.lastCustomerMessageAt) ?? null,
      updated_at: epochToIso(row.updated_at),
      created_at: epochToIso(row.created_at),
      profile_picture: profilePicture,
      assignee_id: assigneeId,
      contact:
        contactName || contactId || contactPhone
          ? {
              id: contactId,
              name: contactName,
              phone: contactPhone,
              phone_e164: contactPhone,
            }
          : null,
    });
  }

  return parsed;
}

function parseConversationsPagination(payload: unknown) {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rawPagination =
    typeof record.pagination === "object" && record.pagination !== null
      ? (record.pagination as Record<string, unknown>)
      : null;

  const nextCursor =
    rawPagination && (typeof rawPagination.nextCursor === "string" || typeof rawPagination.nextCursor === "number")
      ? rawPagination.nextCursor
      : undefined;

  const hasMore = rawPagination?.hasMore === true;

  return { nextCursor, hasMore };
}

function parseMessagesResponse(payload: unknown): EvoMessageApi[] {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const conversationRecord =
    typeof record.conversation === "object" && record.conversation !== null
      ? (record.conversation as Record<string, unknown>)
      : null;
  const rawList = Array.isArray(record.messages)
    ? record.messages
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.items)
        ? record.items
        : Array.isArray(record.results)
          ? record.results
          : conversationRecord && Array.isArray(conversationRecord.messages)
            ? conversationRecord.messages
            : conversationRecord && Array.isArray(conversationRecord.data)
              ? conversationRecord.data
              : assertArrayPayload(payload);

  const parsed: EvoMessageApi[] = [];

  for (const [index, item] of rawList.entries()) {
    if (typeof item !== "object" || item === null) continue;

    const row = item as Record<string, unknown>;
    const sourceId = toExternalId(row.id ?? row.message_id ?? row.uuid ?? row.external_id);

    const rawDirection = typeof row.direction === "string" ? row.direction.trim().toLowerCase() : null;
    const rawMsgType = typeof row.message_type === "string" ? row.message_type.trim().toLowerCase() : null;
    const fromMe =
      typeof row.from_me === "boolean"
        ? row.from_me
        : typeof row.fromMe === "boolean"
          ? row.fromMe
          : rawMsgType === "outgoing" || rawDirection === "outbound" || rawDirection === "sent" || rawDirection === "agent" || rawDirection === "operator"
            ? true
            : rawMsgType === "incoming" || rawDirection === "inbound" || rawDirection === "received" || rawDirection === "customer"
              ? false
              : null;

    const messageType =
      typeof row.type === "string" && row.type.trim().length > 0
        ? row.type.trim().toLowerCase()
        : typeof row.message_type === "string" && row.message_type.trim().length > 0
          ? row.message_type.trim().toLowerCase()
          : typeof row.messageType === "string" && row.messageType.trim().length > 0
            ? row.messageType.trim().toLowerCase()
            : typeof row.media_type === "string" && row.media_type.trim().length > 0
              ? row.media_type.trim().toLowerCase()
              : null;

    const caption = typeof row.caption === "string" && row.caption.trim().length > 0 ? row.caption : null;

    const mediaUrl =
      typeof row.media_url === "string" && row.media_url.trim().length > 0
        ? row.media_url.trim()
        : typeof row.mediaUrl === "string" && row.mediaUrl.trim().length > 0
          ? row.mediaUrl.trim()
          : typeof row.file_url === "string" && row.file_url.trim().length > 0
            ? row.file_url.trim()
            : typeof row.attachment_url === "string" && row.attachment_url.trim().length > 0
              ? row.attachment_url.trim()
              : null;

    const rawContent =
      typeof row.content === "string"
        ? row.content
        : typeof row.body === "string"
          ? row.body
          : typeof row.text === "string"
            ? row.text
            : typeof row.message === "string"
              ? row.message
              : null;

    const content = rawContent || caption || null;

    const createdAt =
      typeof row.created_at === "string"
        ? row.created_at
        : typeof row.createdAt === "string"
          ? row.createdAt
          : typeof row.sent_at === "string"
            ? row.sent_at
            : typeof row.timestamp === "string"
              ? row.timestamp
              : null;

    if (!content && !createdAt && !messageType) continue;

    const id =
      sourceId ??
      `${createdAt ?? "no-date"}::${content ?? "no-content"}::${fromMe === null ? "unknown" : String(fromMe)}::${index}`;

    parsed.push({ id, content, from_me: fromMe, created_at: createdAt, message_type: messageType, caption, media_url: mediaUrl });
  }

  return parsed;
}

function parsePipeline(item: Record<string, unknown>): EvoPipelineApi {
  return {
    id: String(item.id ?? ""),
    name: typeof item.name === "string" ? item.name : null,
    description: typeof item.description === "string" ? item.description : null,
    pipeline_type: typeof item.pipeline_type === "string" ? item.pipeline_type : null,
    is_active: typeof item.is_active === "boolean" ? item.is_active : null,
    is_default: typeof item.is_default === "boolean" ? item.is_default : null,
    item_count: typeof item.item_count === "number" ? item.item_count : null,
    stages: Array.isArray(item.stages)
      ? item.stages.map((s: Record<string, unknown>) => ({
          id: String(s.id ?? ""),
          name: typeof s.name === "string" ? s.name : null,
          pipeline_id: typeof s.pipeline_id === "string" ? s.pipeline_id : null,
          position: typeof s.position === "number" ? s.position : null,
          color: typeof s.color === "string" ? s.color : null,
          stage_type: typeof s.stage_type === "string" ? s.stage_type : null,
          item_count: typeof s.item_count === "number" ? s.item_count : null,
        }))
      : null,
  };
}

function readSessionBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "open", "opened", "active"].includes(normalized)) return true;
    if (["false", "0", "closed", "expired", "inactive"].includes(normalized)) return false;
  }
  return null;
}

function parseSessionStatusResponse(payload: unknown): EvoSessionStatus | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;

  const record = payload as Record<string, unknown>;
  const conversationRecord =
    typeof record.conversation === "object" && record.conversation !== null && !Array.isArray(record.conversation)
      ? (record.conversation as Record<string, unknown>)
      : null;
  const sessionRecord =
    typeof record.session === "object" && record.session !== null && !Array.isArray(record.session)
      ? (record.session as Record<string, unknown>)
      : null;

  const candidates = [record, conversationRecord, sessionRecord].filter(
    (candidate): candidate is Record<string, unknown> => Boolean(candidate)
  );

  for (const candidate of candidates) {
    const active =
      readSessionBoolean(candidate.session_open) ??
      readSessionBoolean(candidate.active) ??
      readSessionBoolean(candidate.sessionOpen) ??
      readSessionBoolean(candidate.is_active);

    const expiresAt =
      typeof candidate.session_expires_at === "string"
        ? candidate.session_expires_at
        : typeof candidate.expires_at === "string"
          ? candidate.expires_at
          : typeof candidate.sessionExpiresAt === "string"
            ? candidate.sessionExpiresAt
            : null;

    if (active !== null || expiresAt !== null) {
      const rawSeconds = candidate.seconds_remaining ?? candidate.secondsRemaining;
      const secondsRemaining = typeof rawSeconds === "number" ? rawSeconds : null;
      return { active: active ?? false, expires_at: expiresAt, seconds_remaining: secondsRemaining };
    }
  }

  return null;
}

/**
 * Retorna um EvoCrmClient com cache de 5 minutos por company.
 * Este é o ponto de entrada principal — todos os consumidores devem usar esta função.
 */
export async function getEvoCrmClient(companyId: string): Promise<EvoCrmClient> {
  return getCachedEvoCrmClient(companyId);
}

/**
 * Constrói um novo EvoCrmClient buscando credenciais do Supabase.
 * Uso interno — chamado pela factory. Consumidores devem usar getEvoCrmClient().
 */
export async function buildEvoCrmClient(companyId: string): Promise<EvoCrmClient> {
  const supabase = createSupabaseAdminClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("id, config, is_active")
    .eq("company_id", companyId)
    .eq("type", "evo_crm")
    .maybeSingle();

  if (error) {
    throw new EvoCrmNotConfiguredError(companyId);
  }

  if (!integration?.config) {
    throw new EvoCrmNotConfiguredError(companyId);
  }

  const config = decodeIntegrationConfig("evo_crm", integration.config);

  if (!config.baseUrl || !config.apiToken) {
    throw new Error("Credenciais do Evo CRM incompletas para esta empresa.");
  }

  const baseUrl = normalizeEvoBaseUrl(config.baseUrl);
  if (!baseUrl) {
    throw new Error("URL base do Evo CRM inválida.");
  }

  const RATE_LIMIT_MAX_RETRIES = 2;
  const RATE_LIMIT_BASE_DELAY_MS = 15_000;

  async function requestJson<T>(path: string, options?: EvoRequestOptions): Promise<T> {
    const method = options?.method ?? "GET";
    const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

    if (options?.searchParams) {
      for (const [key, value] of Object.entries(options.searchParams)) {
        if (typeof value !== "undefined") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const fetchUrl = url.toString();

    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), EVO_HTTP_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(fetchUrl, {
          method,
          headers: {
            api_access_token: config.apiToken,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeout);
        const detail = describeFetchError(err);
        throw new Error(`Falha ao conectar com o Evo CRM (${url.origin}): ${detail}`);
      } finally {
        clearTimeout(timeout);
      }

      const responseBody = await res.text();

      if (res.status === 429) {
        if (attempt < RATE_LIMIT_MAX_RETRIES) {
          const delay = RATE_LIMIT_BASE_DELAY_MS * (attempt + 1);
          console.warn(`[Evo CRM] Rate limit 429 em ${method} ${path}. Retry ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES} em ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        let retryMessage = "Muitas requisições — aguarde alguns minutos.";
        try {
          const parsed = JSON.parse(responseBody);
          if (parsed?.error?.message) retryMessage = parsed.error.message;
        } catch {}
        throw new Error(`Evo CRM Rate Limit (429): ${retryMessage}`);
      }

      if (res.status >= 400) {
        // Tenta extrair envelope de erro padrão Evo CRM
        try {
          const parsed = JSON.parse(responseBody);
          if (parsed?.success === false && parsed?.error) {
            const code = parsed.error.code ?? "UNKNOWN";
            const message = parsed.error.message ?? responseBody.slice(0, 180);
            throw new Error(`Evo CRM ${method} ${path} falhou [${code}]: ${message}`);
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Evo CRM ")) throw e;
        }
        throw new Error(`Evo CRM ${method} ${path} falhou: ${res.status} ${responseBody.slice(0, 180)}`);
      }

      if (res.status === 204 || !responseBody.trim()) {
        return {} as T;
      }

      if (responseBody.trim().startsWith("<")) {
        throw new Error(`Evo CRM retornou HTML em vez de JSON (${url.origin}). Verifique a URL base da API.`);
      }

      try {
        const rawJson = JSON.parse(responseBody);
        return unwrap<T>(rawJson);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Evo CRM [")) throw e;
        throw new Error(`Resposta inválida do Evo CRM (${url.origin}). JSON malformado.`);
      }
    }

    throw new Error(`Evo CRM: esgotou retries para ${method} ${path}`);
  }

  const evoClient: EvoCrmClient = {
    baseUrl,
    apiToken: config.apiToken,
    inboxId: config.inboxId || undefined,
    syncInboxIds: config.syncInboxIds?.length ? config.syncInboxIds : undefined,

    buildConversationUrl(externalConversationId: string) {
      return `${baseUrl}/conversations/${encodeURIComponent(externalConversationId)}`;
    },

    async listConversations(limit = 50, filters?: { status?: string; filter?: string; inbox_id?: string }) {
      const targetTotal = Math.max(limit, 1);
      const pageSize = Math.min(50, targetTotal);
      const collected: EvoConversationApi[] = [];
      const seenConversationIds = new Set<string>();
      const seenCursors = new Set<string>();
      let page = 1;
      let cursor: string | number | undefined;

      while (collected.length < targetTotal) {
        const remaining = targetTotal - collected.length;
        const requestLimit = Math.min(pageSize, remaining);
        const payload = await requestJson<unknown>("/api/v1/conversations", {
          searchParams: {
            limit: requestLimit,
            ...(filters?.status ? { status: filters.status } : {}),
            ...(filters?.filter ? { filter: filters.filter } : {}),
            ...(filters?.inbox_id ? { inbox_id: filters.inbox_id } : {}),
            ...(typeof cursor !== "undefined" ? { cursor } : { page }),
          },
        });
        const pageRows = parseConversationsResponse(payload);
        const pagination = parseConversationsPagination(payload);

        if (pageRows.length === 0) break;

        for (const row of pageRows) {
          if (seenConversationIds.has(row.id)) continue;
          seenConversationIds.add(row.id);
          collected.push(row);
          if (collected.length >= targetTotal) break;
        }

        if (typeof pagination.nextCursor !== "undefined") {
          const nextCursorKey = String(pagination.nextCursor);
          if (!pagination.hasMore || seenCursors.has(nextCursorKey)) break;
          seenCursors.add(nextCursorKey);
          cursor = pagination.nextCursor;
          continue;
        }

        if (pageRows.length < requestLimit) break;
        page += 1;
      }

      return collected.slice(0, targetTotal);
    },

    async listMessages(externalConversationId: string, limit = 200) {
      const encodedConversationId = encodeURIComponent(externalConversationId);
      const payload = await requestJson<unknown>(
        `/api/v1/conversations/${encodedConversationId}/messages`,
        { searchParams: { limit } }
      );
      return parseMessagesResponse(payload).slice(0, limit);
    },

    async sendMessage(conversationId: string, content: string, options?: { checkSession?: boolean }) {
      if (options?.checkSession) {
        const session = await evoClient.getSessionStatus(conversationId);
        if (!session.active) {
          throw new Error(
            "Sessão WhatsApp expirada (janela de 24h fechada). Use um template para reabrir a conversa."
          );
        }
      }
      await requestJson<unknown>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        body: { content },
      });
    },

    // UNVERIFIED — revalidar após obter token: endpoint `/send-template` retornou 404 no Evo CRM.
    // Pode ser necessário enviar via Evolution API WhatsApp (outro serviço) em vez do CRM.
    async sendTemplate(payload) {
      if (!config.inboxId) {
        throw new Error("Inbox ID não configurado. Não é possível enviar template.");
      }
      const result = await requestJson<Record<string, unknown>>(
        `/api/v1/inboxes/${encodeURIComponent(config.inboxId)}/send-template`,
        {
          method: "POST",
          body: {
            to: payload.to,
            template_name: payload.templateName,
            language: payload.language ?? "pt_BR",
            ...(payload.components ? { components: payload.components } : {}),
          },
        }
      );
      const messageId =
        (result as Record<string, unknown>)?.message_id ??
        (result as Record<string, unknown>)?.messageId ??
        (result as Record<string, unknown>)?.id;
      return { messageId: typeof messageId === "string" ? messageId : undefined };
    },

    // UNVERIFIED — revalidar: `/session` retornou 404. Session info pode vir embedded no conversation detail.
    async getSessionStatus(conversationId: string) {
      const encodedConversationId = encodeURIComponent(conversationId);
      try {
        const result = await requestJson<Record<string, unknown>>(
          `/api/v1/conversations/${encodedConversationId}`
        );
        const parsed = parseSessionStatusResponse(result);
        if (parsed) return parsed;
      } catch {
        // ignore
      }
      return { active: false, expires_at: null };
    },

    // UNVERIFIED — revalidar: `/assign` e `/assignee` retornaram 404. Provável `PATCH /conversations/:id` com body {assignee_id}.
    async assignConversation(conversationId: string, payload) {
      await requestJson<unknown>(`/api/v1/conversations/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        body: {
          ...(payload.assigneeId ? { assignee_id: payload.assigneeId } : {}),
          ...(payload.teamId ? { team_id: payload.teamId } : {}),
        },
      });
    },

    async startConversation(phone: string) {
      if (!config.inboxId) {
        throw new Error("Inbox ID não configurado. Não é possível iniciar conversa.");
      }
      const result = await requestJson<Record<string, unknown>>("/api/v1/conversations/start", {
        method: "POST",
        body: { phone, inbox_id: config.inboxId },
      });
      const id = toExternalId(result.id ?? result.conversation_id);
      return { conversationId: id ?? "" };
    },

    // --- Contatos ---

    async listContacts(params) {
      const result = await requestJson<Record<string, unknown>>("/api/v1/contacts", {
        searchParams: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 50,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.include_labels ? { include_labels: true } : {}),
        },
      });
      const rawList = Array.isArray(result.contacts)
        ? result.contacts
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);

      return rawList.map((item: Record<string, unknown>) => {
        const phone = typeof item.phone_number === "string" ? item.phone_number
          : typeof item.phone === "string" ? item.phone : null;
        const createdAt = typeof item.created_at === "string" ? item.created_at
          : typeof item.created_at === "number" ? new Date(item.created_at * 1000).toISOString() : null;
        const updatedAt = typeof item.updated_at === "string" ? item.updated_at
          : typeof item.updated_at === "number" ? new Date(item.updated_at * 1000).toISOString() : null;
        return {
          id: String(item.id ?? ""),
          name: typeof item.name === "string" ? item.name : null,
          phone,
          phone_e164: typeof item.phone_e164 === "string" ? item.phone_e164 : phone,
          email: typeof item.email === "string" ? item.email : null,
          gender: typeof item.gender === "string" ? item.gender : null,
          archived: typeof item.archived === "boolean" ? item.archived : null,
          blocked: typeof item.blocked === "boolean" ? item.blocked : null,
          created_at: createdAt,
          updated_at: updatedAt,
          labels: Array.isArray(item.labels)
            ? item.labels.map((l: Record<string, unknown>) => ({
                id: String(l.id ?? ""),
                name: typeof l.title === "string" ? l.title : typeof l.name === "string" ? l.name : null,
                color: typeof l.color === "string" ? l.color : null,
              }))
            : null,
        };
      }) as EvoContactApi[];
    },

    async getContact(contactId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/v1/contacts/${encodeURIComponent(contactId)}`);
      const item = typeof result.contact === "object" && result.contact !== null
        ? (result.contact as Record<string, unknown>)
        : result;
      const phone = typeof item.phone_number === "string" ? item.phone_number
        : typeof item.phone === "string" ? item.phone : null;
      return {
        id: String(item.id ?? contactId),
        name: typeof item.name === "string" ? item.name : null,
        phone,
        phone_e164: typeof item.phone_e164 === "string" ? item.phone_e164 : phone,
        email: typeof item.email === "string" ? item.email : null,
        gender: typeof item.gender === "string" ? item.gender : null,
        archived: typeof item.archived === "boolean" ? item.archived : null,
        blocked: typeof item.blocked === "boolean" ? item.blocked : null,
        created_at: typeof item.created_at === "string" ? item.created_at
          : typeof item.created_at === "number" ? new Date(item.created_at * 1000).toISOString() : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at
          : typeof item.updated_at === "number" ? new Date(item.updated_at * 1000).toISOString() : null,
        labels: Array.isArray(item.labels)
          ? item.labels.map((l: Record<string, unknown>) => ({
              id: String(l.id ?? ""),
              name: typeof l.title === "string" ? l.title : typeof l.name === "string" ? l.name : null,
              color: typeof l.color === "string" ? l.color : null,
            }))
          : null,
      } as EvoContactApi;
    },

    async findContactByPhone(phone: string) {
      try {
        // Evo CRM usa /contacts/search?q={phone} (validado: 401 = existe)
        const result = await requestJson<Record<string, unknown>>("/api/v1/contacts/search", {
          searchParams: { q: phone },
        });
        const rawList = Array.isArray(result.contacts)
          ? result.contacts
          : Array.isArray(result.data)
            ? result.data
            : assertArrayPayload(result);
        const match = rawList[0] as Record<string, unknown> | undefined;
        if (!match?.id) return null;
        const matchPhone = typeof match.phone_number === "string" ? match.phone_number
          : typeof match.phone === "string" ? match.phone : null;
        return {
          id: String(match.id),
          name: typeof match.name === "string" ? match.name : null,
          phone: matchPhone,
          phone_e164: typeof match.phone_e164 === "string" ? match.phone_e164 : matchPhone,
          email: typeof match.email === "string" ? match.email : null,
        } as EvoContactApi;
      } catch {
        return null;
      }
    },

    async createContact(payload) {
      const result = await requestJson<Record<string, unknown>>("/api/v1/contacts", {
        method: "POST",
        body: { name: payload.name, phone_number: payload.phone },
      });
      const item = typeof result.contact === "object" && result.contact !== null
        ? (result.contact as Record<string, unknown>)
        : result;
      const phone = typeof item.phone_number === "string" ? item.phone_number
        : typeof item.phone === "string" ? item.phone : payload.phone;
      return {
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : payload.name,
        phone,
        phone_e164: phone,
      } as EvoContactApi;
    },

    async listContactLabels(contactId: string) {
      const result = await requestJson<Record<string, unknown>>(
        `/api/v1/contacts/${encodeURIComponent(contactId)}/labels`
      );
      const rawList = Array.isArray(result.labels)
        ? result.labels
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        color: typeof item.color === "string" ? item.color : null,
      })) as EvoLabelApi[];
    },

    async removeContactLabel(contactId: string, labelId: string) {
      await requestJson<unknown>(
        `/api/v1/contacts/${encodeURIComponent(contactId)}/labels/${encodeURIComponent(labelId)}`,
        { method: "DELETE" }
      );
    },

    async addContactLabel(payload) {
      await requestJson<unknown>(
        `/api/v1/contacts/${encodeURIComponent(payload.contactId)}/labels`,
        { method: "POST", body: { label: payload.label } }
      );
    },

    // --- Labels ---

    async listLabels() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/labels");
      const rawList = Array.isArray(result.labels)
        ? result.labels
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.title === "string" ? item.title : typeof item.name === "string" ? item.name : null,
        color: typeof item.color === "string" ? item.color : null,
      })) as EvoLabelApi[];
    },

    async createLabel(name: string) {
      const result = await requestJson<Record<string, unknown>>("/api/v1/labels", {
        method: "POST",
        body: { title: name },
      });
      const item = typeof result.label === "object" && result.label !== null
        ? (result.label as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? ""),
        name: typeof item.title === "string" ? item.title : typeof item.name === "string" ? item.name : name,
        color: typeof item.color === "string" ? item.color : null,
      } as EvoLabelApi;
    },

    async updateLabel(labelId: string, payload) {
      await requestJson<unknown>(`/api/v1/labels/${encodeURIComponent(labelId)}`, {
        method: "PUT",
        body: {
          ...(payload.name ? { title: payload.name } : {}),
          ...(payload.color ? { color: payload.color } : {}),
        },
      });
    },

    async deleteLabel(labelId: string) {
      await requestJson<unknown>(`/api/v1/labels/${encodeURIComponent(labelId)}`, { method: "DELETE" });
    },

    // --- Kanban (Evo CRM: /api/v1/pipelines) ---

    async listBoards() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/pipelines");
      const rawList = Array.isArray(result.pipelines)
        ? result.pipelines
        : Array.isArray(result.boards)
          ? result.boards
          : Array.isArray(result.data)
            ? result.data
            : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        stages: Array.isArray(item.stages)
          ? item.stages.map((s: Record<string, unknown>) => ({
              id: String(s.id ?? ""),
              name: typeof s.name === "string" ? s.name : null,
              position: typeof s.position === "number" ? s.position : null,
              cards: null,
            }))
          : null,
      })) as EvoKanbanBoard[];
    },

    async getBoard(boardId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/v1/pipelines/${encodeURIComponent(boardId)}`);
      const item = typeof result.pipeline === "object" && result.pipeline !== null
        ? (result.pipeline as Record<string, unknown>)
        : typeof result.board === "object" && result.board !== null
          ? (result.board as Record<string, unknown>)
          : result;

      const parseCard = (c: Record<string, unknown>): EvoKanbanCard => ({
        id: String(c.id ?? ""),
        title: typeof c.title === "string" ? c.title : null,
        description: typeof c.description === "string" ? c.description : null,
        stage_id: typeof c.stage_id === "string" ? c.stage_id : null,
        board_id: typeof c.board_id === "string" ? c.board_id : typeof c.pipeline_id === "string" ? c.pipeline_id : null,
        source: typeof c.source === "string" ? c.source : null,
        contact_id: typeof c.contact_id === "string" ? c.contact_id : null,
        created_at: typeof c.created_at === "string" ? c.created_at : null,
        updated_at: typeof c.updated_at === "string" ? c.updated_at : null,
        assigned_to: typeof c.assigned_to === "string" ? c.assigned_to : null,
        assignee: typeof c.assignee === "string" ? c.assignee : null,
        value_amount: typeof c.value_amount === "number" ? c.value_amount : null,
        phone: typeof c.phone === "string" ? c.phone : null,
        priority: typeof c.priority === "string" ? c.priority : null,
        tags: Array.isArray(c.tags) ? c.tags.filter((t): t is string => typeof t === "string") : null,
        conversation_id: typeof c.conversation_id === "string" ? c.conversation_id : null,
      });

      return {
        id: String(item.id ?? boardId),
        name: typeof item.name === "string" ? item.name : null,
        stages: Array.isArray(item.stages)
          ? item.stages.map((s: Record<string, unknown>) => ({
              id: String(s.id ?? ""),
              name: typeof s.name === "string" ? s.name : null,
              position: typeof s.position === "number" ? s.position : null,
              cards: Array.isArray(s.cards) ? s.cards.map((c: Record<string, unknown>) => parseCard(c)) : null,
            }))
          : null,
      } as EvoKanbanBoard;
    },

    // UNVERIFIED — sub-rotas de cards de pipeline. Tentativa baseada em REST convencional.
    async createKanbanCard(payload) {
      await requestJson<unknown>(
        `/api/v1/pipelines/${encodeURIComponent(payload.boardId)}/cards`,
        {
          method: "POST",
          body: {
            title: payload.title,
            description: payload.description,
            source: "axiomix",
            ...(payload.stage_id ? { stage_id: payload.stage_id } : {}),
            ...(payload.contact_id ? { contact_id: payload.contact_id } : {}),
            ...(typeof payload.value_amount === "number" ? { value_amount: payload.value_amount } : {}),
            ...(payload.phone ? { phone: payload.phone } : {}),
            ...(payload.assigned_to ? { assigned_to: payload.assigned_to } : {}),
            ...(payload.priority ? { priority: payload.priority } : {}),
            ...(payload.tags && payload.tags.length > 0 ? { tags: payload.tags } : {}),
            ...(payload.conversation_id ? { conversation_id: payload.conversation_id } : {}),
          },
        }
      );
    },

    async getCard(cardId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/v1/pipelines/cards/${encodeURIComponent(cardId)}`);
      const item = typeof result.card === "object" && result.card !== null
        ? (result.card as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? cardId),
        title: typeof item.title === "string" ? item.title : null,
        description: typeof item.description === "string" ? item.description : null,
        stage_id: typeof item.stage_id === "string" ? item.stage_id : null,
        board_id: typeof item.board_id === "string" ? item.board_id : typeof item.pipeline_id === "string" ? item.pipeline_id : null,
        source: typeof item.source === "string" ? item.source : null,
        contact_id: typeof item.contact_id === "string" ? item.contact_id : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
        assigned_to: typeof item.assigned_to === "string" ? item.assigned_to : null,
        assignee: typeof item.assignee === "string" ? item.assignee : null,
        value_amount: typeof item.value_amount === "number" ? item.value_amount : null,
        phone: typeof item.phone === "string" ? item.phone : null,
        priority: typeof item.priority === "string" ? item.priority : null,
        tags: Array.isArray(item.tags) ? item.tags.filter((t: unknown): t is string => typeof t === "string") : null,
        conversation_id: typeof item.conversation_id === "string" ? item.conversation_id : null,
      } as EvoKanbanCard;
    },

    async updateCard(cardId: string, data) {
      await requestJson<unknown>(`/api/v1/pipelines/cards/${encodeURIComponent(cardId)}`, {
        method: "PUT",
        body: data as Json,
      });
    },

    async deleteCard(cardId: string) {
      await requestJson<unknown>(`/api/v1/pipelines/cards/${encodeURIComponent(cardId)}`, { method: "DELETE" });
    },

    async moveCard(cardId: string, boardId: string, stageId: string) {
      await requestJson<unknown>(`/api/v1/pipelines/cards/${encodeURIComponent(cardId)}/move`, {
        method: "POST",
        body: { pipeline_id: boardId, stage_id: stageId },
      });
    },

    // --- Equipe ---

    async listUsers() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/users");
      const rawList = Array.isArray(result.users)
        ? result.users
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.agents)
            ? result.agents
            : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        email: typeof item.email === "string" ? item.email : null,
        role: typeof item.role === "string" ? item.role : null,
        avatar_url: typeof item.avatar_url === "string" ? item.avatar_url : null,
      })) as EvoUserApi[];
    },

    async getUser(userId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/v1/users/${encodeURIComponent(userId)}`);
      const item = typeof result.user === "object" && result.user !== null
        ? (result.user as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? userId),
        name: typeof item.name === "string" ? item.name : null,
        email: typeof item.email === "string" ? item.email : null,
        role: typeof item.role === "string" ? item.role : null,
        avatar_url: typeof item.avatar_url === "string" ? item.avatar_url : null,
      } as EvoUserApi;
    },

    async listTeams() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/teams");
      const rawList = Array.isArray(result.teams)
        ? result.teams
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        members: Array.isArray(item.members)
          ? item.members.map((m: Record<string, unknown>) => ({
              id: String(m.id ?? ""),
              name: typeof m.name === "string" ? m.name : null,
              email: typeof m.email === "string" ? m.email : null,
              role: typeof m.role === "string" ? m.role : null,
              avatar_url: typeof m.avatar_url === "string" ? m.avatar_url : null,
            }))
          : null,
      })) as EvoTeamApi[];
    },

    async listInboxes() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/inboxes");
      const rawList = Array.isArray(result.inboxes)
        ? result.inboxes
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        channel_type: typeof item.channel_type === "string" ? item.channel_type : null,
        phone_number: typeof item.phone_number === "string" ? item.phone_number : null,
        provider: typeof item.provider === "string" ? item.provider : null,
      })) as EvoInboxApi[];
    },

    // --- Pipelines (verificado 2026-04-29) ---

    async listPipelines() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/pipelines");
      const rawList = Array.isArray(result.pipelines)
        ? result.pipelines
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => parsePipeline(item)) as EvoPipelineApi[];
    },

    async getPipeline(pipelineId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/v1/pipelines/${encodeURIComponent(pipelineId)}`);
      const item = typeof result.pipeline === "object" && result.pipeline !== null
        ? (result.pipeline as Record<string, unknown>)
        : typeof result.data === "object" && result.data !== null && !Array.isArray(result.data)
          ? (result.data as Record<string, unknown>)
          : result;
      return parsePipeline(item) as EvoPipelineApi;
    },

    async createPipeline(payload) {
      const result = await requestJson<Record<string, unknown>>("/api/v1/pipelines", {
        method: "POST",
        body: {
          name: payload.name,
          ...(payload.description ? { description: payload.description } : {}),
          ...(payload.pipeline_type ? { pipeline_type: payload.pipeline_type } : {}),
        },
      });
      const item = typeof result.pipeline === "object" && result.pipeline !== null
        ? (result.pipeline as Record<string, unknown>)
        : typeof result.data === "object" && result.data !== null && !Array.isArray(result.data)
          ? (result.data as Record<string, unknown>)
          : result;
      return parsePipeline(item) as EvoPipelineApi;
    },

    async updatePipeline(pipelineId: string, payload) {
      await requestJson<unknown>(`/api/v1/pipelines/${encodeURIComponent(pipelineId)}`, {
        method: "PATCH",
        body: payload as Json,
      });
    },

    // --- Macros (verificado 2026-04-29) ---

    async listMacros() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/macros");
      const rawList = Array.isArray(result.macros)
        ? result.macros
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        actions: Array.isArray(item.actions) ? item.actions as Record<string, unknown>[] : null,
        created_by_id: typeof item.created_by_id === "string" ? item.created_by_id : null,
        visibility: typeof item.visibility === "string" ? item.visibility : null,
      })) as EvoMacroApi[];
    },

    async executeMacro(macroId: string, conversationIds: string[]) {
      await requestJson<unknown>(`/api/v1/macros/${encodeURIComponent(macroId)}/execute`, {
        method: "POST",
        body: { conversation_ids: conversationIds },
      });
    },

    // --- Webhooks (verificado 2026-04-29) ---

    async listWebhooks() {
      const result = await requestJson<Record<string, unknown>>("/api/v1/webhooks");
      const rawList = Array.isArray(result.webhooks)
        ? result.webhooks
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        url: typeof item.url === "string" ? item.url : null,
        webhook_type: typeof item.webhook_type === "string" ? item.webhook_type : null,
        subscriptions: Array.isArray(item.subscriptions)
          ? item.subscriptions.filter((s): s is string => typeof s === "string")
          : null,
      })) as EvoWebhookApi[];
    },

    async createWebhook(url: string, subscriptions: string[]) {
      const result = await requestJson<Record<string, unknown>>("/api/v1/webhooks", {
        method: "POST",
        body: { url, subscriptions },
      });
      const item = typeof result.webhook === "object" && result.webhook !== null
        ? (result.webhook as Record<string, unknown>)
        : typeof result.data === "object" && result.data !== null && !Array.isArray(result.data)
          ? (result.data as Record<string, unknown>)
          : result;
      return {
        id: String(item.id ?? ""),
        url: typeof item.url === "string" ? item.url : url,
        webhook_type: typeof item.webhook_type === "string" ? item.webhook_type : null,
        subscriptions: Array.isArray(item.subscriptions)
          ? item.subscriptions.filter((s: unknown): s is string => typeof s === "string")
          : subscriptions,
      } as EvoWebhookApi;
    },

    async deleteWebhook(webhookId: string) {
      await requestJson<unknown>(`/api/v1/webhooks/${encodeURIComponent(webhookId)}`, { method: "DELETE" });
    },

    // --- Conversation update (verificado 2026-04-29) ---

    async updateConversation(conversationId: string, payload) {
      await requestJson<unknown>(`/api/v1/conversations/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        body: payload as Json,
      });
    },
  };

  return evoClient;
}

// Re-exportar utilitários da factory para acesso direto
export { invalidateEvoCrmCache, clearEvoCrmCache } from "./factory";
