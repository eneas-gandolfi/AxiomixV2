import Link from "next/link";
import { Settings } from "lucide-react";
import type { GroupRadarItem } from "@/services/group-intelligence/queries";

const STATUS_LABEL: Record<GroupRadarItem["status"], string> = {
  inactive: "Inativo",
  quiet: "Pouco movimento",
  active: "Ativo",
  hot: "Quente",
  risk: "Risco",
};

const AGENT_MODE_LABEL: Record<GroupRadarItem["agentMode"], string> = {
  radar_only: "Radar",
  trigger_only: "Trigger",
  proactive: "Proativo",
};

export function getAgentModeLabel(mode: GroupRadarItem["agentMode"]): string {
  return AGENT_MODE_LABEL[mode];
}

function getStatusLabel(status: GroupRadarItem["status"]): string {
  return STATUS_LABEL[status];
}

function getStatusBadgeClass(status: GroupRadarItem["status"]): string {
  switch (status) {
    case "risk":
      return "border-[var(--color-danger)]/45 bg-[var(--color-danger-bg)] text-[var(--color-danger)]";
    case "hot":
      return "border-amber-500/45 bg-amber-500/10 text-amber-300";
    case "active":
      return "border-[var(--color-success)]/40 bg-[var(--color-success-bg)] text-[var(--color-success)]";
    case "quiet":
      return "border-sky-500/35 bg-sky-500/10 text-sky-300";
    case "inactive":
      return "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]";
  }
}

function getAgentBadgeClass(mode: GroupRadarItem["agentMode"]): string {
  if (mode === "proactive") {
    return "border-[var(--color-success)]/40 bg-[var(--color-success-bg)] text-[var(--color-success)]";
  }
  if (mode === "trigger_only") {
    return "border-sky-500/35 bg-sky-500/10 text-sky-300";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]";
}

function getPriorityAction(group: GroupRadarItem): string {
  if (group.status === "risk") return "Ação: responder e acionar responsável.";
  if (group.status === "hot") return "Ação: acompanhar e enviar próximo passo.";
  return group.lastMessagePreview ?? "Sem ação necessária.";
}

function formatLastActivity(value: string | null): string {
  if (!value) return "sem atividade";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GroupPriorityList({ groups }: { groups: GroupRadarItem[] }) {
  const priorityGroups = groups
    .filter((group) => group.status === "risk" || group.status === "hot")
    .slice(0, 3);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Atenção agora</h2>
        <span className="text-xs text-[var(--color-text-tertiary)]">Prioridade</span>
      </div>

      {priorityGroups.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--color-text)]">Sem urgências agora</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Os grupos estão em observação.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {priorityGroups.map((group) => (
            <article
              key={group.configId}
              className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 flex-1 basis-full truncate text-sm font-semibold text-[var(--color-text)] sm:basis-auto">
                    {group.name}
                  </h3>
                  <StatusBadge status={group.status} />
                  <AgentBadge mode={group.agentMode} />
                </div>
                <p className="mt-2 truncate text-sm text-[var(--color-text-secondary)]">
                  {getPriorityAction(group)}
                </p>
                <GroupNumbers group={group} compact />
              </div>
              <Link
                href="/settings?tab=group-agent"
                aria-label={`Configurar ${group.name}`}
                title="Configurar grupo"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)] sm:justify-self-end"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function GroupStatusGrid({ groups }: { groups: GroupRadarItem[] }) {
  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Nenhum grupo monitorado
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Configure grupos para ativar o radar.
        </p>
        <Link
          href="/settings?tab=group-agent"
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--module-accent)] px-3 text-sm font-semibold text-white"
        >
          Configurar
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Todos os grupos</h2>
        <span className="text-xs text-[var(--color-text-tertiary)]">Visão rápida</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <article
            key={group.configId}
            className="min-h-[132px] min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-[var(--color-text)]">
                  {group.name}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {getStatusLabel(group.status)}
                </p>
              </div>
              <StatusBadge status={group.status} />
            </div>

            <GroupNumbers group={group} />

            {group.lastMessagePreview ? (
              <p className="mt-3 truncate text-xs text-[var(--color-text-secondary)]">
                {group.lastMessagePreview}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: GroupRadarItem["status"] }) {
  return (
    <span
      className={`inline-flex h-6 max-w-[112px] shrink-0 items-center truncate rounded-full border px-2.5 text-[11px] font-semibold ${getStatusBadgeClass(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function AgentBadge({ mode }: { mode: GroupRadarItem["agentMode"] }) {
  return (
    <span
      className={`inline-flex h-6 max-w-[112px] shrink-0 items-center truncate rounded-full border px-2.5 text-[11px] font-semibold ${getAgentBadgeClass(mode)}`}
    >
      {getAgentModeLabel(mode)}
    </span>
  );
}

function GroupNumbers({ group, compact = false }: { group: GroupRadarItem; compact?: boolean }) {
  if (compact) {
    return (
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
        <span>
          <strong className="font-mono text-[var(--color-text)]">{group.messageCount24h}</strong>{" "}
          mensagens
        </span>
        <span>
          <strong className="font-mono text-[var(--color-text)]">{group.uniqueSenders24h}</strong>{" "}
          pessoas
        </span>
        <span>
          <strong className="font-mono text-[var(--color-text)]">{group.agentResponses24h}</strong>{" "}
          IA
        </span>
        <span>{formatLastActivity(group.lastMessageAt)}</span>
      </p>
    );
  }

  return (
    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
      <div className="min-w-0">
        <dt className="truncate text-[var(--color-text-tertiary)]">24h</dt>
        <dd className="mt-1 font-mono text-sm font-semibold text-[var(--color-text)]">
          {group.messageCount24h}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="truncate text-[var(--color-text-tertiary)]">Pessoas</dt>
        <dd className="mt-1 font-mono text-sm font-semibold text-[var(--color-text)]">
          {group.uniqueSenders24h}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="truncate text-[var(--color-text-tertiary)]">IA</dt>
        <dd className="mt-1 font-mono text-sm font-semibold text-[var(--color-text)]">
          {group.agentResponses24h}
        </dd>
      </div>
    </dl>
  );
}
