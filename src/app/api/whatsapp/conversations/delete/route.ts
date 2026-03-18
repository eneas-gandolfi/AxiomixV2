/**
 * Arquivo: src/app/api/whatsapp/conversations/delete/route.ts
 * Proposito: Excluir conversas do Axiomix e impedir que retornem em sincronizacoes futuras.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createConversationExclusions } from "@/services/whatsapp/conversation-exclusions";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
  conversationIds: z.array(z.string().uuid("conversationId invalido.")).min(1, "Selecione pelo menos uma conversa."),
});

function extractConversationId(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>).conversationId;
  return typeof value === "string" ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario nao autenticado.", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const admin = createSupabaseAdminClient();

    const { data: conversations, error: conversationsError } = await admin
      .from("conversations")
      .select("id, external_id, remote_jid, contact_name")
      .eq("company_id", access.companyId)
      .in("id", parsed.data.conversationIds);

    if (conversationsError) {
      throw new Error(`Falha ao carregar conversas para exclusao: ${conversationsError.message}`);
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma conversa valida encontrada para exclusao.", code: "CONVERSATIONS_NOT_FOUND" },
        { status: 404 }
      );
    }

    await createConversationExclusions(access.companyId, conversations);

    const { data: analyzeJobs, error: jobsError } = await admin
      .from("async_jobs")
      .select("id, payload")
      .eq("company_id", access.companyId)
      .eq("job_type", "whatsapp_analyze");

    if (jobsError) {
      throw new Error(`Falha ao carregar jobs relacionados: ${jobsError.message}`);
    }

    const conversationIdSet = new Set(conversations.map((conversation) => conversation.id));
    const relatedJobIds = (analyzeJobs ?? [])
      .filter((job) => {
        const conversationId = extractConversationId(job.payload);
        return conversationId ? conversationIdSet.has(conversationId) : false;
      })
      .map((job) => job.id);

    if (relatedJobIds.length > 0) {
      const { error: deleteJobsError } = await admin
        .from("async_jobs")
        .delete()
        .in("id", relatedJobIds);

      if (deleteJobsError) {
        throw new Error(`Falha ao remover jobs relacionados: ${deleteJobsError.message}`);
      }
    }

    const { error: deleteConversationsError } = await admin
      .from("conversations")
      .delete()
      .eq("company_id", access.companyId)
      .in("id", conversations.map((conversation) => conversation.id));

    if (deleteConversationsError) {
      throw new Error(`Falha ao excluir conversas: ${deleteConversationsError.message}`);
    }

    revalidatePath("/whatsapp-intelligence");
    revalidatePath("/whatsapp-intelligence/conversas");
    revalidatePath("/dashboard");

    return NextResponse.json({
      companyId: access.companyId,
      deletedCount: conversations.length,
      message: `${conversations.length} conversa(s) excluida(s) do Axiomix.`,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "WHATSAPP_DELETE_CONVERSATIONS_ERROR" }, { status: 500 });
  }
}
