/**
 * Arquivo: src/app/api/whatsapp/contacts/[id]/route.ts
 * Propósito: Buscar detalhe de um contato e gerenciar labels do contato.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: contactId } = await context.params;
    const body = await request.json();
    const { companyId, action } = body;

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório." }, { status: 400 });
    }

    const sofiaClient = await getSofiaCrmClient(companyId);

    if (action === "get") {
      const contact = await sofiaClient.getContact(contactId);
      return NextResponse.json({ contact });
    }

    if (action === "listLabels") {
      const labels = await sofiaClient.listContactLabels(contactId);
      return NextResponse.json({ labels });
    }

    if (action === "addLabel") {
      const { label } = body;
      if (!label) {
        return NextResponse.json({ error: "label é obrigatório." }, { status: 400 });
      }
      await sofiaClient.addContactLabel({ contactId, label });
      return NextResponse.json({ success: true });
    }

    if (action === "removeLabel") {
      const { labelId } = body;
      if (!labelId) {
        return NextResponse.json({ error: "labelId é obrigatório." }, { status: 400 });
      }
      await sofiaClient.removeContactLabel(contactId, labelId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro no contato.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
