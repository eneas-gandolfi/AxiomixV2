import Link from "next/link";
import type {
  GroupRadarData,
  GroupRadarInsight,
  GroupRadarItem,
  GroupRadarStatus,
} from "@/services/group-intelligence/queries";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<GroupRadarStatus, string> = {
  inactive: "Inativo",
  quiet: "Radar",
  active: "OK",
  hot: "Quente",
  risk: "Risco",
};

const INSIGHT_KIND_LABEL: Record<GroupRadarInsight["kind"], string> = {
  action_item: "Pendência",
  contact_info: "Contato",
  decision: "Oportunidade",
  fact: "Fato",
  preference: "Preferência",
  response: "Resposta IA",
};

function getStatusLabel(status: GroupRadarStatus): string {
  return STATUS_LABEL[status];
}

function getStatusTone(status: GroupRadarStatus): string {
  if (status === "risk") return "text-[var(--color-danger)]";
  if (status === "hot") return "text-[var(--color-warning)]";
  if (status === "active") return "text-[var(--color-success)]";
  return "text-[var(--color-text)]";
}

function getPriorityAction(group: GroupRadarItem): string {
  if (group.status === "risk") return "Ação: responder e acionar responsável.";
  if (group.status === "hot") return "Ação: enviar oferta e próximo horário.";
  if (group.lastMessagePreview) return group.lastMessagePreview;
  return "Grupo ativo, sem bloqueio comercial.";
}

function formatInsightTime(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRiskSummary(data: GroupRadarData) {
  if (data.summary.riskGroups > 0) {
    return {
      label: "Revisar agora.",
      hint: `${data.summary.riskGroups} grupo${data.summary.riskGroups === 1 ? "" : "s"} em risco.`,
      tone: "red" as const,
    };
  }

  return {
    label: "Tudo respondido.",
    hint: "Nenhum cliente esperando agora.",
    tone: "green" as const,
  };
}

function getOpportunitySummary(data: GroupRadarData) {
  if (data.summary.hotGroups > 0) {
    return {
      label: `${data.summary.hotGroups} oportunidade${data.summary.hotGroups === 1 ? "" : "s"} ativa${data.summary.hotGroups === 1 ? "" : "s"}`,
      hint: "Grupos quentes para ação comercial.",
    };
  }

  return {
    label: "0 oportunidades ativas",
    hint: "A IA avisa quando detectar intenção de compra.",
  };
}

function RadarGroupCard({ group }: { group: GroupRadarItem }) {
  return (
    <article className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-[var(--color-surface)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] sm:items-center">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
          {group.name}
        </h3>
        <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
          {getPriorityAction(group)}
        </p>
      </div>

      <dl className="grid min-w-0 grid-cols-3 gap-2">
        <MetricPill value={group.messageCount24h} label="msg" />
        <MetricPill value={group.uniqueSenders24h} label="pessoas" />
        <MetricPill
          value={getStatusLabel(group.status)}
          label="status"
          className={getStatusTone(group.status)}
        />
      </dl>
    </article>
  );
}

function MetricPill({
  value,
  label,
  className,
}: {
  value: number | string;
  label: string;
  className?: string;
}) {
  return (
    <div className="grid min-h-[58px] min-w-0 content-center justify-items-center rounded-xl bg-card px-2 py-2 text-center">
      <dt className="sr-only">{label}</dt>
      <dd
        className={cn(
          "max-w-full truncate font-mono text-sm font-semibold leading-tight text-[var(--color-text)]",
          className,
        )}
      >
        {value}
      </dd>
      <span className="mt-0.5 max-w-full truncate text-[11px] leading-tight text-[var(--color-text-tertiary)]">
        {label}
      </span>
    </div>
  );
}

function SignalsPanel({ insights }: { insights: GroupRadarInsight[] }) {
  const visibleInsights = insights.slice(0, 3);

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Sinais da IA</h2>
        <span className="rounded-full bg-success-light px-3 py-1 text-xs font-semibold text-success">
          24h
        </span>
      </div>

      {visibleInsights.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="text-sm font-medium text-[var(--color-text)]">Aguardando padrões</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Os sinais aparecem conforme a IA analisa os grupos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <article
              key={insight.id}
              className="border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-semibold text-[var(--color-text-tertiary)]">
                <span>{insight.groupName}</span>
                <span>{INSIGHT_KIND_LABEL[insight.kind]}</span>
                <span>{formatInsightTime(insight.createdAt)}</span>
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text)]">
                {insight.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}

function StatusPanel({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="truncate text-sm font-semibold text-[var(--color-text)]">{title}</h2>
        <span className="shrink-0 rounded-full bg-success-light px-3 py-1 text-xs font-semibold text-success">
          {badge}
        </span>
      </div>
      {children}
    </article>
  );
}

function CompactStatus({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-[var(--color-surface)] p-3">
      <p className="truncate text-sm font-semibold text-[var(--color-text)]">{label}</p>
      <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{hint}</p>
    </div>
  );
}

export function DashboardGroupCommandCenterView({ data }: { data: GroupRadarData }) {
  const radarGroups = data.groups.slice(0, 3);
  const risk = getRiskSummary(data);
  const opportunity = getOpportunitySummary(data);
  const hasGroups = data.summary.totalGroups > 0;

  return (
    <section className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
        <article
          className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5"
          aria-label="Radar de grupos WhatsApp"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Radar de grupos WhatsApp
            </h2>
            <span className="rounded-full bg-success-light px-3 py-1 text-xs font-semibold text-success">
              Central do produto
            </span>
          </div>

          {radarGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Nenhum grupo monitorado
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Configure grupos para ativar o radar do WhatsApp.
              </p>
              <Link
                href="/settings?tab=group-agent"
                className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-white"
              >
                Configurar grupos
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {radarGroups.map((group) => (
                <RadarGroupCard key={group.configId} group={group} />
              ))}
            </div>
          )}
        </article>

        <SignalsPanel insights={data.insights} />
      </div>

      <section
        className="grid grid-cols-1 gap-3 md:grid-cols-3"
        aria-label="Estado operacional"
      >
        <StatusPanel title="Controle de risco" badge={risk.tone === "green" ? "OK" : "ação"}>
          <CompactStatus label={risk.label} hint={risk.hint} />
        </StatusPanel>

        <StatusPanel title="Oportunidades" badge="vendas">
          <CompactStatus label={opportunity.label} hint={opportunity.hint} />
        </StatusPanel>

        <StatusPanel title="Saúde da operação" badge={hasGroups ? "estável" : "configurar"}>
          <div className="grid grid-cols-3 gap-2">
            <CompactStatus label={hasGroups ? "OK" : "Ação"} hint={hasGroups ? "radar" : "grupos"} />
            <CompactStatus label="OK" hint="base da IA" />
            <CompactStatus label={String(data.summary.totalGroups)} hint="grupos" />
          </div>
        </StatusPanel>
      </section>
    </section>
  );
}
