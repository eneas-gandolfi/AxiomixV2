/**
 * Arquivo: src/app/api/webhooks/evolution/group/route.ts
 * Propósito: Webhook da Evolution API para receber mensagens de grupos WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

const webhookPayloadSchema = z.object({
  event: z.string(),
  instance: z.string().optional(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
      id: z.string(),
      participant: z.string().optional(),
    }),
    pushName: z.string().optional(),
    message: z
      .object({
        conversation: z.string().optional(),
        extendedTextMessage: z
          .object({
            text: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    messageType: z.string().optional(),
    messageTimestamp: z.union([z.number(), z.string()]).optional(),
  }),
});

function extractTextContent(message: z.infer<typeof webhookPayloadSchema>["data"]["message"]): string | null {
  if (!message) return null;
  return message.conversation ?? message.extendedTextMessage?.text ?? null;
}

function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

function detectTrigger(content: string, triggerKeywords: string[]): boolean {
  const normalized = content.toLowerCase().trim();
  return triggerKeywords.some((keyword) => {
    const k = keyword.toLowerCase().trim();
    return (
      normalized.startsWith(k) ||
      normalized.includes(` ${k}`) ||
      normalized.includes(`\n${k}`)
    );
  });
}

function resolveTimestamp(raw: number | string | undefined): string {
  if (!raw) return new Date().toISOString();
  const ts = typeof raw === "string" ? Number(raw) : raw;
  if (ts > 1e12) return new Date(ts).toISOString();
  return new Date(ts * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const expectedToken = process.env.EVOLUTION_WEBHOOK_API_KEY?.trim();

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody: unknown = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const parsed = webhookPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: true, skipped: "payload_invalid" });
    }

    const { data } = parsed.data;
    const remoteJid = data.key.remoteJid;

    if (!isGroupJid(remoteJid)) {
      return NextResponse.json({ ok: true, skipped: "not_group" });
    }

    if (data.key.fromMe) {
      return NextResponse.json({ ok: true, skipped: "from_me" });
    }

    const senderJid = data.key.participant ?? data.key.remoteJid;
    const content = extractTextContent(data.message);
    const messageId = data.key.id;
    const senderName = data.pushName ?? null;
    const messageType = data.messageType ?? "text";
    const sentAt = resolveTimestamp(data.messageTimestamp);

    const supabase = createSupabaseAdminClient();

    // Busca config existente para este grupo (ativo ou inativo)
    let { data: config } = await supabase
      .from("group_agent_configs")
      .select("id, company_id, trigger_keywords, is_active, group_name")
      .eq("group_jid", remoteJid)
      .limit(1)
      .maybeSingle();

    // Auto-registrar grupo se não existe config
    if (!config) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("company_id")
        .eq("type", "evolution_api")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!integration?.company_id) {
        return NextResponse.json({ ok: true, skipped: "no_company" });
      }

      const companyId: string = integration.company_id;
      const groupName = senderName ? `Grupo ${remoteJid.split("@")[0].slice(-6)}` : null;

      const { data: newConfig } = await supabase
        .from("group_agent_configs")
        .upsert(
          {
            company_id: companyId,
            group_jid: remoteJid,
            group_name: groupName,
            is_active: false,
          },
          { onConflict: "company_id,group_jid" }
        )
        .select("id, company_id, trigger_keywords, is_active, group_name")
        .maybeSingle();

      if (!newConfig) {
        return NextResponse.json({ ok: true, skipped: "auto_register_failed" });
      }

      config = newConfig;
    }

    // Se grupo está inativo, salva mensagem mas não processa trigger
    if (!config.is_active) {
      await supabase.from("group_messages").upsert(
        {
          company_id: config.company_id,
          config_id: config.id,
          group_jid: remoteJid,
          sender_jid: senderJid,
          sender_name: senderName,
          message_id: messageId,
          content,
          message_type: messageType,
          is_trigger: false,
          sent_at: sentAt,
        },
        { onConflict: "company_id,message_id", ignoreDuplicates: true }
      );
      return NextResponse.json({ ok: true, registered: true, active: false });
    }

    const isTrigger = content ? detectTrigger(content, config.trigger_keywords) : false;

    const { error: insertError } = await supabase.from("group_messages").upsert(
      {
        company_id: config.company_id,
        config_id: config.id,
        group_jid: remoteJid,
        sender_jid: senderJid,
        sender_name: senderName,
        message_id: messageId,
        content,
        message_type: messageType,
        is_trigger: isTrigger,
        sent_at: sentAt,
      },
      { onConflict: "company_id,message_id", ignoreDuplicates: true }
    );

    if (insertError) {
      console.error("[webhook/group] Falha ao inserir mensagem:", insertError.message);
      return NextResponse.json({ ok: true, skipped: "insert_error" });
    }

    if (isTrigger && content) {
      const { data: insertedMsg } = await supabase
        .from("group_messages")
        .select("id")
        .eq("company_id", config.company_id)
        .eq("message_id", messageId)
        .maybeSingle();

      if (insertedMsg) {
        await enqueueJob(
          "group_agent_respond",
          { messageId: insertedMsg.id, configId: config.id },
          config.company_id
        );
      }
    }

    return NextResponse.json({ ok: true, trigger: isTrigger });
  } catch (error) {
    console.error("[webhook/group] Erro inesperado:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: true, skipped: "error" });
  }
}
