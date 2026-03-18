"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, MessageSquareWarning, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedbackStatus = "helpful" | "needs_review" | "incorrect";

type InsightFeedbackPanelProps = {
  companyId: string;
  conversationId: string;
  initialStatus?: FeedbackStatus | null;
  initialNote?: string | null;
  initialFeedbackAt?: string | null;
  compact?: boolean;
};

const FEEDBACK_OPTIONS: Array<{
  status: FeedbackStatus;
  label: string;
  hint: string;
  icon: typeof CheckCircle2;
}> = [
  {
    status: "helpful",
    label: "Util",
    hint: "A leitura ajudou e esta bem direcionada.",
    icon: CheckCircle2,
  },
  {
    status: "needs_review",
    label: "Revisar",
    hint: "A ideia e boa, mas faltou contexto ou precisao.",
    icon: MessageSquareWarning,
  },
  {
    status: "incorrect",
    label: "Incorreto",
    hint: "A analise induz ao erro ou leu a conversa errado.",
    icon: XCircle,
  },
];

function formatFeedbackDate(value?: string | null) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString("pt-BR");
}

export function InsightFeedbackPanel({
  companyId,
  conversationId,
  initialStatus,
  initialNote,
  initialFeedbackAt,
  compact,
}: InsightFeedbackPanelProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus | null>(initialStatus ?? null);
  const [note, setNote] = useState(initialNote ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    initialStatus ? `Feedback salvo em ${formatFeedbackDate(initialFeedbackAt)}.` : null
  );
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    if (!selectedStatus) {
      setError("Selecione uma classificacao para o insight.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/insight-feedback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          feedbackStatus: selectedStatus,
          feedbackNote: note.trim(),
        }),
      });

      const payload = (await response.json()) as { error?: string; insight?: { feedback_at?: string | null } };

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao salvar feedback.");
      }

      setSuccess(
        payload.insight?.feedback_at
          ? `Feedback salvo em ${formatFeedbackDate(payload.insight.feedback_at)}.`
          : "Feedback salvo."
      );
      setExpanded(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao salvar feedback.");
    } finally {
      setIsSaving(false);
    }
  };

  if (compact && !expanded) {
    return (
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted">A analise ajudou?</p>
          <div className="flex gap-1.5">
            {FEEDBACK_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = selectedStatus === option.status;
              return (
                <button
                  key={option.status}
                  type="button"
                  title={`${option.label}: ${option.hint}`}
                  onClick={() => {
                    setSelectedStatus(option.status);
                    setExpanded(true);
                  }}
                  className={`rounded-md p-1.5 transition-colors ${
                    isActive
                      ? "bg-[var(--color-primary-dim)] text-[var(--color-primary)]"
                      : "text-muted-light hover:bg-sidebar hover:text-text"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
        {initialStatus && (
          <p className="mt-1.5 text-[11px] text-muted">
            Feedback: {FEEDBACK_OPTIONS.find((o) => o.status === initialStatus)?.label}
            {initialFeedbackAt ? ` · ${formatFeedbackDate(initialFeedbackAt)}` : ""}
          </p>
        )}
        {success && !initialStatus ? <p className="mt-1.5 text-[11px] text-success">{success}</p> : null}
      </div>
    );
  }

  if (compact && expanded) {
    return (
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted">A analise ajudou?</p>
          <div className="flex items-center gap-1.5">
            {FEEDBACK_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = selectedStatus === option.status;
              return (
                <button
                  key={option.status}
                  type="button"
                  title={`${option.label}: ${option.hint}`}
                  onClick={() => setSelectedStatus(option.status)}
                  className={`rounded-md p-1.5 transition-colors ${
                    isActive
                      ? "bg-[var(--color-primary-dim)] text-[var(--color-primary)]"
                      : "text-muted-light hover:bg-sidebar hover:text-text"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              title="Recolher"
              className="ml-1 rounded-md p-1.5 text-muted-light transition-colors hover:bg-sidebar hover:text-text"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <textarea
            id="insight-feedback-note-compact"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="O que faltou ou acertou na analise..."
            maxLength={1000}
            className="min-h-[80px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !selectedStatus}>
            {isSaving ? "Salvando..." : "Salvar feedback"}
          </Button>
          {success ? <p className="text-[11px] text-success">{success}</p> : null}
          {error ? <p className="text-[11px] text-danger">{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-light">Feedback do time</p>
          <h3 className="mt-1 text-sm font-semibold text-text">A analise ajudou de verdade?</h3>
        </div>
        {initialStatus ? (
          <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
            Ultimo: {FEEDBACK_OPTIONS.find((option) => option.status === initialStatus)?.label ?? initialStatus}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {FEEDBACK_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = selectedStatus === option.status;
          return (
            <button
              key={option.status}
              type="button"
              onClick={() => setSelectedStatus(option.status)}
              className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-dim)]"
                  : "border-border bg-card hover:border-border-strong hover:bg-sidebar"
              }`}
            >
              <Icon className={`mt-0.5 h-4 w-4 ${isActive ? "text-[var(--color-primary)]" : "text-muted-light"}`} />
              <div>
                <p className="text-sm font-medium text-text">{option.label}</p>
                <p className="text-xs text-muted">{option.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs uppercase tracking-wide text-muted-light" htmlFor="insight-feedback-note">
          O que faltou ou acertou
        </label>
        <textarea
          id="insight-feedback-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ex.: faltou identificar a objecao de prazo, resumiu bem a necessidade, sugeriu um proximo passo fraco..."
          className="min-h-[110px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={isSaving || !selectedStatus}>
          {isSaving ? "Salvando..." : "Salvar feedback"}
        </Button>
        {success ? <p className="text-xs text-success">{success}</p> : null}
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
