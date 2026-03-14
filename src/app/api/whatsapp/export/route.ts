/**
 * Arquivo: src/app/api/whatsapp/export/route.ts
 * Proposito: Exportar conversas filtradas para CSV.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

const exportSchema = z.object({
  companyId: z.string().uuid(),
  conversationIds: z.array(z.string().uuid()).optional(),
  sentiment: z.enum(["all", "positivo", "neutro", "negativo"]).optional(),
  intent: z.string().optional(),
  status: z.enum(["all", "open", "closed"]).optional(),
});

function escapeCSV(value: string | null | undefined): string {
  if (!value) return "";
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Buscar conversas com insights
    let conversationsQuery = supabase
      .from("conversations")
      .select(
        `
        id,
        external_id,
        contact_name,
        remote_jid,
        status,
        last_message_at,
        created_at
      `
      )
      .eq("company_id", access.companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1000);

    if (parsed.data.conversationIds && parsed.data.conversationIds.length > 0) {
      conversationsQuery = conversationsQuery.in("id", parsed.data.conversationIds);
    }

    if (parsed.data.status && parsed.data.status !== "all") {
      conversationsQuery = conversationsQuery.eq("status", parsed.data.status);
    }

    const { data: conversations, error: conversationsError } = await conversationsQuery;

    if (conversationsError) {
      throw new Error(`Falha ao carregar conversas: ${conversationsError.message}`);
    }

    const conversationIds = (conversations ?? []).map((c) => c.id);

    // Buscar insights
    const { data: insights } =
      conversationIds.length > 0
        ? await supabase
            .from("conversation_insights")
            .select("conversation_id, sentiment, intent, summary")
            .eq("company_id", access.companyId)
            .in("conversation_id", conversationIds)
        : { data: [] };

    const insightMap = new Map(
      (insights ?? []).map((i) => [
        i.conversation_id,
        { sentiment: i.sentiment, intent: i.intent, summary: i.summary },
      ])
    );

    // Aplicar filtros client-side (para sentiment e intent)
    let filteredConversations = conversations ?? [];

    if (parsed.data.sentiment && parsed.data.sentiment !== "all") {
      filteredConversations = filteredConversations.filter((c) => {
        const insight = insightMap.get(c.id);
        return insight?.sentiment === parsed.data.sentiment;
      });
    }

    if (parsed.data.intent && parsed.data.intent !== "all") {
      filteredConversations = filteredConversations.filter((c) => {
        const insight = insightMap.get(c.id);
        return insight?.intent === parsed.data.intent;
      });
    }

    // Gerar CSV
    const headers = [
      "ID Externo",
      "Nome do Contato",
      "Telefone",
      "Status",
      "Sentimento",
      "Intenção",
      "Resumo",
      "Última Mensagem",
      "Data de Criação",
    ];

    const csvRows = [headers.join(",")];

    for (const conversation of filteredConversations) {
      const insight = insightMap.get(conversation.id);

      const row = [
        escapeCSV(conversation.external_id ?? ""),
        escapeCSV(conversation.contact_name ?? ""),
        escapeCSV(conversation.remote_jid ?? ""),
        escapeCSV(conversation.status ?? ""),
        escapeCSV(insight?.sentiment ?? ""),
        escapeCSV(insight?.intent ?? ""),
        escapeCSV(insight?.summary ?? ""),
        escapeCSV(conversation.last_message_at ?? ""),
        escapeCSV(conversation.created_at ?? ""),
      ];

      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `whatsapp-intelligence-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao exportar dados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
