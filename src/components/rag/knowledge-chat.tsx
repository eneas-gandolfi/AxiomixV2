/**
 * Arquivo: src/components/rag/knowledge-chat.tsx
 * Propósito: Interface de perguntas e respostas sobre a base de conhecimento RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useCallback, useState } from "react";
import { Send, FileText, Loader2 } from "lucide-react";
import { App } from "antd";

type Source = {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
};

type QueryResult = {
  answer: string;
  sources: Source[];
};

type KnowledgeChatProps = {
  companyId: string;
};

export function KnowledgeChat({ companyId }: KnowledgeChatProps) {
  const { message } = App.useApp();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = question.trim();
      if (!trimmed || trimmed.length < 3) {
        message.warning("Digite uma pergunta com pelo menos 3 caracteres.");
        return;
      }

      setIsLoading(true);
      setResult(null);

      try {
        const response = await fetch("/api/rag/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, question: trimmed }),
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "Falha na consulta.");
        }

        const data: QueryResult = await response.json();
        setResult(data);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Erro inesperado.";
        message.error(detail);
      } finally {
        setIsLoading(false);
      }
    },
    [companyId, question]
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Use este campo para testar se a IA absorveu corretamente os documentos antes de analisar
        conversas reais do WhatsApp.
      </p>

      {/* Input de pergunta */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex.: como a IA deve conduzir um lead interessado em puxada com supino?"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || question.trim().length < 3}
          className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Perguntar
        </button>
      </form>

      {/* Resposta */}
      {result && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {result.answer}
            </p>
          </div>

          {/* Fontes */}
          {result.sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                Fontes utilizadas
              </p>
              <div className="grid gap-2">
                {result.sources.map((source, i) => (
                  <div
                    key={source.id}
                    className="flex items-start gap-2 p-3 rounded-lg bg-background border border-border"
                  >
                    <FileText className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        Fonte {i + 1} — relevancia {Math.round(source.similarity * 100)}%
                      </p>
                      <p className="text-xs text-muted mt-1 line-clamp-2">
                        {source.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
