/**
 * Arquivo: src/app/api/whatsapp/kanban/cards/route.ts
 * Propósito: CRUD e movimentação de cards do Kanban via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

const cardsSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  action: z.enum(["create", "get", "get-details", "update", "delete", "move"]),
  boardId: z.string().optional(),
  cardId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  stage_id: z.string().optional(),
  contact_id: z.string().optional(),
  conversation_id: z.string().optional(),
  value_amount: z.number().optional(),
  phone: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  stageId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = cardsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const sofiaClient = await getSofiaCrmClient(access.companyId);
    const { action } = parsed.data;

    if (action === "create") {
      const { boardId, title } = parsed.data;
      if (!boardId || !title) {
        return NextResponse.json({ error: "boardId e title são obrigatórios.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await sofiaClient.createKanbanCard({
        boardId,
        title,
        description: parsed.data.description ?? "",
        stage_id: parsed.data.stage_id,
        contact_id: parsed.data.contact_id,
        value_amount: typeof parsed.data.value_amount === "number" ? parsed.data.value_amount : undefined,
        phone: parsed.data.phone,
        assigned_to: parsed.data.assigned_to,
        priority: parsed.data.priority,
        tags: parsed.data.tags,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "get") {
      const { cardId } = parsed.data;
      if (!cardId) {
        return NextResponse.json({ error: "cardId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      const card = await sofiaClient.getCard(cardId);
      return NextResponse.json({ card });
    }

    if (action === "get-details") {
      const { cardId } = parsed.data;
      if (!cardId) {
        return NextResponse.json({ error: "cardId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }

      const card = await sofiaClient.getCard(cardId);

      let contactName: string | null = null;
      if (card.contact_id) {
        try {
          const contact = await sofiaClient.getContact(card.contact_id);
          contactName = contact.name ?? null;
        } catch {
          // Contact may not exist
        }
      }

      let conversationInternalId: string | null = null;
      if (card.conversation_id) {
        try {
          const { data } = await supabase
            .from("conversations")
            .select("id")
            .eq("external_id", card.conversation_id)
            .eq("company_id", access.companyId)
            .maybeSingle();
          conversationInternalId = data?.id ?? null;
        } catch {
          // Conversation may not exist locally
        }
      }

      return NextResponse.json({ card, contactName, conversationInternalId });
    }

    if (action === "update") {
      const { cardId, title, description, stage_id, assigned_to, value_amount, phone, priority, tags, contact_id, conversation_id } = parsed.data;
      if (!cardId) {
        return NextResponse.json({ error: "cardId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      const updateData: Record<string, unknown> = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (stage_id !== undefined) updateData.stage_id = stage_id;
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
      if (value_amount !== undefined) updateData.value_amount = value_amount;
      if (phone !== undefined) updateData.phone = phone;
      if (priority !== undefined) updateData.priority = priority;
      if (tags !== undefined) updateData.tags = tags;
      if (contact_id !== undefined) updateData.contact_id = contact_id;
      if (conversation_id !== undefined) updateData.conversation_id = conversation_id;

      await sofiaClient.updateCard(cardId, updateData);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { cardId } = parsed.data;
      if (!cardId) {
        return NextResponse.json({ error: "cardId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await sofiaClient.deleteCard(cardId);
      return NextResponse.json({ success: true });
    }

    if (action === "move") {
      const { cardId, boardId, stageId } = parsed.data;
      if (!cardId || !boardId || !stageId) {
        return NextResponse.json({ error: "cardId, boardId e stageId são obrigatórios.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await sofiaClient.moveCard(cardId, boardId, stageId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida.", code: "VALIDATION_ERROR" }, { status: 400 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao gerenciar card.";
    return NextResponse.json({ error: message, code: "KANBAN_CARDS_ERROR" }, { status: 500 });
  }
}
