import type { GroupRadarItem } from "@/services/group-intelligence/queries";

const STATUS_LABEL: Record<GroupRadarItem["status"], string> = {
  inactive: "Radar silencioso",
  quiet: "Pouco movimento",
  active: "Ativo",
  hot: "Quente",
  risk: "Risco",
};

export function GroupStatusGrid({ groups }: { groups: GroupRadarItem[] }) {
  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Nenhum grupo monitorado
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Assim que o webhook receber mensagens de grupos, eles aparecem neste radar.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <article
          key={group.configId}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--color-text)]">
                {group.name}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {STATUS_LABEL[group.status]}
              </p>
            </div>
            <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)]">
              {group.agentMode === "radar_only" ? "Radar" : "Agente"}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-[var(--color-text-tertiary)]">24h</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-text)]">
                {group.messageCount24h}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-tertiary)]">Pessoas</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-text)]">
                {group.uniqueSenders24h}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-tertiary)]">IA</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-text)]">
                {group.agentResponses24h}
              </dd>
            </div>
          </dl>

          {group.lastMessagePreview ? (
            <p className="mt-3 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
              {group.lastMessagePreview}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
