/**
 * Arquivo: src/app/api/whatsapp/agents/[agentId]/activity/route.ts
 * Propósito: GET paginado da timeline de eventos de um agente IA.
 * RLS já garante isolamento por company via memberships; o handler só monta a query.
 *
 * Query params:
 *   - companyId (uuid, obrigatório)
 *   - limit (default 50, max 200)
 *   - cursor (ISO timestamp, exclusivo — eventos com created_at < cursor)
 *   - type (CSV de event_types para filtrar; default: todos)
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { AGENT_ACTIVITY_EVENT_TYPES } from "@/lib/whatsapp/agent-activity";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ agentId: string }> };

const querySchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().datetime().optional(),
  type: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Parâmetros inválidos.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { companyId, limit, cursor, type } = parsed.data;
    const typeFilter = type
      ? type.split(",").map((t) => t.trim()).filter((t) =>
          (AGENT_ACTIVITY_EVENT_TYPES as readonly string[]).includes(t)
        )
      : null;

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, companyId);

    let query = supabase
      .from("agent_activity_log")
      .select("id, event_type, details, actor_user_id, created_at")
      .eq("company_id", access.companyId)
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // +1 pra detectar next page

    if (cursor) query = query.lt("created_at", cursor);
    if (typeFilter && typeFilter.length > 0) query = query.in("event_type", typeFilter);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: error.message, code: "ACTIVITY_QUERY_ERROR" },
        { status: 500 }
      );
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const events = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? events[events.length - 1]?.created_at ?? null : null;

    return NextResponse.json({ events, next_cursor: nextCursor });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao listar atividade.";
    return NextResponse.json({ error: message, code: "ACTIVITY_ERROR" }, { status: 500 });
  }
}
