/**
 * Arquivo: src/app/api/settings/openrouter/model/route.ts
 * Propósito: Ler e gravar o modelo OpenRouter preferido da empresa (sem tocar na API key).
 * Autor: AXIOMIX
 * Data: 2026-04-18
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import type { Json } from "@/database/types/database.types";

export const dynamic = "force-dynamic";

const modelUpdateSchema = z.object({
  model: z.string().trim().min(3, "Modelo inválido.").max(120, "Modelo muito longo."),
});

async function getMembership(request: NextRequest, response: NextResponse) {
  const supabase = createSupabaseRouteHandlerClient(request, response);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, membership: null, authError: true as const };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { supabase, membership, authError: false as const };
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const { supabase, membership, authError } = await getMembership(request, response);

    if (authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", membership.company_id)
      .eq("type", "openrouter")
      .maybeSingle();

    const config = (integration?.config ?? {}) as Record<string, unknown>;
    const model = typeof config.model === "string" && config.model.trim().length > 0
      ? config.model.trim()
      : null;
    const envDefault = process.env.OPENROUTER_MODEL?.trim() || "google/gemini-2.0-flash-lite-001";

    return NextResponse.json({
      model: model ?? envDefault,
      isCustom: Boolean(model),
      envDefault,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "OPENROUTER_MODEL_GET_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const { supabase, membership, authError } = await getMembership(request, response);

    if (authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem alterar o modelo.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = modelUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", membership.company_id)
      .eq("type", "openrouter")
      .maybeSingle();

    const prevConfig = (existing?.config ?? {}) as Record<string, Json>;
    const nextConfig: Record<string, Json> = { ...prevConfig, model: parsed.data.model };

    const { error } = await supabase
      .from("integrations")
      .upsert(
        {
          company_id: membership.company_id,
          type: "openrouter",
          config: nextConfig,
          is_active: existing ? undefined : false,
        },
        { onConflict: "company_id,type" }
      );

    if (error) {
      return NextResponse.json(
        { error: "Não foi possível salvar o modelo.", code: "OPENROUTER_MODEL_SAVE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ model: parsed.data.model, isCustom: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "OPENROUTER_MODEL_POST_ERROR" }, { status: 500 });
  }
}
