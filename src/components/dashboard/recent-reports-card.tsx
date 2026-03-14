"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, X } from "lucide-react";

export type RecentReportItem = {
  id: string;
  completedAt: string | null;
  reportText: string;
};

type RecentReportsCardProps = {
  reports: RecentReportItem[];
  hasRunningJob: boolean;
};

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function truncatePreview(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars).trim()}...`;
}

export function RecentReportsCard({ reports, hasRunningJob }: RecentReportsCardProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
    [reports, selectedReportId]
  );
  const selectedReportTitleId = selectedReport ? `report-modal-title-${selectedReport.id}` : undefined;
  const selectedReportContentId = selectedReport ? `report-modal-content-${selectedReport.id}` : undefined;

  useEffect(() => {
    if (!selectedReport) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedReportId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedReport]);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4 flex items-center gap-2">
        <FileText className="h-[20px] w-[20px] text-primary" aria-label="Histórico de relatórios" />
        <h2 className="text-lg font-semibold text-text">Histórico de relatórios</h2>
      </header>

      {hasRunningJob ? (
        <div className="mb-4 rounded-lg border border-border p-4" aria-busy="true">
          <div className="mb-2 h-4 w-1/3 animate-pulse rounded bg-border" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-border" />
          <p className="mt-3 text-sm text-muted">Gerando relatório...</p>
        </div>
      ) : null}

      {reports.length === 0 ? (
        <div className="p-6 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-light" aria-label="Sem relatórios" />
          <p className="mt-2 text-sm text-muted">
            Seus relatórios aparecerão aqui após o primeiro envio na próxima segunda-feira.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {reports.map((report) => (
            <article key={report.id} className="py-4 first:pt-0 last:pb-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-text">{formatDateLabel(report.completedAt)}</p>
                <span className="inline-flex items-center gap-1 rounded bg-success-light px-2.5 py-1 text-xs text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-label="Enviado" />
                  Enviado
                </span>
              </div>
              <p className="text-sm text-muted">{truncatePreview(report.reportText, 80)}</p>
              <button
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className="mt-2 inline-flex h-10 items-center rounded-lg bg-transparent px-3 text-sm text-muted hover:bg-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Ver relatório
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedReport ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedReportId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={selectedReportTitleId}
            aria-describedby={selectedReportContentId}
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(28,25,23,0.12)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id={selectedReportTitleId} className="text-lg font-semibold text-text">
                  Relatório completo
                </h3>
                <p className="text-sm text-muted">{formatDateLabel(selectedReport.completedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportId(null)}
                className="rounded-lg p-1.5 text-muted-light hover:text-text hover:bg-sidebar transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Fechar modal do relatório"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              id={selectedReportContentId}
              className="max-h-[60vh] overflow-y-auto rounded-lg border border-border p-4 text-sm leading-relaxed text-text"
            >
              {selectedReport.reportText}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
