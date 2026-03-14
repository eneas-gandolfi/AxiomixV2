/**
 * Arquivo: src/app/api/integrations/evolution-api/vendors/route.ts
 * Proposito: Gerenciar vendedores conectados na Evolution API via QR Code.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import {
  decodeIntegrationConfig,
  encodeIntegrationConfig,
  testIntegrationConnection,
} from "@/lib/integrations/service";
import type { EvolutionApiConfig, EvolutionVendor } from "@/lib/integrations/types";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  createEvolutionVendor,
  fetchEvolutionInstanceStatuses,
  generateEvolutionQrCode,
  mergeVendorStatuses,
  resolveEvolutionCredentials,
} from "@/services/integrations/evolution";

export const dynamic = "force-dynamic";

const createVendorSchema = z.object({
  vendorName: z.string().trim().min(2, "Nome do vendedor invalido."),
  managerPhone: z.string().trim().min(8, "WhatsApp do gestor invalido.").optional(),
  instanceName: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "instanceName invalido.")
    .optional(),
});

function toEvolutionConfig(payload: unknown): EvolutionApiConfig | null {
  if (!payload) {
    return null;
  }

  try {
    return decodeIntegrationConfig("evolution_api", payload as never);
  } catch {
    return null;
  }
}

function mergeVendor(vendors: EvolutionVendor[], nextVendor: EvolutionVendor) {
  const map = new Map(vendors.map((vendor) => [vendor.instanceName, vendor]));
  map.set(nextVendor.instanceName, nextVendor);
  return Array.from(map.values());
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const { data: integration } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("company_id", access.companyId)
      .eq("type", "evolution_api")
      .maybeSingle();

    const decoded = integration?.config ? toEvolutionConfig(integration.config) : null;
    const vendors = decoded?.vendors ?? [];
    const managerPhone = decoded?.managerPhone ?? "";

    if (vendors.length === 0) {
      return NextResponse.json({
        vendors: [],
        managerPhone,
      });
    }

    try {
      const credentials = resolveEvolutionCredentials({
        baseUrl: decoded?.baseUrl,
        apiKey: decoded?.apiKey,
      });

      const statuses = await fetchEvolutionInstanceStatuses({ credentials });
      const syncedVendors = mergeVendorStatuses({
        vendors,
        statuses,
      });

      const changed =
        JSON.stringify(vendors.map((item) => [item.instanceName, item.status, item.connectedAt])) !==
        JSON.stringify(
          syncedVendors.map((item) => [item.instanceName, item.status, item.connectedAt])
        );

      if (changed && integration?.id) {
        const nextConfig: EvolutionApiConfig = {
          managerPhone,
          vendors: syncedVendors,
          baseUrl: decoded?.baseUrl,
          apiKey: decoded?.apiKey,
        };

        await supabase
          .from("integrations")
          .update({
            config: encodeIntegrationConfig("evolution_api", nextConfig),
          })
          .eq("id", integration.id)
          .eq("company_id", access.companyId);
      }

      return NextResponse.json({
        vendors: syncedVendors,
        managerPhone,
      });
    } catch {
      return NextResponse.json({
        vendors,
        managerPhone,
      });
    }
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EVOLUTION_VENDORS_GET_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem conectar vendedores.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = createVendorSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: existingIntegration } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("company_id", access.companyId)
      .eq("type", "evolution_api")
      .maybeSingle();

    const decoded = existingIntegration?.config ? toEvolutionConfig(existingIntegration.config) : null;
    const managerPhone = parsed.data.managerPhone ?? decoded?.managerPhone ?? "";

    if (managerPhone.trim().length < 8) {
      return NextResponse.json(
        {
          error: "Informe o WhatsApp do gestor para finalizar a conexao.",
          code: "MANAGER_PHONE_REQUIRED",
        },
        { status: 400 }
      );
    }

    const credentials = resolveEvolutionCredentials({
      baseUrl: decoded?.baseUrl,
      apiKey: decoded?.apiKey,
    });

    const vendor = createEvolutionVendor({
      companyId: access.companyId,
      vendorName: parsed.data.vendorName,
      instanceName: parsed.data.instanceName,
    });

    const qr = await generateEvolutionQrCode({
      credentials,
      instanceName: vendor.instanceName,
    });

    const vendorWithQr: EvolutionVendor = {
      ...vendor,
      qrCodeSource: qr.source,
      lastQrAt: new Date().toISOString(),
      lastError: null,
    };

    const vendors = mergeVendor(decoded?.vendors ?? [], vendorWithQr);
    const nextConfig: EvolutionApiConfig = {
      managerPhone,
      baseUrl: decoded?.baseUrl,
      apiKey: decoded?.apiKey,
      vendors,
    };

    const test = await testIntegrationConnection("evolution_api", nextConfig);
    const nowIso = new Date().toISOString();

    const { error: upsertError } = await supabase.from("integrations").upsert(
      {
        company_id: access.companyId,
        type: "evolution_api",
        config: encodeIntegrationConfig("evolution_api", nextConfig),
        is_active: test.ok,
        test_status: test.ok ? "ok" : "error",
        last_tested_at: nowIso,
      },
      {
        onConflict: "company_id,type",
      }
    );

    if (upsertError) {
      return NextResponse.json(
        { error: "Falha ao salvar vendedor da Evolution API.", code: "EVOLUTION_VENDOR_SAVE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      vendor: vendorWithQr,
      managerPhone,
      qrCodeDataUrl: qr.qrCodeDataUrl,
      testDetail: test.detail,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EVOLUTION_VENDORS_POST_ERROR" }, { status: 500 });
  }
}
