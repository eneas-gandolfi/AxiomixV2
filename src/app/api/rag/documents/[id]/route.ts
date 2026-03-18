/**
 * Arquivo: src/app/api/rag/documents/[id]/route.ts
 * Propósito: Detalhe e exclusão de um documento RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { z } from "zod";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";
import { processJobById } from "@/lib/jobs/processor";

export const dynamic = "force-dynamic";

const RAG_BUCKET = "Axiomix - v2";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "RAG_ERROR" }, { status: 500 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const { id } = paramsSchema.parse(await params);

    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;
    const access = await resolveCompanyAccess(supabase, companyId);
    const adminSupabase = createSupabaseAdminClient();

    const { data: doc, error: docError } = await adminSupabase
      .from("rag_documents")
      .select("*")
      .eq("id", id)
      .eq("company_id", access.companyId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Documento não encontrado.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Buscar contagem de chunks
    const { count } = await adminSupabase
      .from("rag_document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", id);

    return NextResponse.json({
      companyId: access.companyId,
      document: {
        ...doc,
        chunksCount: count ?? 0,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const { id } = paramsSchema.parse(await params);

    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;
    const access = await resolveCompanyAccess(supabase, companyId);
    const adminSupabase = createSupabaseAdminClient();

    // Buscar documento para verificar ownership e obter storage_path
    const { data: doc, error: docError } = await adminSupabase
      .from("rag_documents")
      .select("id, storage_path")
      .eq("id", id)
      .eq("company_id", access.companyId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Documento não encontrado.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Remover chunks (cascade ja cuida, mas ser explicito)
    await adminSupabase
      .from("rag_document_chunks")
      .delete()
      .eq("document_id", id);

    // Remover documento do banco
    await adminSupabase
      .from("rag_documents")
      .delete()
      .eq("id", id);

    // Remover arquivo do Storage
    await adminSupabase.storage.from(RAG_BUCKET).remove([doc.storage_path]);

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const { id } = paramsSchema.parse(await params);

    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;
    const access = await resolveCompanyAccess(supabase, companyId);
    const adminSupabase = createSupabaseAdminClient();

    // Buscar documento e verificar ownership
    const { data: doc, error: docError } = await adminSupabase
      .from("rag_documents")
      .select("id, status")
      .eq("id", id)
      .eq("company_id", access.companyId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Documento não encontrado.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Apenas failed ou pending podem ser reprocessados
    if (doc.status !== "failed" && doc.status !== "pending") {
      return NextResponse.json(
        { error: "Apenas documentos com erro ou pendentes podem ser reprocessados.", code: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    // Deletar chunks antigos para evitar duplicatas
    await adminSupabase
      .from("rag_document_chunks")
      .delete()
      .eq("document_id", id);

    // Resetar documento
    const { data: updated, error: updateError } = await adminSupabase
      .from("rag_documents")
      .update({ status: "pending", total_chunks: null, error_message: null })
      .eq("id", id)
      .select("id, file_name, file_size, status, created_at")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Falha ao resetar documento.", code: "UPDATE_ERROR" },
        { status: 500 }
      );
    }

    // Enfileirar job e disparar processamento
    const job = await enqueueJob("rag_process", { documentId: id }, access.companyId);

    // Processar o job recem-criado evita starvation por backlog antigo da fila.
    after(async () => {
      try {
        const processed = await processJobById(job.id);
        console.log("[RAG] Reprocessamento do documento:", JSON.stringify(processed));
      } catch (err) {
        console.error("[RAG] Falha no reprocessamento:", err);
      }
    });

    return NextResponse.json({
      companyId: access.companyId,
      document: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
