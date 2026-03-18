/**
 * Arquivo: src/components/rag/knowledge-base-module.tsx
 * Proposito: Modulo client que orquestra upload, lista e chat da Base de Conhecimento.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useCallback, useState } from "react";
import { DocumentUpload } from "@/components/rag/document-upload";
import { DocumentList } from "@/components/rag/document-list";
import { KnowledgeChat } from "@/components/rag/knowledge-chat";

type KnowledgeBaseModuleProps = {
  companyId: string;
};

export function KnowledgeBaseModule({ companyId }: KnowledgeBaseModuleProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-sm text-foreground">
          Esta area alimenta o cerebro da IA com contexto do seu negocio. A IA consulta os
          documentos enviados pela sua empresa e tambem os playbooks padrao da Axiomix para
          melhorar a analise de conversas, diagnosticar gargalos e sugerir proximos passos mais
          aplicaveis ao dia a dia da operacao.
        </p>
      </section>

      {/* Upload */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          Treinar a IA com documentos do negocio
        </h2>
        <DocumentUpload companyId={companyId} onUploadComplete={handleUploadComplete} />
      </section>

      {/* Lista de documentos */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          Documentos disponiveis
        </h2>
        <DocumentList companyId={companyId} refreshKey={refreshKey} />
      </section>

      {/* Chat */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          Validar o que a IA aprendeu
        </h2>
        <KnowledgeChat companyId={companyId} />
      </section>
    </div>
  );
}
