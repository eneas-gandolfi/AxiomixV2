import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      {variant === "danger" ? "Critico" : "Atencao"}
    </span>
  );
}

export function AlertsCard({ alerts }: AlertsCardProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-warning-light bg-card p-4 shadow-card">
      <header className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warning-light">
          <AlertTriangle className="h-4 w-4 text-warning" aria-label="Atencao" />
        </span>
        <h2 className="text-lg font-semibold text-text">Atencao necessaria</h2>
      </header>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={cn(
              "rounded-xl border border-border p-3",
              alert.variant === "danger" && "bg-danger-light",
              alert.variant === "warning" && "border-l-4 border-l-warning bg-warning-light"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <AlertBadge variant={alert.variant} />
              <p className="text-sm font-medium text-text">{alert.title}</p>
            </div>
            <p className="mt-1 text-sm text-muted">{alert.description}</p>

            {alert.variant === "warning" ? (
              <p className="mt-1 text-sm text-muted">
                A sincronizacao de conversas esta parada. Sem isso, o WhatsApp
                Intelligence e o relatorio semanal ficam desatualizados.
              </p>
            ) : null}

            <div className="mt-2 text-right">
              {alert.variant === "warning" ? (
                <Button
                  size="sm"
                  className="mt-3 bg-primary text-white hover:bg-primary-hover"
                  asChild
                >
                  <Link href={alert.actionHref}>{alert.actionLabel} -&gt;</Link>
                </Button>
              ) : (
                <Link
                  href={alert.actionHref}
                  className="inline-block text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {alert.actionLabel}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
