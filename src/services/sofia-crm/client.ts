/**
 * Arquivo: src/services/sofia-crm/client.ts
 * Proposito: Fornecer cliente tipado do Sofia CRM com credenciais por company_id.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import http2 from "http2";
import type { Json } from "@/database/types/database.types";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SofiaConversationApi = {
  id: string;
  phone_e164?: string | null;
  remote_jid?: string | null;
  status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
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

type SofiaCrmClient = {
  baseUrl: string;
  inboxId: string;
  buildConversationUrl: (externalConversationId: string) => string;
  // Conversas
  listConversations: (limit?: number) => Promise<SofiaConversationApi[]>;
  listMessages: (externalConversationId: string, limit?: number) => Promise<SofiaMessageApi[]>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  sendTemplate: (payload: { to: string; templateName: string; language?: string; components?: Json }) => Promise<void>;
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
  createKanbanCard: (payload: { boardId: string; title: string; description: string }) => Promise<void>;
  addContactLabel: (payload: { contactId: string; label: string }) => Promise<void>;
  listBoards: () => Promise<SofiaKanbanBoard[]>;
  getBoard: (boardId: string) => Promise<SofiaKanbanBoard>;
  getCard: (cardId: string) => Promise<SofiaKanbanCard>;
  updateCard: (cardId: string, data: Partial<Pick<SofiaKanbanCard, "title" | "description" | "stage_id">>) => Promise<void>;
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
    return "falha TLS no servidor (alert 80). Verifique se o SSL do Hostinger esta instalado corretamente ou se o BitNinja esta bloqueando o agente Axiomix.";
  }

  if (code === "ENOTFOUND") {
    return "host nao encontrado (DNS).";
  }

  if (code === "ECONNREFUSED") {
    return "conexao recusada pelo servidor.";
  }

  if (code === "UND_ERR_CONNECT_TIMEOUT") {
    return "timeout de conexao com o servidor.";
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

    parsed.push({
      id,
      phone_e164: typeof row.phone_e164 === "string" ? row.phone_e164 : null,
      remote_jid: typeof row.remote_jid === "string" ? row.remote_jid : null,
      status: typeof row.status === "string" ? row.status : null,
      updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
      created_at: typeof row.created_at === "string" ? row.created_at : null,
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

    const content =
      typeof row.content === "string"
        ? row.content
        : typeof row.body === "string"
          ? row.body
          : typeof row.text === "string"
            ? row.text
            : typeof row.message === "string"
              ? row.message
              : null;

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

    if (!content && !createdAt) {
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
    });
  }

  return parsed;
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
    throw new Error("Falha ao carregar configuracao do Sofia CRM.");
  }

  if (!integration?.config) {
    throw new Error("Integracao Sofia CRM nao configurada para esta empresa.");
  }

  const config = decodeIntegrationConfig("sofia_crm", integration.config);

  if (!config.baseUrl || !config.apiToken || !config.inboxId) {
    throw new Error("Credenciais do Sofia CRM incompletas para esta empresa.");
  }

  const baseUrl = normalizeSofiaBaseUrl(config.baseUrl);
  if (!baseUrl) {
    throw new Error("URL base do Sofia CRM invalida.");
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

    // O Sofia CRM v1.5.6 pode exigir api_token nos query params
    if (!url.searchParams.has("api_token")) {
      url.searchParams.set("api_token", config.apiToken);
    }
    if (!url.searchParams.has("inbox_id") && config.inboxId) {
      url.searchParams.set("inbox_id", config.inboxId);
    }

    const hostOverride = url.hostname === "crm.getlead.capital" ? "82.25.68.119" : url.hostname;

    return new Promise((resolve, reject) => {
      // O servidor do CRM (Hostinger/BitNinja) exige HTTP/2 para rotas /api/ e falha no TLS em HTTP/1.1
      const client = http2.connect(`https://${hostOverride}`, {
        servername: url.hostname,
        rejectUnauthorized: false,
      });

      client.on("error", (err) => {
        const detail = describeFetchError(err);
        reject(new Error(`Falha ao conectar via HTTP/2 no Sofia CRM (${url.origin}): ${detail}`));
      });

      const reqHeaders: http2.OutgoingHttpHeaders = {
        ":method": method,
        ":path": `${url.pathname}${url.search}`,
        "authorization": `Bearer ${config.apiToken}`,
        "x-inbox-id": config.inboxId || "",
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      const req = client.request(reqHeaders);
      let responseBody = "";
      let statusCode = 0;

      req.on("response", (headers) => {
        statusCode = Number(headers[":status"]);
      });

      req.on("data", (chunk) => {
        responseBody += chunk;
      });

      req.on("end", () => {
        client.close();

        if (statusCode === 429) {
          let retryMessage = "Limite de requisições excedido. Tente novamente em alguns minutos.";
          try {
             const parsed = JSON.parse(responseBody);
             if (parsed.error) retryMessage = parsed.error;
          } catch {}
          return reject(
            new Error(`Sofia CRM Rate Limit (429): ${retryMessage}`)
          );
        }

        if (statusCode >= 400) {
          return reject(
            new Error(`Sofia CRM ${method} ${path} falhou: ${statusCode} ${responseBody.slice(0, 180)}`)
          );
        }

        if (statusCode === 204 || !responseBody.trim()) {
          return resolve({} as T);
        }

        const bodyLower = responseBody.toLowerCase();
        if (bodyLower.includes("parked domain") || bodyLower.includes("hostinger dns")) {
          return reject(
            new Error(`URL base do Sofia CRM invalida (${url.origin}): dominio estacionado detectado.`)
          );
        }

        if (responseBody.trim().startsWith("<")) {
          return reject(
            new Error(`Sofia CRM retornou HTML em vez de JSON (${url.origin}). Verifique a URL base da API.`)
          );
        }

        try {
          resolve(JSON.parse(responseBody) as T);
        } catch {
          reject(new Error(`Resposta invalida do Sofia CRM (${url.origin}): JSON malformado.`));
        }
      });

      req.on("timeout", () => {
        req.destroy();
        client.destroy();
        reject(new Error(`Timeout HTTP/2 ao conectar com o Sofia CRM (${url.origin}).`));
      });

      if (options?.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  return {
    baseUrl,
    inboxId: config.inboxId,
    buildConversationUrl(externalConversationId: string) {
      return `${baseUrl}/conversations/${encodeURIComponent(externalConversationId)}`;
    },
    async listConversations(limit = 50) {
      const targetTotal = Math.max(limit, 1);
      const pageSize = Math.min(50, targetTotal);
      const collected: SofiaConversationApi[] = [];
      let page = 1;

      while (collected.length < targetTotal) {
        const remaining = targetTotal - collected.length;
        const requestLimit = Math.min(pageSize, remaining);
        const payload = await requestJson<unknown>("/api/conversations", {
          searchParams: {
            limit: requestLimit,
            page,
            status: "all",
            filter: "all",
          },
        });
        const pageRows = parseConversationsResponse(payload);

        if (pageRows.length === 0) {
          break;
        }

        collected.push(...pageRows);
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
        const payload = await requestJson<unknown>(`/api/conversations/${encodedConversationId}/messages`, {
          searchParams: { limit },
        });
        return parseMessagesResponse(payload).slice(0, limit);
      } catch (error) {
        const isRouteNotFound =
          error instanceof Error &&
          error.message.includes(`/api/conversations/${encodedConversationId}/messages`) &&
          error.message.includes("404");

        if (!isRouteNotFound) {
          throw error;
        }

        const fallbackPayload = await requestJson<unknown>(`/api/conversations/${encodedConversationId}`, {
          searchParams: {
            limit,
            include_messages: true,
            includeMessages: true,
            with_messages: true,
          },
        });
        return parseMessagesResponse(fallbackPayload).slice(0, limit);
      }
    },
    async createKanbanCard(payload) {
      await requestJson<unknown>(`/api/kanban/boards/${encodeURIComponent(payload.boardId)}/cards`, {
        method: "POST",
        body: {
          title: payload.title,
          description: payload.description,
          source: "axiomix",
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

    async sendMessage(conversationId: string, content: string) {
      await requestJson<unknown>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        body: { content },
      });
    },

    async sendTemplate(payload) {
      await requestJson<unknown>(`/api/whatsapp-cloud/inboxes/${encodeURIComponent(config.inboxId)}/send-template`, {
        method: "POST",
        body: {
          to: payload.to,
          template_name: payload.templateName,
          language: payload.language ?? "pt_BR",
          ...(payload.components ? { components: payload.components } : {}),
        },
      });
    },

    async getSessionStatus(conversationId: string) {
      const result = await requestJson<Record<string, unknown>>(`/api/conversations/${encodeURIComponent(conversationId)}/session`);
      return {
        active: result.active === true,
        expires_at: typeof result.expires_at === "string" ? result.expires_at : null,
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
