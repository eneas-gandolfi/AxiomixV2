/**
 * Arquivo: src/app/(app)/social-publisher/biblioteca/page.tsx
 * Propósito: Pagina da Biblioteca de Midia dentro do Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { redirect } from "next/navigation";
import { MediaLibrary } from "@/components/social/media-library";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { listMediaFiles } from "@/services/social/media-library";

export default async function BibliotecaPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const initialData = await listMediaFiles({
    companyId,
    page: 1,
    pageSize: 24,
  });

  return <MediaLibrary companyId={companyId} initialData={initialData} />;
}
