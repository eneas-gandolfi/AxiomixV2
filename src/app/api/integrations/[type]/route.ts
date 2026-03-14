/**
 * Arquivo: src/app/api/integrations/[type]/route.ts
 * Propósito: Salvar configuração de uma integração com credenciais criptografadas.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { ZodError } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  buildIntegrationPublicItem,
  encodeIntegrationConfig,
  parseIntegrationConfig,
  parseIntegrationType,
} from "@/lib/integrations/service";

export const dynamic = "force-dynamic";

type IntegrationRouteContext = {
  params: Promise<{
    type: string;
  }>;
};

function isEncryptionConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("INTEGRATIONS_ENCRYPTION_KEY") &&
    error.message.includes("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export async function POST(request: NextRequest, context: IntegrationRouteContext) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem alterar integrações.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const params = await context.params;
    const integrationType = parseIntegrationType(params.type);
    const payload: unknown = await request.json().catch(() => ({}));
    const config = parseIntegrationConfig(integrationType, payload);
    const encryptedConfig = encodeIntegrationConfig(integrationType, config);

    // Identify if it's a Sofia CRM configuration change that requires clearing old data
    let shouldClearConversations = false;
    if (integrationType === "sofia_crm") {
      const { data: currentIntegration } = await supabase
        .from("integrations")
        .select("config")
        .eq("company_id", membership.company_id)
        .eq("type", "sofia_crm")
        .maybeSingle();

      if (currentIntegration?.config) {
        try {
          // If the config string changed, we assume it's a different client/inbox
          // and we should clear the old sync data to avoid mixing conversations
          if (JSON.stringify(currentIntegration.config) !== JSON.stringify(encryptedConfig)) {
            shouldClearConversations = true;
          }
        } catch {
          // Ignore parse errors
        }
      } else {
        // New integration, nothing to clear yet
      }
    }

    const { data: integration, error } = await supabase
      .from("integrations")
      .upsert(
        {
          company_id: membership.company_id,
          type: integrationType,
          config: encryptedConfig,
          is_active: false,
          test_status: null,
          last_tested_at: null,
        },
        {
          onConflict: "company_id,type",
        }
      )
      .select("id, type, config, is_active, test_status, last_tested_at, created_at, company_id")
      .single();

    if (error || !integration) {
      return NextResponse.json(
        { error: "Não foi possível salvar integração.", code: "INTEGRATION_SAVE_ERROR" },
        { status: 500 }
      );
    }

    if (shouldClearConversations) {
      console.log(`[Integration] Sofia CRM config changed for company ${membership.company_id}. Clearing old sync data.`);
      // We perform deletions in order to respect potential foreign key constraints
      // Insights, Notes, Messages, then Conversations
      try {
        await supabase.from("conversation_insights").delete().eq("company_id", membership.company_id);
        await supabase.from("conversation_notes").delete().eq("company_id", membership.company_id);
        await supabase.from("messages").delete().eq("company_id", membership.company_id);
        await supabase.from("conversations").delete().eq("company_id", membership.company_id);
      } catch (clearError) {
        console.error("[Integration] Erro ao limpar conversas antigas:", clearError);
      }
    }

    if (error || !integration) {
      return NextResponse.json(
        { error: "Não foi possível salvar integração.", code: "INTEGRATION_SAVE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      integration: buildIntegrationPublicItem(integration),
      message: "Configuração salva com sucesso.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (isEncryptionConfigurationError(error)) {
      return NextResponse.json(
        {
          error:
            "Não foi possível salvar no momento por configuração interna pendente. Tente novamente em instantes.",
          code: "INTERNAL_CONFIG_ERROR",
        },
        { status: 500 }
      );
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTEGRATION_POST_ERROR" }, { status: 500 });
  }
}
