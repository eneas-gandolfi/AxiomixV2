/**
 * Arquivo: src/services/bridge/crm-to-group-alerts.ts
 * Propósito: Detectar labels de risco no Evo CRM e enviar alertas ao grupo do time via WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendGroupAgentResponse } from "@/services/group-agent/sender";
import { resolvePreferredEvolutionInstance } from "@/services/integrations/evolution";
import { decodeIntegrationConfig } from "@/lib/integrations/service";

const RISK_LABELS = ["quase perdendo", "at risk", "urgente", "cancelamento"] as const;

type CrmAlertPayload = {
  conversationId: string;
  contactName: string;
  contactPhone: string | null;
  labels: string[];
  assigneeName: string | null;
};

function isRiskLabel(label: string): boolean {
  return RISK_LABELS.some(
    (risk) => label.toLowerCase().trim() === risk
  );
}

function formatAlertMessage(payload: CrmAlertPayload, triggeredLabels: string[]): string {
  const labelStr = triggeredLabels.map((l) => `*${l}*`).join(", ");
  const lines = [
    `\u{1F6A8} *Alerta CRM — ${labelStr}*`,
    "",
    `\u{1F464} *Contato:* ${payload.contactName}`,
  ];

  if (payload.contactPhone) {
    lines.push(`\u{1F4DE} *Telefone:* ${payload.contactPhone}`);
  }

  if (payload.assigneeName) {
    lines.push(`\u{1F465} *Responsável:* ${payload.assigneeName}`);
  }

  lines.push(
    "",
    "_Algum voluntário para retomar contato hoje?_"
  );

  return lines.join("\n");
}

async function resolveAlertGroupJid(companyId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();

  const { data: configs } = await supabase
    .from("group_agent_configs")
    .select("group_jid, evolution_instance_name")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!configs || configs.length === 0) return null;
  return configs[0].group_jid;
}

async function resolveInstanceName(companyId: string): Promise<string> {
  const supabase = createSupabaseAdminClient();

  const { data: config } = await supabase
    .from("group_agent_configs")
    .select("evolution_instance_name")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (config?.[0]?.evolution_instance_name) {
    return config[0].evolution_instance_name;
  }

  const { data: integration } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "evolution_api")
    .eq("is_active", true)
    .maybeSingle();

  if (integration?.config) {
    const decoded = decodeIntegrationConfig("evolution_api", integration.config);
    const preferred = resolvePreferredEvolutionInstance(decoded.vendors);
    if (preferred) return preferred;
  }

  return process.env.EVOLUTION_INSTANCE_NAME ?? "axiomix-default";
}

export async function handleCrmLabelAlert(
  companyId: string,
  payload: CrmAlertPayload
): Promise<boolean> {
  const triggeredLabels = payload.labels.filter(isRiskLabel);
  if (triggeredLabels.length === 0) return false;

  const groupJid = await resolveAlertGroupJid(companyId);
  if (!groupJid) {
    console.log("[bridge/crm-alert] Nenhum grupo ativo para alertas", { companyId });
    return false;
  }

  const instanceName = await resolveInstanceName(companyId);
  const message = formatAlertMessage(payload, triggeredLabels);

  const result = await sendGroupAgentResponse({
    instanceName,
    groupJid,
    responseText: message,
  });

  if (!result.success) {
    console.error("[bridge/crm-alert] Falha ao enviar alerta", { companyId, status: result.evolutionStatus });
    return false;
  }

  console.log("[bridge/crm-alert] Alerta enviado", { companyId, groupJid, labels: triggeredLabels });
  return true;
}

export { isRiskLabel, formatAlertMessage };
