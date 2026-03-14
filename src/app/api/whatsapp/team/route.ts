/**
 * Arquivo: src/app/api/whatsapp/team/route.ts
 * Propósito: Listar membros da equipe, times e inboxes via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, action } = body;

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório." }, { status: 400 });
    }

    const sofiaClient = await getSofiaCrmClient(companyId);

    if (action === "listUsers") {
      const users = await sofiaClient.listUsers();
      return NextResponse.json({ users });
    }

    if (action === "getUser") {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: "userId é obrigatório." }, { status: 400 });
      }
      const user = await sofiaClient.getUser(userId);
      return NextResponse.json({ user });
    }

    if (action === "listTeams") {
      const teams = await sofiaClient.listTeams();
      return NextResponse.json({ teams });
    }

    if (action === "listInboxes") {
      const inboxes = await sofiaClient.listInboxes();
      return NextResponse.json({ inboxes });
    }

    if (action === "assignConversation") {
      const { conversationExternalId, assigneeId, teamId } = body;
      if (!conversationExternalId) {
        return NextResponse.json({ error: "conversationExternalId é obrigatório." }, { status: 400 });
      }
      await sofiaClient.assignConversation(conversationExternalId, { assigneeId, teamId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro na operação de equipe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
