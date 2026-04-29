/**
 * Arquivo: src/components/social/demand-detail-client.tsx
 * Propósito: Página de detalhe de uma demanda com status, comentários e histórico.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Calendar,
  Copy,
  Check,
  Link2,
  Loader2,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemandStatusBadge } from "./demand-status-badge";
import { PlatformIcon } from "./platform-icons";
import { DemandStatusTransition } from "./demand-status-transition";
import { DemandCommentThread } from "./demand-comment-thread";
import {
  DEMAND_STATUS_LABELS,
  type ContentDemandWithMeta,
  type DemandComment,
  type DemandHistoryEntry,
} from "@/types/modules/content-demands.types";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";

type DemandDetailClientProps = {
  demandId: string;
  companyId: string;
};

export function DemandDetailClient({ demandId, companyId }: DemandDetailClientProps) {
  const router = useRouter();
  const [demand, setDemand] = useState<ContentDemandWithMeta | null>(null);
  const [comments, setComments] = useState<DemandComment[]>([]);
  const [history, setHistory] = useState<DemandHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDemand = useCallback(async () => {
    try {
      const res = await fetch(`/api/social/demands/${demandId}?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setDemand(data.demand);
        setComments(data.comments ?? []);
        setHistory(data.history ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [demandId, companyId]);

  useEffect(() => {
    fetchDemand();
  }, [fetchDemand]);

  const generateApprovalLink = async () => {
    setIsGeneratingLink(true);
    try {
      const res = await fetch(`/api/social/demands/${demandId}/approval-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        setApprovalUrl(data.url);
      }
    } catch {
      // silently fail
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    if (!approvalUrl) return;
    await navigator.clipboard.writeText(approvalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta demanda?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/social/demands/${demandId}?companyId=${companyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/social-publisher/demandas");
      }
    } catch {
      // silently fail
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--module-accent)]" />
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-secondary)]">Demanda não encontrada.</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Main content */}
        <div className="space-y-4">
          {/* Header */}
          <Card accent className="rounded-xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{demand.title}</CardTitle>
                  <DemandStatusBadge status={demand.status} size="md" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              {demand.description && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-1">
                    Descrição
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                    {demand.description}
                  </p>
                </div>
              )}

              {/* Caption */}
              {demand.caption && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-1">
                    Legenda
                  </p>
                  <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                    <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
                      {demand.caption}
                    </p>
                  </div>
                </div>
              )}

              {/* Media preview */}
              {demand.thumbnailUrl && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-1">
                    Mídia
                  </p>
                  <img
                    loading="lazy"
                    decoding="async"
                    src={demand.thumbnailUrl}
                    alt=""
                    className="w-48 h-48 rounded-xl object-cover border border-[var(--color-border)]"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-[var(--color-border)]">
                <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-2">
                  Ações
                </p>
                <DemandStatusTransition
                  demandId={demand.id}
                  companyId={companyId}
                  currentStatus={demand.status}
                  onTransitioned={fetchDemand}
                />
              </div>

              {/* Approval link */}
              {demand.status === "em_revisao" && (
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-2">
                    Link de Aprovação Externa
                  </p>
                  {approvalUrl ? (
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={approvalUrl}
                        className="flex-1 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-xs text-[var(--color-text)] truncate"
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={copyToClipboard}>
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={generateApprovalLink}
                      disabled={isGeneratingLink}
                    >
                      {isGeneratingLink ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      Gerar Link
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <DemandCommentThread
                demandId={demand.id}
                companyId={companyId}
                comments={comments}
                onCommentAdded={fetchDemand}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Creator */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase">Criado por</p>
                  <p className="text-xs text-[var(--color-text)]">{demand.creatorName ?? "—"}</p>
                </div>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase">Responsável</p>
                  <p className="text-xs text-[var(--color-text)]">{demand.assigneeName ?? "Não atribuído"}</p>
                </div>
              </div>

              {/* Platforms */}
              {demand.platforms.length > 0 && (
                <div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase mb-1">Plataformas</p>
                  <div className="flex gap-1">
                    {demand.platforms.map((p) => (
                      <div key={p} className="h-7 w-7 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center" title={p}>
                        <PlatformIcon platform={p} className="h-4 w-4" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Due date */}
              {demand.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  <div>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase">Prazo</p>
                    <p className={`text-xs ${new Date(demand.dueDate).getTime() < Date.now() ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}`}>
                      {new Date(demand.dueDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Created at */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase">Criado em</p>
                  <p className="text-xs text-[var(--color-text)]">
                    {new Date(demand.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)] text-center py-4">
                  Nenhuma transição registrada.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 text-xs"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--module-accent)] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-[var(--color-text)]">
                          <span className="font-medium">{entry.userName ?? "Sistema"}</span>
                          {" "}
                          <span className="text-[var(--color-text-tertiary)]">
                            {DEMAND_STATUS_LABELS[entry.fromStatus]}
                          </span>
                          {" → "}
                          <span className="font-medium">
                            {DEMAND_STATUS_LABELS[entry.toStatus]}
                          </span>
                        </p>
                        {entry.comment && (
                          <p className="text-[var(--color-text-tertiary)] mt-0.5 italic">
                            &ldquo;{entry.comment}&rdquo;
                          </p>
                        )}
                        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                          {new Date(entry.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
