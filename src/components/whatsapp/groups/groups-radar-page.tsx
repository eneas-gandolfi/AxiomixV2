import { getGroupRadarData } from "@/services/group-intelligence/queries";
import { GroupInsightsFeed } from "./group-insights-feed";
import { GroupStatusGrid } from "./group-status-grid";

export async function GroupsRadarPage({ companyId }: { companyId: string }) {
  const data = await getGroupRadarData(companyId);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Grupos" value={data.summary.totalGroups} />
        <Metric label="Mensagens 24h" value={data.summary.messages24h} />
        <Metric label="Grupos quentes" value={data.summary.hotGroups} />
        <Metric label="Em risco" value={data.summary.riskGroups} />
      </section>
      <GroupStatusGrid groups={data.groups} />
      <GroupInsightsFeed insights={data.insights} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-[var(--color-text)]">
        {value}
      </p>
    </div>
  );
}
