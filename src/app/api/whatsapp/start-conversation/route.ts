/**
 * Arquivo: src/app/api/whatsapp/start-conversation/route.ts
 * Propósito: Iniciar nova conversa WhatsApp via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export async function POST(request: Request) {
  try {
    const { companyId, phone } = await request.json();

    if (!companyId || !phone) {
      return NextResponse.json(
        { error: "companyId e phone são obrigatórios." },
        { status: 400 }
      );
    }

    const sofiaClient = await getSofiaCrmClient(companyId);
    const result = await sofiaClient.startConversation(phone);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao iniciar conversa.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
