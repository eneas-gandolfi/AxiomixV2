import "server-only";

import { DashboardGroupCommandCenterView } from "@/components/dashboard/group-command-center-view";
import { getGroupRadarData } from "@/services/group-intelligence/queries";

export async function DashboardGroupCommandCenterSection({
  companyId,
}: {
  companyId: string;
}) {
  const data = await getGroupRadarData(companyId);

  return <DashboardGroupCommandCenterView data={data} />;
}
