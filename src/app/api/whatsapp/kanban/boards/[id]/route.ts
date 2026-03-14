/**
 * Arquivo: src/app/api/whatsapp/kanban/boards/[id]/route.ts
 * Propósito: Buscar board completo com stages e cards via Sofia CRM.
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
    const { id: boardId } = await context.params;
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório." }, { status: 400 });
    }

    const sofiaClient = await getSofiaCrmClient(companyId);
    const board = await sofiaClient.getBoard(boardId);

    return NextResponse.json({ board });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar board.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
