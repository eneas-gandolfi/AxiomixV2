/**
 * Arquivo: src/app/api/settings/group-agent/route.ts
 * Propósito: Listar e criar configurações de agente de grupo WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const admin = createSupabaseAdminClient();

    const { data: configs, error } = await admin
      .from("group_agent_configs")
      .select("*")
      .eq("company_id", access.companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "QUERY_ERROR" },
        { status: 500 }
      );
    }

    const configsWithStats = await Promise.all(
      (configs ?? []).map(async (config) => {
        const [{ count: messageCount }, { count: responseCount }] = await Promise.all([
          admin
            .from("group_messages")
            .select("id", { count: "exact", head: true })
            .eq("config_id", config.id),
          admin
            .from("group_agent_responses")
            .select("id", { count: "exact", head: true })
            .eq("config_id", config.id),
        ]);

        return {
          ...config,
          stats: {
            totalMessages: messageCount ?? 0,
            totalResponses: responseCount ?? 0,
          },
        };
      })
    );

    return NextResponse.json({ configs: configsWithStats });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

const createSchema = z.object({
  groupJid: z.string().min(1, "groupJid obrigatório.").refine(
    (jid) => jid.endsWith("@g.us"),
    "JID deve terminar com @g.us"
  ),
  groupName: z.string().optional(),
  triggerKeywords: z.array(z.string().min(1)).min(1).optional(),
  agentName: z.string().min(1).optional(),
  agentTone: z.enum(["profissional", "casual", "tecnico"]).optional(),
  feedToRag: z.boolean().optional(),
  ragMinMessageLength: z.number().int().min(10).optional(),
  ragBatchIntervalMinutes: z.number().int().min(5).optional(),
  maxResponsesPerHour: z.number().int().min(1).max(100).optional(),
  cooldownSeconds: z.number().int().min(0).optional(),
  evolutionInstanceName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: config, error } = await admin
      .from("group_agent_configs")
      .insert({
        company_id: access.companyId,
        group_jid: parsed.data.groupJid,
        group_name: parsed.data.groupName ?? null,
        trigger_keywords: parsed.data.triggerKeywords ?? ["@axiomix", "/ia"],
        agent_name: parsed.data.agentName ?? "Axiomix IA",
        agent_tone: parsed.data.agentTone ?? "profissional",
        feed_to_rag: parsed.data.feedToRag ?? true,
        rag_min_message_length: parsed.data.ragMinMessageLength ?? 50,
        rag_batch_interval_minutes: parsed.data.ragBatchIntervalMinutes ?? 30,
        max_responses_per_hour: parsed.data.maxResponsesPerHour ?? 20,
        cooldown_seconds: parsed.data.cooldownSeconds ?? 10,
        evolution_instance_name: parsed.data.evolutionInstanceName ?? null,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Grupo já configurado para esta empresa.", code: "DUPLICATE" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message, code: "INSERT_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
