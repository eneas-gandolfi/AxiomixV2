/**
 * Arquivo: src/components/social/post-details-modal.tsx
 * Proposito: Modal de detalhes de uma publicacao agendada com acoes de retry e edicao.
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil, RotateCcw, Save, X } from "lucide-react";
import { formatDate, postTypeLabel, progressStateLabel } from "@/lib/social/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  type ScheduledHistoryItem,
} from "@/types/modules/social-publisher.types";

type PostDetailsModalProps = {
  details: ScheduledHistoryItem | null;
  companyId?: string;
  onClose: () => void;
  onRefresh?: () => void;
};

export function PostDetailsModal({ details, companyId, onClose, onRefresh }: PostDetailsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!details) return;
    setIsEditingCaption(false);
    setCaptionDraft(details.caption ?? "");
    setActionError(null);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [details, onClose]);

  if (!details) return null;

  const canRetry = details.status === "failed" || details.status === "partial";
  const canEdit = details.status === "scheduled";

  const handleSaveCaption = async () => {
    if (!companyId) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/social/schedule/${details.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, caption: captionDraft }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(data.error ?? "Falha ao salvar legenda.");
        return;
      }
      setIsEditingCaption(false);
      onRefresh?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao salvar legenda.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = async () => {
    if (!companyId) return;
    setIsRetrying(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/social/schedule/${details.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(data.error ?? "Falha ao reexecutar post.");
        return;
      }
      onRefresh?.();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao reexecutar post.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da publicacao"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-auto border border-border rounded-2xl shadow-[0_20px_60px_rgba(28,25,23,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-text">
                Detalhes da Publicacao
              </CardTitle>
              <CardDescription className="mt-2 text-muted">
                {postTypeLabel(details.postType)} • {formatDate(details.scheduledAt)}
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-light hover:text-text hover:bg-sidebar transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          {actionError && (
            <div className="rounded-lg border border-danger bg-danger-light px-3 py-2 text-sm text-danger">
              {actionError}
            </div>
          )}

          {details.thumbnailUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img
                loading="lazy"
                decoding="async"
                src={details.thumbnailUrl}
                alt="Post thumbnail"
                className="w-full max-h-64 object-contain bg-background"
              />
            </div>
          )}

          {/* Caption com edicao inline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-text">Legenda:</h4>
              {canEdit && !isEditingCaption && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingCaption(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
            </div>
            {isEditingCaption ? (
              <div className="space-y-2">
                <textarea
                  value={captionDraft}
                  onChange={(event) => setCaptionDraft(event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingCaption(false);
                      setCaptionDraft(details.caption ?? "");
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveCaption}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text whitespace-pre-wrap bg-background rounded-lg p-3 border border-border min-h-[40px]">
                {details.caption ?? <span className="text-muted">(sem legenda)</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text">Status:</h4>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[details.status]}`}
            >
              {STATUS_LABELS[details.status]}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-medium text-text mb-3">Plataformas:</h4>
            <div className="space-y-3">
              {details.platforms.map((platform) => {
                const progress = details.progress[platform];
                return (
                  <div
                    key={`${details.id}-${platform}`}
                    className="rounded-lg border border-border p-4 bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium capitalize text-text">
                        {platform}
                      </p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          progress?.status === "ok"
                            ? "bg-success-light text-success"
                            : progress?.status === "error"
                            ? "bg-danger-light text-danger"
                            : progress?.status === "processing"
                            ? "bg-warning-light text-warning"
                            : "bg-sidebar text-muted"
                        }`}
                      >
                        {progressStateLabel(progress?.status ?? "pending")}
                      </span>
                    </div>

                    {progress?.externalPostId && (
                      <p className="text-xs text-success mb-1">
                        Post ID: {progress.externalPostId}
                      </p>
                    )}

                    {progress?.error && (
                      <p className="text-xs text-danger bg-danger-light rounded p-2">
                        {progress.error}
                      </p>
                    )}

                    {progress?.updatedAt && (
                      <p className="text-xs text-muted mt-2">
                        Atualizado: {formatDate(progress.updatedAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted bg-background rounded-lg p-3 border border-border">
            <p>Criado em: {formatDate(details.createdAt)}</p>
            {details.publishedAt && (
              <p>Publicado em: {formatDate(details.publishedAt)}</p>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t border-border">
            {canRetry && companyId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Tentar novamente
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
