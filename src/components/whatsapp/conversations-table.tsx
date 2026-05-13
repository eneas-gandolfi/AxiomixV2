/**
 * Arquivo: src/components/whatsapp/conversations-table.tsx
 * Propósito: Lista densa de conversas (estilo MGM/Axiomix Intelligence). Cada
 *            linha tem 60px, faixa lateral por sentiment, avatar + dot, chip
 *            de intent, timestamp relativo, avatar do vendedor responsável,
 *            e ações rápidas no hover. Substitui a antiga Antd Table.
 *
 *            Helpers exportados são reaproveitados por `batch-conversation-card`.
 * Autor: AXIOMIX
 * Data: 2026-05-12
 */

"use client";

import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Headphones,
  AlertTriangle,
  HelpCircle,
  XCircle,
  MoreHorizontal,
  MessageSquareDashed,
} from "lucide-react";
import { ContactAvatar } from "./contact-avatar";
import { ConversationQuickActions } from "./conversation-quick-actions";

type Sentiment = "positivo" | "neutro" | "negativo";

type ConversationData = {
  id: string;
  external_id: string | null;
  contact_name: string | null;
  contact_avatar_url: string | null;
  remote_jid: string;
  status: string | null;
  last_message_at: string | null;
  assigned_to: string | null;
  sentiment: Sentiment | null;
  intent: string | null;
};

type ConversationsTableProps = {
  conversations: ConversationData[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onResolve?: (conversationId: string) => void;
  agents?: Array<{ id: string; name: string | null }>;
};

// =============================================================================
// Helpers exportados (consumidos em batch-conversation-card.tsx)
// =============================================================================

export function sentimentBadgeClass(sentiment?: Sentiment | null) {
  if (sentiment === "positivo") return "bg-success-light text-success";
  if (sentiment === "negativo") return "bg-danger-light text-danger";
  if (sentiment === "neutro") return "bg-warning-light text-warning";
  return "bg-background text-muted";
}

export function sentimentLabel(sentiment?: Sentiment | null) {
  if (!sentiment) return "Sem análise";
  return sentiment;
}

export function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
}

export function getIntentIcon(intent?: string | null) {
  switch (intent) {
    case "compra":
      return ShoppingCart;
    case "suporte":
      return Headphones;
    case "reclamacao":
      return AlertTriangle;
    case "duvida":
      return HelpCircle;
    case "cancelamento":
      return XCircle;
    default:
      return MoreHorizontal;
  }
}

export function getIntentColor(intent?: string | null) {
  switch (intent) {
    case "compra":
      return "text-success";
    case "suporte":
      return "text-primary";
    case "reclamacao":
      return "text-danger";
    case "duvida":
      return "text-warning";
    case "cancelamento":
      return "text-danger";
    default:
      return "text-muted";
  }
}

function getIntentCssColor(intent?: string | null): string {
  switch (intent) {
    case "compra":
      return "var(--color-success)";
    case "suporte":
      return "var(--color-primary)";
    case "reclamacao":
      return "var(--color-danger)";
    case "duvida":
      return "var(--color-warning)";
    case "cancelamento":
      return "var(--color-danger)";
    default:
      return "var(--color-text-secondary)";
  }
}

export function getTimeSinceLastMessage(lastMessageAt?: string | null): string {
  if (!lastMessageAt) return "";

  const now = new Date();
  const lastMessage = new Date(lastMessageAt);
  const diffMs = now.getTime() - lastMessage.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "agora";
  if (diffHours < 1) return `${diffMinutes}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(lastMessageAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatContactDisplay(contactName: string | null, remoteJid: string): string {
  if (contactName && contactName.trim().length > 0) {
    return contactName.trim();
  }

  const phone = remoteJid.replace(/@s.whatsapp.net|@c.us/g, "");

  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const numero = phone.substring(4);

    if (numero.length === 9) {
      return `(${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
    } else if (numero.length === 8) {
      return `(${ddd}) ${numero.substring(0, 4)}-${numero.substring(4)}`;
    }
  }

  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") || phone;
}

// =============================================================================
// Helpers internos
// =============================================================================

function getMinutesSince(lastMessageAt: string | null): number {
  if (!lastMessageAt) return 0;
  return Math.floor((Date.now() - new Date(lastMessageAt).getTime()) / 60000);
}

function isAwaitingCritical(c: ConversationData): boolean {
  return (
    c.sentiment === "negativo" &&
    c.status !== "closed" &&
    getMinutesSince(c.last_message_at) >= 30
  );
}

function sentimentDotClass(s: Sentiment | null): string {
  if (s === "positivo") return "bg-[var(--color-success)]";
  if (s === "neutro") return "bg-[var(--color-warning)]";
  if (s === "negativo") return "bg-[var(--color-danger)]";
  return "bg-[var(--color-text-tertiary)]";
}

function sentimentBorderColor(s: Sentiment | null): string {
  if (s === "positivo") return "var(--color-success)";
  if (s === "neutro") return "var(--color-warning)";
  if (s === "negativo") return "var(--color-danger)";
  return "transparent";
}

function vendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (
    (parts[0][0]?.toUpperCase() ?? "") +
    (parts[parts.length - 1][0]?.toUpperCase() ?? "")
  );
}

// =============================================================================
// Empty state
// =============================================================================

function EmptyConversationsState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <MessageSquareDashed
        className="mb-4 h-16 w-16"
        style={{ stroke: "var(--color-text-tertiary)", strokeWidth: 1.25 }}
        aria-hidden
      />
      <p className="mb-1 text-[16px] font-semibold text-[var(--color-text-secondary)]">
        Tudo respondido por aqui.
      </p>
      <p className="text-[13px] text-[var(--color-text-tertiary)]">
        Nenhuma conversa encontrada com os filtros aplicados.
      </p>
    </div>
  );
}

// =============================================================================
// Row
// =============================================================================

type RowProps = {
  c: ConversationData;
  selectionMode: boolean;
  isSelected: boolean;
  vendorName: string | null;
  onToggle: () => void;
  onResolve?: () => void;
  onOpen: () => void;
};

function ConversationRow({
  c,
  selectionMode,
  isSelected,
  vendorName,
  onToggle,
  onResolve,
  onOpen,
}: RowProps) {
  const awaitingCritical = isAwaitingCritical(c);
  const IntentIcon = getIntentIcon(c.intent);
  const dotClass = sentimentDotClass(c.sentiment);
  const displayName =
    c.contact_name?.trim() || formatContactDisplay(null, c.remote_jid);
  const phoneSecondary = formatContactDisplay(null, c.remote_jid);
  const timeRelative = getTimeSinceLastMessage(c.last_message_at);

  // Borda lateral: 4px sólida quando crítico, 3px nas demais. Quando selecionado,
  // a borda laranja SOBRESCREVE a de sentiment (uma fonte de verdade visual).
  const borderColor = isSelected
    ? "var(--color-primary)"
    : sentimentBorderColor(c.sentiment);
  const borderWidth = awaitingCritical && !isSelected ? "4px" : "3px";

  // Background da linha (default fica como hover via Tailwind).
  let rowBg: string | undefined;
  if (isSelected) {
    rowBg = "var(--color-primary-dim)";
  } else if (awaitingCritical) {
    rowBg = "color-mix(in srgb, var(--color-danger) 4%, transparent)";
  }

  // peek (linha 2) — TODO: substituir por texto real da última mensagem
  // quando a coluna estiver disponível em conversations. Por enquanto mostra
  // telefone formatado quando há nome, ou data absoluta no fallback.
  const peekText = c.contact_name?.trim()
    ? phoneSecondary
    : formatDate(c.last_message_at);

  return (
    <li
      onClick={() => (selectionMode ? onToggle() : onOpen())}
      className="group relative flex h-[60px] cursor-pointer items-center gap-3 px-4 transition-colors hover:bg-[color-mix(in_srgb,var(--color-surface-2)_50%,transparent)]"
      style={{
        boxShadow: `inset ${borderWidth} 0 0 0 ${borderColor}`,
        background: rowBg,
      }}
    >
      {/* checkbox */}
      <div
        className={`flex w-4 justify-center ${
          selectionMode || isSelected
            ? ""
            : "opacity-0 transition-opacity group-hover:opacity-100"
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle()}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 cursor-pointer rounded accent-[var(--color-primary)]"
          aria-label={`Selecionar conversa com ${displayName}`}
        />
      </div>

      {/* avatar + dot de sentiment */}
      <div className="relative shrink-0">
        <ContactAvatar
          name={c.contact_name}
          avatarUrl={c.contact_avatar_url}
          size="md"
        />
        {c.sentiment ? (
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${dotClass} ${
              awaitingCritical ? "animate-pulse" : ""
            }`}
            style={{ border: "2px solid var(--color-surface)" }}
            aria-label={`Sentimento: ${c.sentiment}`}
          />
        ) : (
          <span
            className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-[var(--color-text-tertiary)]"
            aria-label="Sem análise"
          />
        )}
      </div>

      {/* bloco central */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span
            className="truncate text-[14px] font-semibold leading-tight tracking-[-0.01em] text-[var(--color-text)]"
            title={phoneSecondary}
          >
            {displayName}
          </span>
          {c.intent && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]"
              style={{
                background: `color-mix(in srgb, ${getIntentCssColor(c.intent)} 14%, transparent)`,
                color: getIntentCssColor(c.intent),
              }}
            >
              <IntentIcon className="h-3 w-3" />
              {c.intent}
            </span>
          )}
          {c.status === "closed" && (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
              · resolvida
            </span>
          )}
        </div>
        <p className="truncate text-[13px] text-[var(--color-text-secondary)]">
          {peekText}
        </p>
      </div>

      {/* coluna direita: badge "aguardando" + vendedor + timestamp */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {awaitingCritical && timeRelative && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-danger)]"
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              background: "color-mix(in srgb, var(--color-danger) 18%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
            }}
          >
            aguardando {timeRelative}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {vendorName ? (
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white"
              style={{ fontSize: "9px" }}
              title={vendorName}
            >
              {vendorInitials(vendorName)}
            </div>
          ) : null}
          <span className="text-[12px] font-medium tabular-nums text-[var(--color-text-tertiary)]">
            {timeRelative || "·"}
          </span>
        </div>
      </div>

      {/* quick actions on hover (não aparece em selectionMode) */}
      {!selectionMode && onResolve && (
        <div
          className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <ConversationQuickActions
            conversationId={c.id}
            conversationUrl={`/whatsapp-intelligence/conversas/${c.id}`}
            onResolve={onResolve}
          />
        </div>
      )}
    </li>
  );
}

// =============================================================================
// Componente principal
// =============================================================================

export function ConversationsTable({
  conversations,
  selectionMode,
  selectedIds,
  onToggleSelection,
  onResolve,
  agents = [],
}: ConversationsTableProps) {
  const router = useRouter();

  if (conversations.length === 0) {
    return <EmptyConversationsState />;
  }

  const vendorById = new Map(agents.map((a) => [a.id, a.name]));

  return (
    <ul className="divide-y divide-[var(--color-surface-2)]">
      {conversations.map((c) => {
        const isSelected = selectedIds.has(c.id);
        const vendorName = c.assigned_to
          ? vendorById.get(c.assigned_to) ?? null
          : null;
        return (
          <ConversationRow
            key={c.id}
            c={c}
            selectionMode={selectionMode}
            isSelected={isSelected}
            vendorName={vendorName}
            onToggle={() => onToggleSelection(c.id)}
            onResolve={
              onResolve && c.status !== "closed"
                ? () => onResolve(c.id)
                : undefined
            }
            onOpen={() =>
              router.push(`/whatsapp-intelligence/conversas?c=${c.id}`, {
                scroll: false,
              })
            }
          />
        );
      })}
    </ul>
  );
}
