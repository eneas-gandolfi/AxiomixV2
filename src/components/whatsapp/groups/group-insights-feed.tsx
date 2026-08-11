import type { GroupRadarInsight } from "@/services/group-intelligence/queries";

export function GroupInsightsFeed({ insights }: { insights: GroupRadarInsight[] }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Insights recentes
        </h2>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {insights.length === 0 ? (
          <p className="px-4 py-5 text-sm text-[var(--color-text-secondary)]">
            Ainda nao ha decisoes, pendencias ou respostas recentes registradas.
          </p>
        ) : (
          insights.map((insight) => (
            <article key={insight.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
                <span>{insight.groupName}</span>
                <span>{insight.kind}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text)]">{insight.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
