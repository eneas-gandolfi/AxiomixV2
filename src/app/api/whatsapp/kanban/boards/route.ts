/**
 * Arquivo: src/app/api/whatsapp/kanban/boards/route.ts
 * Propósito: Listar pipelines/boards do Kanban via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export async function POST(request: Request) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório." }, { status: 400 });
    }

    const sofiaClient = await getSofiaCrmClient(companyId);
    const boards = await sofiaClient.listBoards();

    return NextResponse.json({ boards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar boards.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
