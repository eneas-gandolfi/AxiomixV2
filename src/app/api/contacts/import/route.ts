/**
 * Arquivo: src/app/api/contacts/import/route.ts
 * Propósito: API de import de contatos via CSV para o Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { parseContactsCsv, importContacts } from "@/services/contacts/import";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const response = NextResponse.next();
  try {
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const access = await resolveCompanyAccess(supabase);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const action = formData.get("action") as string | null;
    const labelName = formData.get("labelName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo CSV não enviado." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Arquivo excede o limite de 5MB." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Apenas arquivos .csv são aceitos." }, { status: 400 });
    }

    const text = await file.text();

    // Preview: parse e retorna primeiras linhas
    if (action === "preview") {
      try {
        const { contacts, headers, totalRows } = parseContactsCsv(text);
        return NextResponse.json({
          headers,
          totalRows,
          preview: contacts.slice(0, 10),
          totalContacts: contacts.length,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro ao parsear CSV";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    // Import: processar contatos
    try {
      const { contacts } = parseContactsCsv(text);

      if (contacts.length === 0) {
        return NextResponse.json({ error: "Nenhum contato válido encontrado no CSV." }, { status: 400 });
      }

      const result = await importContacts(
        access.companyId,
        contacts,
        labelName ? { labelName } : undefined
      );

      return NextResponse.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao importar";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    console.error("[api/contacts/import] Erro:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
