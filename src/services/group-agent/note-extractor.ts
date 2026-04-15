/**
 * Arquivo: src/services/group-agent/note-extractor.ts
 * Propósito: Extrair fatos-chave das conversas e gerenciar notas persistentes do agente.
 * Autor: AXIOMIX
 * Data: 2026-04-09
 */

import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { parseAiJson } from "@/lib/ai/parse-ai-json";
import type { AgentNote, AgentNoteCategory, ExtractedNote } from "@/types/modules/group-agent.types";

/**
 * Normaliza o conteúdo de uma nota para comparação: lowercase, remove
 * acentos, pontuação e múltiplos espaços. Usado para detectar duplicatas
 * mesmo quando o texto foi levemente reescrito.
 */
export function canonicalizeNoteContent(content: string): string {
  return content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s]/g, " ")         // remove pontuação
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalNoteHash(content: string): string {
  const normalized = canonicalizeNoteContent(content);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

const MAX_NOTES_PER_GROUP = 50;
const TABLE = "group_agent_notes";

// Helper: query tipada para tabela ainda não gerada nos types do Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function notesTable(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  return supabase.from(TABLE) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const EXTRACTION_SYSTEM_PROMPT = `Você é um assistente que extrai fatos-chave de conversas de grupo WhatsApp.

Analise a conversa e a resposta do agente. Extraia APENAS informações que seriam úteis lembrar em conversas futuras.

## Categorias válidas:
- "fact": Fatos importantes (ex: "O cliente João prefere entregas às terças")
- "preference": Preferências de membros do grupo (ex: "Maria não gosta de relatórios longos")
- "decision": Decisões tomadas no grupo (ex: "Decidido aumentar meta de vendas em 15%")
- "action_item": Tarefas pendentes (ex: "Pedro vai enviar proposta até sexta")
- "contact_info": Informações de contato (ex: "Fornecedor ABC: contato@abc.com")

## Regras:
1. Extraia NO MÁXIMO 3 notas por interação
2. NÃO extraia saudações, conversas triviais ou informações óbvias
3. NÃO extraia informações que mudam rapidamente (ex: "está chovendo hoje")
4. Cada nota deve ser uma frase completa e autossuficiente
5. Atribua relevance_score de 0.5 a 1.0 (1.0 = muito importante)
6. Se não há nada relevante para extrair, retorne array vazio

## Formato de resposta (JSON):
{
  "notes": [
    {
      "category": "fact",
      "content": "texto da nota",
      "source_sender": "nome do remetente ou null",
      "relevance_score": 0.8
    }
  ],
  "obsolete_notes": ["conteúdo de nota que deve ser desativada se existir"]
}`;

type ExtractionResult = {
  notes: ExtractedNote[];
  obsolete_notes: string[];
};

export async function extractAndSaveNotes(input: {
  companyId: string;
  configId: string;
  groupJid: string;
  userMessage: string;
  senderName: string;
  agentResponse: string;
  recentMessages: Array<{ senderName: string; content: string }>;
}): Promise<number> {
  try {
    const contextMessages = input.recentMessages
      .slice(-10)
      .map((m) => `${m.senderName}: ${m.content}`)
      .join("\n");

    const userPrompt = `## Mensagens recentes do grupo:
${contextMessages}

## Última pergunta de ${input.senderName}:
${input.userMessage}

## Resposta do agente:
${input.agentResponse}

Extraia fatos-chave para lembrar em conversas futuras.`;

    const raw = await openRouterChatCompletion(input.companyId, [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ], {
      responseFormat: "json",
      temperature: 0.1,
      maxTokens: 512,
      module: "group_agent",
      operation: "note_extraction",
    });

    const parsed = parseAiJson<ExtractionResult>(raw);
    if (!parsed || !Array.isArray(parsed.notes)) return 0;

    const validNotes = parsed.notes
      .filter(
        (n): n is ExtractedNote =>
          typeof n.content === "string" &&
          n.content.length > 10 &&
          isValidCategory(n.category) &&
          typeof n.relevance_score === "number"
      )
      .slice(0, 3);

    if (validNotes.length === 0 && (!parsed.obsolete_notes || parsed.obsolete_notes.length === 0)) {
      return 0;
    }

    const supabase = createSupabaseAdminClient();

    // Carregar todas as notas ativas uma única vez para comparar por hash
    const { data: activeRows } = await notesTable(supabase)
      .select("id, content")
      .eq("config_id", input.configId)
      .eq("is_active", true)
      .limit(MAX_NOTES_PER_GROUP + 10);

    const activeNotes: Array<{ id: string; content: string; hash: string }> = (
      (activeRows ?? []) as Array<{ id: string; content: string }>
    ).map((n) => ({
      id: n.id,
      content: n.content,
      hash: canonicalNoteHash(n.content),
    }));

    // Desativar notas obsoletas por hash canônico
    if (Array.isArray(parsed.obsolete_notes) && parsed.obsolete_notes.length > 0) {
      const obsoleteHashes = new Set(
        parsed.obsolete_notes
          .filter((c): c is string => typeof c === "string" && c.length >= 5)
          .map((c) => canonicalNoteHash(c))
      );

      const toDeactivate = activeNotes
        .filter((n) => obsoleteHashes.has(n.hash))
        .map((n) => n.id);

      if (toDeactivate.length > 0) {
        await notesTable(supabase)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in("id", toDeactivate);
        console.log("[note-extractor] Notas desativadas:", toDeactivate.length);
      }
    }

    // Dedupe por hash + evitar duplicatas entre as próprias novas notas
    const existingHashes = new Set(activeNotes.map((n) => n.hash));
    const newNoteHashes = new Set<string>();

    const newNotes: Array<{
      company_id: string;
      config_id: string;
      group_jid: string;
      category: AgentNoteCategory;
      content: string;
      source_sender: string | null;
      relevance_score: number;
    }> = [];

    for (const note of validNotes) {
      const hash = canonicalNoteHash(note.content);
      if (existingHashes.has(hash) || newNoteHashes.has(hash)) continue;

      newNoteHashes.add(hash);
      newNotes.push({
        company_id: input.companyId,
        config_id: input.configId,
        group_jid: input.groupJid,
        category: note.category,
        content: note.content,
        source_sender: note.source_sender,
        relevance_score: Math.min(1, Math.max(0.5, note.relevance_score)),
      });
    }

    if (newNotes.length > 0) {
      await notesTable(supabase).insert(newNotes);
      console.log("[note-extractor] Notas salvas:", newNotes.length);
    }

    // Limpar notas antigas se exceder limite
    await pruneOldNotes(input.configId);

    return newNotes.length;
  } catch (err) {
    console.error("[note-extractor] Erro (best-effort):", err instanceof Error ? err.message : err);
    return 0;
  }
}

export async function getActiveNotes(
  configId: string,
  limit = 20
): Promise<AgentNote[]> {
  const supabase = createSupabaseAdminClient();

  const { data } = await notesTable(supabase)
    .select("id, config_id, group_jid, category, content, source_sender, relevance_score, is_active, created_at")
    .eq("config_id", configId)
    .eq("is_active", true)
    .order("relevance_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AgentNote[];
}

async function pruneOldNotes(configId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { count } = await notesTable(supabase)
    .select("id", { count: "exact", head: true })
    .eq("config_id", configId)
    .eq("is_active", true);

  if ((count ?? 0) <= MAX_NOTES_PER_GROUP) return;

  // Desativar notas mais antigas e com menor relevância
  const excess = (count ?? 0) - MAX_NOTES_PER_GROUP;
  const { data: toRemove } = await notesTable(supabase)
    .select("id")
    .eq("config_id", configId)
    .eq("is_active", true)
    .order("relevance_score", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(excess);

  if (toRemove && toRemove.length > 0) {
    await notesTable(supabase)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", (toRemove as Array<{ id: string }>).map((n) => n.id));

    console.log("[note-extractor] Notas prunadas:", toRemove.length);
  }
}

function isValidCategory(cat: unknown): cat is AgentNoteCategory {
  return typeof cat === "string" &&
    ["fact", "preference", "decision", "action_item", "contact_info"].includes(cat);
}
