import Link from "next/link";
import { CalendarDays, Info } from "lucide-react";
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
    <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-card-modern">
      <div className="p-5">
        <header className="mb-4 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light">
            <CalendarDays className="h-5 w-5 text-primary" aria-label="Próximo relatório" />
          </span>
          <div>
            <p className="section-label">Relatórios</p>
            <h2 className="mt-1 text-base font-semibold text-text">Próximo relatório semanal</h2>
          </div>
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

        {canManageReports ? (
          <div className="mt-5 space-y-2">
            <SendReportButton
              disabled={!canSendNow}
              disabledReason={sendDisabledReason}
              variant="default"
              className="w-full bg-primary text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              iconPosition="right"
            />
            {!canSendNow && sendDisabledReason ? (
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <p>{sendDisabledReason}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border bg-sidebar/60 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-light">
          <StatusDot state={evolutionStatus.state} />
          <span>{evolutionStatus.label}</span>
          {evolutionStatus.state !== "active" ? (
            <>
              <span>-</span>
              <Link
                href="/settings?tab=integrations"
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Configurar
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
