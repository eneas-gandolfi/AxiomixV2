/**
 * Arquivo: src/components/whatsapp/conversation-quick-actions.tsx
 * Proposito: Acoes rapidas inline para conversas.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState } from "react";
import { CheckCircle2, StickyNote, UserPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConversationQuickActionsProps = {
  conversationId: string;
  conversationUrl?: string;
  onResolve?: () => void;
  onAddNote?: () => void;
  onAssign?: () => void;
};

export function ConversationQuickActions({
  conversationId,
  conversationUrl,
  onResolve,
  onAddNote,
  onAssign,
}: ConversationQuickActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (conversationUrl) {
      navigator.clipboard.writeText(conversationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      {onResolve && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResolve();
          }}
          className="h-7 w-7 p-0"
          title="Marcar como resolvida"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {onAddNote && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddNote();
          }}
          className="h-7 w-7 p-0"
          title="Adicionar nota"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </Button>
      )}

      {onAssign && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAssign();
          }}
          className="h-7 w-7 p-0"
          title="Atribuir responsável"
        >
          <UserPlus className="h-3.5 w-3.5" />
        </Button>
      )}

      {conversationUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCopyLink();
          }}
          className="h-7 w-7 p-0"
          title="Copiar link"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
