/**
 * Arquivo: src/services/sofia-crm/conversations.ts
 * Proposito: Sincronizar conversas e mensagens do Sofia CRM para o banco do AXIOMIX.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

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

function conversationLastMessageDate(raw: {
  updated_at?: string | null;
  created_at?: string | null;
}) {
  const candidate = raw.updated_at ?? raw.created_at;
  if (!candidate) {
    return null;
  }

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

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
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function buildMessageFingerprint(message: {
  content: string | null;
  direction: "inbound" | "outbound";
  sent_at: string;
}) {
  return `${message.sent_at}::${message.direction}::${message.content ?? ""}`;
}

export async function syncConversations(companyId: string): Promise<SyncConversationsResult> {
  const supabase = createSupabaseAdminClient();
  const sofiaClient = await getSofiaCrmClient(companyId);
  const remoteConversations = await sofiaClient.listConversations(100);
  const uniqueConversations = new Map<string, (typeof remoteConversations)[number]>();

  for (const item of remoteConversations) {
    if (!item.id) {
      continue;
    }

    if (!uniqueConversations.has(item.id)) {
      uniqueConversations.set(item.id, item);
    }
  }

  const syncRows = Array.from(uniqueConversations.values()).map((item) => {
    const contactName = item.contact?.name ?? null;

    // Log para debug - ver o que está vindo da API
    if (!contactName && item.id) {
      console.log(
        `[SYNC DEBUG] Conversa ${item.id} sem nome. Contact:`,
        JSON.stringify(item.contact, null, 2)
      );
    }

    return {
      company_id: companyId,
      external_id: item.id,
      remote_jid: resolveRemoteJid(item),
      contact_name: contactName,
      contact_phone: item.contact?.phone_e164 ?? item.contact?.phone ?? null,
      status: item.status ?? "open",
      last_message_at: conversationLastMessageDate(item),
      last_synced_at: new Date().toISOString(),
    };
  });

  if (syncRows.length === 0) {
    return {
      syncedConversations: 0,
      syncedMessages: 0,
      conversations: [],
    };
  }

  const externalIds = syncRows.map((row) => row.external_id);
  const { data: existingRows, error: existingRowsError } = await supabase
    .from("conversations")
    .select("id, external_id")
    .eq("company_id", companyId)
    .in("external_id", externalIds);

  if (existingRowsError) {
    throw new Error(`Falha ao carregar conversas existentes do CRM: ${existingRowsError.message}`);
  }

  const existingByExternalId = new Map<string, string>();
  for (const row of existingRows ?? []) {
    if (!row.external_id || existingByExternalId.has(row.external_id)) {
      continue;
    }
    existingByExternalId.set(row.external_id, row.id);
  }

  const insertRows = syncRows.filter((row) => !existingByExternalId.has(row.external_id));
  const updateRows = syncRows.filter((row) => existingByExternalId.has(row.external_id));
  const rows: Array<{ id: string; external_id: string | null }> = [];

  if (insertRows.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("conversations")
      .insert(insertRows)
      .select("id, external_id");

    if (insertError) {
      throw new Error(`Falha ao inserir conversas do Sofia CRM: ${insertError.message}`);
    }

    rows.push(...(insertedRows ?? []));
  }

  for (const row of updateRows) {
    const conversationId = existingByExternalId.get(row.external_id);
    if (!conversationId) {
      continue;
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("conversations")
      .update({
        remote_jid: row.remote_jid,
        contact_name: row.contact_name,
        contact_phone: row.contact_phone,
        status: row.status,
        last_message_at: row.last_message_at,
        last_synced_at: row.last_synced_at,
      })
      .eq("id", conversationId)
      .eq("company_id", companyId)
      .select("id, external_id")
      .single();

    if (updateError) {
      throw new Error(`Falha ao atualizar conversa ${row.external_id}: ${updateError.message}`);
    }

    if (updatedRow) {
      rows.push(updatedRow);
    }
  }

  let syncedMessages = 0;
  const syncedList: Array<{ id: string; externalId: string }> = [];

  for (const row of rows ?? []) {
    if (!row.external_id) {
      continue;
    }

    syncedList.push({
      id: row.id,
      externalId: row.external_id,
    });

    const messagesResult = await syncMessages(companyId, row.id);
    syncedMessages += messagesResult.syncedMessages;
  }

  return {
    syncedConversations: syncedList.length,
    syncedMessages,
    conversations: syncedList,
  };
}

export async function syncMessages(companyId: string, conversationId: string): Promise<SyncMessagesResult> {
  const supabase = createSupabaseAdminClient();
  const sofiaClient = await getSofiaCrmClient(companyId);

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, external_id")
    .eq("id", conversationId)
    .eq("company_id", companyId)
    .single();

  if (conversationError || !conversation?.external_id) {
    throw new Error("Conversa invalida para sincronizacao de mensagens.");
  }

  const remoteMessages = await sofiaClient.listMessages(conversation.external_id, 300);

  const { data: existingMessages, error: existingError } = await supabase
    .from("messages")
    .select("content, direction, sent_at")
    .eq("company_id", companyId)
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(1000);

  if (existingError) {
    throw new Error("Falha ao carregar mensagens existentes para deduplicacao.");
  }

  const existingSet = new Set<string>();
  for (const item of existingMessages ?? []) {
    if (!item.direction || !item.sent_at) {
      continue;
    }
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
  }> = [];

  for (const remoteMessage of remoteMessages) {
    const direction: "inbound" | "outbound" = remoteMessage.from_me ? "outbound" : "inbound";
    const normalized = {
      company_id: companyId,
      conversation_id: conversationId,
      content: remoteMessage.content ?? "",
      direction,
      sent_at: normalizeSentAt(remoteMessage.created_at),
    };
    const fingerprint = buildMessageFingerprint(normalized);

    if (existingSet.has(fingerprint)) {
      continue;
    }

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
