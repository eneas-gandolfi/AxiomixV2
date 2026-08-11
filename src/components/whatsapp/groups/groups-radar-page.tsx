import Link from "next/link";
import { getGroupRadarData } from "@/services/group-intelligence/queries";
import { GroupInsightsFeed } from "./group-insights-feed";
import { GroupPriorityList, GroupStatusGrid } from "./group-status-grid";

export async function GroupsRadarPage({ companyId }: { companyId: string }) {
  const data = await getGroupRadarData(companyId);
  const attentionGroups = data.summary.riskGroups + data.summary.hotGroups;

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-[var(--color-text)] sm:text-3xl">
            Grupos
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {attentionGroups === 0
              ? "Nenhum grupo precisa de atenção agora."
              : `${attentionGroups} grupo${attentionGroups === 1 ? "" : "s"} precisa${attentionGroups === 1 ? "" : "m"} de atenção agora.`}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link
            href="/whatsapp-intelligence/agentes"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-semibold text-[var(--color-text)] sm:flex-none"
          >
            Agentes
          </Link>
          <Link
            href="/settings?tab=group-agent"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--module-accent)] px-3 text-sm font-semibold text-white sm:flex-none"
          >
            Configurar
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <Metric
          label="Atenção"
          value={attentionGroups}
          hint={`${data.summary.riskGroups} risco · ${data.summary.hotGroups} quente`}
          tone={attentionGroups > 0 ? "warning" : "default"}
        />
        <Metric label="Mensagens" value={data.summary.messages24h} hint="24h" />
        <Metric
          label="Ativos"
          value={data.summary.activeGroups}
          hint={`${data.summary.totalGroups} monitorados`}
        />
        <Metric label="IA" value={data.summary.agentResponses24h} hint="respostas em 24h" />
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <GroupPriorityList groups={data.groups} />
          <GroupStatusGrid groups={data.groups} />
        </div>
        <GroupInsightsFeed insights={data.insights} />
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`min-h-[84px] rounded-lg border p-3 sm:min-h-[88px] sm:p-4 ${
        tone === "warning"
          ? "border-[var(--color-danger)]/35 bg-[var(--color-danger-bg)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold text-[var(--color-text)] sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-[var(--color-text-tertiary)]">{hint}</p>
    </div>
  );
}
