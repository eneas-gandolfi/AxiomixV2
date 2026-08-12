"use client";

import Link from "next/link";
import { ArrowRight, Bot, MessageSquare, Settings, Users2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardCommandCenterData = {
  greeting: string;
  companyName: string | null;
  stalled: {
    count: number;
    topItem: {
      conversationId: string;
      customerName: string;
      waitSeconds: number;
    } | null;
  };
  kpis: {
    attention: number;
    groupsMonitored: number;
    activeGroups: number;
    messages24h: number;
    aiResponses24h: number;
    opportunities: number;
  };
  groups: Array<{
    id: string;
    name: string;
    action: string;
    messages24h: number;
    people24h: number;
    status: string;
  }>;
  signals: Array<{
    id: string;
    groupName: string;
    kind: string;
    time: string;
    text: string;
  }>;
  health: {
    evoCrm: "OK" | "Ação";
    aiBase: "OK" | "Ação";
    openRouter: "OK" | "Ação";
  };
};

const STATUS_TONE: Record<string, string> = {
  Risco: "bg-red-50 text-red-600 ring-red-100",
  Quente: "bg-amber-50 text-amber-700 ring-amber-100",
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Radar: "bg-blue-50 text-blue-700 ring-blue-100",
  Inativo: "bg-slate-100 text-slate-600 ring-slate-200",
};

function formatWait(seconds: number): string {
  const minutes = Math.max(Math.floor(seconds / 60), 1);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}

function getFocusCopy(data: DashboardCommandCenterData) {
  if (data.stalled.topItem) {
    return {
      eyebrow: `Sem resposta há ${formatWait(data.stalled.topItem.waitSeconds)}`,
      title: `Retomar conversa com ${data.stalled.topItem.customerName}`,
      body:
        data.stalled.count > 1
          ? `Mais ${data.stalled.count - 1} conversa${data.stalled.count > 2 ? "s" : ""} aguardando resposta.`
          : "Esta é a conversa mais urgente no momento.",
      href: "/whatsapp-intelligence?modo=agora",
      cta: "Abrir conversa",
    };
  }

  if (data.kpis.groupsMonitored === 0) {
    return {
      eyebrow: "Próxima ação",
      title: "Ativar inteligência dos grupos",
      body: "Comece pelos grupos do WhatsApp. Eles concentram sinais, dúvidas e oportunidades.",
      href: "/settings?tab=group-agent",
      cta: "Configurar grupos",
    };
  }

  return {
    eyebrow: "Próxima ação",
    title: "Monitorar grupos prioritários",
    body: "Revise os grupos em foco e avance nas oportunidades que a IA encontrou.",
    href: "/whatsapp-intelligence",
    cta: "Abrir grupos",
  };
}

function KpiCard({
  label,
  value,
  hint,
  urgent,
}: {
  label: string;
  value: string | number;
  hint: string;
  urgent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className={cn("text-xs font-semibold uppercase tracking-[0.04em] text-muted", urgent && "text-red-500")}>
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-bold leading-none text-[var(--color-text)]", urgent && "text-red-500")}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-muted">{hint}</p>
    </article>
  );
}

function SectionHeader({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
        {children ? <div className="mt-1 text-sm leading-5 text-muted">{children}</div> : null}
      </div>
      {badge ? (
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function TodoItem({
  rank,
  title,
  subtitle,
  href,
}: {
  rank: number;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-[var(--color-surface)] px-3 py-2.5 transition hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-card text-sm font-bold text-primary ring-1 ring-border">
        {rank}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{title}</span>
        <span className="block truncate text-xs text-muted">{subtitle}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
    </Link>
  );
}

function GroupRow({ group }: { group: DashboardCommandCenterData["groups"][number] }) {
  const tone = STATUS_TONE[group.status] ?? STATUS_TONE.Radar;

  return (
    <article className="grid gap-3 rounded-xl border border-border bg-[var(--color-surface)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] md:items-center">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">{group.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{group.action}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <MetricPill value={group.messages24h} label="msg" />
        <MetricPill value={group.people24h} label="pessoas" />
        <MetricPill value={group.status} label="status" className={tone} />
      </dl>
    </article>
  );
}

function MetricPill({
  value,
  label,
  className,
}: {
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("grid min-h-[56px] min-w-0 place-items-center rounded-xl bg-card px-2 py-1.5 text-center ring-1 ring-border/60", className)}>
      <dt className="sr-only">{label}</dt>
      <dd className="max-w-full truncate text-sm font-bold leading-tight text-[var(--color-text)]">{value}</dd>
      <span className="text-[11px] leading-tight text-muted">{label}</span>
    </div>
  );
}

function BottleneckBar({
  label,
  value,
  total,
  tone = "bg-primary",
}: {
  label: string;
  value: number;
  total: number;
  tone?: string;
}) {
  const width = total > 0 ? Math.max(8, Math.round((value / total) * 100)) : 8;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-[var(--color-text)]">{label}</span>
        <span className="font-semibold text-muted">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface)] ring-1 ring-border/60">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function OperationalItem({
  label,
  value,
  action,
  tone = "neutral",
}: {
  label: string;
  value: string;
  action: string;
  tone?: "neutral" | "danger" | "success" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 text-red-700 ring-red-100"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700 ring-amber-100"
          : "bg-[var(--color-surface)] text-[var(--color-text)] ring-border";

  return (
    <div className="grid min-w-0 gap-1 rounded-xl border border-border bg-card px-3 py-3 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className={`w-fit rounded-full px-2.5 py-1 text-sm font-bold ring-1 ${toneClass}`}>
        {value}
      </p>
      <p className="min-w-0 truncate text-sm text-muted">{action}</p>
    </div>
  );
}

export function DashboardCommandCenterView({ data }: { data: DashboardCommandCenterData }) {
  const focus = getFocusCopy(data);
  const groups = data.groups.slice(0, 3);
  const signals = data.signals.slice(0, 3);
  const bottleneckTotal = Math.max(
    data.kpis.attention + data.kpis.opportunities + data.kpis.groupsMonitored,
    1,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-[var(--color-text)] md:text-3xl">
            {data.greeting}
            {data.companyName ? `, ${data.companyName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-muted">Seu painel abre direto no que precisa de decisão.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Operacional
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <article className="grid gap-4 rounded-[18px] bg-gradient-to-br from-primary to-orange-600 p-5 text-white shadow-[0_18px_42px_rgba(240,90,18,0.22)] md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center md:p-6">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20">
            <Zap className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/75">{focus.eyebrow}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Próxima ação</h2>
            <p className="mt-2 text-xl font-semibold leading-snug">{focus.title}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/85">{focus.body}</p>
          </div>
          <Link
            href={focus.href}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-primary shadow-sm transition hover:bg-white/90"
          >
            {focus.cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </article>

        <aside className="rounded-[18px] border border-border bg-card p-4 shadow-sm">
          <SectionHeader title="Fila de hoje" badge={data.stalled.count > 0 ? `${data.stalled.count} ações` : "em dia"}>
            Próximos passos para não perder venda.
          </SectionHeader>
          <div className="mt-4 grid gap-2">
            <TodoItem
              rank={1}
              title={data.stalled.topItem ? "Revisar conversa mais antiga" : "Revisar grupos em foco"}
              subtitle={data.stalled.topItem?.customerName ?? "WhatsApp Intelligence"}
              href="/whatsapp-intelligence?modo=agora"
            />
            <TodoItem
              rank={2}
              title="Monitorar grupos prioritários"
              subtitle={`${data.kpis.groupsMonitored} grupo${data.kpis.groupsMonitored === 1 ? "" : "s"} configurado${data.kpis.groupsMonitored === 1 ? "" : "s"}`}
              href="/whatsapp-intelligence"
            />
            <TodoItem
              rank={3}
              title="Checar conexões"
              subtitle="WhatsApp, Evo CRM e OpenRouter"
              href="/settings?tab=group-agent"
            />
          </div>
        </aside>
      </section>

      <section aria-labelledby="dashboard-summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <h2 id="dashboard-summary" className="sr-only">
          Resumo operacional
        </h2>
        <KpiCard
          label="Atenção"
          value={data.kpis.attention}
          hint={data.kpis.attention > 0 ? "pedem decisão agora" : "sem urgências agora"}
          urgent={data.kpis.attention > 0}
        />
        <KpiCard
          label="Grupos monitorados"
          value={data.kpis.groupsMonitored}
          hint={`${data.kpis.activeGroups} ativo${data.kpis.activeGroups === 1 ? "" : "s"} hoje`}
        />
        <KpiCard
          label="Mensagens 24h"
          value={data.kpis.messages24h}
          hint="em grupos e conversas"
        />
        <KpiCard
          label="IA"
          value={data.kpis.aiResponses24h}
          hint="respostas em 24h"
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-4" aria-label="Leitura operacional principal">
          <article
            className="self-start rounded-[18px] border border-border bg-card p-4 shadow-sm sm:p-5"
            aria-label="Radar de grupos WhatsApp"
          >
            <SectionHeader title="Radar de grupos WhatsApp" badge="Central do produto">
              Grupos que concentram dúvidas, sinais comerciais e risco.
            </SectionHeader>
            <div className="mt-4 grid gap-2.5">
              {groups.length > 0 ? (
                groups.map((group) => <GroupRow key={group.id} group={group} />)
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                  Nenhum grupo monitorado ainda. Configure os grupos para ativar o radar.
                </div>
              )}
            </div>
          </article>

          <section className="rounded-[18px] border border-border bg-card p-3 shadow-sm" aria-label="Estado operacional">
            <div className="grid gap-2">
              <OperationalItem
                label="Risco"
                value={
                  data.kpis.attention > 0
                    ? `${data.kpis.attention} pendência${data.kpis.attention === 1 ? "" : "s"}`
                    : "OK"
                }
                action={data.kpis.attention > 0 ? "Responder casos críticos" : "Fila sem urgência"}
                tone={data.kpis.attention > 0 ? "danger" : "success"}
              />
              <OperationalItem
                label="Oportunidades"
                value={`${data.kpis.opportunities} ativa${data.kpis.opportunities === 1 ? "" : "s"}`}
                action="Revisar intenção de compra"
                tone={data.kpis.opportunities > 0 ? "warning" : "neutral"}
              />
              <OperationalItem
                label="Saúde"
                value="estável"
                action={`Evo ${data.health.evoCrm} · IA ${data.health.aiBase} · OpenRouter ${data.health.openRouter}`}
                tone="success"
              />
            </div>
          </section>

          <article className="rounded-[18px] border border-border bg-card p-4 shadow-sm" aria-label="Atalhos operacionais">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[var(--color-text)]">Ações rápidas</h2>
                <p className="mt-1 text-sm leading-5 text-muted">
                  Use o espaço livre para decidir o próximo movimento sem rolar a página.
                </p>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-orange-100">
                direto ao ponto
              </span>
            </div>
            <nav className="mt-4 grid grid-cols-3 gap-2">
              <Link
                href="/whatsapp-intelligence"
                className="grid min-h-[68px] place-items-center rounded-xl border border-border bg-[var(--color-surface)] p-3 text-center text-xs font-semibold text-[var(--color-text)] hover:border-primary/40 hover:bg-primary/5"
              >
                <Users2 className="mb-1 h-5 w-5 text-primary" aria-hidden="true" />
                Grupos
              </Link>
              <Link
                href="/whatsapp-intelligence?modo=agora"
                className="grid min-h-[68px] place-items-center rounded-xl border border-border bg-[var(--color-surface)] p-3 text-center text-xs font-semibold text-[var(--color-text)] hover:border-primary/40 hover:bg-primary/5"
              >
                <MessageSquare className="mb-1 h-5 w-5 text-primary" aria-hidden="true" />
                Conversas
              </Link>
              <Link
                href="/settings?tab=group-agent"
                className="grid min-h-[68px] place-items-center rounded-xl border border-border bg-[var(--color-surface)] p-3 text-center text-xs font-semibold text-[var(--color-text)] hover:border-primary/40 hover:bg-primary/5"
              >
                <Settings className="mb-1 h-5 w-5 text-primary" aria-hidden="true" />
                Configurar
              </Link>
            </nav>
          </article>
        </div>

        <aside className="grid content-start gap-4">
          <article className="rounded-[18px] border border-border bg-card p-4 shadow-sm sm:p-5">
            <SectionHeader title="Sinais da IA" badge="24h">
              Sinais extraídos dos grupos.
            </SectionHeader>
            <div className="mt-4 divide-y divide-border">
              {signals.length > 0 ? (
                signals.map((signal) => (
                  <article key={signal.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-muted">
                      <span>{signal.groupName}</span>
                      <span>{signal.kind}</span>
                      <span>{signal.time}</span>
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[var(--color-text)]">{signal.text}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                  Aguardando padrões. Os sinais aparecem conforme a IA analisa os grupos.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[18px] border border-border bg-card p-4 shadow-sm sm:p-5">
            <SectionHeader title="Gargalos de vendas" badge="IA">
              Onde leads podem estar escapando.
            </SectionHeader>
            <div className="mt-4 grid gap-4">
              <BottleneckBar
                label="Sem resposta longa"
                value={data.kpis.attention}
                total={bottleneckTotal}
                tone="bg-red-500"
              />
              <BottleneckBar
                label="Oportunidades sem ação"
                value={data.kpis.opportunities}
                total={bottleneckTotal}
                tone="bg-amber-500"
              />
              <BottleneckBar
                label="Grupos em observação"
                value={Math.max(data.kpis.groupsMonitored - data.kpis.activeGroups, 0)}
                total={bottleneckTotal}
                tone="bg-blue-500"
              />
              <div className="rounded-xl bg-orange-50 p-3 text-sm leading-5 text-orange-900 ring-1 ring-orange-100">
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  Leitura da IA
                </div>
                {data.kpis.attention > 0
                  ? "O maior gargalo agora é tempo de resposta. Assuma os casos críticos antes de abrir novas frentes."
                  : "Nenhum gargalo crítico detectado. Mantenha o radar de grupos ativo para capturar intenção de compra cedo."}
              </div>
            </div>
          </article>

        </aside>
      </section>
    </div>
  );
}
