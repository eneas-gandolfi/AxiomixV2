/**
 * Arquivo: src/components/whatsapp/analyze-conversation-button.tsx
 * Propósito: Disparar analise de IA para uma conversa especifica.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type AnalyzeConversationButtonProps = {
  companyId: string;
  conversationId: string;
  hasInsight?: boolean;
};

export function AnalyzeConversationButton({
  companyId,
  conversationId,
  hasInsight,
}: AnalyzeConversationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/whatsapp/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        conversationId,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    setIsLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Falha ao analisar conversa.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={handleAnalyze} disabled={isLoading}>
        <Sparkles className="h-4 w-4" />
        {isLoading ? "Analisando..." : hasInsight ? "Reanalisar com IA" : "Analisar com IA"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
