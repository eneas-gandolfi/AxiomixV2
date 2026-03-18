/**
 * Arquivo: src/app/api/settings/alerts/route.ts
 * Proposito: Gerenciar preferencias de alertas WhatsApp por empresa.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { normalizeOptionalWhatsAppPhone } from "@/lib/whatsapp/phone";

export const dynamic = "force-dynamic";

const ALERT_TYPES = ["purchase_intent", "negative_sentiment", "failed_post", "viral_content"] as const;

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const { data: preferences, error } = await supabase
      .from("alert_preferences")
      .select("alert_type, is_enabled, recipient_phone, cooldown_minutes, updated_at")
      .eq("company_id", access.companyId);

    if (error) {
      return NextResponse.json(
        { error: "Falha ao carregar preferencias de alertas.", code: "ALERT_PREFS_FETCH_ERROR" },
        { status: 500 }
      );
    }

    const prefMap = new Map((preferences ?? []).map((p) => [p.alert_type, p]));
    const result = ALERT_TYPES.map((type) => ({
      alertType: type,
      isEnabled: prefMap.get(type)?.is_enabled ?? false,
      recipientPhone: normalizeOptionalWhatsAppPhone(prefMap.get(type)?.recipient_phone ?? null),
      cooldownMinutes: prefMap.get(type)?.cooldown_minutes ?? 60,
      updatedAt: prefMap.get(type)?.updated_at ?? null,
    }));

    return NextResponse.json({ preferences: result });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "ALERT_PREFS_ERROR" }, { status: 500 });
  }
}

const alertPrefSchema = z.object({
  alertType: z.enum(ALERT_TYPES),
  isEnabled: z.boolean(),
  recipientPhone: z
    .string()
    .trim()
    .min(8)
    .transform((value) => normalizeOptionalWhatsAppPhone(value))
    .nullable()
    .optional(),
  cooldownMinutes: z.number().int().min(5).max(1440).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem gerenciar alertas.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = alertPrefSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: upserted, error } = await supabase
      .from("alert_preferences")
      .upsert(
        {
          company_id: access.companyId,
          alert_type: parsed.data.alertType,
          is_enabled: parsed.data.isEnabled,
          recipient_phone: normalizeOptionalWhatsAppPhone(parsed.data.recipientPhone ?? null),
          cooldown_minutes: parsed.data.cooldownMinutes ?? 60,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,alert_type" }
      )
      .select("alert_type, is_enabled, recipient_phone, cooldown_minutes, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Falha ao salvar preferencia de alerta.", code: "ALERT_PREF_UPSERT_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preference: {
        alertType: upserted.alert_type,
        isEnabled: upserted.is_enabled,
        recipientPhone: normalizeOptionalWhatsAppPhone(upserted.recipient_phone),
        cooldownMinutes: upserted.cooldown_minutes,
        updatedAt: upserted.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "ALERT_PREF_ERROR" }, { status: 500 });
  }
}
