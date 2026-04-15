import { redirect } from "next/navigation";
import { EditorialCalendar } from "@/components/social/editorial-calendar";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { getCompanyTimezone } from "@/lib/social/get-company-timezone";

export default async function CalendarioPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) redirect("/onboarding");

  const companyTimezone = await getCompanyTimezone(companyId);

  return <EditorialCalendar companyId={companyId} companyTimezone={companyTimezone} />;
}
