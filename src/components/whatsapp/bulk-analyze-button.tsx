/**
 * Arquivo: src/components/whatsapp/bulk-analyze-button.tsx
 * Propósito: Botão para disparar análise em lote de conversas pendentes.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type BulkAnalyzeButtonProps = {
  companyId: string;
};

export function BulkAnalyzeButton({ companyId }: BulkAnalyzeButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBulkAnalyze = async () => {
    setIsLoading(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/bulk-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        enqueuedAnalyses?: number;
      };

      if (!response.ok) {
        setError(payload.error ?? "Falha ao enfileirar análises.");
        return;
      }

      setFeedback(
        payload.message ?? `${payload.enqueuedAnalyses ?? 0} análise(s) enfileirada(s).`
      );

      // Aguardar 2 segundos e então refresh para mostrar jobs processados
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (requestError) {
      const detail =
        requestError instanceof Error ? requestError.message : "Erro inesperado ao analisar.";
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleBulkAnalyze}
        disabled={isLoading}
      >
        <Sparkles className={`h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
        {isLoading ? "Enfileirando..." : "Analisar todas pendentes"}
      </Button>
      {feedback ? <p className="text-xs text-success">{feedback}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
