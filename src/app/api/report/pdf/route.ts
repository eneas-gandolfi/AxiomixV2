/**
 * Arquivo: src/app/api/report/pdf/route.ts
 * Propósito: Gerar signed URL temporária para download do PDF do relatório semanal.
 * Autor: AXIOMIX
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

export const dynamic = "force-dynamic";

// Signed URL válida por 5 minutos
const SIGNED_URL_EXPIRY_SECONDS = 300;

/**
 * Extrai o company_id do path do storage.
 * Formato esperado: "{companyId}/weekly-{start}-{end}.pdf"
 */
function extractCompanyIdFromPath(pathInBucket: string): string | null {
  const segments = pathInBucket.split("/");
  if (segments.length < 2) return null;
  const candidate = segments[0];
  // UUID v4 pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)) {
    return candidate;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get("path");

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json(
        { error: "Parâmetro 'path' ausente ou inválido.", code: "MISSING_PATH" },
        { status: 400 }
      );
    }

    // Verificar autenticação e acesso à empresa
    const response = NextResponse.next();
    const supabase = createSupabaseRouteHandlerClient(request, response);

    // O storagePath vem no formato "reports/{companyId}/weekly-{start}-{end}.pdf"
    const BUCKET = "reports";
    const bucketPrefix = `${BUCKET}/`;
    const pathInBucket = storagePath.startsWith(bucketPrefix)
      ? storagePath.slice(bucketPrefix.length)
      : storagePath;

    // Extrair e validar company_id do path
    const pathCompanyId = extractCompanyIdFromPath(pathInBucket);
    if (!pathCompanyId) {
      return NextResponse.json(
        { error: "Caminho do arquivo inválido.", code: "INVALID_PATH" },
        { status: 400 }
      );
    }

    // Verificar que o usuário pertence à empresa do relatório
    await resolveCompanyAccess(supabase, pathCompanyId);

    // Gerar signed URL via admin client (sem restrição de RLS)
    const adminSupabase = createSupabaseAdminClient();
    const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
      .from(BUCKET)
      .createSignedUrl(pathInBucket, SIGNED_URL_EXPIRY_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        {
          error: "Não foi possível gerar o link de download. O PDF pode não estar disponível.",
          code: "SIGNED_URL_ERROR",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "PDF_ROUTE_ERROR" }, { status: 500 });
  }
}
