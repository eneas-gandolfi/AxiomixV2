"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, X } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export type RecentReportItem = {
  id: string;
  completedAt: string | null;
  reportText: string;
  status?: "done" | "failed" | "delivery_failed";
  errorMessage?: string | null;
  pdfStoragePath?: string | null;
};

type RecentReportsCardProps = {
  reports: RecentReportItem[];
  hasRunningJob: boolean;
  runningJobCreatedAt?: string | null;
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

function formatElapsedMinutes(createdAt: string) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
  return `Iniciado há ${minutes} min`;
}

export function RecentReportsCard({
  reports,
  hasRunningJob,
  runningJobCreatedAt,
}: RecentReportsCardProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownloadPdf(reportId: string, storagePath: string) {
    if (downloadingId === reportId) return;
    setDownloadingId(reportId);
    try {
      const res = await fetch(`/api/report/pdf?path=${encodeURIComponent(storagePath)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(body.error ?? "Falha ao gerar link de download.");
        return;
      }
      const body = (await res.json()) as { url: string };
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Não foi possível baixar o PDF. Tente novamente.");
    } finally {
      setDownloadingId(null);
    }
  }

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
    <section className="rounded-[24px] border border-border bg-card p-5 shadow-card-modern">
      <header className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light">
          <FileText className="h-5 w-5 text-primary" aria-label="Histórico de relatórios" />
        </span>
        <div>
          <p className="section-label">Relatórios</p>
          <h2 className="mt-1 text-base font-semibold text-text">Histórico de relatórios</h2>
        </div>
      </header>

      {hasRunningJob ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-info/20 bg-info-light p-4" aria-busy="true">
          <LoadingSpinner size="sm" />
          <div>
            <p className="text-sm font-medium text-text">Relatório em processamento</p>
            {runningJobCreatedAt ? (
              <p className="text-xs text-muted">{formatElapsedMinutes(runningJobCreatedAt)}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {reports.length === 0 ? (
        <div className="rounded-2xl bg-surface-subtle p-6 text-center">
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
                {report.status === "failed" ? (
                  <span className="inline-flex items-center gap-1 rounded bg-danger-light px-2.5 py-1 text-xs text-danger">
                    <AlertCircle className="h-3.5 w-3.5" aria-label="Falhou" />
                    Falhou
                  </span>
                ) : report.status === "delivery_failed" ? (
                  <span className="inline-flex items-center gap-1 rounded bg-warning-light px-2.5 py-1 text-xs text-warning">
                    <AlertCircle className="h-3.5 w-3.5" aria-label="Envio falhou" />
                    Envio falhou
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-success-light px-2.5 py-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-label="Enviado" />
                    Enviado
                  </span>
                )}
              </div>
              <p className="text-sm leading-6 text-muted">{truncatePreview(report.reportText, 88)}</p>
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className="inline-flex h-10 items-center rounded-lg bg-transparent px-3 text-sm text-muted hover:bg-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Ver relatório
                </button>
                {report.pdfStoragePath ? (
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(report.id, report.pdfStoragePath!)}
                    disabled={downloadingId === report.id}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-transparent px-3 text-sm text-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {downloadingId === report.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {downloadingId === report.id ? "Gerando..." : "Baixar PDF"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedReport ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
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
                className="rounded-lg p-1.5 text-muted-light transition-colors hover:bg-sidebar hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
