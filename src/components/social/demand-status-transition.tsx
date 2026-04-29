/**
 * Arquivo: src/components/social/demand-status-transition.tsx
 * Propósito: Botões de transição de status contextuais por role e status atual.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { Send, Check, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_TRANSITIONS,
  DEMAND_STATUS_LABELS,
  type DemandStatus,
} from "@/types/modules/content-demands.types";

type DemandStatusTransitionProps = {
  demandId: string;
  companyId: string;
  currentStatus: DemandStatus;
  onTransitioned: () => void;
};

const TRANSITION_CONFIG: Record<DemandStatus, { icon: typeof Send; variant: "default" | "secondary" | "ghost" }> = {
  rascunho: { icon: Send, variant: "default" },
  em_revisao: { icon: Send, variant: "secondary" },
  alteracoes_solicitadas: { icon: AlertTriangle, variant: "secondary" },
  aprovado: { icon: Check, variant: "default" },
  agendado: { icon: Calendar, variant: "default" },
  publicado: { icon: Check, variant: "default" },
};

export function DemandStatusTransition({
  demandId,
  companyId,
  currentStatus,
  onTransitioned,
}: DemandStatusTransitionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<DemandStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transitions = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (transitions.length === 0) return null;

  const handleTransition = async (toStatus: DemandStatus) => {
    if (toStatus === "alteracoes_solicitadas" && !showCommentInput) {
      setPendingAction(toStatus);
      setShowCommentInput(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/demands/${demandId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          toStatus,
          comment: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao transicionar.");
      }

      setShowCommentInput(false);
      setComment("");
      setPendingAction(null);
      onTransitioned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao transicionar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((toStatus) => {
          const config = TRANSITION_CONFIG[toStatus];
          const Icon = config.icon;
          return (
            <Button
              key={toStatus}
              type="button"
              variant={config.variant}
              size="sm"
              disabled={isLoading}
              onClick={() => handleTransition(toStatus)}
            >
              {isLoading && pendingAction === toStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {DEMAND_STATUS_LABELS[toStatus]}
            </Button>
          );
        })}
      </div>

      {showCommentInput && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Descreva as alterações necessárias..."
            className="w-full min-h-[80px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--module-accent,#8B5CF6)] focus:border-transparent"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => pendingAction && handleTransition(pendingAction)}
              disabled={isLoading || !comment.trim()}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCommentInput(false);
                setComment("");
                setPendingAction(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}
