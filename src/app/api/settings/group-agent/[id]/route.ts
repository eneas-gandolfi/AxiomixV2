/**
 * Arquivo: src/app/api/settings/group-agent/[id]/route.ts
 * Propósito: Atualizar e deletar configurações individuais de agente de grupo.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  groupName: z.string().optional(),
  isActive: z.boolean().optional(),
  triggerKeywords: z.array(z.string().min(1)).min(1).optional(),
  agentName: z.string().min(1).optional(),
  agentTone: z.enum(["profissional", "casual", "tecnico"]).optional(),
  feedToRag: z.boolean().optional(),
  ragMinMessageLength: z.number().int().min(10).optional(),
  ragBatchIntervalMinutes: z.number().int().min(5).optional(),
  maxResponsesPerHour: z.number().int().min(1).max(100).optional(),
  cooldownSeconds: z.number().int().min(0).optional(),
  evolutionInstanceName: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (parsed.data.groupName !== undefined) updateData.group_name = parsed.data.groupName;
    if (parsed.data.isActive !== undefined) updateData.is_active = parsed.data.isActive;
    if (parsed.data.triggerKeywords !== undefined) updateData.trigger_keywords = parsed.data.triggerKeywords;
    if (parsed.data.agentName !== undefined) updateData.agent_name = parsed.data.agentName;
    if (parsed.data.agentTone !== undefined) updateData.agent_tone = parsed.data.agentTone;
    if (parsed.data.feedToRag !== undefined) updateData.feed_to_rag = parsed.data.feedToRag;
    if (parsed.data.ragMinMessageLength !== undefined) updateData.rag_min_message_length = parsed.data.ragMinMessageLength;
    if (parsed.data.ragBatchIntervalMinutes !== undefined) updateData.rag_batch_interval_minutes = parsed.data.ragBatchIntervalMinutes;
    if (parsed.data.maxResponsesPerHour !== undefined) updateData.max_responses_per_hour = parsed.data.maxResponsesPerHour;
    if (parsed.data.cooldownSeconds !== undefined) updateData.cooldown_seconds = parsed.data.cooldownSeconds;
    if (parsed.data.evolutionInstanceName !== undefined) updateData.evolution_instance_name = parsed.data.evolutionInstanceName;

    const { data: config, error } = await admin
      .from("group_agent_configs")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", access.companyId)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message, code: "UPDATE_ERROR" }, { status: 500 });
    }

    if (!config) {
      return NextResponse.json({ error: "Configuração não encontrada.", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("group_agent_configs")
      .delete()
      .eq("id", id)
      .eq("company_id", access.companyId);

    if (error) {
      return NextResponse.json({ error: error.message, code: "DELETE_ERROR" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
