/**
 * Arquivo: src/app/api/auth/company-id/route.ts
 * Propósito: Retornar o company_id do usuário autenticado para componentes client-side.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";

export async function GET() {
  try {
    const companyId = await getUserCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    return NextResponse.json({ companyId });
  } catch {
    return NextResponse.json({ error: "Erro ao obter company_id." }, { status: 500 });
  }
}
