import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardAlert = {
  id: string;
  variant: "danger" | "warning";
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
};

type AlertsCardProps = {
  alerts: DashboardAlert[];
};

function AlertBadge({ variant }: { variant: DashboardAlert["variant"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold",
        variant === "danger"
          ? "bg-danger-light text-danger"
          : "bg-warning-light text-warning"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {variant === "danger" ? "Crítico" : "Atenção"}
    </span>
  );
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  if (alerts.length === 0) {
    return null;
  }

  const criticalAlerts = alerts.filter((alert) => alert.variant === "danger");
  const attentionAlerts = alerts.filter((alert) => alert.variant === "warning");

  return (
    <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-card-modern">
      <header className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-2xl",
            criticalAlerts.length > 0 ? "bg-danger-light" : "bg-warning-light"
          )}>
            <AlertTriangle className={cn(
              "h-4 w-4",
              criticalAlerts.length > 0 ? "text-danger" : "text-warning"
            )} aria-label="Atenção" />
          </span>
          <div>
            <p className="section-label">Monitoramento</p>
            <h2 className="mt-1 text-base font-semibold text-text">
              {criticalAlerts.length > 0 ? "Ação imediata" : "Acompanhar"}
            </h2>
          </div>
        </div>
        <span className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          criticalAlerts.length > 0 ? "bg-danger-light text-danger" : "bg-sidebar text-muted"
        )}>
          {alerts.length} abertos
        </span>
      </header>

      <div className="p-4">
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            {criticalAlerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-2xl border border-danger/20 bg-danger-light/70 p-3.5 transition-colors duration-150"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AlertBadge variant="danger" />
                  <p className="text-sm font-medium text-text">{alert.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{alert.description}</p>
                <div className="mt-3">
                  <Link
                    href={alert.actionHref}
                    className="inline-flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                  >
                    {alert.actionLabel}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {criticalAlerts.length > 0 && attentionAlerts.length > 0 && (
          <div className="my-3 border-t border-border/60" />
        )}

        {attentionAlerts.length > 0 && (
          <div className="space-y-3">
            {attentionAlerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-2xl border border-warning/20 bg-warning-light/70 p-3.5 transition-colors duration-150"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AlertBadge variant="warning" />
                  <p className="text-sm font-medium text-text">{alert.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{alert.description}</p>
                <div className="mt-3">
                  <Link
                    href={alert.actionHref}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {alert.actionLabel}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
