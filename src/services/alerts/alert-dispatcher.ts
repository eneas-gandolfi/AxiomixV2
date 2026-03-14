/**
 * Arquivo: src/services/alerts/alert-dispatcher.ts
 * Proposito: Despachar alertas WhatsApp em tempo real com rate limiting e deduplicacao.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import "server-only";

import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AlertType = "purchase_intent" | "negative_sentiment" | "failed_post" | "viral_content";

type AlertPayload = {
  companyId: string;
  alertType: AlertType;
  sourceId: string;
  messageText: string;
};

type AlertPreference = {
  isEnabled: boolean;
  recipientPhone: string | null;
  cooldownMinutes: number;
};

type DispatchResult = {
  status: "sent" | "skipped" | "failed";
  reason?: string;
};

async function getAlertPreference(
  companyId: string,
  alertType: AlertType
): Promise<AlertPreference | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("alert_preferences")
    .select("is_enabled, recipient_phone, cooldown_minutes")
    .eq("company_id", companyId)
    .eq("alert_type", alertType)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    isEnabled: data.is_enabled,
    recipientPhone: data.recipient_phone,
    cooldownMinutes: data.cooldown_minutes,
  };
}

async function resolveRecipientPhone(
  companyId: string,
  preferencePhone: string | null
): Promise<string | null> {
  if (preferencePhone && preferencePhone.trim().length >= 8) {
    return preferencePhone.trim();
  }

  const supabase = createSupabaseAdminClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "evolution_api")
    .maybeSingle();

  if (error || !integration?.config) {
    return null;
  }

  const decoded = decodeIntegrationConfig("evolution_api", integration.config);
  return decoded.managerPhone?.trim() || null;
}

async function resolveEvolutionConfig(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "evolution_api")
    .maybeSingle();

  if (error || !integration?.config) {
    return null;
  }

  const decoded = decodeIntegrationConfig("evolution_api", integration.config);
  const baseUrl = decoded.baseUrl?.replace(/\/+$/, "");
  const apiKey = decoded.apiKey;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

async function isWithinCooldown(
  companyId: string,
  alertType: AlertType,
  sourceId: string,
  cooldownMinutes: number
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const cooldownThreshold = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Check source-level deduplication
  const { count: sourceCount } = await supabase
    .from("alert_log")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("alert_type", alertType)
    .eq("source_id", sourceId)
    .eq("status", "sent")
    .gte("sent_at", cooldownThreshold);

  if ((sourceCount ?? 0) > 0) {
    return true;
  }

  // Check type-level rate limit: max 5 per type per hour
  const { count: typeCount } = await supabase
    .from("alert_log")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("alert_type", alertType)
    .eq("status", "sent")
    .gte("sent_at", oneHourAgo);

  if ((typeCount ?? 0) >= 5) {
    return true;
  }

  // Check global rate limit: max 15 per company per hour
  const { count: globalCount } = await supabase
    .from("alert_log")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "sent")
    .gte("sent_at", oneHourAgo);

  if ((globalCount ?? 0) >= 15) {
    return true;
  }

  return false;
}

async function sendWhatsAppAlert(
  companyId: string,
  recipientPhone: string,
  messageText: string
): Promise<{ providerStatus: number; providerBody: string }> {
  const config = await resolveEvolutionConfig(companyId);
  if (!config) {
    throw new Error("Evolution API nao configurada.");
  }

  const response = await fetch(`${config.baseUrl}/message/sendText`, {
    method: "POST",
    headers: {
      apikey: config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: recipientPhone,
      text: messageText,
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`Falha no envio WhatsApp: ${response.status} ${responseBody.slice(0, 180)}`);
  }

  return {
    providerStatus: response.status,
    providerBody: responseBody.slice(0, 500),
  };
}

async function logAlert(
  companyId: string,
  alertType: AlertType,
  sourceId: string,
  recipientPhone: string,
  messagePreview: string,
  status: "sent" | "failed" | "skipped",
  errorDetail?: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("alert_log").insert({
    company_id: companyId,
    alert_type: alertType,
    source_id: sourceId,
    recipient_phone: recipientPhone,
    message_preview: messagePreview.slice(0, 200),
    status,
    error_detail: errorDetail ?? null,
  });
}

export async function dispatchAlert(payload: AlertPayload): Promise<DispatchResult> {
  try {
    const preference = await getAlertPreference(payload.companyId, payload.alertType);
    if (!preference || !preference.isEnabled) {
      return { status: "skipped", reason: "alert_disabled" };
    }

    const recipientPhone = await resolveRecipientPhone(
      payload.companyId,
      preference.recipientPhone
    );
    if (!recipientPhone) {
      return { status: "skipped", reason: "no_recipient" };
    }

    const cooldown = await isWithinCooldown(
      payload.companyId,
      payload.alertType,
      payload.sourceId,
      preference.cooldownMinutes
    );
    if (cooldown) {
      return { status: "skipped", reason: "cooldown_active" };
    }

    await sendWhatsAppAlert(payload.companyId, recipientPhone, payload.messageText);

    await logAlert(
      payload.companyId,
      payload.alertType,
      payload.sourceId,
      recipientPhone,
      payload.messageText,
      "sent"
    );

    return { status: "sent" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado no despacho de alerta.";

    try {
      await logAlert(
        payload.companyId,
        payload.alertType,
        payload.sourceId,
        "unknown",
        payload.messageText,
        "failed",
        detail
      );
    } catch {
      // Silently ignore log failures
    }

    return { status: "failed", reason: detail };
  }
}

export type { AlertType, AlertPayload, DispatchResult };
