/**
 * Arquivo: src/app/api/whatsapp/send-template/route.ts
 * Propósito: Enviar template WhatsApp via Sofia CRM Cloud API.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export async function POST(request: Request) {
  try {
    const { companyId, to, templateName, language, components } = await request.json();

    if (!companyId || !to || !templateName) {
      return NextResponse.json(
        { error: "companyId, to e templateName são obrigatórios." },
        { status: 400 }
      );
    }

    const sofiaClient = await getSofiaCrmClient(companyId);
    await sofiaClient.sendTemplate({
      to,
      templateName,
      language: language ?? "pt_BR",
      components,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar template.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
