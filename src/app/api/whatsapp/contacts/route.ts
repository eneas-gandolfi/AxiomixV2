/**
 * Arquivo: src/app/api/whatsapp/contacts/route.ts
 * Propósito: Listar e criar contatos via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getEvoCrmClient } from "@/services/evo-crm/client";

export const dynamic = "force-dynamic";

const contactsSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  action: z.enum(["list", "create"]).optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  search: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = contactsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const evoClient = await getEvoCrmClient(access.companyId);

    if (parsed.data.action === "create") {
      const { name, phone } = parsed.data;
      if (!name || !phone) {
        return NextResponse.json({ error: "name e phone são obrigatórios.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      const contact = await evoClient.createContact({ name, phone });
      return NextResponse.json({ contact });
    }

    // Default: listar contatos
    const contacts = await evoClient.listContacts({
      search: parsed.data.search,
      page: parsed.data.page ?? 1,
      limit: parsed.data.limit ?? 50,
      include_labels: true,
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao buscar contatos.";
    return NextResponse.json({ error: message, code: "CONTACTS_ERROR" }, { status: 500 });
  }
}
