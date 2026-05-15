/**
 * Arquivo: src/components/whatsapp/conversation-filters-compact.tsx
 * Propósito: Filtros da lista de Conversas — busca + 4 chips-trigger com
 *            popover (Sentimento, Intenção, Agente, Período). Chip ativo
 *            ganha fundo primary-dim + label do valor selecionado.
 *
 *            Default do period é "all" (mostra todas as conversas).
 * Autor: AXIOMIX
 * Data: 2026-05-12
 */

"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  CircleDot,
  Clock,
  Headphones,
  HelpCircle,
  Inbox,
  MoreHorizontal,
  Search,
  ShoppingCart,
  Smile,
  Target,
  UserCircle2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Sentiment = "all" | "positivo" | "neutro" | "negativo" | "not_analyzed";
type Intent =
  | "all"
  | "compra"
  | "suporte"
  | "reclamacao"
  | "duvida"
  | "cancelamento"
  | "outro";
// "active"   = open + pending + snoozed  (aba "Ativas" do Evo CRM)
// "archived" = resolved + closed         (aba "Arquivadas")
type Status =
  | "all"
  | "active"
  | "archived"
  | "open"
  | "pending"
  | "snoozed"
  | "resolved";
type Period = "1" | "7" | "30" | "all";

export type ConversationFilters = {
  sentiment: Sentiment;
  intent: Intent;
  status: Status;
  agent: string;
  inbox: string;
  period: Period;
  search: string;
};

export type InboxOption = {
  id: string;
  name: string | null;
  channel_type?: string | null;
};

type Props = {
  onFiltersChange: (filters: ConversationFilters) => void;
  agents?: Array<{ id: string; name: string | null }>;
  inboxes?: InboxOption[];
  initialFilters?: Partial<ConversationFilters>;
};

const DEFAULT_FILTERS: ConversationFilters = {
  sentiment: "all",
  intent: "all",
  // Default "active" espelha o comportamento do Evo CRM (abre direto em "Ativas").
  status: "active",
  agent: "all",
  inbox: "all",
  period: "all",
  search: "",
};

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  all: "",
  positivo: "Positivo",
  neutro: "Neutro",
  negativo: "Negativo",
  not_analyzed: "Sem análise",
};

const INTENT_LABEL: Record<Intent, string> = {
  all: "",
  compra: "Compra",
  suporte: "Suporte",
  reclamacao: "Reclamação",
  duvida: "Dúvida",
  cancelamento: "Cancelamento",
  outro: "Outro",
};

const PERIOD_LABEL: Record<Period, string> = {
  "1": "24h",
  "7": "7 dias",
  "30": "30 dias",
  all: "",
};

const STATUS_LABEL: Record<Status, string> = {
  all: "",
  active: "Ativas",
  archived: "Arquivadas",
  open: "Aberta",
  pending: "Pendente",
  snoozed: "Adiada",
  resolved: "Resolvida",
};

function formatChannelType(channelType: string | null | undefined): string | null {
  if (!channelType) return null;
  const normalized = channelType.toLowerCase();
  if (normalized.includes("whatsapp")) return "WhatsApp";
  if (normalized.includes("instagram")) return "Instagram";
  if (normalized.includes("messenger") || normalized.includes("facebook")) return "Messenger";
  if (normalized.includes("telegram")) return "Telegram";
  if (normalized.includes("email")) return "E-mail";
  return channelType;
}

// =============================================================================
// FilterChip — chip-trigger genérico com popover ancorado
// =============================================================================

type FilterChipProps = {
  icon: LucideIcon;
  label: string;
  activeLabel?: string;
  isActive: boolean;
  children: (close: () => void) => ReactNode;
};

function FilterChip({
  icon: Icon,
  label,
  activeLabel,
  isActive,
  children,
}: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const chipClasses = isActive
    ? "border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[var(--color-primary-dim)] text-[var(--color-primary)] font-semibold"
    : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-text-tertiary)] hover:text-[var(--color-text)]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[13px] font-medium transition-all ${chipClasses}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>
          {label}
          {activeLabel ? ` · ${activeLabel}` : ""}
        </span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-[10px] border border-[var(--color-border)] bg-white py-1.5"
          style={{ boxShadow: "0 8px 24px rgba(13,17,23,0.08)" }}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

// =============================================================================
// Subcomponentes do popover
// =============================================================================

function PopoverHeader({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
      {children}
    </p>
  );
}

type PopoverItemProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
  dotColor?: string;
};

function PopoverItem({
  active,
  onClick,
  label,
  icon: Icon,
  iconColor,
  dotColor,
}: PopoverItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--color-surface-2)] ${
        active
          ? "font-semibold text-[var(--color-primary)]"
          : "text-[var(--color-text)]"
      }`}
    >
      {dotColor ? (
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ background: dotColor }}
          aria-hidden
        />
      ) : null}
      {Icon ? (
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${iconColor ?? ""}`} />
      ) : null}
      <span className="flex-1 truncate">{label}</span>
      {active ? (
        <span className="flex-shrink-0 text-[10px] font-bold text-[var(--color-primary)]">
          ✓
        </span>
      ) : null}
    </button>
  );
}

function PopoverFooter({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-1 border-t border-[var(--color-border)] px-2 pt-1">
      <button
        type="button"
        onClick={onClear}
        className="w-full rounded-md px-2 py-1 text-left text-[12px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      >
        Limpar
      </button>
    </div>
  );
}

// =============================================================================
// Componente principal
// =============================================================================

export function ConversationFiltersCompact({
  onFiltersChange,
  agents = [],
  inboxes = [],
  initialFilters,
}: Props) {
  const [filters, setFilters] = useState<ConversationFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const updateFilter = <K extends keyof ConversationFilters>(
    key: K,
    value: ConversationFilters[K],
  ) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onFiltersChange(next);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateFilter("search", event.target.value);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  };

  // Compara com DEFAULT_FILTERS (não com "all") porque o default de status é
  // "active" — senão "Limpar filtros" apareceria sempre.
  const hasActiveFilters =
    filters.sentiment !== DEFAULT_FILTERS.sentiment ||
    filters.intent !== DEFAULT_FILTERS.intent ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.agent !== DEFAULT_FILTERS.agent ||
    filters.inbox !== DEFAULT_FILTERS.inbox ||
    filters.period !== DEFAULT_FILTERS.period ||
    filters.search !== DEFAULT_FILTERS.search;

  const agentActiveLabel =
    filters.agent !== "all"
      ? agents.find((a) => a.id === filters.agent)?.name ?? "Selecionado"
      : "";

  const inboxActiveLabel =
    filters.inbox !== "all"
      ? inboxes.find((i) => i.id === filters.inbox)?.name ?? "Selecionado"
      : "";

  return (
    <div className="mb-4 space-y-3">
      {/* Busca com × embutido */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={filters.search}
          onChange={handleSearchChange}
          className="h-10 w-full rounded-[10px] border border-transparent bg-[var(--color-surface-2)] pl-10 pr-10 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:bg-white"
        />
        {filters.search ? (
          <button
            type="button"
            onClick={() => updateFilter("search", "")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
            title="Limpar busca"
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Linha de chips-trigger */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status — espelha as abas "Ativas" / "Arquivadas" do Evo CRM */}
        <FilterChip
          icon={CircleDot}
          label="Status"
          activeLabel={STATUS_LABEL[filters.status]}
          isActive={filters.status !== "all"}
        >
          {(close) => (
            <>
              <PopoverHeader>Status</PopoverHeader>
              <PopoverItem
                active={filters.status === "active"}
                onClick={() => {
                  updateFilter("status", "active");
                  close();
                }}
                icon={CircleDot}
                iconColor="text-[var(--color-success)]"
                label="Ativas"
              />
              <PopoverItem
                active={filters.status === "archived"}
                onClick={() => {
                  updateFilter("status", "archived");
                  close();
                }}
                icon={Archive}
                iconColor="text-[var(--color-text-tertiary)]"
                label="Arquivadas"
              />
              <PopoverItem
                active={filters.status === "all"}
                onClick={() => {
                  updateFilter("status", "all");
                  close();
                }}
                label="Todas"
              />
              <div className="my-1 border-t border-[var(--color-border)]" aria-hidden />
              <PopoverHeader>Status individual</PopoverHeader>
              <PopoverItem
                active={filters.status === "open"}
                onClick={() => {
                  updateFilter("status", "open");
                  close();
                }}
                dotColor="var(--color-success)"
                label="Aberta"
              />
              <PopoverItem
                active={filters.status === "pending"}
                onClick={() => {
                  updateFilter("status", "pending");
                  close();
                }}
                dotColor="var(--color-warning)"
                label="Pendente"
              />
              <PopoverItem
                active={filters.status === "snoozed"}
                onClick={() => {
                  updateFilter("status", "snoozed");
                  close();
                }}
                dotColor="var(--color-text-tertiary)"
                label="Adiada"
              />
              <PopoverItem
                active={filters.status === "resolved"}
                onClick={() => {
                  updateFilter("status", "resolved");
                  close();
                }}
                dotColor="var(--color-primary)"
                label="Resolvida"
              />
            </>
          )}
        </FilterChip>

        {/* Sentimento */}
        <FilterChip
          icon={Smile}
          label="Sentimento"
          activeLabel={SENTIMENT_LABEL[filters.sentiment]}
          isActive={filters.sentiment !== "all"}
        >
          {(close) => (
            <>
              <PopoverHeader>Sentimento</PopoverHeader>
              <PopoverItem
                active={filters.sentiment === "negativo"}
                onClick={() => {
                  updateFilter("sentiment", "negativo");
                  close();
                }}
                dotColor="var(--color-danger)"
                label="Negativo"
              />
              <PopoverItem
                active={filters.sentiment === "neutro"}
                onClick={() => {
                  updateFilter("sentiment", "neutro");
                  close();
                }}
                dotColor="var(--color-warning)"
                label="Neutro"
              />
              <PopoverItem
                active={filters.sentiment === "positivo"}
                onClick={() => {
                  updateFilter("sentiment", "positivo");
                  close();
                }}
                dotColor="var(--color-success)"
                label="Positivo"
              />
              <PopoverItem
                active={filters.sentiment === "not_analyzed"}
                onClick={() => {
                  updateFilter("sentiment", "not_analyzed");
                  close();
                }}
                dotColor="var(--color-text-tertiary)"
                label="Sem análise"
              />
              {filters.sentiment !== "all" ? (
                <PopoverFooter
                  onClear={() => {
                    updateFilter("sentiment", "all");
                    close();
                  }}
                />
              ) : null}
            </>
          )}
        </FilterChip>

        {/* Intenção */}
        <FilterChip
          icon={Target}
          label="Intenção"
          activeLabel={INTENT_LABEL[filters.intent]}
          isActive={filters.intent !== "all"}
        >
          {(close) => (
            <>
              <PopoverHeader>Intenção</PopoverHeader>
              <PopoverItem
                active={filters.intent === "compra"}
                onClick={() => {
                  updateFilter("intent", "compra");
                  close();
                }}
                icon={ShoppingCart}
                iconColor="text-[var(--color-success)]"
                label="Compra"
              />
              <PopoverItem
                active={filters.intent === "suporte"}
                onClick={() => {
                  updateFilter("intent", "suporte");
                  close();
                }}
                icon={Headphones}
                iconColor="text-[var(--color-primary)]"
                label="Suporte"
              />
              <PopoverItem
                active={filters.intent === "reclamacao"}
                onClick={() => {
                  updateFilter("intent", "reclamacao");
                  close();
                }}
                icon={AlertTriangle}
                iconColor="text-[var(--color-danger)]"
                label="Reclamação"
              />
              <PopoverItem
                active={filters.intent === "duvida"}
                onClick={() => {
                  updateFilter("intent", "duvida");
                  close();
                }}
                icon={HelpCircle}
                iconColor="text-[var(--color-warning)]"
                label="Dúvida"
              />
              <PopoverItem
                active={filters.intent === "cancelamento"}
                onClick={() => {
                  updateFilter("intent", "cancelamento");
                  close();
                }}
                icon={XCircle}
                iconColor="text-[var(--color-danger)]"
                label="Cancelamento"
              />
              <PopoverItem
                active={filters.intent === "outro"}
                onClick={() => {
                  updateFilter("intent", "outro");
                  close();
                }}
                icon={MoreHorizontal}
                label="Outro"
              />
              {filters.intent !== "all" ? (
                <PopoverFooter
                  onClear={() => {
                    updateFilter("intent", "all");
                    close();
                  }}
                />
              ) : null}
            </>
          )}
        </FilterChip>

        {/* Agente */}
        {agents.length > 0 ? (
          <FilterChip
            icon={UserCircle2}
            label="Agente"
            activeLabel={agentActiveLabel}
            isActive={filters.agent !== "all"}
          >
            {(close) => (
              <>
                <PopoverHeader>Agente</PopoverHeader>
                {agents.map((agent) => (
                  <PopoverItem
                    key={agent.id}
                    active={filters.agent === agent.id}
                    onClick={() => {
                      updateFilter("agent", agent.id);
                      close();
                    }}
                    label={agent.name ?? agent.id}
                  />
                ))}
                {filters.agent !== "all" ? (
                  <PopoverFooter
                    onClear={() => {
                      updateFilter("agent", "all");
                      close();
                    }}
                  />
                ) : null}
              </>
            )}
          </FilterChip>
        ) : null}

        {/* Canal / Inbox */}
        {inboxes.length > 0 ? (
          <FilterChip
            icon={Inbox}
            label="Canal"
            activeLabel={inboxActiveLabel}
            isActive={filters.inbox !== "all"}
          >
            {(close) => (
              <>
                <PopoverHeader>Canal</PopoverHeader>
                {inboxes.map((inbox) => {
                  const channel = formatChannelType(inbox.channel_type);
                  const label =
                    inbox.name && channel
                      ? `${inbox.name} · ${channel}`
                      : inbox.name ?? channel ?? inbox.id;
                  return (
                    <PopoverItem
                      key={inbox.id}
                      active={filters.inbox === inbox.id}
                      onClick={() => {
                        updateFilter("inbox", inbox.id);
                        close();
                      }}
                      label={label}
                    />
                  );
                })}
                {filters.inbox !== "all" ? (
                  <PopoverFooter
                    onClear={() => {
                      updateFilter("inbox", "all");
                      close();
                    }}
                  />
                ) : null}
              </>
            )}
          </FilterChip>
        ) : null}

        {/* Período */}
        <FilterChip
          icon={Clock}
          label="Período"
          activeLabel={PERIOD_LABEL[filters.period]}
          isActive={filters.period !== "all"}
        >
          {(close) => (
            <>
              <PopoverHeader>Período</PopoverHeader>
              <PopoverItem
                active={filters.period === "1"}
                onClick={() => {
                  updateFilter("period", "1");
                  close();
                }}
                label="Últimas 24h"
              />
              <PopoverItem
                active={filters.period === "7"}
                onClick={() => {
                  updateFilter("period", "7");
                  close();
                }}
                label="Últimos 7 dias"
              />
              <PopoverItem
                active={filters.period === "30"}
                onClick={() => {
                  updateFilter("period", "30");
                  close();
                }}
                label="Últimos 30 dias"
              />
              <PopoverItem
                active={filters.period === "all"}
                onClick={() => {
                  updateFilter("period", "all");
                  close();
                }}
                label="Todas"
              />
            </>
          )}
        </FilterChip>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-auto text-[12px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:underline"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    </div>
  );
}
