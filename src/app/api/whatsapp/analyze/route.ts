/**
 * Arquivo: src/app/api/whatsapp/analyze/route.ts
 * Propósito: Analisar conversa do WhatsApp com IA e salvar insight.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { analyzeConversation } from "@/services/whatsapp/analyzer";
import { applyIpRateLimit } from "@/lib/auth/rate-limit";
import { handleRouteError } from "@/lib/api/handle-route-error";

export const dynamic = "force-dynamic";

const analyzeSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  conversationId: z.string().uuid("conversationId inválido."),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await applyIpRateLimit(request, "ai:analyze", 30, 60);
    if (rateLimited) return rateLimited;

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = analyzeSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const insight = await analyzeConversation(access.companyId, parsed.data.conversationId);

    return NextResponse.json({
      insight,
    });
  } catch (error) {
    return handleRouteError(error, "WHATSAPP_ANALYZE_ERROR", request);
  }
}
