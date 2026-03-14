/**
 * Arquivo: src/components/whatsapp/send-message-form.tsx
 * Propósito: Formulário de envio de mensagem direta numa conversa.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type SendMessageFormProps = {
  companyId: string;
  conversationExternalId: string;
};

export function SendMessageForm({ companyId, conversationExternalId }: SendMessageFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const content = message.trim();
    if (!content) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, conversationExternalId, content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Erro ao enviar mensagem.");
      }

      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      {error && (
        <p className="mb-2 text-xs text-danger">{error}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows={2}
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[#2EC4B6] focus:outline-none focus:ring-1 focus:ring-[#2EC4B6]"
          disabled={sending}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="h-10 w-10 shrink-0 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted">
        Enter para enviar, Shift+Enter para quebra de linha
      </p>
    </div>
  );
}
