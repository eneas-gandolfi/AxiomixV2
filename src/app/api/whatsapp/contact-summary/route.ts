/**
 * Arquivo: src/app/api/whatsapp/contact-summary/route.ts
 * Propósito: Gerar resumo AI do relacionamento com um contato via OpenRouter.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";

export const dynamic = "force-dynamic";

const summarySchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  contactPhone: z.string().min(1, "contactPhone é obrigatório."),
  contactName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = summarySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const adminSupabase = createSupabaseAdminClient();
    const contactPhone = parsed.data.contactPhone;
    const contactName = parsed.data.contactName ?? "Cliente";

    // Buscar conversas do contato
    const { data: conversations } = await adminSupabase
      .from("conversations")
      .select("id")
      .eq("company_id", access.companyId)
      .eq("contact_phone", contactPhone);

    const convIds = (conversations ?? []).map((c) => c.id);

    if (convIds.length === 0) {
      return NextResponse.json({ summary: "Sem dados suficientes para gerar um resumo." });
    }

    // Buscar insights existentes
    const { data: insights } = await adminSupabase
      .from("conversation_insights")
      .select("sentiment, intent, sales_stage, summary, generated_at, action_items")
      .eq("company_id", access.companyId)
      .in("conversation_id", convIds)
      .order("generated_at", { ascending: false })
      .limit(10);

    // Buscar últimas mensagens para contexto
    const { data: recentMessages } = await adminSupabase
      .from("messages")
      .select("content, direction, sent_at")
      .eq("company_id", access.companyId)
      .in("conversation_id", convIds)
      .order("sent_at", { ascending: false })
      .limit(30);

    // Montar contexto para o prompt
    const insightsSummary = (insights ?? []).map((ins) => {
      const actionItems = ins.action_items as Record<string, unknown> | null;
      const topics = actionItems && Array.isArray(actionItems.key_topics)
        ? (actionItems.key_topics as string[]).join(", ")
        : "";
      return `- Sentimento: ${ins.sentiment ?? "?"}, Intenção: ${ins.intent ?? "?"}, Estágio: ${ins.sales_stage ?? "?"}, Resumo: ${ins.summary ?? "N/A"}${topics ? `, Tópicos: ${topics}` : ""}`;
    }).join("\n");

    const messagesContext = (recentMessages ?? [])
      .reverse()
      .slice(0, 20)
      .map((m) => `[${m.direction === "inbound" ? "CLIENTE" : "AGENTE"}] ${m.content ?? "(mídia)"}`)
      .join("\n");

    const prompt = `Você é um analista de CRM. Gere um resumo executivo do relacionamento com o contato "${contactName}" (${contactPhone}) baseado nos dados abaixo.

## Análises anteriores (mais recentes primeiro):
${insightsSummary || "Nenhuma análise disponível."}

## Últimas mensagens:
${messagesContext || "Nenhuma mensagem disponível."}

## Instruções:
- Escreva um resumo de 3-5 frases sobre o perfil deste cliente
- Inclua: tom geral do relacionamento, principais interesses/necessidades, riscos ou oportunidades
- Use linguagem profissional e direta em português BR
- NÃO use formatação markdown, apenas texto puro
- Responda APENAS o resumo, sem introduções`;

    const aiResponse = await openRouterChatCompletion(
      access.companyId,
      [
        { role: "system", content: "Voce é um assistente de CRM que gera resumos concisos em portugues." },
        { role: "user", content: prompt },
      ],
      { responseFormat: "text", temperature: 0.3, maxTokens: 512, module: "whatsapp", operation: "contact_summary" }
    );

    return NextResponse.json({ summary: aiResponse ?? "Não foi possível gerar o resumo." });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao gerar resumo.";
    return NextResponse.json({ error: message, code: "SUMMARY_ERROR" }, { status: 500 });
  }
}
