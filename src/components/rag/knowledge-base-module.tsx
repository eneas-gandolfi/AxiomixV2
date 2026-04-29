/**
 * Arquivo: src/components/rag/knowledge-base-module.tsx
 * Propósito: Módulo Base de Conhecimento com split layout —
 *            Vault (upload + docs) à esquerda, Chat de validação à direita.
 *            O cérebro que o Axiomix constrói em tempo real.
 * Autor: AXIOMIX
 * Redesign: Orange Command — proposta Sally
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Brain, FileText, MessageCircle } from "lucide-react";
import { DocumentUpload } from "@/components/rag/document-upload";
import { DocumentList } from "@/components/rag/document-list";
import { KnowledgeChat } from "@/components/rag/knowledge-chat";

type KnowledgeBaseModuleProps = {
  companyId: string;
};

type DocStats = {
  total: number;
  ready: number;
  processing: number;
  totalChunks: number;
};

function CoverageBar({ stats }: { stats: DocStats }) {
  // Cobertura estimada: cada doc pronto vale ~15%, cap em 100%
  const coverage = Math.min(stats.ready * 15, 100);
  const isLow = coverage < 40;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#7C3AED]" />
          <span className="ax-kpi-label !text-[11px]">
            Cobertura do Conhecimento
          </span>
        </div>
        <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">
          {coverage}%
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 w-full rounded-full bg-[var(--color-surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${coverage}%`,
            backgroundColor: isLow ? "var(--color-warning)" : "#7C3AED",
          }}
        />
      </div>

      {/* Métricas inline */}
      <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--color-text-tertiary)]">
        <span>{stats.total} documento{stats.total === 1 ? "" : "s"}</span>
        <span className="text-[var(--color-text-tertiary)]">·</span>
        <span>{stats.totalChunks.toLocaleString("pt-BR")} chunks indexados</span>
        {stats.processing > 0 && (
          <>
            <span className="text-[var(--color-text-tertiary)]">·</span>
            <span className="text-[var(--color-warning)]">
              {stats.processing} processando
            </span>
          </>
        )}
      </div>

      {/* Nudge se cobertura baixa */}
      {isLow && stats.total > 0 && (
        <p className="mt-2 text-[11px] text-[var(--color-warning)]">
          Considere adicionar FAQs ou um playbook de atendimento para cobrir mais cenários.
        </p>
      )}
    </div>
  );
}

export function KnowledgeBaseModule({ companyId }: KnowledgeBaseModuleProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<DocStats>({
    total: 0,
    ready: 0,
    processing: 0,
    totalChunks: 0,
  });
  const [mobileTab, setMobileTab] = useState<"vault" | "chat">("vault");

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Fetch doc stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `/api/rag/documents?companyId=${companyId}&statsOnly=true`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            items?: Array<{
              status: string;
              total_chunks: number | null;
            }>;
          };
          const docs = data.items ?? [];
          setStats({
            total: docs.length,
            ready: docs.filter((d) => d.status === "ready").length,
            processing: docs.filter((d) => d.status === "processing").length,
            totalChunks: docs.reduce(
              (sum, d) => sum + (d.total_chunks ?? 0),
              0
            ),
          });
        }
      } catch {
        // silently fail — stats are optional
      }
    }
    fetchStats();
  }, [companyId, refreshKey]);

  return (
    <div className="space-y-5">
      {/* Indicador de cobertura */}
      <CoverageBar stats={stats} />

      {/* Mobile tabs */}
      <div className="flex gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("vault")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
            mobileTab === "vault"
              ? "bg-[#7C3AED]/10 text-[#7C3AED]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <FileText className="h-4 w-4" />
          Vault
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
            mobileTab === "chat"
              ? "bg-[#7C3AED]/10 text-[#7C3AED]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Testar IA
        </button>
      </div>

      {/* Split layout desktop / Tabs mobile */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Esquerda — Knowledge Vault */}
        <div
          className={`space-y-5 ${mobileTab !== "vault" ? "hidden md:block" : ""}`}
        >
          {/* Header do vault */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#7C3AED]" />
            <h2 className="ax-t3 text-[var(--color-text)]">
              Vault de Conhecimento
            </h2>
          </div>

          {/* Upload */}
          <DocumentUpload
            companyId={companyId}
            onUploadComplete={handleUploadComplete}
          />

          {/* Lista de documentos */}
          <DocumentList companyId={companyId} refreshKey={refreshKey} />
        </div>

        {/* Direita — Chat de validação */}
        <div
          className={`${mobileTab !== "chat" ? "hidden md:block" : ""}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-4 w-4 text-[#7C3AED]" />
            <h2 className="ax-t3 text-[var(--color-text)]">
              Testar o que a IA aprendeu
            </h2>
          </div>

          <div className="rounded-xl border border-[#7C3AED]/15 bg-[#7C3AED]/[0.02] p-1">
            <KnowledgeChat companyId={companyId} />
          </div>

          <p className="mt-3 ax-caption text-center">
            Faça perguntas sobre seus documentos para validar que a IA entendeu o contexto.
          </p>
        </div>
      </div>
    </div>
  );
}
