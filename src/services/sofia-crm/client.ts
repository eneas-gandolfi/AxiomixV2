/**
 * Arquivo: src/services/sofia-crm/client.ts
 * Propósito: Fornecer cliente tipado do Sofia CRM com credenciais por company_id.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import type { Json } from "@/database/types/database.types";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SofiaConversationApi = {
  id: string;
  phone_e164?: string | null;
  remote_jid?: string | null;
  status?: string | null;
  last_message_at?: string | null;
  last_customer_message_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  profile_picture?: string | null;
  assignee_id?: string | null;
  contact?: {
    id?: string | null;
    name?: string | null;
    phone?: string | null;
    phone_e164?: string | null;
  } | null;
};

type SofiaMessageApi = {
  id: string;
  content?: string | null;
  from_me?: boolean | null;
  created_at?: string | null;
  message_type?: string | null;
  caption?: string | null;
  media_url?: string | null;
};

type SofiaContactApi = {
  id: string;
  name?: string | null;
  phone?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  gender?: string | null;
  archived?: boolean | null;
  blocked?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  labels?: SofiaLabelApi[] | null;
};

type SofiaLabelApi = {
  id: string;
  name?: string | null;
  color?: string | null;
};

type SofiaSessionStatus = {
  active: boolean;
  expires_at?: string | null;
  seconds_remaining?: number | null;
};

type SofiaKanbanBoard = {
  id: string;
  name?: string | null;
  stages?: SofiaKanbanStage[] | null;
};

type SofiaKanbanStage = {
  id: string;
  name?: string | null;
  position?: number | null;
  cards?: SofiaKanbanCard[] | null;
};

type SofiaKanbanCard = {
  id: string;
  title?: string | null;
  description?: string | null;
  stage_id?: string | null;
  board_id?: string | null;
  source?: string | null;
  contact_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  assigned_to?: string | null;
  assignee?: string | null;
  value_amount?: number | null;
  phone?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  conversation_id?: string | null;
};

type SofiaUserApi = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
};

type SofiaTeamApi = {
  id: string;
  name?: string | null;
  members?: SofiaUserApi[] | null;
};

type SofiaInboxApi = {
  id: string;
  name?: string | null;
  channel_type?: string | null;
  phone_number?: string | null;
};

type SofiaRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: Json;
  searchParams?: Record<string, string | number | boolean | undefined>;
};

const SOFIA_HTTP2_TIMEOUT_MS = 15_000;

type SofiaCrmClient = {
  baseUrl: string;
  apiToken: string;
  inboxId?: string;
  syncInboxIds?: string[];
  buildConversationUrl: (externalConversationId: string) => string;
  // Conversas
  listConversations: (limit?: number, filters?: { status?: string; filter?: string; inbox_id?: string }) => Promise<SofiaConversationApi[]>;
  listMessages: (externalConversationId: string, limit?: number) => Promise<SofiaMessageApi[]>;
  sendMessage: (conversationId: string, content: string, options?: { checkSession?: boolean }) => Promise<void>;
  sendTemplate: (payload: { to: string; templateName: string; language?: string; components?: Json }) => Promise<{ messageId?: string }>;
  getSessionStatus: (conversationId: string) => Promise<SofiaSessionStatus>;
  assignConversation: (conversationId: string, payload: { assigneeId?: string; teamId?: string }) => Promise<void>;
  startConversation: (phone: string) => Promise<{ conversationId: string }>;
  // Contatos
  listContacts: (params?: { search?: string; page?: number; limit?: number; include_labels?: boolean }) => Promise<SofiaContactApi[]>;
  getContact: (contactId: string) => Promise<SofiaContactApi>;
  findContactByPhone: (phone: string) => Promise<SofiaContactApi | null>;
  createContact: (payload: { name: string; phone: string }) => Promise<SofiaContactApi>;
  listContactLabels: (contactId: string) => Promise<SofiaLabelApi[]>;
  removeContactLabel: (contactId: string, labelId: string) => Promise<void>;
  // Labels
  listLabels: () => Promise<SofiaLabelApi[]>;
  createLabel: (name: string) => Promise<SofiaLabelApi>;
  updateLabel: (labelId: string, payload: { name?: string; color?: string }) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;
  // Kanban
  createKanbanCard: (payload: {
    boardId: string;
    title: string;
    description: string;
    stage_id?: string;
    contact_id?: string;
    value_amount?: number;
    phone?: string;
    assigned_to?: string;
    priority?: string;
    tags?: string[];
    conversation_id?: string;
  }) => Promise<void>;
  addContactLabel: (payload: { contactId: string; label: string }) => Promise<void>;
  listBoards: () => Promise<SofiaKanbanBoard[]>;
  getBoard: (boardId: string) => Promise<SofiaKanbanBoard>;
  getCard: (cardId: string) => Promise<SofiaKanbanCard>;
  updateCard: (cardId: string, data: Partial<Pick<SofiaKanbanCard, "title" | "description" | "stage_id" | "assigned_to" | "value_amount" | "phone" | "priority" | "tags" | "contact_id" | "conversation_id">>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, boardId: string, stageId: string) => Promise<void>;
  // Equipe
  listUsers: () => Promise<SofiaUserApi[]>;
  getUser: (userId: string) => Promise<SofiaUserApi>;
  listTeams: () => Promise<SofiaTeamApi[]>;
  listInboxes: () => Promise<SofiaInboxApi[]>;
};

function describeFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return "erro desconhecido de rede.";
  }

  if (error.name === "AbortError") {
    return "timeout ao conectar com o Sofia CRM.";
  }

  const cause =
    typeof error.cause === "object" && error.cause !== null
      ? (error.cause as Record<string, unknown>)
      : null;

  const code = cause && typeof cause.code === "string" ? cause.code : null;
  const causeMessage = cause && typeof cause.message === "string" ? cause.message : null;

  if (code === "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" || code === "EPROTO") {
    return "falha TLS no servidor (alert 80). Verifique se o SSL do Hostinger está instalado corretamente ou se o BitNinja está bloqueando o agente Axiomix.";
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

function normalizeSofiaBaseUrl(rawBaseUrl: string) {
  const normalized = rawBaseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
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

function parseConversationsResponse(payload: unknown): SofiaConversationApi[] {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rawList = Array.isArray(record.conversations)
    ? record.conversations
    : Array.isArray(record.data)
      ? record.data
      : assertArrayPayload(payload);

  const parsed: SofiaConversationApi[] = [];

  for (const item of rawList) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const row = item as Record<string, unknown>;
    const id = toExternalId(row.id);
    if (!id) {
      continue;
    }

    // Sofia CRM API retorna contact_name e contact_id diretamente no objeto conversation (não aninhado)
    // Mas também tentamos extrair de um objeto contact aninhado como fallback
    const contactRaw =
      typeof row.contact === "object" && row.contact !== null
        ? (row.contact as Record<string, unknown>)
        : null;

    // Prioridade: campos diretos (contact_name) -> objeto aninhado (contact.name)
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
      typeof row.phone_e164 === "string"
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

    // Extrair assignee_id — pode vir de vários campos dependendo da versão da API Sofia
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

    parsed.push({
      id,
      phone_e164: typeof row.phone_e164 === "string" ? row.phone_e164 : null,
      remote_jid: typeof row.remote_jid === "string" ? row.remote_jid : null,
      status: typeof row.status === "string" ? row.status : null,
      last_message_at:
        typeof row.last_message_at === "string"
          ? row.last_message_at
          : typeof row.lastMessageAt === "string"
            ? row.lastMessageAt
            : null,
      last_customer_message_at:
        typeof row.last_customer_message_at === "string"
          ? row.last_customer_message_at
          : typeof row.lastCustomerMessageAt === "string"
            ? row.lastCustomerMessageAt
            : null,
      updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
      created_at: typeof row.created_at === "string" ? row.created_at : null,
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

  return {
    nextCursor,
    hasMore,
  };
}

function parseMessagesResponse(payload: unknown): SofiaMessageApi[] {
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
              : conversationRecord && Array.isArray(conversationRecord.items)
                ? conversationRecord.items
                : conversationRecord && Array.isArray(conversationRecord.last_messages)
                  ? conversationRecord.last_messages
                  : conversationRecord && Array.isArray(conversationRecord.chat_messages)
                    ? conversationRecord.chat_messages
                    : Array.isArray(record.conversation_messages)
                      ? record.conversation_messages
                      : assertArrayPayload(payload);

  const parsed: SofiaMessageApi[] = [];

  for (const [index, item] of rawList.entries()) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const row = item as Record<string, unknown>;
    const sourceId = toExternalId(row.id ?? row.message_id ?? row.uuid ?? row.external_id);

    const rawDirection =
      typeof row.direction === "string" ? row.direction.trim().toLowerCase() : null;
    const fromMe =
      typeof row.from_me === "boolean"
        ? row.from_me
        : typeof row.fromMe === "boolean"
          ? row.fromMe
          : rawDirection === "outbound" ||
            rawDirection === "sent" ||
            rawDirection === "agent" ||
            rawDirection === "operator"
            ? true
            : rawDirection === "inbound" || rawDirection === "received" || rawDirection === "customer"
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
              : typeof row.mediaType === "string" && row.mediaType.trim().length > 0
                ? row.mediaType.trim().toLowerCase()
                : null;

    const caption =
      typeof row.caption === "string" && row.caption.trim().length > 0
        ? row.caption
        : null;

    const mediaUrl =
      typeof row.media_url === "string" && row.media_url.trim().length > 0
        ? row.media_url.trim()
        : typeof row.mediaUrl === "string" && row.mediaUrl.trim().length > 0
          ? row.mediaUrl.trim()
          : typeof row.file_url === "string" && row.file_url.trim().length > 0
            ? row.file_url.trim()
            : typeof row.fileUrl === "string" && row.fileUrl.trim().length > 0
              ? row.fileUrl.trim()
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
              : typeof row.date === "string"
                ? row.date
                : null;

    if (!content && !createdAt && !messageType) {
      continue;
    }

    const id =
      sourceId ??
      `${createdAt ?? "no-date"}::${content ?? "no-content"}::${fromMe === null ? "unknown" : String(fromMe)}::${index}`;

    parsed.push({
      id,
      content,
      from_me: fromMe,
      created_at: createdAt,
      message_type: messageType,
      caption,
      media_url: mediaUrl,
    });
  }

  return parsed;
}

function readSessionBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "open", "opened", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "closed", "expired", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function parseSessionStatusResponse(payload: unknown): SofiaSessionStatus | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

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
      return {
        active: active ?? false,
        expires_at: expiresAt,
        seconds_remaining: secondsRemaining,
      };
    }
  }

  return null;
}

export async function getSofiaCrmClient(companyId: string): Promise<SofiaCrmClient> {
  const supabase = createSupabaseAdminClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("id, config, is_active")
    .eq("company_id", companyId)
    .eq("type", "sofia_crm")
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao carregar configuração do Sofia CRM.");
  }

  if (!integration?.config) {
    throw new Error("Integração Sofia CRM não configurada para esta empresa.");
  }

  const config = decodeIntegrationConfig("sofia_crm", integration.config);

  if (!config.baseUrl || !config.apiToken) {
    throw new Error("Credenciais do Sofia CRM incompletas para esta empresa.");
  }

  const baseUrl = normalizeSofiaBaseUrl(config.baseUrl);
  if (!baseUrl) {
    throw new Error("URL base do Sofia CRM inválida.");
  }

  async function requestJson<T>(path: string, options?: SofiaRequestOptions): Promise<T> {
    const method = options?.method ?? "GET";
    const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

    if (options?.searchParams) {
      for (const [key, value] of Object.entries(options.searchParams)) {
        if (typeof value !== "undefined") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Em Docker, crm.getlead.capital não é alcançável pelo IP público.
    // SOFIA_CRM_INTERNAL_URL (ex: http://sofiacrm_crm_api:3000) roteia pela rede interna.
    const internalBase = process.env.SOFIA_CRM_INTERNAL_URL;
    const fetchUrl = internalBase
      ? url.toString().replace(baseUrl, internalBase.replace(/\/+$/, ""))
      : url.toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SOFIA_HTTP2_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(fetchUrl, {
        method,
        headers: {
          "authorization": `Bearer ${config.apiToken}`,
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const detail = describeFetchError(err);
      throw new Error(`Falha ao conectar com o Sofia CRM (${url.origin}): ${detail}`);
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await res.text();

    if (res.status === 429) {
      let retryMessage = "Limite de requisições excedido. Tente novamente em alguns minutos.";
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed.error) retryMessage = parsed.error;
      } catch {}
      throw new Error(`Sofia CRM Rate Limit (429): ${retryMessage}`);
    }

    if (res.status >= 400) {
      throw new Error(`Sofia CRM ${method} ${path} falhou: ${res.status} ${responseBody.slice(0, 180)}`);
    }

    if (res.status === 204 || !responseBody.trim()) {
      return {} as T;
    }

    const bodyLower = responseBody.toLowerCase();
    if (bodyLower.includes("parked domain") || bodyLower.includes("hostinger dns")) {
      throw new Error(`URL base do Sofia CRM inválida (${url.origin}): domínio estacionado detectado.`);
    }

    if (responseBody.trim().startsWith("<")) {
      throw new Error(`Sofia CRM retornou HTML em vez de JSON (${url.origin}). Verifique a URL base da API.`);
    }

    try {
      return JSON.parse(responseBody) as T;
    } catch {
      throw new Error(`Resposta inválida do Sofia CRM (${url.origin}). JSON malformado.`);
    }
  }

  const sofiaClient: SofiaCrmClient = {
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
      const collected: SofiaConversationApi[] = [];
      const seenConversationIds = new Set<string>();
      const seenCursors = new Set<string>();
      let page = 1;
      let cursor: string | number | undefined;

      while (collected.length < targetTotal) {
        const remaining = targetTotal - collected.length;
        const requestLimit = Math.min(pageSize, remaining);
        const payload = await requestJson<unknown>("/api/conversations", {
          searchParams: {
            limit: requestLimit,
            status: filters?.status ?? "all",
            filter: filters?.filter ?? "all",
            ...(filters?.inbox_id ? { inbox_id: filters.inbox_id } : {}),
            ...(typeof cursor !== "undefined" ? { cursor } : { page }),
          },
        });
        const pageRows = parseConversationsResponse(payload);
        const pagination = parseConversationsPagination(payload);

        if (pageRows.length === 0) {
          break;
        }

        for (const row of pageRows) {
          if (seenConversationIds.has(row.id)) {
            continue;
          }

          seenConversationIds.add(row.id);
          collected.push(row);

          if (collected.length >= targetTotal) {
            break;
          }
        }

        if (typeof pagination.nextCursor !== "undefined") {
          const nextCursorKey = String(pagination.nextCursor);
          if (!pagination.hasMore || seenCursors.has(nextCursorKey)) {
            break;
          }

          seenCursors.add(nextCursorKey);
          cursor = pagination.nextCursor;
          continue;
        }

        if (pageRows.length < requestLimit) {
          break;
        }

        page += 1;
      }

      return collected.slice(0, targetTotal);
    },
    async listMessages(externalConversationId: string, limit = 200) {
      const encodedConversationId = encodeURIComponent(externalConversationId);
      try {
        const payload = await requestJson<unknown>(`/api/conversations/${encodedConversationId}`, {
          searchParams: { limit },
        });
        const messages = parseMessagesResponse(payload).slice(0, limit);
        if (messages.length > 0) {
          return messages;
        }
      } catch (error) {
        const isRouteNotFound =
          error instanceof Error &&
          error.message.includes(`/api/conversations/${encodedConversationId}`) &&
          error.message.includes("404");

        if (!isRouteNotFound) {
          throw error;
        }
      }

      try {
        const legacyPayload = await requestJson<unknown>(`/api/conversations/${encodedConversationId}/messages`, {
          searchParams: { limit },
        });
        return parseMessagesResponse(legacyPayload).slice(0, limit);
      } catch (error) {
        const isLegacyRouteNotFound =
          error instanceof Error &&
          error.message.includes(`/api/conversations/${encodedConversationId}/messages`) &&
          error.message.includes("404");

        if (isLegacyRouteNotFound) {
          return [];
        }

        throw error;
      }
    },
    async createKanbanCard(payload) {
      await requestJson<unknown>(`/api/kanban/boards/${encodeURIComponent(payload.boardId)}/cards`, {
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
      });
    },
    async addContactLabel(payload) {
      await requestJson<unknown>(`/api/contacts/${encodeURIComponent(payload.contactId)}/labels`, {
        method: "POST",
        body: {
          label: payload.label,
        },
      });
    },

    // --- Fase 2: Conversas aprimoradas ---

    async sendMessage(conversationId: string, content: string, options?: { checkSession?: boolean }) {
      if (options?.checkSession) {
        const session = await sofiaClient.getSessionStatus(conversationId);
        if (!session.active) {
          throw new Error(
            "Sessão WhatsApp expirada (janela de 24h fechada). Use um template para reabrir a conversa."
          );
        }
      }
      await requestJson<unknown>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        body: { content },
      });
    },

    async sendTemplate(payload) {
      if (!config.inboxId) {
        throw new Error("Inbox ID não configurado. Não é possível enviar template.");
      }
      const result = await requestJson<Record<string, unknown>>(`/api/whatsapp-cloud/inboxes/${encodeURIComponent(config.inboxId)}/send-template`, {
        method: "POST",
        body: {
          to: payload.to,
          template_name: payload.templateName,
          language: payload.language ?? "pt_BR",
          ...(payload.components ? { components: payload.components } : {}),
        },
      });
      const messageId = (result as Record<string, unknown>)?.message_id
        ?? (result as Record<string, unknown>)?.messageId
        ?? (result as Record<string, unknown>)?.id;
      return { messageId: typeof messageId === "string" ? messageId : undefined };
    },

    async getSessionStatus(conversationId: string) {
      const encodedConversationId = encodeURIComponent(conversationId);

      try {
        const result = await requestJson<Record<string, unknown>>(`/api/conversations/${encodedConversationId}/session`);
        const parsed = parseSessionStatusResponse(result);
        if (parsed) {
          return parsed;
        }
      } catch (error) {
        const isUnsupportedRoute =
          error instanceof Error &&
          error.message.includes(`/api/conversations/${encodedConversationId}/session`) &&
          (error.message.includes("404") || error.message.includes("405"));

        if (!isUnsupportedRoute) {
          try {
            const fallbackResult = await requestJson<Record<string, unknown>>(`/api/conversations/${encodedConversationId}`);
            const parsedFallback = parseSessionStatusResponse(fallbackResult);
            if (parsedFallback) {
              return parsedFallback;
            }
          } catch {
            throw error;
          }

          throw error;
        }
      }

      try {
        const fallbackResult = await requestJson<Record<string, unknown>>(`/api/conversations/${encodedConversationId}`);
        const parsedFallback = parseSessionStatusResponse(fallbackResult);
        if (parsedFallback) {
          return parsedFallback;
        }
      } catch {
        // Session status is optional in some Sofia CRM deployments.
      }

      return {
        active: false,
        expires_at: null,
      };
    },

    async assignConversation(conversationId: string, payload) {
      await requestJson<unknown>(`/api/conversations/${encodeURIComponent(conversationId)}/assign`, {
        method: "POST",
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
      const result = await requestJson<Record<string, unknown>>("/api/conversations/start", {
        method: "POST",
        body: {
          phone,
          inbox_id: config.inboxId,
        },
      });
      const id = toExternalId(result.id ?? result.conversation_id);
      return { conversationId: id ?? "" };
    },

    // --- Fase 3: Contatos ---

    async listContacts(params) {
      const result = await requestJson<Record<string, unknown>>("/api/contacts", {
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

      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        phone: typeof item.phone === "string" ? item.phone : null,
        phone_e164: typeof item.phone_e164 === "string" ? item.phone_e164 : null,
        email: typeof item.email === "string" ? item.email : null,
        gender: typeof item.gender === "string" ? item.gender : null,
        archived: typeof item.archived === "boolean" ? item.archived : null,
        blocked: typeof item.blocked === "boolean" ? item.blocked : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
        labels: Array.isArray(item.labels)
          ? item.labels.map((l: Record<string, unknown>) => ({
              id: String(l.id ?? ""),
              name: typeof l.name === "string" ? l.name : null,
              color: typeof l.color === "string" ? l.color : null,
            }))
          : null,
      })) as SofiaContactApi[];
    },

    async getContact(contactId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/contacts/${encodeURIComponent(contactId)}`);
      const item = typeof result.contact === "object" && result.contact !== null
        ? (result.contact as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? contactId),
        name: typeof item.name === "string" ? item.name : null,
        phone: typeof item.phone === "string" ? item.phone : null,
        phone_e164: typeof item.phone_e164 === "string" ? item.phone_e164 : null,
        email: typeof item.email === "string" ? item.email : null,
        gender: typeof item.gender === "string" ? item.gender : null,
        archived: typeof item.archived === "boolean" ? item.archived : null,
        blocked: typeof item.blocked === "boolean" ? item.blocked : null,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
        labels: Array.isArray(item.labels)
          ? item.labels.map((l: Record<string, unknown>) => ({
              id: String(l.id ?? ""),
              name: typeof l.name === "string" ? l.name : null,
              color: typeof l.color === "string" ? l.color : null,
            }))
          : null,
      } as SofiaContactApi;
    },

    async findContactByPhone(phone: string) {
      try {
        const result = await requestJson<Record<string, unknown>>(`/api/contacts/number/${encodeURIComponent(phone)}`);
        const item = typeof result.contact === "object" && result.contact !== null
          ? (result.contact as Record<string, unknown>)
          : result;
        if (!item.id) return null;
        return {
          id: String(item.id),
          name: typeof item.name === "string" ? item.name : null,
          phone: typeof item.phone === "string" ? item.phone : null,
          phone_e164: typeof item.phone_e164 === "string" ? item.phone_e164 : null,
          email: typeof item.email === "string" ? item.email : null,
        } as SofiaContactApi;
      } catch {
        return null;
      }
    },

    async createContact(payload) {
      const result = await requestJson<Record<string, unknown>>("/api/contacts", {
        method: "POST",
        body: { name: payload.name, phone: payload.phone },
      });
      const item = typeof result.contact === "object" && result.contact !== null
        ? (result.contact as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : payload.name,
        phone: typeof item.phone === "string" ? item.phone : payload.phone,
      } as SofiaContactApi;
    },

    async listContactLabels(contactId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/contacts/${encodeURIComponent(contactId)}/labels`);
      const rawList = Array.isArray(result.labels)
        ? result.labels
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        color: typeof item.color === "string" ? item.color : null,
      })) as SofiaLabelApi[];
    },

    async removeContactLabel(contactId: string, labelId: string) {
      await requestJson<unknown>(
        `/api/contacts/${encodeURIComponent(contactId)}/labels/${encodeURIComponent(labelId)}`,
        { method: "DELETE" }
      );
    },

    // --- Fase 3: Labels ---

    async listLabels() {
      const result = await requestJson<Record<string, unknown>>("/api/labels");
      const rawList = Array.isArray(result.labels)
        ? result.labels
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        color: typeof item.color === "string" ? item.color : null,
      })) as SofiaLabelApi[];
    },

    async createLabel(name: string) {
      const result = await requestJson<Record<string, unknown>>("/api/labels", {
        method: "POST",
        body: { name },
      });
      const item = typeof result.label === "object" && result.label !== null
        ? (result.label as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : name,
        color: typeof item.color === "string" ? item.color : null,
      } as SofiaLabelApi;
    },

    async updateLabel(labelId: string, payload) {
      await requestJson<unknown>(`/api/labels/${encodeURIComponent(labelId)}`, {
        method: "PUT",
        body: {
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.color ? { color: payload.color } : {}),
        },
      });
    },

    async deleteLabel(labelId: string) {
      await requestJson<unknown>(`/api/labels/${encodeURIComponent(labelId)}`, {
        method: "DELETE",
      });
    },

    // --- Fase 4: Kanban ---

    async listBoards() {
      const result = await requestJson<Record<string, unknown>>("/api/kanban/boards");
      const rawList = Array.isArray(result.boards)
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
      })) as SofiaKanbanBoard[];
    },

    async getBoard(boardId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/kanban/boards/${encodeURIComponent(boardId)}`);
      const item = typeof result.board === "object" && result.board !== null
        ? (result.board as Record<string, unknown>)
        : result;

      const parseCard = (c: Record<string, unknown>): SofiaKanbanCard => ({
        id: String(c.id ?? ""),
        title: typeof c.title === "string" ? c.title : null,
        description: typeof c.description === "string" ? c.description : null,
        stage_id: typeof c.stage_id === "string" ? c.stage_id : null,
        board_id: typeof c.board_id === "string" ? c.board_id : null,
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
              cards: Array.isArray(s.cards)
                ? s.cards.map((c: Record<string, unknown>) => parseCard(c))
                : null,
            }))
          : null,
      } as SofiaKanbanBoard;
    },

    async getCard(cardId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/kanban/cards/${encodeURIComponent(cardId)}`);
      const item = typeof result.card === "object" && result.card !== null
        ? (result.card as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? cardId),
        title: typeof item.title === "string" ? item.title : null,
        description: typeof item.description === "string" ? item.description : null,
        stage_id: typeof item.stage_id === "string" ? item.stage_id : null,
        board_id: typeof item.board_id === "string" ? item.board_id : null,
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
      } as SofiaKanbanCard;
    },

    async updateCard(cardId: string, data) {
      await requestJson<unknown>(`/api/kanban/cards/${encodeURIComponent(cardId)}`, {
        method: "PUT",
        body: data as Json,
      });
    },

    async deleteCard(cardId: string) {
      await requestJson<unknown>(`/api/kanban/cards/${encodeURIComponent(cardId)}`, {
        method: "DELETE",
      });
    },

    async moveCard(cardId: string, boardId: string, stageId: string) {
      await requestJson<unknown>(`/api/kanban/cards/${encodeURIComponent(cardId)}/move`, {
        method: "POST",
        body: { board_id: boardId, stage_id: stageId },
      });
    },

    // --- Fase 5: Equipe ---

    async listUsers() {
      const result = await requestJson<Record<string, unknown>>("/api/users");
      const rawList = Array.isArray(result.users)
        ? result.users
        : Array.isArray(result.data)
          ? result.data
          : assertArrayPayload(result);
      return rawList.map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        name: typeof item.name === "string" ? item.name : null,
        email: typeof item.email === "string" ? item.email : null,
        role: typeof item.role === "string" ? item.role : null,
        avatar_url: typeof item.avatar_url === "string" ? item.avatar_url : null,
      })) as SofiaUserApi[];
    },

    async getUser(userId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/users/${encodeURIComponent(userId)}`);
      const item = typeof result.user === "object" && result.user !== null
        ? (result.user as Record<string, unknown>)
        : result;
      return {
        id: String(item.id ?? userId),
        name: typeof item.name === "string" ? item.name : null,
        email: typeof item.email === "string" ? item.email : null,
        role: typeof item.role === "string" ? item.role : null,
        avatar_url: typeof item.avatar_url === "string" ? item.avatar_url : null,
      } as SofiaUserApi;
    },

    async listTeams() {
      const result = await requestJson<Record<string, unknown>>("/api/teams");
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
      })) as SofiaTeamApi[];
    },

    async listInboxes() {
      const result = await requestJson<Record<string, unknown>>("/api/inboxes");
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
      })) as SofiaInboxApi[];
    },
  };

  return sofiaClient;
}

export type {
  SofiaConversationApi,
  SofiaMessageApi,
  SofiaContactApi,
  SofiaLabelApi,
  SofiaSessionStatus,
  SofiaKanbanBoard,
  SofiaKanbanStage,
  SofiaKanbanCard,
  SofiaUserApi,
  SofiaTeamApi,
  SofiaInboxApi,
  SofiaCrmClient,
};
