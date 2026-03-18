/**
 * Arquivo: src/components/whatsapp/conversation-filters-compact.tsx
 * Propósito: Filtros horizontais compactos com chips para WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState, type ChangeEvent } from "react";
import {
  Search,
  Smile,
  Meh,
  Frown,
  ShoppingCart,
  Headphones,
  AlertTriangle,
  HelpCircle,
  XCircle,
  MoreHorizontal,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Sentiment = "all" | "positivo" | "neutro" | "negativo" | "not_analyzed";
type Intent = "all" | "compra" | "suporte" | "reclamacao" | "duvida" | "cancelamento" | "outro";
type Status = "all" | "open" | "closed";
type Period = "7" | "30" | "all";

export type ConversationFilters = {
  sentiment: Sentiment;
  intent: Intent;
  status: Status;
  period: Period;
  search: string;
};

type ConversationFiltersCompactProps = {
  onFiltersChange: (filters: ConversationFilters) => void;
};

type ChipProps = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  color?: "success" | "warning" | "danger" | "primary";
};

function Chip({ label, icon: Icon, active, onClick, color }: ChipProps) {
  const colorClasses = {
    success: active ? "bg-success text-white" : "hover:bg-success-light hover:text-success",
    warning: active ? "bg-warning text-white" : "hover:bg-warning-light hover:text-warning",
    danger: active ? "bg-danger text-white" : "hover:bg-danger-light hover:text-danger",
    primary: active ? "bg-primary text-white" : "hover:bg-primary-light hover:text-primary",
  };

  const baseClasses = "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer";
  const activeClasses = active
    ? color
      ? colorClasses[color]
      : "bg-primary text-white"
    : "bg-background text-muted border border-border hover:border-primary hover:text-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}

export function ConversationFiltersCompact({ onFiltersChange }: ConversationFiltersCompactProps) {
  const [filters, setFilters] = useState<ConversationFilters>({
    sentiment: "all",
    intent: "all",
    status: "all",
    period: "7",
    search: "",
  });

  const handleFilterChange = <K extends keyof ConversationFilters>(
    key: K,
    value: ConversationFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFilterChange("search", event.target.value);
  };

  const handleClearFilters = () => {
    const defaultFilters: ConversationFilters = {
      sentiment: "all",
      intent: "all",
      status: "all",
      period: "7",
      search: "",
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.sentiment !== "all" ||
    filters.intent !== "all" ||
    filters.status !== "all" ||
    filters.period !== "7" ||
    filters.search !== "";

  return (
    <div className="mb-4 space-y-3">
      {/* Busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={filters.search}
            onChange={handleSearchChange}
            className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Filtros de Sentimento */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Sentimento:</span>
        <Chip
          label="Positivo"
          icon={Smile}
          active={filters.sentiment === "positivo"}
          onClick={() => handleFilterChange("sentiment", filters.sentiment === "positivo" ? "all" : "positivo")}
          color="success"
        />
        <Chip
          label="Neutro"
          icon={Meh}
          active={filters.sentiment === "neutro"}
          onClick={() => handleFilterChange("sentiment", filters.sentiment === "neutro" ? "all" : "neutro")}
          color="warning"
        />
        <Chip
          label="Negativo"
          icon={Frown}
          active={filters.sentiment === "negativo"}
          onClick={() => handleFilterChange("sentiment", filters.sentiment === "negativo" ? "all" : "negativo")}
          color="danger"
        />
        <span className="mx-1 h-4 w-px bg-[var(--color-border)]" />
        <Chip
          label="Sem análise"
          active={filters.sentiment === "not_analyzed"}
          onClick={() => handleFilterChange("sentiment", filters.sentiment === "not_analyzed" ? "all" : "not_analyzed")}
        />
      </div>

      {/* Filtros de Intenção */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Intenção:</span>
        <Chip
          label="Compra"
          icon={ShoppingCart}
          active={filters.intent === "compra"}
          onClick={() => handleFilterChange("intent", filters.intent === "compra" ? "all" : "compra")}
          color="success"
        />
        <Chip
          label="Suporte"
          icon={Headphones}
          active={filters.intent === "suporte"}
          onClick={() => handleFilterChange("intent", filters.intent === "suporte" ? "all" : "suporte")}
          color="primary"
        />
        <Chip
          label="Reclamação"
          icon={AlertTriangle}
          active={filters.intent === "reclamacao"}
          onClick={() => handleFilterChange("intent", filters.intent === "reclamacao" ? "all" : "reclamacao")}
          color="danger"
        />
        <Chip
          label="Dúvida"
          icon={HelpCircle}
          active={filters.intent === "duvida"}
          onClick={() => handleFilterChange("intent", filters.intent === "duvida" ? "all" : "duvida")}
          color="warning"
        />
        <Chip
          label="Cancelamento"
          icon={XCircle}
          active={filters.intent === "cancelamento"}
          onClick={() => handleFilterChange("intent", filters.intent === "cancelamento" ? "all" : "cancelamento")}
          color="danger"
        />
        <Chip
          label="Outro"
          icon={MoreHorizontal}
          active={filters.intent === "outro"}
          onClick={() => handleFilterChange("intent", filters.intent === "outro" ? "all" : "outro")}
        />
      </div>

      {/* Filtros de Período */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Período:</span>
        <Chip
          label="7 dias"
          icon={Clock}
          active={filters.period === "7"}
          onClick={() => handleFilterChange("period", "7")}
        />
        <Chip
          label="30 dias"
          icon={Clock}
          active={filters.period === "30"}
          onClick={() => handleFilterChange("period", "30")}
        />
        <Chip
          label="Todas"
          icon={Clock}
          active={filters.period === "all"}
          onClick={() => handleFilterChange("period", "all")}
        />
      </div>
    </div>
  );
}
