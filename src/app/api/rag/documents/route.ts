/**
 * Arquivo: src/app/api/rag/documents/route.ts
 * Propósito: Listar e fazer upload de documentos RAG (PDF).
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { z } from "zod";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob, recoverStaleJobs } from "@/lib/jobs/queue";
import { processJobById, processJobs } from "@/lib/jobs/processor";
import type { Database } from "@/database/types/database.types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RAG_BUCKET = "Axiomix - v2";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const querySchema = z.object({
  companyId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "RAG_ERROR" }, { status: 500 });
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);

    const parsed = querySchema.safeParse({
      companyId: request.nextUrl.searchParams.get("companyId") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? 1,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? 20,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Query inválida.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const adminSupabase = createSupabaseAdminClient();

    const { page, pageSize } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: documents, error: listError, count } = await adminSupabase
      .from("rag_documents")
      .select("id, file_name, file_size, file_type, status, total_chunks, error_message, created_at, scope, source_key", {
        count: "exact",
      })
      .or(`scope.eq.global,company_id.eq.${access.companyId}`)
      .order("scope", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (listError) {
      throw new Error(`Falha ao listar documentos: ${listError.message}`);
    }

    // Recuperar documentos/jobs presos e disparar processamento em background
    after(async () => {
      try {
        // Recuperar documentos presos em "processing" por mais de 5 minutos
        const STALE_MINUTES = 5;
        const staleThreshold = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();

        const { data: resetDocs } = await adminSupabase
          .from("rag_documents")
          .update({
            status: "pending" as const,
            error_message: "Processamento interrompido. Tentando novamente.",
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", access.companyId)
          .eq("status", "processing")
          .lt("updated_at", staleThreshold)
          .select("id");

        if (resetDocs && resetDocs.length > 0) {
          console.log(`[RAG] ${resetDocs.length} documento(s) preso(s) resetado(s) para pending.`);
        }

        // Recuperar jobs presos
        const recoveredJobs = await recoverStaleJobs(access.companyId);
        if (recoveredJobs > 0) {
          console.log(`[RAG] ${recoveredJobs} job(s) preso(s) resetado(s) para pending.`);
        }

        // Disparar processamento se houve recovery
        if ((resetDocs && resetDocs.length > 0) || recoveredJobs > 0) {
          const summary = await processJobs({
            companyId: access.companyId,
            maxJobs: 1,
            allowedTypes: ["rag_process"],
          });
          console.log("[RAG] Processamento após recovery:", JSON.stringify(summary));
        }
      } catch (err) {
        console.error("[RAG] Falha no processamento após recovery:", err);
      }
    });

    return NextResponse.json({
      companyId: access.companyId,
      items: documents ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const formData = await request.formData();

    const rawCompanyId = formData.get("companyId");
    const companyId = typeof rawCompanyId === "string" ? rawCompanyId : undefined;

    const access = await resolveCompanyAccess(supabase, companyId);

    // Validar arquivo
    const rawFile = formData.get("file");
    if (!(rawFile instanceof File) || rawFile.size === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo PDF enviado.", code: "FILE_REQUIRED" },
        { status: 400 }
      );
    }

    if (rawFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Apenas arquivos PDF são aceitos.", code: "INVALID_FILE_TYPE" },
        { status: 400 }
      );
    }

    if (rawFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo excede o limite de 20 MB.", code: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    const adminSupabase = createSupabaseAdminClient();

    // 1. Upload ao Supabase Storage
    const timestampPrefix = new Date().toISOString().slice(0, 10);
    const safeName = sanitizeFileName(rawFile.name);
    const storagePath = `${access.companyId}/rag/${timestampPrefix}/${crypto.randomUUID()}-${safeName}`;
    const uploadBuffer = Buffer.from(await rawFile.arrayBuffer());

    const { error: uploadError } = await adminSupabase.storage
      .from(RAG_BUCKET)
      .upload(storagePath, uploadBuffer, { contentType: "application/pdf", upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: "Falha ao enviar arquivo para o Storage.", code: "UPLOAD_ERROR" },
        { status: 500 }
      );
    }

    // 2. Inserir registro no banco
    const insertRow: Database["public"]["Tables"]["rag_documents"]["Insert"] = {
      company_id: access.companyId,
      file_name: rawFile.name,
      file_size: rawFile.size,
      file_type: "application/pdf",
      storage_path: storagePath,
      status: "pending",
    };

    const { data: doc, error: insertError } = await adminSupabase
      .from("rag_documents")
      .insert(insertRow)
      .select("id, file_name, file_size, status, created_at")
      .single();

    if (insertError || !doc) {
      return NextResponse.json(
        { error: "Falha ao registrar documento.", code: "INSERT_ERROR" },
        { status: 500 }
      );
    }

    // 3. Enfileirar job (tracking/retry) e disparar processamento
    const job = await enqueueJob("rag_process", { documentId: doc.id }, access.companyId);

    // Processar o job recem-criado evita starvation por backlog antigo da fila.
    after(async () => {
      try {
        const processed = await processJobById(job.id);
        console.log("[RAG] Processamento do upload:", JSON.stringify(processed));
      } catch (err) {
        console.error("[RAG] Falha no processamento:", err);
      }
    });

    return NextResponse.json({
      companyId: access.companyId,
      document: doc,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
