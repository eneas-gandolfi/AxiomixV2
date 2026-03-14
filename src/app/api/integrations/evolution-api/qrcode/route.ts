/**
 * Arquivo: src/app/api/integrations/evolution-api/qrcode/route.ts
 * Proposito: Gerar QR Code de conexao na Evolution API com credenciais do servidor.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyAccess, CompanyAccessError } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  createEvolutionVendor,
  generateEvolutionQrCode,
  resolveEvolutionCredentials,
} from "@/services/integrations/evolution";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  vendorName: z.string().trim().min(2, "Nome do vendedor invalido.").optional(),
  instanceName: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "instanceName invalido.")
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem gerar QR Code.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = payloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const vendor = createEvolutionVendor({
      companyId: access.companyId,
      vendorName: parsed.data.vendorName ?? "Vendedor",
      instanceName: parsed.data.instanceName,
    });

    const credentials = resolveEvolutionCredentials();
    const qr = await generateEvolutionQrCode({
      credentials,
      instanceName: vendor.instanceName,
    });

    return NextResponse.json({
      instanceName: qr.instanceName,
      source: qr.source,
      qrCodeDataUrl: qr.qrCodeDataUrl,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EVOLUTION_QR_ERROR" }, { status: 500 });
  }
}
