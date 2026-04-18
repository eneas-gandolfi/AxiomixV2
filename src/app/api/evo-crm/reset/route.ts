/**
 * Arquivo: src/app/api/evo-crm/reset/route.ts
 * Propósito: Limpar dados sincronizados do Evo CRM para a empresa autenticada.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { clearEvoCrmCompanyData } from "@/lib/integrations/evo-crm-maintenance";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = resetSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem limpar os dados do Evo CRM.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    await clearEvoCrmCompanyData(access.companyId);
    revalidatePath("/settings");
    revalidatePath("/whatsapp-intelligence");
    revalidatePath("/whatsapp-intelligence/conversas");

    return NextResponse.json({
      companyId: access.companyId,
      message: "Dados sincronizados do Evo CRM removidos com sucesso.",
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EVO_RESET_ERROR" }, { status: 500 });
  }
}
