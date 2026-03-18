/**
 * Arquivo: src/app/api/intelligence/collect/route.ts
 * Propósito: Enfileirar e disparar coleta de dados do módulo Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { processJobs } from "@/lib/jobs/processor";
import { enqueueJob } from "@/lib/jobs/queue";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const collectSchema = z
  .object({
    companyId: z.string().uuid("companyId inválido.").optional(),
    sourceType: z.enum(["competitor", "radar", "all"]).default("all"),
    competitorId: z.string().uuid("competitorId inválido.").optional(),
    processNow: z.boolean().optional().default(true),
    maxJobs: z.number().int().min(1).max(5).optional(),
  })
  .superRefine((value, context) => {
    if (value.sourceType === "radar" && value.competitorId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "competitorId não pode ser usado quando sourceType = radar.",
        path: ["competitorId"],
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = collectSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    if (parsed.data.competitorId && parsed.data.sourceType !== "radar") {
      const { data: competitor, error: competitorError } = await supabase
        .from("competitor_profiles")
        .select("id")
        .eq("id", parsed.data.competitorId)
        .eq("company_id", access.companyId)
        .maybeSingle();

      if (competitorError) {
        return NextResponse.json(
          { error: "Falha ao validar concorrente.", code: "COMPETITOR_VALIDATE_ERROR" },
          { status: 500 }
        );
      }

      if (!competitor?.id) {
        return NextResponse.json(
          { error: "Concorrente não encontrado para esta empresa.", code: "COMPETITOR_NOT_FOUND" },
          { status: 404 }
        );
      }
    }

    const queuedJobs: Array<{
      id: string;
      type: string;
      scheduledFor: string | null;
    }> = [];

    if (parsed.data.sourceType === "all" || parsed.data.sourceType === "competitor") {
      const queued = await enqueueJob(
        "competitor_scrape",
        {
          competitorId: parsed.data.competitorId,
        },
        access.companyId
      );
      queuedJobs.push({
        id: queued.id,
        type: queued.jobType,
        scheduledFor: queued.scheduledFor,
      });
    }

    if (parsed.data.sourceType === "all" || parsed.data.sourceType === "radar") {
      const queued = await enqueueJob("radar_collect", {}, access.companyId);
      queuedJobs.push({
        id: queued.id,
        type: queued.jobType,
        scheduledFor: queued.scheduledFor,
      });
    }

    const shouldProcessNow = parsed.data.processNow ?? true;
    const processingSummary = shouldProcessNow
      ? await processJobs({
          companyId: access.companyId,
          maxJobs: parsed.data.maxJobs ?? Math.max(queuedJobs.length, 1),
        })
      : null;

    return NextResponse.json({
      companyId: access.companyId,
      queued: queuedJobs,
      processed: processingSummary,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTELLIGENCE_COLLECT_ERROR" }, { status: 500 });
  }
}
