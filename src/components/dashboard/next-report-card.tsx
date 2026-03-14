import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SendReportButton } from "@/components/dashboard/send-report-button";
import { cn } from "@/lib/utils";

type EvolutionStatus = {
  state: "active" | "error" | "missing";
  label: string;
};

type NextReportCardProps = {
  nextSendAtLabel: string;
  managerPhone: string;
  evolutionStatus: EvolutionStatus;
  canManageReports: boolean;
  canSendNow: boolean;
  sendDisabledReason?: string;
};

function StatusDot({ state }: { state: EvolutionStatus["state"] }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        state === "active"
          ? "bg-success"
          : state === "error"
            ? "bg-danger"
            : "bg-muted-light"
      )}
      aria-label={
        state === "active"
          ? "Integração ativa"
          : state === "error"
            ? "Integração com erro"
            : "Integração não configurada"
      }
    />
  );
}

export function NextReportCard({
  nextSendAtLabel,
  managerPhone,
  evolutionStatus,
  canManageReports,
  canSendNow,
  sendDisabledReason,
}: NextReportCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-6">
        <header className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-[20px] w-[20px] text-primary" aria-label="Próximo relatório" />
          <h2 className="text-sm font-medium text-text">Próximo relatório semanal</h2>
        </header>

        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted">
            Envio automático toda segunda-feira às 08:00.
          </p>
          <p className="text-sm text-muted">
            <span className="font-medium text-text">Próximo envio:</span> {nextSendAtLabel}
          </p>
          <p className="text-sm text-muted">
            <span className="font-medium text-text">WhatsApp do gestor:</span> {managerPhone}
          </p>
        </div>

        {canManageReports && (
          <div className="mt-5">
            <SendReportButton
              disabled={!canSendNow}
              disabledReason={sendDisabledReason}
              variant="default"
              className="ml-auto bg-primary text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              iconPosition="right"
            />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-sidebar px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-light">
          <StatusDot state={evolutionStatus.state} />
          <span>{evolutionStatus.label}</span>
          {evolutionStatus.state !== "active" && (
            <>
              <span>—</span>
              <Link
                href="/settings/integrations"
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Configurar
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
