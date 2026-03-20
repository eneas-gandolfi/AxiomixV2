/**
 * Arquivo: src/app/api/report/pdf/route.ts
 * Propósito: Gerar signed URL temporária para download do PDF do relatório semanal.
 * Autor: AXIOMIX
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Signed URL válida por 5 minutos
const SIGNED_URL_EXPIRY_SECONDS = 300;

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

    // Verificar autenticação do usuário
    const response = NextResponse.next();
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Não autenticado.", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    // O storagePath vem no formato "reports/{companyId}/weekly-{start}-{end}.pdf"
    // Precisamos separar o bucket do caminho dentro do bucket
    const BUCKET = "reports";
    const bucketPrefix = `${BUCKET}/`;
    const pathInBucket = storagePath.startsWith(bucketPrefix)
      ? storagePath.slice(bucketPrefix.length)
      : storagePath;

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
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "PDF_ROUTE_ERROR" }, { status: 500 });
  }
}
