/**
 * Arquivo: src/components/whatsapp/export-button.tsx
 * Proposito: Botao para exportar conversas filtradas para CSV.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportButtonProps = {
  companyId: string;
  conversationIds?: string[];
  filters?: {
    sentiment?: string;
    intent?: string;
    status?: string;
  };
};

export function ExportButton({ companyId, conversationIds, filters }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          conversationIds,
          ...filters,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Erro ao exportar dados.");
      }

      // Download do arquivo CSV
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      a.download = `whatsapp-intelligence-${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Erro ao exportar dados.";
      setError(detail);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
      >
        <Download className="h-4 w-4" />
        {isExporting ? "Exportando..." : "Exportar CSV"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
