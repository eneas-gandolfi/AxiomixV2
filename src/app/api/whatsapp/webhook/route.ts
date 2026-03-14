/**
 * Arquivo: src/app/api/whatsapp/webhook/route.ts
 * Proposito: Receber eventos em tempo real do Sofia CRM e persistir no AXIOMIX.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  companyId: z.string().uuid("companyId invalido."),
  event: z.string().min(1),
  conversation: z
    .object({
      id: z.string(),
      phone_e164: z.string().optional().nullable(),
      remote_jid: z.string().optional().nullable(),
      status: z.string().optional().nullable(),
      updated_at: z.string().optional().nullable(),
      contact: z
        .object({
          id: z.string().optional().nullable(),
          name: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          phone_e164: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
    })
    .optional(),
  message: z
    .object({
      id: z.string().optional().nullable(),
      content: z.string().optional().nullable(),
      from_me: z.boolean().optional().nullable(),
      created_at: z.string().optional().nullable(),
    })
    .optional(),
});

function normalizeSentAt(value?: string | null) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.SOFIA_CRM_WEBHOOK_TOKEN;
    const receivedToken = request.headers.get("x-sofia-webhook-token");

    if (expectedToken && receivedToken !== expectedToken) {
      return NextResponse.json({ error: "Webhook nao autorizado.", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload: unknown = await request.json();
    const parsed = webhookSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const body = parsed.data;
    await getSofiaCrmClient(body.companyId);

    const supabase = createSupabaseAdminClient();
    let localConversationId: string | null = null;

    if (body.conversation) {
      const remoteJid =
        body.conversation.phone_e164 ??
        body.conversation.remote_jid ??
        body.conversation.contact?.phone_e164 ??
        body.conversation.contact?.phone ??
        "unknown";

      const { data: conversationRow, error: conversationError } = await supabase
        .from("conversations")
        .upsert(
          {
            company_id: body.companyId,
            external_id: body.conversation.id,
            remote_jid: remoteJid,
            contact_name: body.conversation.contact?.name ?? null,
            contact_phone:
              body.conversation.contact?.phone_e164 ?? body.conversation.contact?.phone ?? null,
            status: body.conversation.status ?? "open",
            last_message_at: normalizeSentAt(body.conversation.updated_at),
            last_synced_at: new Date().toISOString(),
          },
          {
            onConflict: "company_id,external_id",
          }
        )
        .select("id")
        .single();

      if (conversationError || !conversationRow?.id) {
        return NextResponse.json(
          { error: "Falha ao sincronizar conversa do webhook.", code: "CONVERSATION_UPSERT_ERROR" },
          { status: 500 }
        );
      }

      localConversationId = conversationRow.id;
    }

    if (body.message && localConversationId) {
      const direction: "inbound" | "outbound" = body.message.from_me ? "outbound" : "inbound";
      const sentAt = normalizeSentAt(body.message.created_at);
      const content = body.message.content ?? "";

      const { data: existingMessage } = await supabase
        .from("messages")
        .select("id")
        .eq("company_id", body.companyId)
        .eq("conversation_id", localConversationId)
        .eq("direction", direction)
        .eq("sent_at", sentAt)
        .eq("content", content)
        .limit(1)
        .maybeSingle();

      if (!existingMessage?.id) {
        const { error: insertError } = await supabase.from("messages").insert({
          company_id: body.companyId,
          conversation_id: localConversationId,
          content,
          direction,
          sent_at: sentAt,
        });

        if (insertError) {
          return NextResponse.json(
            { error: "Falha ao salvar mensagem do webhook.", code: "MESSAGE_INSERT_ERROR" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      event: body.event,
      companyId: body.companyId,
      conversationId: localConversationId,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "WHATSAPP_WEBHOOK_ERROR" }, { status: 500 });
  }
}
