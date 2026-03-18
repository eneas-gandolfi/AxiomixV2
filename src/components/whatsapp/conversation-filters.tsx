/**
 * Arquivo: src/components/whatsapp/conversation-filters.tsx
 * Propósito: Filtros e busca para lista de conversas do WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState, type ChangeEvent } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Sentiment = "all" | "positivo" | "neutro" | "negativo";
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

type ConversationFiltersProps = {
  onFiltersChange: (filters: ConversationFilters) => void;
};

export function ConversationFiltersComponent({ onFiltersChange }: ConversationFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Busca sempre visível */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={filters.search}
                onChange={handleSearchChange}
                className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={handleClearFilters}>
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filtros avançados */}
          {isExpanded && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Sentimento</label>
                <select
                  value={filters.sentiment}
                  onChange={(e) => handleFilterChange("sentiment", e.target.value as Sentiment)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Todos</option>
                  <option value="positivo">Positivo</option>
                  <option value="neutro">Neutro</option>
                  <option value="negativo">Negativo</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Intenção</label>
                <select
                  value={filters.intent}
                  onChange={(e) => handleFilterChange("intent", e.target.value as Intent)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Todas</option>
                  <option value="compra">Compra</option>
                  <option value="suporte">Suporte</option>
                  <option value="reclamacao">Reclamação</option>
                  <option value="duvida">Dúvida</option>
                  <option value="cancelamento">Cancelamento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value as Status)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Todas</option>
                  <option value="open">Aberta</option>
                  <option value="closed">Fechada</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Período</label>
                <select
                  value={filters.period}
                  onChange={(e) => handleFilterChange("period", e.target.value as Period)}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="all">Todas</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
