/**
 * Arquivo: src/services/evo-crm/conversations.ts
 * Propósito: Sincronizar conversas e mensagens do Evo CRM para o banco do AXIOMIX.
 * Autor: AXIOMIX
 * Data: 2026-04-17
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEvoCrmClient } from "@/services/evo-crm/client";
import { getExcludedConversationExternalIds } from "@/services/whatsapp/conversation-exclusions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SyncConversationsResult = {
  syncedConversations: number;
  syncedMessages: number;
  conversations: Array<{ id: string; externalId: string }>;
};

type SyncMessagesResult = {
  conversationId: string;
  externalId: string;
  syncedMessages: number;
};

export type SyncProgressInfo = {
  phase: "conversations" | "upserting" | "messages";
  totalConversations: number;
  processedConversations: number;
  syncedMessages: number;
};

export type SyncProgressCallback = (progress: SyncProgressInfo) => void;

const EVO_SYNC_CONVERSATION_LIMIT = 300;
const EVO_AUTO_SYNC_CONVERSATION_LIMIT = 5;
const EVO_AUTO_SYNC_MESSAGE_LIMIT = 80;
const EVO_DEFAULT_MESSAGE_LIMIT = 300;
const EVO_DEFAULT_EXISTING_MESSAGES_LIMIT = 1000;

type SyncRecentMessagesOptions = {
  conversationLimit?: number;
  messageLimit?: number;
};

type SyncMessagesOptions = {
  messageLimit?: number;
  existingMessagesLimit?: number;
};

function conversationLastMessageDate(raw: {
  last_message_at?: string | null;
  last_customer_message_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}) {
  const candidate =
    raw.last_message_at ??
    raw.last_customer_message_at ??
    raw.updated_at ??
    raw.created_at;
  if (!candidate) return null;

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function resolveRemoteJid(raw: {
  phone_e164?: string | null;
  remote_jid?: string | null;
  contact?: { phone_e164?: string | null; phone?: string | null } | null;
}) {
  return (
    raw.phone_e164 ??
    raw.remote_jid ??
    raw.contact?.phone_e164 ??
    raw.contact?.phone ??
    "unknown"
  );
}

function normalizeSentAt(value?: string | null) {
  const fallback = new Date().toISOString();
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function buildMessageFingerprint(message: {
  content: string | null;
  direction: "inbound" | "outbound";
  sent_at: string;
}) {
  return `${message.sent_at}::${message.direction}::${message.content ?? ""}`;
}

function shouldSyncMessages(
  previousLastMessageAt?: string | null,
  nextLastMessageAt?: string | null
) {
  if (!nextLastMessageAt) return false;
  if (!previousLastMessageAt) return true;
  const previousTime = new Date(previousLastMessageAt).getTime();
  const nextTime = new Date(nextLastMessageAt).getTime();
  if (Number.isNaN(previousTime) || Number.isNaN(nextTime)) return true;
  return nextTime > previousTime;
}

export async function syncConversations(
  companyId: string,
  onProgress?: SyncProgressCallback
): Promise<SyncConversationsResult> {
  const supabase = createSupabaseAdminClient();
  const evoClient = await getEvoCrmClient(companyId);

  const syncFilters: { status: string; inbox_id?: string } = { status: "open" };
  if (evoClient.syncInboxIds?.[0]) {
    syncFilters.inbox_id = evoClient.syncInboxIds[0];
  }
  const remoteConversations = await evoClient.listConversations(
    EVO_SYNC_CONVERSATION_LIMIT,
    syncFilters
  );
  const excludedExternalIds = await getExcludedConversationExternalIds(
    companyId,
    remoteConversations.map((conversation) => conversation.id).filter(Boolean)
  );
  const uniqueConversations = new Map<string, (typeof remoteConversations)[number]>();

  for (const item of remoteConversations) {
    if (!item.id) continue;
    if (excludedExternalIds.has(item.id)) continue;
    if (!uniqueConversations.has(item.id)) {
      uniqueConversations.set(item.id, item);
    }
  }

  const ENRICH_LIMIT = 10;
  const toEnrich = Array.from(uniqueConversations.values())
    .filter((item) => !item.contact?.name && item.contact?.id)
    .slice(0, ENRICH_LIMIT);

  for (const item of toEnrich) {
    try {
      const detail = await evoClient.getContact(String(item.contact!.id!));
      if (detail.name || detail.phone || detail.phone_e164) {
        item.contact = {
          id: item.contact!.id,
          name: detail.name ?? null,
          phone: detail.phone ?? null,
          phone_e164: detail.phone_e164 ?? detail.phone ?? null,
        };
      }
    } catch {
      // Silently skip
    }
    await sleep(200);
  }

  const syncRows = Array.from(uniqueConversations.values()).map((item) => {
    const contactName = item.contact?.name ?? null;

    return {
      company_id: companyId,
      external_id: item.id,
      remote_jid: resolveRemoteJid(item),
      contact_name: contactName,
      contact_phone: item.contact?.phone_e164 ?? item.contact?.phone ?? null,
      contact_avatar_url: item.profile_picture
        ? item.profile_picture.startsWith("http")
          ? item.profile_picture
          : `${evoClient.baseUrl}${item.profile_picture.startsWith("/") ? "" : "/"}${item.profile_picture}`
        : null,
      contact_external_id: item.contact?.id ?? null,
      assigned_to: isValidUuid(item.assignee_id) ? item.assignee_id : null,
      status: item.status ?? "open",
      last_message_at: conversationLastMessageDate(item),
      last_synced_at: new Date().toISOString(),
    };
  });

  onProgress?.({
    phase: "conversations",
    totalConversations: syncRows.length,
    processedConversations: 0,
    syncedMessages: 0,
  });

  if (syncRows.length === 0) {
    return { syncedConversations: 0, syncedMessages: 0, conversations: [] };
  }

  const externalIds = syncRows.map((row) => row.external_id);
  const { data: existingRows, error: existingRowsError } = await supabase
    .from("conversations")
    .select("id, external_id, last_message_at")
    .eq("company_id", companyId)
    .in("external_id", externalIds);

  if (existingRowsError) {
    throw new Error(`Falha ao carregar conversas existentes do CRM: ${existingRowsError.message}`);
  }

  const existingByExternalId = new Map<string, { id: string; lastMessageAt: string | null }>();
  for (const row of existingRows ?? []) {
    if (!row.external_id || existingByExternalId.has(row.external_id)) continue;
    existingByExternalId.set(row.external_id, {
      id: row.id,
      lastMessageAt: row.last_message_at,
    });
  }

  const insertRows = syncRows.filter((row) => !existingByExternalId.has(row.external_id));
  const updateRows = syncRows.filter((row) => existingByExternalId.has(row.external_id));
  const rows: Array<{ id: string; external_id: string | null }> = [];
  const messageSyncExternalIds = new Set<string>();

  onProgress?.({
    phase: "upserting",
    totalConversations: syncRows.length,
    processedConversations: 0,
    syncedMessages: 0,
  });

  if (insertRows.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("conversations")
      .insert(insertRows)
      .select("id, external_id");

    if (insertError) {
      throw new Error(`Falha ao inserir conversas do Evo CRM: ${insertError.message}`);
    }

    rows.push(...(insertedRows ?? []));
    for (const row of insertedRows ?? []) {
      if (row.external_id) messageSyncExternalIds.add(row.external_id);
    }
  }

  onProgress?.({
    phase: "upserting",
    totalConversations: syncRows.length,
    processedConversations: insertRows.length,
    syncedMessages: 0,
  });

  const UPDATE_BATCH_SIZE = 20;
  for (let batchStart = 0; batchStart < updateRows.length; batchStart += UPDATE_BATCH_SIZE) {
    const batch = updateRows.slice(batchStart, batchStart + UPDATE_BATCH_SIZE);
    const updatePromises = batch.map(async (row) => {
      const existingConversation = existingByExternalId.get(row.external_id);
      if (!existingConversation) return null;

      const { data: updatedRow, error: updateError } = await supabase
        .from("conversations")
        .update({
          remote_jid: row.remote_jid,
          contact_name: row.contact_name,
          contact_phone: row.contact_phone,
          contact_avatar_url: row.contact_avatar_url,
          contact_external_id: row.contact_external_id,
          assigned_to: row.assigned_to,
          status: row.status,
          last_message_at: row.last_message_at,
          last_synced_at: row.last_synced_at,
        })
        .eq("id", existingConversation.id)
        .eq("company_id", companyId)
        .select("id, external_id")
        .single();

      if (updateError) {
        console.error(`[SYNC] Falha ao atualizar conversa ${row.external_id}: ${updateError.message}`);
        return null;
      }

      if (updatedRow?.external_id && shouldSyncMessages(existingConversation.lastMessageAt, row.last_message_at)) {
        messageSyncExternalIds.add(updatedRow.external_id);
      }

      return updatedRow;
    });

    const batchResults = await Promise.all(updatePromises);
    for (const updatedRow of batchResults) {
      if (updatedRow) rows.push(updatedRow);
    }

    onProgress?.({
      phase: "upserting",
      totalConversations: syncRows.length,
      processedConversations: insertRows.length + Math.min(batchStart + UPDATE_BATCH_SIZE, updateRows.length),
      syncedMessages: 0,
    });
  }

  let syncedMessages = 0;
  let processedConversations = 0;
  const totalConversations = rows.length;
  const syncedList: Array<{ id: string; externalId: string }> = [];

  onProgress?.({
    phase: "messages",
    totalConversations,
    processedConversations: 0,
    syncedMessages: 0,
  });

  for (const row of rows ?? []) {
    if (!row.external_id) continue;

    syncedList.push({ id: row.id, externalId: row.external_id });

    if (!messageSyncExternalIds.has(row.external_id)) {
      processedConversations += 1;
      continue;
    }

    try {
      const messagesResult = await syncMessages(companyId, row.id);
      syncedMessages += messagesResult.syncedMessages;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("429") || msg.includes("Rate Limit")) {
        console.warn(`[SYNC] Rate limit atingido na conversa ${row.external_id}. Interrompendo sincronização.`);
        break;
      }
      console.error(`[SYNC] Falha ao sincronizar mensagens da conversa ${row.id}:`, msg);
    }

    processedConversations += 1;
    onProgress?.({
      phase: "messages",
      totalConversations,
      processedConversations,
      syncedMessages,
    });

    await sleep(400);
  }

  const LABEL_SYNC_LIMIT = 10;
  const contactIdsToSync = Array.from(uniqueConversations.values())
    .filter((item) => item.contact?.id && messageSyncExternalIds.has(item.id))
    .slice(0, LABEL_SYNC_LIMIT);

  for (const item of contactIdsToSync) {
    const contactId = item.contact?.id;
    if (!contactId) continue;
    try {
      const labels = await evoClient.listContactLabels(String(contactId));
      const labelsJson = labels.map((l) => ({ id: l.id, name: l.name, color: l.color }));
      await supabase
        .from("conversations")
        .update({ contact_labels: labelsJson })
        .eq("company_id", companyId)
        .eq("external_id", item.id);
    } catch {
      // Labels são complementares
    }
    await sleep(200);
  }

  return {
    syncedConversations: syncedList.length,
    syncedMessages,
    conversations: syncedList,
  };
}

export async function syncRecentMessages(
  companyId: string,
  options?: SyncRecentMessagesOptions
): Promise<{ syncedMessages: number; checkedConversations: number }> {
  const supabase = createSupabaseAdminClient();
  const conversationLimit = Math.max(1, options?.conversationLimit ?? EVO_AUTO_SYNC_CONVERSATION_LIMIT);
  const messageLimit = Math.max(1, options?.messageLimit ?? EVO_AUTO_SYNC_MESSAGE_LIMIT);
  const existingMessagesLimit = Math.max(messageLimit * 3, 200);

  const { data: recent } = await supabase
    .from("conversations")
    .select("id, external_id")
    .eq("company_id", companyId)
    .not("external_id", "is", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(conversationLimit);

  if (!recent?.length) return { syncedMessages: 0, checkedConversations: 0 };

  let syncedMessages = 0;
  let checked = 0;

  for (const conv of recent) {
    if (!conv.external_id) continue;
    try {
      const result = await syncMessages(companyId, conv.id, { messageLimit, existingMessagesLimit });
      syncedMessages += result.syncedMessages;
      checked++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("429") || msg.includes("Rate Limit")) break;
      checked++;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  return { syncedMessages, checkedConversations: checked };
}

export async function syncMessages(
  companyId: string,
  conversationId: string,
  options?: SyncMessagesOptions
): Promise<SyncMessagesResult> {
  const supabase = createSupabaseAdminClient();
  const evoClient = await getEvoCrmClient(companyId);
  const messageLimit = Math.max(1, options?.messageLimit ?? EVO_DEFAULT_MESSAGE_LIMIT);
  const existingMessagesLimit = Math.max(1, options?.existingMessagesLimit ?? EVO_DEFAULT_EXISTING_MESSAGES_LIMIT);

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, external_id")
    .eq("id", conversationId)
    .eq("company_id", companyId)
    .single();

  if (conversationError || !conversation?.external_id) {
    throw new Error("Conversa inválida para sincronização de mensagens.");
  }

  const remoteMessages = await evoClient.listMessages(conversation.external_id, messageLimit);

  const { data: existingMessages, error: existingError } = await supabase
    .from("messages")
    .select("content, direction, sent_at")
    .eq("company_id", companyId)
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(existingMessagesLimit);

  if (existingError) {
    throw new Error("Falha ao carregar mensagens existentes para deduplicacao.");
  }

  const existingSet = new Set<string>();
  for (const item of existingMessages ?? []) {
    if (!item.direction || !item.sent_at) continue;
    existingSet.add(
      buildMessageFingerprint({
        content: item.content,
        direction: item.direction,
        sent_at: normalizeSentAt(item.sent_at),
      })
    );
  }

  const insertRows: Array<{
    company_id: string;
    conversation_id: string;
    content: string | null;
    direction: "inbound" | "outbound";
    sent_at: string;
    message_type: string | null;
    media_url: string | null;
  }> = [];

  for (const remoteMessage of remoteMessages) {
    const direction: "inbound" | "outbound" = remoteMessage.from_me ? "outbound" : "inbound";
    const normalized = {
      company_id: companyId,
      conversation_id: conversationId,
      content: remoteMessage.content ?? "",
      direction,
      sent_at: normalizeSentAt(remoteMessage.created_at),
      message_type: remoteMessage.message_type ?? null,
      media_url: remoteMessage.media_url ?? null,
    };
    const fingerprint = buildMessageFingerprint(normalized);

    if (existingSet.has(fingerprint)) continue;

    existingSet.add(fingerprint);
    insertRows.push(normalized);
  }

  if (insertRows.length > 0) {
    const { error: insertError } = await supabase.from("messages").insert(insertRows);
    if (insertError) {
      throw new Error("Falha ao salvar mensagens sincronizadas.");
    }
  }

  return {
    conversationId,
    externalId: conversation.external_id,
    syncedMessages: insertRows.length,
  };
}

export type { SyncConversationsResult, SyncMessagesResult };
