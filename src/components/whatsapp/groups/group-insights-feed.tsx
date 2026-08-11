import type { GroupRadarInsight } from "@/services/group-intelligence/queries";

const INSIGHT_KIND_LABEL: Record<GroupRadarInsight["kind"], string> = {
  fact: "Fato",
  preference: "Preferência",
  decision: "Decisão",
  action_item: "Pendência",
  contact_info: "Contato",
  response: "Resposta IA",
};

export function getInsightKindLabel(kind: GroupRadarInsight["kind"]): string {
  return INSIGHT_KIND_LABEL[kind];
}

function formatShortTime(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GroupInsightsFeed({ insights }: { insights: GroupRadarInsight[] }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] xl:sticky xl:top-4">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Sinais recentes
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
          Extraídos pela IA
        </p>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {insights.length === 0 ? (
          <p className="px-4 py-5 text-sm text-[var(--color-text-secondary)]">
            Sem sinais recentes.
          </p>
        ) : (
          insights.map((insight) => (
            <article key={insight.id} className="px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[var(--color-text-tertiary)]">
                <span className="max-w-[180px] truncate">{insight.groupName}</span>
                <span>{getInsightKindLabel(insight.kind)}</span>
                <span>{formatShortTime(insight.createdAt)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--color-text)]">
                {insight.text}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
