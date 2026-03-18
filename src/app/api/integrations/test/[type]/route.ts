/**
 * Arquivo: src/app/api/integrations/test/[type]/route.ts
 * Propósito: Testar conexão real de integração e persistir resultado no banco.
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
  testIntegrationConnection,
} from "@/lib/integrations/service";
import {
  clearSofiaCrmCompanyData,
  hasSofiaCrmConfigChanged,
} from "@/lib/integrations/sofia-crm-maintenance";
import type { SofiaCrmConfig } from "@/lib/integrations/types";

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
        { error: "Apenas owner/admin podem testar integrações.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const params = await context.params;
    const integrationType = parseIntegrationType(params.type);
    const payload: unknown = await request.json().catch(() => ({}));
    const config = parseIntegrationConfig(integrationType, payload);
    const testResult = await testIntegrationConnection(integrationType, config);

    // Merge auto-detected fields (e.g. Sofia CRM inboxId) into config before saving
    if (testResult.detectedConfig) {
      Object.assign(config, testResult.detectedConfig);
    }

    const encryptedConfig = encodeIntegrationConfig(integrationType, config);
    const nowIso = new Date().toISOString();

    let shouldClearConversations = false;
    if (integrationType === "sofia_crm") {
      const { data: currentIntegration } = await supabase
        .from("integrations")
        .select("config")
        .eq("company_id", membership.company_id)
        .eq("type", "sofia_crm")
        .maybeSingle();

      if (currentIntegration?.config) {
        shouldClearConversations = hasSofiaCrmConfigChanged(
          currentIntegration.config,
          config as SofiaCrmConfig
        );
      }
    }

    const { data: integration, error } = await supabase
      .from("integrations")
      .upsert(
        {
          company_id: membership.company_id,
          type: integrationType,
          config: encryptedConfig,
          is_active: testResult.ok,
          test_status: testResult.ok ? "ok" : "error",
          last_tested_at: nowIso,
        },
        {
          onConflict: "company_id,type",
        }
      )
      .select("id, type, config, is_active, test_status, last_tested_at, created_at, company_id")
      .single();

    if (error || !integration) {
      return NextResponse.json(
        { error: "Não foi possível salvar resultado do teste.", code: "INTEGRATION_TEST_SAVE_ERROR" },
        { status: 500 }
      );
    }

    if (shouldClearConversations) {
      console.log(
        `[Integration Test] Sofia CRM config changed for company ${membership.company_id}. Clearing old sync data.`
      );

      try {
        await clearSofiaCrmCompanyData(membership.company_id);
      } catch (clearError) {
        console.error("[Integration Test] Erro ao limpar conversas antigas:", clearError);
      }
    }

    return NextResponse.json({
      integration: buildIntegrationPublicItem(integration),
      testDetail: testResult.detail,
      testedAt: nowIso,
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
            "Não foi possível testar no momento por configuração interna pendente. Tente novamente em instantes.",
          code: "INTERNAL_CONFIG_ERROR",
        },
        { status: 500 }
      );
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTEGRATION_TEST_ERROR" }, { status: 500 });
  }
}
