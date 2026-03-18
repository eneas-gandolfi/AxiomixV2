import { z } from "zod";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { enqueueJob, markStaleJobsFailed } from "@/lib/jobs/queue";
import { processJobs } from "@/lib/jobs/processor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const enqueueSchema = z.object({
  type: z.enum(["weekly_report"]),
  companyId: z.string().uuid("companyId inválido.").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = enqueueSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Erro ao carregar dados. Tente novamente.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Erro ao carregar dados. Tente novamente.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { data: evolutionIntegration, error: integrationError } = await supabase
      .from("integrations")
      .select("id, is_active, test_status")
      .eq("company_id", access.companyId)
      .eq("type", "evolution_api")
      .maybeSingle();

    if (integrationError) {
      return NextResponse.json(
        { error: "Erro ao carregar dados. Tente novamente.", code: "INTEGRATION_STATUS_ERROR" },
        { status: 500 }
      );
    }

    const canSendReport =
      Boolean(evolutionIntegration?.is_active) &&
      evolutionIntegration?.test_status === "ok";

    if (!canSendReport) {
      return NextResponse.json(
        {
          error: "Verifique a integração com a Evolution API.",
          code: "EVOLUTION_NOT_READY",
        },
        { status: 400 }
      );
    }

    // Limpar jobs travados (pending > 10min ou running > 30min)
    await markStaleJobsFailed(access.companyId);

    const { count: queuedJobsCount, error: jobsCountError } = await supabase
      .from("async_jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", access.companyId)
      .eq("job_type", "weekly_report")
      .in("status", ["pending", "running"]);

    if (jobsCountError) {
      return NextResponse.json(
        { error: "Erro ao carregar dados. Tente novamente.", code: "JOBS_COUNT_ERROR" },
        { status: 500 }
      );
    }

    if ((queuedJobsCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Relatório já está em processamento.", code: "JOB_ALREADY_RUNNING" },
        { status: 409 }
      );
    }

    const queued = await enqueueJob(parsed.data.type, {}, access.companyId, undefined, 1);

    // Processar o job imediatamente (nao depender de cron externo)
    const summary = await processJobs({ companyId: access.companyId, maxJobs: 1 });
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    if (summary.processed === 0) {
      // Job criado mas nao processado — forcar falha
      const admin = createSupabaseAdminClient();
      await admin
        .from("async_jobs")
        .update({
          status: "failed",
          error_message: "Job não foi processado.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", queued.id);

      return NextResponse.json(
        {
          error: "Falha ao processar o relatório. Tente novamente.",
          code: "JOB_NOT_PROCESSED",
          jobId: queued.id,
        },
        { status: 500 }
      );
    }

    const processedJob = summary.jobs[0];
    if (processedJob?.status === "failed") {
      return NextResponse.json(
        {
          error: processedJob.error ?? "Falha ao processar o relatório.",
          code: "JOB_EXECUTION_FAILED",
          jobId: queued.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobId: queued.id,
      status: processedJob?.status ?? queued.status,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: "Erro ao carregar dados. Tente novamente." }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Erro ao carregar dados. Tente novamente.", code: "JOBS_ENQUEUE_ERROR" },
      { status: 500 }
    );
  }
}
