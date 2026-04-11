/**
 * Arquivo: src/components/whatsapp/conversation-chat.tsx
 * Propósito: Chat de conversa com histórico, envio otimista e polling de novas mensagens.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Image, Loader2, MapPin, Mic, RefreshCw, Send, Smile, Sparkles, Video, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type MessageData = {
  id: string;
  content: string | null;
  direction: string | null;
  sent_at: string | null;
  message_type?: string | null;
};

const MEDIA_TYPE_MAP: Record<string, { label: string; icon: typeof Mic }> = {
  audio: { label: "Áudio", icon: Mic },
  voice: { label: "Áudio", icon: Mic },
  ptt: { label: "Áudio", icon: Mic },
  image: { label: "Imagem", icon: Image },
  photo: { label: "Imagem", icon: Image },
  video: { label: "Vídeo", icon: Video },
  document: { label: "Documento", icon: FileText },
  file: { label: "Documento", icon: FileText },
  sticker: { label: "Figurinha", icon: Smile },
  location: { label: "Localização", icon: MapPin },
};

function getMediaInfo(messageType?: string | null) {
  if (!messageType) return null;
  return MEDIA_TYPE_MAP[messageType] ?? null;
}

type ConversationChatProps = {
  companyId: string;
  conversationId: string;
  conversationExternalId: string | null;
  initialMessages: MessageData[];
  pollIntervalMs?: number;
};

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
}

function deduplicateMessages(messages: MessageData[]): MessageData[] {
  const seen = new Set<string>();
  return messages.filter((m) => {
    // Mensagens otimistas e enviadas usam ids únicos, manter sempre
    if (m.id.startsWith("optimistic-") || m.id.startsWith("sent-")) {
      return true;
    }
    // Deduplicar por fingerprint (sent_at + direction + content)
    const fp = `${m.sent_at}::${m.direction}::${m.content ?? ""}`;
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  });
}

export function ConversationChat({
  companyId,
  conversationId,
  conversationExternalId,
  initialMessages,
  pollIntervalMs = 10000,
}: ConversationChatProps) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detectar se o usuário está no final do scroll
  const checkAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  // Scroll para o final somente se o usuário já estava lá
  useEffect(() => {
    if (wasAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Polling: buscar novas mensagens periodicamente
  const fetchNewMessages = useCallback(async () => {
    if (!conversationId) return;

    setPolling(true);
    try {
      // Primeiro: sync da conversa com Sofia CRM (traz mensagens novas do WhatsApp)
      if (conversationExternalId) {
        await fetch("/api/sofia-crm/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, conversationId }),
        });
      }

      // Depois: buscar todas as mensagens atualizadas do banco local
      const response = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, conversationId }),
      });

      if (response.ok) {
        const data = await response.json();
        const serverMessages: MessageData[] = data.messages ?? [];

        setMessages((prev) => {
          // Manter mensagens otimistas/enviadas que ainda não estão no server
          const optimistic = prev.filter(
            (m) => m.id.startsWith("optimistic-") || m.id.startsWith("sent-")
          );

          // Deduplicar: remover otimistas que já chegaram do server
          const serverContents = new Set(
            serverMessages.map((m) => `${m.direction}::${m.content}`)
          );
          const remainingOptimistic = optimistic.filter(
            (m) => !serverContents.has(`${m.direction}::${m.content}`)
          );

          return deduplicateMessages([...serverMessages, ...remainingOptimistic]);
        });
      }
    } catch {
      // Silently fail — polling continuará na próxima iteração
    } finally {
      setPolling(false);
    }
  }, [companyId, conversationId, conversationExternalId]);

  useEffect(() => {
    // Polling periódico
    const interval = setInterval(fetchNewMessages, pollIntervalMs);

    // Pausar quando tab não está visível
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchNewMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchNewMessages, pollIntervalMs]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !conversationExternalId) return;

    const optimisticMsg: MessageData = {
      id: `optimistic-${Date.now()}`,
      content,
      direction: "outbound",
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
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

      // Confirmar: trocar id otimista por definitivo
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id
            ? { ...m, id: `sent-${Date.now()}` }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
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

  const handleSuggestResponse = async () => {
    setIsGenerating(true);
    setSuggestion(null);
    try {
      const response = await fetch("/api/whatsapp/suggest-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, conversationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Erro ao gerar sugestão.");
      }

      const data = await response.json();
      setSuggestion(data.suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar sugestão.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseSuggestion = () => {
    if (suggestion) {
      setInput(suggestion);
      setSuggestion(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Área de mensagens com scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={checkAtBottom}
        className="max-h-[500px] space-y-3 overflow-y-auto bg-background p-6"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted">Sem mensagens sincronizadas para esta conversa.</p>
        ) : (
          messages.map((message) => {
            const outbound = message.direction === "outbound";
            const isOptimistic = message.id.startsWith("optimistic-");

            return (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  outbound
                    ? "ml-auto bg-primary-light"
                    : "mr-auto border border-border bg-card"
                } ${isOptimistic ? "opacity-70" : ""}`}
              >
                {(() => {
                  const media = getMediaInfo(message.message_type);
                  if (!message.content && media) {
                    const Icon = media.icon;
                    return (
                      <p className="flex items-center gap-1.5 text-muted italic">
                        <Icon className="h-3.5 w-3.5" />
                        {media.label}
                        <span className="text-xs opacity-60">(processando...)</span>
                      </p>
                    );
                  }
                  if (message.content && media) {
                    const Icon = media.icon;
                    return (
                      <div>
                        <p className="flex items-center gap-1.5 text-muted italic text-xs mb-0.5">
                          <Icon className="h-3 w-3" />
                          {media.label}
                        </p>
                        <p className="text-text">{message.content}</p>
                      </div>
                    );
                  }
                  return <p className="text-text">{message.content || "(mensagem sem texto)"}</p>;
                })()}
                <p className="mt-1 text-xs text-muted-light">
                  {formatDate(message.sent_at)}
                  {isOptimistic && " · Enviando..."}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Form de envio + indicador de polling */}
      {conversationExternalId && (
        <div className="border-t border-border bg-card p-4">
          {error && (
            <p className="mb-2 text-xs text-danger">{error}</p>
          )}

          {/* Card de sugestão da IA */}
          {suggestion && (
            <div className="mb-3 rounded-lg border border-[#FA5E24]/30 bg-[#FA5E24]/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#FA5E24]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sugestão da IA
                </div>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="rounded p-0.5 text-muted hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mb-3 text-sm text-text">{suggestion}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUseSuggestion}
                  className="h-7 text-xs"
                >
                  Usar resposta
                </Button>
                <button
                  type="button"
                  onClick={handleSuggestResponse}
                  disabled={isGenerating}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:text-text disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerar
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleSuggestResponse}
              disabled={isGenerating}
              className="h-10 shrink-0 gap-1.5 text-xs"
              title="Sugerir resposta com IA"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isGenerating ? "Gerando..." : "IA"}</span>
            </Button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
              disabled={sending || !input.trim()}
              className="h-10 w-10 shrink-0 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-muted">
              Enter para enviar, Shift+Enter para quebra de linha
            </p>
            <div className="flex items-center gap-1 text-xs text-muted">
              <Wifi className={`h-3 w-3 ${polling ? "text-[#2EC4B6] animate-pulse" : "text-success"}`} />
              <span>Auto-sync {polling ? "..." : "ativo"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
