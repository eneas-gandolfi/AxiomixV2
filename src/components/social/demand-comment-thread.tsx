/**
 * Arquivo: src/components/social/demand-comment-thread.tsx
 * Propósito: Thread de comentários de uma demanda com formulário para novo comentário.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { MessageSquare, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemandComment } from "@/types/modules/content-demands.types";

type DemandCommentThreadProps = {
  demandId: string;
  companyId: string;
  comments: DemandComment[];
  onCommentAdded: () => void;
};

export function DemandCommentThread({
  demandId,
  companyId,
  comments,
  onCommentAdded,
}: DemandCommentThreadProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/demands/${demandId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao adicionar comentário.");
      }

      setContent("");
      onCommentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar comentário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[var(--module-accent)]" />
        Comentários ({comments.length})
      </h3>

      {/* Comments list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">
            Nenhum comentário ainda.
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-6 w-6 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center">
                  <User className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                </div>
                <span className="text-xs font-medium text-[var(--color-text)]">
                  {comment.userName ?? comment.authorName ?? "Usuário"}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">
                  {new Date(comment.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 min-h-[60px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--module-accent,#8B5CF6)] focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="self-end"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
