/**
 * Arquivo: src/app/api/whatsapp/kanban/boards/route.ts
 * Propósito: Listar pipelines/boards do Kanban via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

const boardsSchema = z.object({
  companyId: z.string().uuid("companyId invalido."),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = boardsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const sofiaClient = await getSofiaCrmClient(access.companyId);
    const boards = await sofiaClient.listBoards();

    return NextResponse.json({ boards });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao listar boards.";
    return NextResponse.json({ error: message, code: "BOARDS_ERROR" }, { status: 500 });
  }
}
