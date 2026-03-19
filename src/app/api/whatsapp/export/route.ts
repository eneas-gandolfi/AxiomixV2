/**
 * Arquivo: src/app/api/whatsapp/export/route.ts
 * Proposito: Exportar conversas filtradas para CSV.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";

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

function normalizeCsvText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\r\n|\r|\n/g, " ").replace(/\s+/g, " ").trim();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return normalizeCsvText(value);
  }

  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatPhoneDisplay(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");

  if (!digits) {
    return rawPhone.trim();
  }

  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const localNumber = digits.slice(4);

    if (localNumber.length === 9) {
      return `(${ddd}) ${localNumber.slice(0, 5)}-${localNumber.slice(5)}`;
    }

    if (localNumber.length === 8) {
      return `(${ddd}) ${localNumber.slice(0, 4)}-${localNumber.slice(4)}`;
    }
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return rawPhone.trim();
}

function formatConversationPhone(
  contactPhone: string | null | undefined,
  remoteJid: string | null | undefined
): string {
  const normalizedPhone = normalizeWhatsAppPhone(contactPhone);
  if (normalizedPhone) {
    return formatPhoneDisplay(normalizedPhone);
  }

  const normalizedRemoteJid = normalizeWhatsAppPhone(
    remoteJid?.replace(/@s\.whatsapp\.net|@c\.us/g, "") ?? ""
  );

  if (normalizedRemoteJid) {
    return formatPhoneDisplay(normalizedRemoteJid);
  }

  return normalizeCsvText(remoteJid);
}

function formatStatusLabel(status: string | null | undefined): string {
  if (status === "open") return "Aberta";
  if (status === "closed") return "Encerrada";
  return normalizeCsvText(status);
}

function serializeCsvRow(values: Array<string | null | undefined>): string {
  return values.map((value) => escapeCSV(normalizeCsvText(value))).join(";");
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
    const explicitConversationIds = Array.from(new Set(parsed.data.conversationIds ?? []));
    const hasExplicitConversationIds = explicitConversationIds.length > 0;

    let conversationsQuery = supabase
      .from("conversations")
      .select(
        `
        id,
        external_id,
        contact_name,
        contact_phone,
        remote_jid,
        status,
        last_message_at,
        created_at
      `
      )
      .eq("company_id", access.companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (hasExplicitConversationIds) {
      conversationsQuery = conversationsQuery.in("id", explicitConversationIds);
    } else {
      conversationsQuery = conversationsQuery.limit(1000);
    }

    if (!hasExplicitConversationIds && parsed.data.status && parsed.data.status !== "all") {
      conversationsQuery = conversationsQuery.eq("status", parsed.data.status);
    }

    const { data: conversations, error: conversationsError } = await conversationsQuery;

    if (conversationsError) {
      throw new Error(`Falha ao carregar conversas: ${conversationsError.message}`);
    }

    const conversationIds = (conversations ?? []).map((conversation) => conversation.id);

    const { data: insights } =
      conversationIds.length > 0
        ? await supabase
            .from("conversation_insights")
            .select("conversation_id, sentiment, intent, summary")
            .eq("company_id", access.companyId)
            .in("conversation_id", conversationIds)
        : {
            data: [] as Array<{
              conversation_id: string;
              sentiment: string | null;
              intent: string | null;
              summary: string | null;
            }>,
          };

    const insightMap = new Map(
      (insights ?? []).map((insight) => [
        insight.conversation_id,
        {
          sentiment: insight.sentiment,
          intent: insight.intent,
          summary: insight.summary,
        },
      ])
    );

    let filteredConversations = conversations ?? [];

    if (!hasExplicitConversationIds && parsed.data.sentiment && parsed.data.sentiment !== "all") {
      filteredConversations = filteredConversations.filter((conversation) => {
        const insight = insightMap.get(conversation.id);
        return insight?.sentiment === parsed.data.sentiment;
      });
    }

    if (!hasExplicitConversationIds && parsed.data.intent && parsed.data.intent !== "all") {
      filteredConversations = filteredConversations.filter((conversation) => {
        const insight = insightMap.get(conversation.id);
        return insight?.intent === parsed.data.intent;
      });
    }

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

    const csvRows = [headers.join(";")];

    for (const conversation of filteredConversations) {
      const insight = insightMap.get(conversation.id);

      csvRows.push(
        serializeCsvRow([
          conversation.external_id,
          conversation.contact_name,
          formatConversationPhone(conversation.contact_phone, conversation.remote_jid),
          formatStatusLabel(conversation.status),
          insight?.sentiment,
          insight?.intent,
          insight?.summary,
          formatDateTime(conversation.last_message_at),
          formatDateTime(conversation.created_at),
        ])
      );
    }

    const csvContent = `\uFEFF${csvRows.join("\r\n")}`;
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `whatsapp-intelligence-${timestamp}.csv`;

    return new NextResponse(new TextEncoder().encode(csvContent), {
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
