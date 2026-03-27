/**
 * Arquivo: src/app/api/whatsapp/auto-assign/route.ts
 * Propósito: Endpoint para executar auto-assignment de conversas (manual ou via cron).
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { autoAssignConversations } from "@/services/whatsapp/auto-assign";

export const dynamic = "force-dynamic";

const autoAssignSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  limit: z.number().optional(),
  rules: z
    .array(
      z.object({
        sentiment: z.string().optional(),
        intent: z.string().optional(),
        preferredAgentId: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = autoAssignSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    const result = await autoAssignConversations(
      access.companyId,
      parsed.data.rules ?? [],
      parsed.data.limit ?? 10
    );

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro no auto-assignment.";
    return NextResponse.json({ error: message, code: "AUTO_ASSIGN_ERROR" }, { status: 500 });
  }
}
