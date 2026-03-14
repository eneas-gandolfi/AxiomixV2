import { redirect } from "next/navigation";
import { HistoryPageClient } from "@/components/social/history-page-client";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { listScheduledPosts } from "@/services/social/publisher";

export default async function HistoricoPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) redirect("/onboarding");

  const initialHistory = await listScheduledPosts({
    companyId,
    page: 1,
    pageSize: 20,
  });

  return <HistoryPageClient companyId={companyId} initialHistory={initialHistory} />;
}
