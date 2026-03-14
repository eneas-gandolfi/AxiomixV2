/**
 * Arquivo: src/app/api/whatsapp/session-status/route.ts
 * Propósito: Verificar status da janela de 24h de uma conversa WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export async function POST(request: Request) {
  try {
    const { companyId, conversationExternalId } = await request.json();

    if (!companyId || !conversationExternalId) {
      return NextResponse.json(
        { error: "companyId e conversationExternalId são obrigatórios." },
        { status: 400 }
      );
    }

    const sofiaClient = await getSofiaCrmClient(companyId);
    const status = await sofiaClient.getSessionStatus(conversationExternalId);

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao verificar sessão.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
