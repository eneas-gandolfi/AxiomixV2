/**
 * Arquivo: src/app/api/whatsapp/send-template/route.ts
 * Propósito: Enviar template WhatsApp via Evo CRM Cloud API.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getEvoCrmClient } from "@/services/evo-crm/client";
import type { Json } from "@/database/types/database.types";

export const dynamic = "force-dynamic";

const sendTemplateSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  to: z.string().min(1, "to é obrigatório."),
  templateName: z.string().min(1, "templateName é obrigatório."),
  language: z.string().optional(),
  components: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = sendTemplateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const evoClient = await getEvoCrmClient(access.companyId);
    await evoClient.sendTemplate({
      to: parsed.data.to,
      templateName: parsed.data.templateName,
      language: parsed.data.language ?? "pt_BR",
      components: parsed.data.components as Json | undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao enviar template.";
    return NextResponse.json({ error: message, code: "SEND_TEMPLATE_ERROR" }, { status: 500 });
  }
}
