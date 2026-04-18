/**
 * Arquivo: src/app/api/whatsapp/kanban/boards/route.ts
 * Propósito: Listar pipelines/boards do Kanban via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getEvoCrmClient } from "@/services/evo-crm/client";

export const dynamic = "force-dynamic";

const boardsSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = boardsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const evoClient = await getEvoCrmClient(access.companyId);
    const boards = await evoClient.listBoards();

    return NextResponse.json({ boards });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao listar boards.";
    return NextResponse.json({ error: message, code: "BOARDS_ERROR" }, { status: 500 });
  }
}
