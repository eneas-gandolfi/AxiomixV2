/**
 * Arquivo: src/app/api/whatsapp/contact-metrics/route.ts
 * Propósito: Calcular metricas de engajamento e historico de sentimento de um contato.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const metricsSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  contactPhone: z.string().min(1, "contactPhone é obrigatório."),
});

type SentimentPoint = {
  date: string;
  sentiment: string;
  conversationId: string;
};

type ContactMetrics = {
  totalConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  sentimentDistribution: { positivo: number; neutro: number; negativo: number };
  sentimentTimeline: SentimentPoint[];
  topIntents: Array<{ intent: string; count: number }>;
  lastInteraction: string | null;
  firstInteraction: string | null;
  avgMessagesPerConversation: number;
  currentLabels: Array<{ name: string; color: string | null }>;
};

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = metricsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const adminSupabase = createSupabaseAdminClient();
    const contactPhone = parsed.data.contactPhone;

    // 1. Buscar conversas desse contato
    const { data: conversations } = await adminSupabase
      .from("conversations")
      .select("id, external_id, contact_name, contact_phone, contact_labels, last_message_at, created_at")
      .eq("company_id", access.companyId)
      .eq("contact_phone", contactPhone)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const convList = conversations ?? [];
    const convIds = convList.map((c) => c.id);

    if (convIds.length === 0) {
      return NextResponse.json({
        metrics: {
          totalConversations: 0,
          totalMessages: 0,
          inboundMessages: 0,
          outboundMessages: 0,
          sentimentDistribution: { positivo: 0, neutro: 0, negativo: 0 },
          sentimentTimeline: [],
          topIntents: [],
          lastInteraction: null,
          firstInteraction: null,
          avgMessagesPerConversation: 0,
          currentLabels: [],
        } satisfies ContactMetrics,
      });
    }

    // 2. Contar mensagens por direção
    const { data: messages } = await adminSupabase
      .from("messages")
      .select("direction, sent_at")
      .eq("company_id", access.companyId)
      .in("conversation_id", convIds);

    const msgList = messages ?? [];
    const inbound = msgList.filter((m) => m.direction === "inbound").length;
    const outbound = msgList.filter((m) => m.direction === "outbound").length;

    // 3. Buscar insights (sentimento + intenção)
    const { data: insights } = await adminSupabase
      .from("conversation_insights")
      .select("conversation_id, sentiment, intent, generated_at")
      .eq("company_id", access.companyId)
      .in("conversation_id", convIds)
      .order("generated_at", { ascending: true });

    const insightList = insights ?? [];

    // Distribuição de sentimento
    const sentimentDist = { positivo: 0, neutro: 0, negativo: 0 };
    for (const ins of insightList) {
      const s = ins.sentiment as keyof typeof sentimentDist;
      if (s in sentimentDist) sentimentDist[s]++;
    }

    // Timeline de sentimento
    const sentimentTimeline: SentimentPoint[] = insightList
      .filter((ins) => ins.sentiment && ins.generated_at)
      .map((ins) => ({
        date: ins.generated_at!,
        sentiment: ins.sentiment!,
        conversationId: ins.conversation_id ?? "",
      }));

    // Top intents
    const intentMap = new Map<string, number>();
    for (const ins of insightList) {
      if (ins.intent) {
        intentMap.set(ins.intent, (intentMap.get(ins.intent) ?? 0) + 1);
      }
    }
    const topIntents = Array.from(intentMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);

    // Datas
    const allDates = msgList
      .map((m) => m.sent_at)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime())
      .filter((t) => !Number.isNaN(t));

    const lastInteraction = allDates.length > 0 ? new Date(Math.max(...allDates)).toISOString() : null;
    const firstInteraction = allDates.length > 0 ? new Date(Math.min(...allDates)).toISOString() : null;

    // Labels atuais (do primeiro conv que tiver)
    const labelsRaw = convList.find((c) => c.contact_labels)?.contact_labels;
    const currentLabels = Array.isArray(labelsRaw)
      ? (labelsRaw as Array<{ name?: string; color?: string | null }>)
          .filter((l) => l.name)
          .map((l) => ({ name: l.name!, color: l.color ?? null }))
      : [];

    const metrics: ContactMetrics = {
      totalConversations: convIds.length,
      totalMessages: msgList.length,
      inboundMessages: inbound,
      outboundMessages: outbound,
      sentimentDistribution: sentimentDist,
      sentimentTimeline,
      topIntents,
      lastInteraction,
      firstInteraction,
      avgMessagesPerConversation: convIds.length > 0 ? Math.round(msgList.length / convIds.length) : 0,
      currentLabels,
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao calcular métricas.";
    return NextResponse.json({ error: message, code: "METRICS_ERROR" }, { status: 500 });
  }
}
