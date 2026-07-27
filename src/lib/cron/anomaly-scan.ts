/**
 * Arquivo: src/lib/cron/anomaly-scan.ts
 * Propósito: Cron diário da Intelligence Layer — roda detectAnomalias (janela
 *            7d vs baseline 21d) para cada empresa com Evo CRM ativo e
 *            despacha alertas proativos via dispatchAlert (tfr_anomaly /
 *            sentiment_drop). Cooldown, dedup e opt-in por empresa já são
 *            responsabilidade do dispatcher (alert_preferences).
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { detectAnomalias, type Anomalia } from "@/lib/whatsapp/anomalias";
import type { MessageLight } from "@/lib/whatsapp/pulso-comercial";
import { dispatchAlert, type AlertType } from "@/services/alerts/alert-dispatcher";

const DAY_MS = 86_400_000;
const LOOKBACK_DAYS = 28;
const MESSAGE_SCAN_LIMIT = 8000;

/** Só métricas com alert_type correspondente geram alerta WhatsApp; queda de
 *  volume aparece apenas in-app (Recomendações). */
const METRICA_TO_ALERT: Partial<Record<Anomalia["metrica"], AlertType>> = {
  tfr: "tfr_anomaly",
  sentimento_negativo: "sentiment_drop",
};

function buildMessage(anomalia: Anomalia): string {
  if (anomalia.metrica === "tfr") {
    const atualMin = Math.round(anomalia.atual / 60);
    const baseMin = Math.round(anomalia.baseline / 60);
    return (
      `⚠️ *Axiomix — anomalia detectada*\n\n` +
      `O tempo médio de primeira resposta da sua equipe subiu pra *${atualMin}min* ` +
      `na última semana (seu normal era ~${baseMin}min, +${anomalia.deltaPct}%).\n\n` +
      `Vale conferir escala, notificações e fila em Inteligência > Painel.`
    );
  }
  return (
    `⚠️ *Axiomix — anomalia detectada*\n\n` +
    `O sentimento negativo subiu pra *${Math.round(anomalia.atual)}%* das conversas ` +
    `na última semana (seu normal era ~${Math.round(anomalia.baseline)}%).\n\n` +
    `Vale ler as conversas negativas recentes em Inteligência > Conversas.`
  );
}

export async function runAnomalyScanCron() {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString();
  const today = now.toISOString().slice(0, 10);

  const { data: integrations, error: integrationsError } = await supabase
    .from("integrations")
    .select("company_id")
    .eq("type", "evo_crm")
    .eq("is_active", true)
    .eq("test_status", "ok")
    .not("company_id", "is", null);

  if (integrationsError) {
    throw new Error(`Falha ao buscar integrações do Evo CRM: ${integrationsError.message}`);
  }

  const companyIds = Array.from(
    new Set(
      (integrations ?? [])
        .map((i) => i.company_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  let scanned = 0;
  let anomaliesFound = 0;
  let alertsSent = 0;

  for (const companyId of companyIds) {
    const [{ data: msgRows }, { data: insightRows }] = await Promise.all([
      supabase
        .from("messages")
        .select("conversation_id, direction, sent_at")
        .eq("company_id", companyId)
        .gte("sent_at", since)
        .order("sent_at", { ascending: false })
        .limit(MESSAGE_SCAN_LIMIT),
      supabase
        .from("conversation_insights")
        .select("sentiment, generated_at")
        .eq("company_id", companyId)
        .gte("generated_at", since),
    ]);

    const messages: MessageLight[] = (msgRows ?? [])
      .filter((m) => m.conversation_id && m.sent_at)
      .map((m) => ({
        conversationId: m.conversation_id as string,
        direction: m.direction,
        sentAt: m.sent_at as string,
      }));

    const anomalias = detectAnomalias({
      messages,
      insights: (insightRows ?? []).map((r) => ({
        sentiment: r.sentiment,
        generatedAt: r.generated_at,
      })),
      now,
    });
    scanned += 1;

    for (const anomalia of anomalias) {
      if (anomalia.direcao !== "piora") continue;
      anomaliesFound += 1;
      const alertType = METRICA_TO_ALERT[anomalia.metrica];
      if (!alertType) continue;
      const result = await dispatchAlert({
        companyId,
        alertType,
        // Dedup diário por métrica — mesmo dia nunca alerta 2x a mesma coisa
        // (o cooldown do dispatcher cobre re-execuções do cron).
        sourceId: `${anomalia.metrica}-${today}`,
        messageText: buildMessage(anomalia),
      });
      if (result.status === "sent") alertsSent += 1;
    }
  }

  return { scanned, anomaliesFound, alertsSent };
}
