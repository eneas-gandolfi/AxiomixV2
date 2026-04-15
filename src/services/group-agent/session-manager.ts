/**
 * Arquivo: src/services/group-agent/session-manager.ts
 * Proposito: Gerenciar sessoes multi-turno do agente de grupo.
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SessionMessage } from "@/types/modules/group-agent.types";

const SESSION_TTL_MINUTES = 15;
const MAX_SESSION_MESSAGES = 10;

type SessionRow = {
  id: string;
  company_id: string;
  config_id: string;
  group_jid: string;
  sender_jid: string;
  messages: SessionMessage[];
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export async function getActiveSession(
  configId: string,
  senderJid: string,
  groupJid: string
): Promise<SessionRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("group_agent_sessions")
    .select("*")
    .eq("config_id", configId)
    .eq("sender_jid", senderJid)
    .eq("group_jid", groupJid)
    .gt("expires_at", new Date().toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[session-manager] Erro ao buscar sessao:", error.message);
    return null;
  }

  return data as SessionRow | null;
}

export async function upsertSession(
  companyId: string,
  configId: string,
  senderJid: string,
  groupJid: string,
  newMessage: SessionMessage
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const existing = await getActiveSession(configId, senderJid, groupJid);
  const newExpires = new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString();

  if (existing) {
    const messages = [...(existing.messages ?? []), newMessage].slice(-MAX_SESSION_MESSAGES);
    const { error } = await supabase
      .from("group_agent_sessions")
      .update({
        messages,
        updated_at: new Date().toISOString(),
        expires_at: newExpires,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[session-manager] Erro ao atualizar sessao:", error.message);
      throw new Error(`Falha ao atualizar sessao: ${error.message}`);
    }
    return existing.id;
  }

  const { data, error } = await supabase
    .from("group_agent_sessions")
    .insert({
      company_id: companyId,
      config_id: configId,
      group_jid: groupJid,
      sender_jid: senderJid,
      messages: [newMessage],
      expires_at: newExpires,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Falha ao criar sessao de conversa.");
  }

  return data.id;
}

export async function appendAgentResponse(
  sessionId: string,
  responseText: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data: session, error: fetchError } = await supabase
    .from("group_agent_sessions")
    .select("messages, expires_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchError || !session) {
    console.error("[session-manager] Sessao nao encontrada para append:", sessionId);
    return;
  }

  const currentMessages = (session.messages ?? []) as SessionMessage[];
  const agentMessage: SessionMessage = {
    role: "agent",
    content: responseText,
    timestamp: new Date().toISOString(),
  };

  const messages = [...currentMessages, agentMessage].slice(-MAX_SESSION_MESSAGES);
  const newExpires = new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString();

  const { error } = await supabase
    .from("group_agent_sessions")
    .update({
      messages,
      updated_at: new Date().toISOString(),
      expires_at: newExpires,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[session-manager] Erro ao salvar resposta na sessao:", error.message);
  }
}

/**
 * Deleta a sessão ativa (se existir) deste usuário neste grupo.
 * Usado quando o usuário explicitamente pede para reiniciar a conversa.
 */
export async function resetSession(
  configId: string,
  senderJid: string,
  groupJid: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("group_agent_sessions")
    .delete()
    .eq("config_id", configId)
    .eq("sender_jid", senderJid)
    .eq("group_jid", groupJid);

  if (error) {
    console.error("[session-manager] Erro ao resetar sessão:", error.message);
    return false;
  }
  return true;
}

const RESET_KEYWORDS = [
  "reiniciar", "reinicia", "recomeçar", "recomeca",
  "nova conversa", "limpar conversa", "limpar sessao", "limpar sessão",
  "esquecer tudo", "comecar de novo", "começar de novo",
];

/**
 * Detecta se a mensagem do usuário é um pedido explícito de reset de sessão.
 */
export function isResetCommand(cleanedQuery: string): boolean {
  const normalized = cleanedQuery.toLowerCase().trim();
  if (!normalized) return false;
  return RESET_KEYWORDS.some((kw) => normalized === kw || normalized.startsWith(`${kw} `) || normalized.endsWith(` ${kw}`));
}

export async function cleanExpiredSessions(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("group_agent_sessions")
    .delete()
    .lte("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("[session-manager] Erro ao limpar sessoes expiradas:", error.message);
    return 0;
  }

  return data?.length ?? 0;
}
