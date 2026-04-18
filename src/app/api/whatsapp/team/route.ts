/**
 * Arquivo: src/app/api/whatsapp/team/route.ts
 * Propósito: Listar membros da equipe, times e inboxes via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getEvoCrmClient } from "@/services/evo-crm/client";

export const dynamic = "force-dynamic";

const teamSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  action: z.enum(["listUsers", "getUser", "listTeams", "listInboxes", "listRecentConversations", "assignConversation"]),
  userId: z.string().optional(),
  conversationExternalId: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = teamSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const evoClient = await getEvoCrmClient(access.companyId);
    const { action } = parsed.data;

    if (action === "listUsers") {
      const users = await evoClient.listUsers();
      return NextResponse.json({ users });
    }

    if (action === "getUser") {
      const { userId } = parsed.data;
      if (!userId) {
        return NextResponse.json({ error: "userId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      const user = await evoClient.getUser(userId);
      return NextResponse.json({ user });
    }

    if (action === "listTeams") {
      const teams = await evoClient.listTeams();
      return NextResponse.json({ teams });
    }

    if (action === "listInboxes") {
      const inboxes = await evoClient.listInboxes();
      return NextResponse.json({ inboxes });
    }

    if (action === "listRecentConversations") {
      const { data: conversations, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, external_id, contact_name, contact_avatar_url, status, last_message_at, assigned_to")
        .eq("company_id", access.companyId)
        .not("external_id", "is", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(20);

      if (conversationsError) {
        return NextResponse.json({ error: "Falha ao carregar conversas.", code: "QUERY_ERROR" }, { status: 500 });
      }

      return NextResponse.json({ conversations: conversations ?? [] });
    }

    if (action === "assignConversation") {
      const { conversationExternalId, assigneeId, teamId } = parsed.data;
      if (!conversationExternalId) {
        return NextResponse.json({ error: "conversationExternalId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await evoClient.assignConversation(conversationExternalId, { assigneeId, teamId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida.", code: "VALIDATION_ERROR" }, { status: 400 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro na operação de equipe.";
    return NextResponse.json({ error: message, code: "TEAM_ERROR" }, { status: 500 });
  }
}
