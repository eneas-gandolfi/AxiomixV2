import Link from "next/link";
import type { GroupActivityBucket, GroupRadarData } from "@/services/group-intelligence/queries";
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

      <section className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <GroupActivityPanel buckets={data.activityBuckets24h} />
          <GroupPriorityList groups={data.groups} />
          <GroupStatusGrid groups={data.groups} />
        </div>
        <aside className="space-y-4">
          <GroupDistributionPanel data={data} />
          <GroupInsightsFeed insights={data.insights} />
        </aside>
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

function GroupActivityPanel({ buckets }: { buckets: GroupActivityBucket[] }) {
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Atividade nas últimas 24h
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
            Picos de mensagens sem abrir todos os grupos.
          </p>
        </div>
        <span className="inline-flex h-7 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-xs font-semibold text-[var(--color-text-secondary)]">
          24h
        </span>
      </div>
      <div className="grid h-[150px] grid-cols-8 items-end gap-2 px-4 pb-3 pt-5">
        {buckets.map((bucket) => {
          const height = bucket.count === 0 ? 8 : Math.max(18, Math.round((bucket.count / maxCount) * 96));
          const isPeak = bucket.count === maxCount && bucket.count > 0;

          return (
            <div key={bucket.label} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
              <div
                className={`w-full max-w-8 rounded-t-lg rounded-b-sm ${
                  isPeak ? "bg-[var(--module-accent)]" : "bg-teal-500/75"
                }`}
                style={{ height }}
                title={`${bucket.count} mensagem${bucket.count === 1 ? "" : "s"}`}
              />
              <span className="truncate text-[10px] text-[var(--color-text-tertiary)]">
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GroupDistributionPanel({ data }: { data: GroupRadarData }) {
  const total = Math.max(data.summary.totalGroups, 1);
  const inactiveGroups = data.summary.totalGroups - data.summary.activeGroups;
  const activeOnlyGroups = data.summary.activeGroups - data.summary.hotGroups - data.summary.riskGroups;
  const rows = [
    { label: "Risco", value: data.summary.riskGroups, tone: "bg-[var(--color-danger)]" },
    { label: "Quentes", value: data.summary.hotGroups, tone: "bg-[var(--module-accent)]" },
    { label: "Ativos", value: Math.max(activeOnlyGroups, 0), tone: "bg-[var(--color-success)]" },
    { label: "Inativos", value: Math.max(inactiveGroups, 0), tone: "bg-slate-400" },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Distribuição dos grupos
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
          Status geral sem abrir a lista completa.
        </p>
      </div>
      <div className="space-y-3 p-4">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-2">
            <span className="truncate text-xs text-[var(--color-text-secondary)]">{row.label}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className={`h-full rounded-full ${row.tone}`}
                style={{ width: row.value === 0 ? 0 : `${Math.max(4, (row.value / total) * 100)}%` }}
              />
            </div>
            <strong className="text-right font-mono text-xs text-[var(--color-text)]">
              {row.value}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
