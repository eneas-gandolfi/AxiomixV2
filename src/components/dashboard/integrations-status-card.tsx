import Link from "next/link";
import { Plug } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntegrationStatusItem = {
  type: "sofia_crm" | "evolution_api" | "upload_post" | "openrouter";
  status: "connected" | "error" | "missing";
  lastTestedAt: string | null;
};

type IntegrationsStatusCardProps = {
  integrations: IntegrationStatusItem[];
};

const integrationLabels: Record<IntegrationStatusItem["type"], string> = {
  sofia_crm: "Sofia CRM",
  evolution_api: "Evolution API",
  upload_post: "Upload-Post API",
  openrouter: "OpenRouter",
};

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "—";
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
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4 flex items-center gap-2">
        <Plug className="h-[20px] w-[20px] text-primary" aria-label="Status das integrações" />
        <h2 className="text-sm font-medium text-text">Status das integrações</h2>
      </header>

      <div className="space-y-0">
        {integrations.map((integration, index) => {
          const meta = statusMeta(integration.status);
          return (
            <article
              key={integration.type}
              className={cn(
                "grid grid-cols-[1fr_auto] items-center gap-3 py-3",
                index !== integrations.length - 1 && "border-b border-border"
              )}
            >
              <p className="text-sm text-text">{integrationLabels[integration.type]}</p>
              <div className="flex items-center gap-3">
                <span className={cn("rounded px-2 py-0.5 text-xs font-medium", meta.badge)}>
                  {meta.label}
                </span>
                <p className="text-xs text-muted-light">
                  {integration.lastTestedAt ? formatRelativeTime(integration.lastTestedAt) : "—"}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-5 border-t border-border pt-4 text-right">
        <Link
          href="/settings/integrations"
          className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm text-text hover:bg-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Gerenciar integrações
        </Link>
      </div>
    </section>
  );
}
