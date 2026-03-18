import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  feedbackStatus: z.enum(["helpful", "needs_review", "incorrect"]),
  feedbackNote: z.string().trim().max(1000).optional().default(""),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const { id: conversationId } = paramsSchema.parse(await params);

    const rawBody: unknown = await request.json();
    const parsed = bodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const { data: insight, error: updateError } = await supabase
      .from("conversation_insights")
      .update({
        feedback_status: parsed.data.feedbackStatus,
        feedback_note: parsed.data.feedbackNote || null,
        feedback_by: user.id,
        feedback_at: new Date().toISOString(),
      })
      .eq("company_id", access.companyId)
      .eq("conversation_id", conversationId)
      .select("conversation_id, feedback_status, feedback_note, feedback_at")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { error: `Falha ao salvar feedback: ${updateError.message}`, code: "UPDATE_ERROR" },
        { status: 500 }
      );
    }

    if (!insight?.conversation_id) {
      return NextResponse.json(
        { error: "Insight não encontrado para esta conversa.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ insight });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "WHATSAPP_INSIGHT_FEEDBACK_ERROR" },
      { status: 500 }
    );
  }
}
