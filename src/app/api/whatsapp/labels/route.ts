/**
 * Arquivo: src/app/api/whatsapp/labels/route.ts
 * Propósito: CRUD de labels/tags via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

const labelsSchema = z.object({
  companyId: z.string().uuid("companyId invalido."),
  action: z.enum(["list", "create", "update", "delete"]),
  name: z.string().optional(),
  color: z.string().optional(),
  labelId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = labelsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const sofiaClient = await getSofiaCrmClient(access.companyId);

    if (parsed.data.action === "list") {
      const labels = await sofiaClient.listLabels();
      return NextResponse.json({ labels });
    }

    if (parsed.data.action === "create") {
      const { name } = parsed.data;
      if (!name) {
        return NextResponse.json({ error: "name é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      const label = await sofiaClient.createLabel(name);
      return NextResponse.json({ label });
    }

    if (parsed.data.action === "update") {
      const { labelId, name, color } = parsed.data;
      if (!labelId) {
        return NextResponse.json({ error: "labelId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await sofiaClient.updateLabel(labelId, { name, color });
      return NextResponse.json({ success: true });
    }

    if (parsed.data.action === "delete") {
      const { labelId } = parsed.data;
      if (!labelId) {
        return NextResponse.json({ error: "labelId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      await sofiaClient.deleteLabel(labelId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action inválida.", code: "VALIDATION_ERROR" }, { status: 400 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao gerenciar labels.";
    return NextResponse.json({ error: message, code: "LABELS_ERROR" }, { status: 500 });
  }
}
