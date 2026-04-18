/**
 * Arquivo: src/services/whatsapp/auto-assign.ts
 * Propósito: Auto-assignment inteligente de conversas baseado em carga de trabalho e regras.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEvoCrmClient } from "@/services/evo-crm/client";

type AgentWorkload = {
  id: string;
  name: string;
  openConversations: number;
};

type AssignmentRule = {
  sentiment?: string;
  intent?: string;
  preferredAgentId?: string;
};

type AutoAssignResult = {
  assigned: number;
  skipped: number;
  details: Array<{
    conversationId: string;
    contactName: string | null;
    assignedTo: string;
    agentName: string;
    reason: string;
  }>;
};

async function getAgentWorkloads(
  companyId: string,
  evoUsers: Array<{ id: string; name?: string | null }>
): Promise<AgentWorkload[]> {
  const supabase = createSupabaseAdminClient();
  const workloads: AgentWorkload[] = [];

  for (const user of evoUsers) {
    const { count } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("assigned_to", user.id)
      .eq("status", "open");

    workloads.push({
      id: user.id,
      name: user.name ?? `Agente ${user.id}`,
      openConversations: count ?? 0,
    });
  }

  return workloads;
}

function selectAgent(
  workloads: AgentWorkload[],
  rules: AssignmentRule[],
  conversation: { sentiment?: string | null; intent?: string | null }
): { agent: AgentWorkload; reason: string } | null {
  if (workloads.length === 0) return null;

  // 1. Tentar match por regra específica
  for (const rule of rules) {
    if (rule.sentiment && conversation.sentiment === rule.sentiment && rule.preferredAgentId) {
      const agent = workloads.find((a) => a.id === rule.preferredAgentId);
      if (agent) {
        return { agent, reason: `Regra: sentimento "${rule.sentiment}"` };
      }
    }
    if (rule.intent && conversation.intent === rule.intent && rule.preferredAgentId) {
      const agent = workloads.find((a) => a.id === rule.preferredAgentId);
      if (agent) {
        return { agent, reason: `Regra: intenção "${rule.intent}"` };
      }
    }
  }

  // 2. Round-robin ponderado por carga (menos conversas = prioridade)
  const sorted = [...workloads].sort((a, b) => a.openConversations - b.openConversations);
  return { agent: sorted[0], reason: "Round-robin por menor carga" };
}

export async function autoAssignConversations(
  companyId: string,
  rules: AssignmentRule[] = [],
  limit = 10
): Promise<AutoAssignResult> {
  const supabase = createSupabaseAdminClient();
  const evoClient = await getEvoCrmClient(companyId);

  // Buscar agentes disponíveis
  const evoUsers = await evoClient.listUsers();
  if (evoUsers.length === 0) {
    return { assigned: 0, skipped: 0, details: [] };
  }

  // Calcular workloads
  const workloads = await getAgentWorkloads(
    companyId,
    evoUsers.map((u) => ({ id: String(u.id), name: u.name }))
  );

  // Buscar conversas abertas não-atribuídas
  const { data: unassigned } = await supabase
    .from("conversations")
    .select("id, external_id, contact_name, assigned_to")
    .eq("company_id", companyId)
    .eq("status", "open")
    .is("assigned_to", null)
    .not("external_id", "is", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (!unassigned || unassigned.length === 0) {
    return { assigned: 0, skipped: 0, details: [] };
  }

  // Buscar insights das conversas para regras baseadas em sentimento/intenção
  const convIds = unassigned.map((c) => c.id);
  const { data: insights } = await supabase
    .from("conversation_insights")
    .select("conversation_id, sentiment, intent")
    .eq("company_id", companyId)
    .in("conversation_id", convIds);

  const insightMap = new Map<string, { sentiment?: string | null; intent?: string | null }>();
  for (const ins of insights ?? []) {
    if (ins.conversation_id) {
      insightMap.set(ins.conversation_id, { sentiment: ins.sentiment, intent: ins.intent });
    }
  }

  const result: AutoAssignResult = { assigned: 0, skipped: 0, details: [] };

  for (const conv of unassigned) {
    if (!conv.external_id) {
      result.skipped++;
      continue;
    }

    const insight = insightMap.get(conv.id) ?? {};
    const selection = selectAgent(workloads, rules, insight);

    if (!selection) {
      result.skipped++;
      continue;
    }

    try {
      await evoClient.assignConversation(conv.external_id, {
        assigneeId: selection.agent.id,
      });

      // Atualizar no banco local
      await supabase
        .from("conversations")
        .update({ assigned_to: selection.agent.id })
        .eq("id", conv.id);

      // Incrementar carga do agente para próxima iteração
      selection.agent.openConversations++;

      result.assigned++;
      result.details.push({
        conversationId: conv.id,
        contactName: conv.contact_name,
        assignedTo: selection.agent.id,
        agentName: selection.agent.name,
        reason: selection.reason,
      });
    } catch (error) {
      console.error(`[AUTO-ASSIGN] Falha ao atribuir conversa ${conv.id}:`, error instanceof Error ? error.message : error);
      result.skipped++;
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  return result;
}
