/**
 * Arquivo: src/app/api/whatsapp/labels/route.ts
 * Propósito: CRUD de labels/tags via Sofia CRM.
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

    if (action === "list") {
      const labels = await sofiaClient.listLabels();
      return NextResponse.json({ labels });
    }

    if (action === "create") {
      const { name } = body;
      if (!name) {
        return NextResponse.json({ error: "name é obrigatório." }, { status: 400 });
      }
      const label = await sofiaClient.createLabel(name);
      return NextResponse.json({ label });
    }

    if (action === "update") {
      const { labelId, name, color } = body;
      if (!labelId) {
        return NextResponse.json({ error: "labelId é obrigatório." }, { status: 400 });
      }
      await sofiaClient.updateLabel(labelId, { name, color });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { labelId } = body;
      if (!labelId) {
        return NextResponse.json({ error: "labelId é obrigatório." }, { status: 400 });
      }
      await sofiaClient.deleteLabel(labelId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerenciar labels.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
