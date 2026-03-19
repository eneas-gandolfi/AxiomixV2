/**
 * Arquivo: src/app/api/settings/alerts/log/route.ts
 * Propósito: Retornar e limpar historico de alertas enviados para a empresa.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get("alertType");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 100);

    let query = supabase
      .from("alert_log")
      .select("id, alert_type, source_id, recipient_phone, message_preview, status, error_detail, sent_at")
      .eq("company_id", access.companyId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    const validAlertTypes = ["purchase_intent", "negative_sentiment", "failed_post", "viral_content"] as const;
    if (alertType && validAlertTypes.includes(alertType as typeof validAlertTypes[number])) {
      query = query.eq("alert_type", alertType as typeof validAlertTypes[number]);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Falha ao carregar histórico de alertas.", code: "ALERT_LOG_FETCH_ERROR" },
        { status: 500 }
      );
    }

    const items = (logs ?? []).map((log) => ({
      id: log.id,
      alertType: log.alert_type,
      sourceId: log.source_id,
      recipientPhone: log.recipient_phone,
      messagePreview: log.message_preview,
      status: log.status,
      errorDetail: log.error_detail,
      sentAt: log.sent_at,
    }));

    return NextResponse.json({ logs: items });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "ALERT_LOG_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const body = await request.json().catch(() => ({})) as { id?: string };

    if (body.id) {
      const { error } = await supabase
        .from("alert_log")
        .delete()
        .eq("id", body.id)
        .eq("company_id", access.companyId);

      if (error) {
        return NextResponse.json(
          { error: "Falha ao remover alerta.", code: "ALERT_LOG_DELETE_ERROR" },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from("alert_log")
        .delete()
        .eq("company_id", access.companyId);

      if (error) {
        return NextResponse.json(
          { error: "Falha ao limpar alertas.", code: "ALERT_LOG_DELETE_ALL_ERROR" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "ALERT_LOG_DELETE_ERROR" }, { status: 500 });
  }
}
