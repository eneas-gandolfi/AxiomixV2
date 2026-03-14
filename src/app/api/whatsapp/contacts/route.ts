/**
 * Arquivo: src/app/api/whatsapp/contacts/route.ts
 * Propósito: Listar e criar contatos via Sofia CRM.
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

    if (action === "create") {
      const { name, phone } = body;
      if (!name || !phone) {
        return NextResponse.json({ error: "name e phone são obrigatórios." }, { status: 400 });
      }
      const contact = await sofiaClient.createContact({ name, phone });
      return NextResponse.json({ contact });
    }

    // Default: listar contatos
    const { search, page, limit } = body;
    const contacts = await sofiaClient.listContacts({
      search,
      page: page ?? 1,
      limit: limit ?? 50,
      include_labels: true,
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar contatos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
