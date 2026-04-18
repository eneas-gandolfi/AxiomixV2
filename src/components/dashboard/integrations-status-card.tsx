import Link from "next/link";
import { Plug } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntegrationStatusItem = {
  type: "evo_crm" | "evolution_api" | "upload_post" | "openrouter";
  status: "connected" | "error" | "missing";
  lastTestedAt: string | null;
};

type IntegrationsStatusCardProps = {
  integrations: IntegrationStatusItem[];
};

const integrationLabels: Record<IntegrationStatusItem["type"], string> = {
  evo_crm: "Evo CRM",
  evolution_api: "Evolution API",
  upload_post: "Upload-Post API",
  openrouter: "OpenRouter",
};

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60_000), 0);
  if (diffMinutes < 1) {
    return "agora";
  }
  if (diffMinutes < 60) {
    return `há ${diffMinutes}min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays}d`;
}

function statusMeta(status: IntegrationStatusItem["status"]) {
  if (status === "connected") {
    return {
      badge: "bg-success-light text-success",
      label: "Conectado",
    };
  }

  if (status === "error") {
    return {
      badge: "bg-danger-light text-danger",
      label: "Erro",
    };
  }

  return {
    badge: "bg-sidebar text-muted-light",
    label: "Não configurado",
  };
}

export function IntegrationsStatusCard({ integrations }: IntegrationsStatusCardProps) {
  const connectedCount = integrations.filter((integration) => integration.status === "connected").length;

  return (
    <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-card-modern">
      <header className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light">
            <Plug className="h-4 w-4 text-primary" aria-label="Status das integrações" />
          </span>
          <div>
            <p className="section-label">Operação</p>
            <h2 className="mt-1 text-base font-semibold text-text">Status das integrações</h2>
          </div>
        </div>
        <span className="rounded-full bg-sidebar px-2.5 py-1 text-xs font-medium text-muted">
          {connectedCount}/{integrations.length}
        </span>
      </header>

      <div className="space-y-2 p-4">
        {integrations.map((integration) => {
          const meta = statusMeta(integration.status);
          return (
            <article
              key={integration.type}
              className={cn(
                "grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border px-3 py-3",
                integration.status === "error" && "border-danger/20 bg-danger-light/50",
                integration.status === "connected" && "border-border bg-background/60",
                integration.status === "missing" && "border-border bg-sidebar/40"
              )}
            >
              <p className="text-sm text-text">{integrationLabels[integration.type]}</p>
              <div className="flex items-center gap-3">
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium", meta.badge)}>
                  {meta.label}
                </span>
                <p className="text-xs text-muted-light">
                  {integration.lastTestedAt ? formatRelativeTime(integration.lastTestedAt) : "-"}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="border-t border-border px-4 py-4">
        <Link
          href="/settings?tab=integrations"
          className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm text-text hover:bg-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Gerenciar integrações
        </Link>
      </div>
    </section>
  );
}
