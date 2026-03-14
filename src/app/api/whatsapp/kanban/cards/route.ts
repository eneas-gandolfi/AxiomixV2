/**
 * Arquivo: src/app/api/whatsapp/kanban/cards/route.ts
 * Propósito: CRUD e movimentação de cards do Kanban via Sofia CRM.
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
      const { boardId, title, description } = body;
      if (!boardId || !title) {
        return NextResponse.json({ error: "boardId e title são obrigatórios." }, { status: 400 });
      }
      await sofiaClient.createKanbanCard({ boardId, title, description: description ?? "" });
      return NextResponse.json({ success: true });
    }

    if (action === "get") {
      const { cardId } = body;
      if (!cardId) {
        return NextResponse.json({ error: "cardId é obrigatório." }, { status: 400 });
      }
      const card = await sofiaClient.getCard(cardId);
      return NextResponse.json({ card });
    }

    if (action === "update") {
      const { cardId, title, description, stage_id } = body;
      if (!cardId) {
        return NextResponse.json({ error: "cardId é obrigatório." }, { status: 400 });
      }
      await sofiaClient.updateCard(cardId, { title, description, stage_id });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { cardId } = body;
      if (!cardId) {
        return NextResponse.json({ error: "cardId é obrigatório." }, { status: 400 });
      }
      await sofiaClient.deleteCard(cardId);
      return NextResponse.json({ success: true });
    }

    if (action === "move") {
      const { cardId, boardId, stageId } = body;
      if (!cardId || !boardId || !stageId) {
        return NextResponse.json({ error: "cardId, boardId e stageId são obrigatórios." }, { status: 400 });
      }
      await sofiaClient.moveCard(cardId, boardId, stageId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerenciar card.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
