/**
 * Arquivo: src/components/social/demand-approval-page.tsx
 * Propósito: Página pública de aprovação de conteúdo via token.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, AlertTriangle, Loader2, Send, Instagram, Linkedin, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type DemandApprovalPageProps = {
  token: string;
};

type DemandPreview = {
  id: string;
  title: string;
  description: string | null;
  caption: string | null;
  platforms: string[];
  status: string;
};

type MediaFile = {
  id: string;
  publicUrl: string;
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

export function DemandApprovalPage({ token }: DemandApprovalPageProps) {
  const [demand, setDemand] = useState<DemandPreview | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"approved" | "changes_requested" | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  const fetchDemand = useCallback(async () => {
    try {
      const res = await fetch(`/api/social/approval/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Token inválido ou expirado.");
      }
      const data = await res.json();
      setDemand(data.demand);
      setMediaFiles(data.mediaFiles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar demanda.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDemand();
  }, [fetchDemand]);

  const handleAction = async (action: "aprovado" | "alteracoes_solicitadas") => {
    if (action === "alteracoes_solicitadas" && !showCommentInput) {
      setShowCommentInput(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/social/approval/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao processar ação.");
      }

      setResult(action === "aprovado" ? "approved" : "changes_requested");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar ação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF0EB] to-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#FA5E24]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF0EB] to-white px-4">
        <Card className="max-w-md w-full rounded-2xl shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-12 w-12 rounded-full bg-[var(--color-danger-bg)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-[var(--color-danger)]" />
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)] mb-2">
              Link inválido
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF0EB] to-white px-4">
        <Card className="max-w-md w-full rounded-2xl shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              result === "approved" ? "bg-[var(--color-success-bg)]" : "bg-[var(--color-warning-bg)]"
            }`}>
              {result === "approved" ? (
                <Check className="h-6 w-6 text-[#22C55E]" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-[var(--color-warning)]" />
              )}
            </div>
            <p className="text-lg font-semibold text-[var(--color-text)] mb-2">
              {result === "approved" ? "Conteúdo Aprovado!" : "Alterações Solicitadas"}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {result === "approved"
                ? "O conteúdo foi aprovado e a equipe será notificada."
                : "Suas observações foram enviadas para a equipe."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF0EB] to-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Aprovação de Conteúdo
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Revise o conteúdo abaixo e aprove ou solicite alterações
          </p>
        </div>

        {/* Content preview */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>{demand?.title}</CardTitle>
            {demand?.description && (
              <CardDescription>{demand.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platforms */}
            {demand?.platforms && demand.platforms.length > 0 && (
              <div className="flex gap-2">
                {demand.platforms.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] font-medium"
                  >
                    {PLATFORM_NAMES[p] ?? p}
                  </span>
                ))}
              </div>
            )}

            {/* Media */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {mediaFiles.map((file) => (
                  <img
                    key={file.id}
                    src={file.publicUrl}
                    alt=""
                    className="w-full rounded-xl object-cover border border-[var(--color-border)]"
                    style={{ maxHeight: 300 }}
                  />
                ))}
              </div>
            )}

            {/* Caption */}
            {demand?.caption && (
              <div className="rounded-xl bg-[var(--color-surface-2)] p-4">
                <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-2">
                  Legenda
                </p>
                <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
                  {demand.caption}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="pt-6 space-y-4">
            {showCommentInput && (
              <div className="space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Descreva as alterações necessárias..."
                  className="w-full min-h-[100px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] resize-none focus:outline-none focus:ring-2 focus:ring-[#FA5E24] focus:border-transparent"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={() => handleAction("aprovado")}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                Aprovar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => handleAction("alteracoes_solicitadas")}
                disabled={isSubmitting}
              >
                <AlertTriangle className="h-5 w-5" />
                Solicitar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--color-text-tertiary)]">
          Powered by Axiomix
        </p>
      </div>
    </div>
  );
}
