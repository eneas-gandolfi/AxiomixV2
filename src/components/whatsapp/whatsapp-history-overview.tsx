import { Bot, MessageSquare, TrendingUp, Users2 } from "lucide-react";

type WhatsAppHistoryOverviewProps = {
  windowDays: number;
  groups: {
    total: number;
    active: number;
    messages: number;
    aiSignals: number;
  };
  conversations: {
    total: number;
    withoutReturn: number;
    opportunities: number;
  };
  ai: {
    responses: number;
    blocked: number;
    insights: number;
  };
};

const formatNumber = new Intl.NumberFormat("pt-BR");

export function WhatsAppHistoryOverview({
  windowDays,
  groups,
  conversations,
  ai,
}: WhatsAppHistoryOverviewProps) {
  const activityTotal = groups.messages + conversations.total + ai.insights;
  const groupShare = percentOf(groups.messages, activityTotal);
  const conversationShare = percentOf(conversations.total, activityTotal);
  const aiShare = percentOf(ai.insights, activityTotal);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div>
          <h2 className="font-bricolage text-xl font-bold text-text">
            Histórico de Inteligência WhatsApp
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Leitura dos últimos {windowDays} dias, separando grupos monitorados,
            conversas individuais e respostas da IA.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
          {windowDays}d
        </span>
      </header>

      <div className="grid gap-0 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <HistoryDomainCard
          icon={Users2}
          title="Grupos monitorados"
          primaryValue={groups.total}
          primaryLabel="grupos"
          items={[
            ["Ativos", groups.active],
            ["Mensagens", groups.messages],
            ["Sinais IA", groups.aiSignals],
          ]}
          barValue={groupShare}
          barTone="success"
        />
        <HistoryDomainCard
          icon={MessageSquare}
          title="Conversas individuais"
          primaryValue={conversations.total}
          primaryLabel="conversas"
          items={[
            ["Sem retorno", conversations.withoutReturn],
            ["Oportunidades", conversations.opportunities],
            ["Janela", `${windowDays}d`],
          ]}
          barValue={conversationShare}
          barTone="warning"
        />
        <HistoryDomainCard
          icon={Bot}
          title="IA em ação"
          primaryValue={ai.responses}
          primaryLabel="respostas"
          items={[
            ["Insights", ai.insights],
            ["Bloqueios", ai.blocked],
            ["Cobertura", `${aiShare}%`],
          ]}
          barValue={aiShare}
          barTone="primary"
        />
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted">
            Use este histórico para decidir se o gargalo está nos grupos, nas
            conversas individuais ou no custo/resposta da IA.
          </p>
        </div>
      </div>
    </section>
  );
}

function HistoryDomainCard({
  icon: Icon,
  title,
  primaryValue,
  primaryLabel,
  items,
  barValue,
  barTone,
}: {
  icon: typeof Users2;
  title: string;
  primaryValue: number;
  primaryLabel: string;
  items: Array<[string, number | string]>;
  barValue: number;
  barTone: "success" | "warning" | "primary";
}) {
  const barClass =
    barTone === "success"
      ? "bg-success"
      : barTone === "warning"
        ? "bg-warning"
        : "bg-[var(--color-primary)]";

  return (
    <article className="p-4">
      <header className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-bricolage text-base font-bold text-text">
          {title}
        </h3>
      </header>

      <div className="mt-4 flex items-end gap-2">
        <span className="font-mono text-4xl font-bold tabular-nums text-text">
          {formatNumber.format(primaryValue)}
        </span>
        <span className="pb-1 text-sm text-muted">{primaryLabel}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-surface px-3 py-2">
            <p className="font-mono text-lg font-bold tabular-nums text-text">
              {typeof value === "number" ? formatNumber.format(value) : value}
            </p>
            <p className="text-[11px] text-muted-light">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.max(8, Math.min(100, barValue))}%` }}
        />
      </div>
    </article>
  );
}

function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
