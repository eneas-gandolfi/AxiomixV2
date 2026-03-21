/**
 * Arquivo: src/services/group-agent/rag-feeder.ts
 * Propósito: Processar mensagens de grupo em batch e alimentar a base RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/services/rag/chunker";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { isRagWorthy } from "@/services/group-agent/message-filter";

export const GROUP_CHAT_CHUNK_SIZE = 1500;
export const GROUP_CHAT_CHUNK_OVERLAP = 200;
const MIN_BATCH_MESSAGES = 3;
const MIN_COMBINED_LENGTH = 200;

type BatchResult = {
  configId: string;
  messagesProcessed: number;
  chunksCreated: number;
  ragDocumentId: string | null;
};

export async function processGroupRagBatch(
  companyId: string,
  configId: string
): Promise<BatchResult> {
  const supabase = createSupabaseAdminClient();

  const { data: config } = await supabase
    .from("group_agent_configs")
    .select("group_name, rag_min_message_length, feed_to_rag")
    .eq("id", configId)
    .maybeSingle();

  if (!config || !config.feed_to_rag) {
    return { configId, messagesProcessed: 0, chunksCreated: 0, ragDocumentId: null };
  }

  const { data: messages } = await supabase
    .from("group_messages")
    .select("id, sender_name, content, sent_at")
    .eq("config_id", configId)
    .eq("company_id", companyId)
    .eq("rag_processed", false)
    .not("content", "is", null)
    .order("sent_at", { ascending: true })
    .limit(200);

  if (!messages || messages.length === 0) {
    return { configId, messagesProcessed: 0, chunksCreated: 0, ragDocumentId: null };
  }

  const worthyMessages = messages.filter(
    (m) =>
      m.content &&
      m.content.length >= (config.rag_min_message_length ?? 50) &&
      isRagWorthy(m.content)
  );

  if (worthyMessages.length < MIN_BATCH_MESSAGES) {
    const allIds = messages.map((m) => m.id);
    await markProcessed(supabase, allIds);
    return { configId, messagesProcessed: messages.length, chunksCreated: 0, ragDocumentId: null };
  }

  const firstDate = new Date(worthyMessages[0].sent_at).toLocaleDateString("pt-BR");
  const lastDate = new Date(worthyMessages[worthyMessages.length - 1].sent_at).toLocaleDateString("pt-BR");
  const groupName = config.group_name ?? "Grupo WhatsApp";

  const senders = [...new Set(worthyMessages.map((m) => m.sender_name ?? "Desconhecido"))];

  const header = [
    `[Grupo: ${groupName}]`,
    `[Periodo: ${firstDate} a ${lastDate}]`,
    `[Participantes: ${senders.join(", ")}]`,
    "",
    "---",
    "",
  ].join("\n");

  const body = worthyMessages
    .map((m) => {
      const time = new Date(m.sent_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${m.sender_name ?? "Desconhecido"} (${time}): ${m.content}`;
    })
    .join("\n\n");

  const combinedText = header + body;

  if (combinedText.length < MIN_COMBINED_LENGTH) {
    const allIds = messages.map((m) => m.id);
    await markProcessed(supabase, allIds);
    return { configId, messagesProcessed: messages.length, chunksCreated: 0, ragDocumentId: null };
  }

  const fileName = `grupo-${groupName.replace(/\s+/g, "-").toLowerCase()}-${firstDate.replace(/\//g, "-")}.txt`;

  const { data: ragDoc, error: docError } = await supabase
    .from("rag_documents")
    .insert({
      company_id: companyId,
      scope: "company" as const,
      file_name: fileName,
      file_size: combinedText.length,
      file_type: "text/plain",
      storage_path: "",
      source_key: "group_chat",
      status: "processing" as const,
    })
    .select("id")
    .single();

  if (docError || !ragDoc) {
    throw new Error(`Falha ao criar rag_documents: ${docError?.message}`);
  }

  const chunks = chunkText(combinedText, {
    chunkSize: GROUP_CHAT_CHUNK_SIZE,
    chunkOverlap: GROUP_CHAT_CHUNK_OVERLAP,
  });

  if (chunks.length === 0) {
    await supabase
      .from("rag_documents")
      .update({ status: "ready", total_chunks: 0 })
      .eq("id", ragDoc.id);

    const allIds = messages.map((m) => m.id);
    await markProcessed(supabase, allIds);
    return { configId, messagesProcessed: messages.length, chunksCreated: 0, ragDocumentId: ragDoc.id };
  }

  const chunkTexts = chunks.map((c) => c.content);
  const batchSize = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunkTexts.length; i += batchSize) {
    const batch = chunkTexts.slice(i, i + batchSize);
    const embeddings = await generateEmbeddings(companyId, batch);
    allEmbeddings.push(...embeddings);
  }

  const chunkRows = chunks.map((chunk, index) => ({
    document_id: ragDoc.id,
    company_id: companyId,
    scope: "company" as const,
    chunk_index: index,
    content: chunk.content,
    token_count: chunk.tokenCount,
    embedding: JSON.stringify(allEmbeddings[index]),
  }));

  const { error: chunkError } = await supabase
    .from("rag_document_chunks")
    .insert(chunkRows);

  if (chunkError) {
    await supabase
      .from("rag_documents")
      .update({ status: "failed", error_message: chunkError.message })
      .eq("id", ragDoc.id);
    throw new Error(`Falha ao inserir chunks: ${chunkError.message}`);
  }

  await supabase
    .from("rag_documents")
    .update({ status: "ready", total_chunks: chunks.length })
    .eq("id", ragDoc.id);

  const allIds = messages.map((m) => m.id);
  await markProcessed(supabase, allIds);

  return {
    configId,
    messagesProcessed: messages.length,
    chunksCreated: chunks.length,
    ragDocumentId: ragDoc.id,
  };
}

async function markProcessed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  messageIds: string[]
): Promise<void> {
  const batchSize = 50;
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    await supabase
      .from("group_messages")
      .update({ rag_processed: true })
      .in("id", batch);
  }
}
