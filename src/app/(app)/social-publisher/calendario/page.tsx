import { redirect } from "next/navigation";
import { EditorialCalendar } from "@/components/social/editorial-calendar";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";

export default async function CalendarioPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) redirect("/onboarding");

  return <EditorialCalendar companyId={companyId} />;
}
