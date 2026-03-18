/**
 * Arquivo: src/app/api/whatsapp/contacts/[id]/route.ts
 * Propósito: Buscar detalhe de um contato e gerenciar labels do contato.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const contactDetailSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  action: z.enum(["get", "listLabels", "addLabel", "removeLabel"]),
  label: z.string().optional(),
  labelId: z.string().optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: contactId } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = contactDetailSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const sofiaClient = await getSofiaCrmClient(access.companyId);

    if (parsed.data.action === "get") {
      const contact = await sofiaClient.getContact(contactId);
      return NextResponse.json({ contact });
    }

    if (parsed.data.action === "listLabels") {
      const labels = await sofiaClient.listContactLabels(contactId);
      return NextResponse.json({ labels });
    }

    if (parsed.data.action === "addLabel") {
      const { label } = parsed.data;
      if (!label) {
        return NextResponse.json({ error: "label é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await sofiaClient.addContactLabel({ contactId, label });
      return NextResponse.json({ success: true });
    }

    if (parsed.data.action === "removeLabel") {
      const { labelId } = parsed.data;
      if (!labelId) {
        return NextResponse.json({ error: "labelId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await sofiaClient.removeContactLabel(contactId, labelId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida.", code: "VALIDATION_ERROR" }, { status: 400 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro no contato.";
    return NextResponse.json({ error: message, code: "CONTACT_DETAIL_ERROR" }, { status: 500 });
  }
}
