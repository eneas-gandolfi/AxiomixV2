/**
 * Arquivo: src/app/api/dashboard/next-action-suggestion/route.ts
 * Propósito: Gerar sugestão de resposta para a conversa parada exibida no
 *            herói NextAction do dashboard. Consumido por client component
 *            que monta após o card renderizar (Fase 3 final).
 * Autor: AXIOMIX
 * Data: 2026-05-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { applyIpRateLimit } from "@/lib/auth/rate-limit";
import { getNicheBySlug, isValidNicheSlug } from "@/lib/niches";

export const dynamic = "force-dynamic";

const schema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  conversationId: z.string().uuid("conversationId inválido."),
});

const MAX_MESSAGES = 10;
const MAX_TOKENS = 250;

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await applyIpRateLimit(
      request,
      "ai:next-action-suggestion",
      30,
      60,
    );
    if (rateLimited) return rateLimited;

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = schema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Payload inválido.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const adminSupabase = createSupabaseAdminClient();

    // 1) Conversa pertence à company? + nome do contato
    const { data: conversation, error: conversationError } = await adminSupabase
      .from("conversations")
      .select("id, contact_name")
      .eq("id", parsed.data.conversationId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const contactName = conversation.contact_name ?? "Cliente";

    // 2) Últimas N mensagens (ordem cronológica pra dar contexto à IA)
    const { data: messagesDesc } = await adminSupabase
      .from("messages")
      .select("direction, content, sent_at")
      .eq("conversation_id", parsed.data.conversationId)
      .order("sent_at", { ascending: false })
      .limit(MAX_MESSAGES);

    if (!messagesDesc || messagesDesc.length === 0) {
      return NextResponse.json(
        { error: "Conversa sem mensagens.", code: "NO_CONTEXT" },
        { status: 422 },
      );
    }

    const messages = [...messagesDesc].reverse(); // cronológica
    const transcript = messages
      .map((m) => `[${m.direction === "inbound" ? "CLIENTE" : "AGENTE"}] ${m.content ?? "(mídia)"}`)
      .join("\n");

    // 3) Tom calibrado pelo nicho
    const { data: company } = await adminSupabase
      .from("companies")
      .select("name, niche_slug")
      .eq("id", access.companyId)
      .maybeSingle();

    const nicheSlug = isValidNicheSlug(company?.niche_slug) ? company.niche_slug : null;
    const niche = nicheSlug ? getNicheBySlug(nicheSlug) : null;
    const nicheHint = niche
      ? ` Negócio do nicho "${niche.label}".`
      : "";

    // 4) IA gera sugestão
    const systemPrompt =
      `Você é um assistente de atendimento via WhatsApp em português brasileiro.${nicheHint} ` +
      `Sua tarefa é sugerir UMA mensagem curta (máx. 2 frases) que o agente humano pode enviar ` +
      `pra retomar a conversa parada com o cliente. ` +
      `Regras: 1) Tom profissional mas próximo. 2) NUNCA prometa preço, prazo ou desconto sem dado explícito. ` +
      `3) Responda APENAS o texto da mensagem sugerida, sem aspas, sem "Sugestão:", sem markdown.`;

    const userPrompt =
      `Cliente: ${contactName}\n\n` +
      `Últimas mensagens (cronológica):\n${transcript}\n\n` +
      `Gere a próxima mensagem que o agente deveria enviar agora pra avançar a conversa.`;

    const suggestion = await openRouterChatCompletion(
      access.companyId,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        responseFormat: "text",
        temperature: 0.4,
        maxTokens: MAX_TOKENS,
        module: "dashboard",
        operation: "next_action_suggestion",
      },
    );

    return NextResponse.json({ suggestion: suggestion.trim() });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "Erro interno.";
    console.error("[api/dashboard/next-action-suggestion] error:", message);
    return NextResponse.json(
      { error: "Não foi possível gerar a sugestão agora.", code: "AI_ERROR" },
      { status: 500 },
    );
  }
}
