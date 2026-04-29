/**
 * Arquivo: src/components/social/demands-page-client.tsx
 * Propósito: Wrapper client-side para a página de demandas com toggle tabela/kanban.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutList, Kanban, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DemandsTable } from "./demands-table";
import { DemandsKanban } from "./demands-kanban";
import { CreateDemandModal } from "./create-demand-modal";
import type { ContentDemandWithMeta, DemandStatus } from "@/types/modules/content-demands.types";

type DemandsPageClientProps = {
  companyId: string;
  teamMembers: Array<{ id: string; name: string }>;
};

type ViewMode = "table" | "kanban";

const STATUS_OPTIONS: Array<{ value: DemandStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "em_revisao", label: "Em Revisão" },
  { value: "alteracoes_solicitadas", label: "Alt. Solicitadas" },
  { value: "aprovado", label: "Aprovado" },
  { value: "agendado", label: "Agendado" },
  { value: "publicado", label: "Publicado" },
];

export function DemandsPageClient({ companyId, teamMembers }: DemandsPageClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [demands, setDemands] = useState<ContentDemandWithMeta[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DemandStatus | "all">("all");

  const fetchDemands = useCallback(async (p: number = 1, status?: DemandStatus | "all") => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ companyId, page: String(p) });
      if (status && status !== "all") params.set("status", status);

      const res = await fetch(`/api/social/demands?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDemands(data.items ?? []);
        setPage(data.page ?? 1);
        setTotal(data.total ?? 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDemands(1, statusFilter);
  }, [fetchDemands, statusFilter]);

  const handleViewDemand = (demand: ContentDemandWithMeta) => {
    router.push(`/social-publisher/demandas/${demand.id}`);
  };

  return (
    <Card accent className="rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg">Demandas de Conteúdo</CardTitle>
            <CardDescription>
              Gerencie o workflow de criação e aprovação de conteúdo
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-[var(--color-surface-2)] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-[var(--color-surface)] shadow-sm text-[var(--module-accent)]"
                    : "text-[var(--color-text-tertiary)]"
                }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "kanban"
                    ? "bg-[var(--color-surface)] shadow-sm text-[var(--module-accent)]"
                    : "text-[var(--color-text-tertiary)]"
                }`}
              >
                <Kanban className="h-4 w-4" />
              </button>
            </div>

            <CreateDemandModal
              companyId={companyId}
              teamMembers={teamMembers}
              onCreated={() => fetchDemands(1, statusFilter)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 pt-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DemandStatus | "all")}
              className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--module-accent,#8B5CF6)] focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && demands.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--module-accent)]" />
          </div>
        ) : viewMode === "table" ? (
          <div className="antd-scope">
            <DemandsTable
              demands={demands}
              page={page}
              total={total}
              isLoading={isLoading}
              onPageChange={(p) => fetchDemands(p, statusFilter)}
              onViewDemand={handleViewDemand}
            />
          </div>
        ) : (
          <DemandsKanban demands={demands} onViewDemand={handleViewDemand} />
        )}
      </CardContent>
    </Card>
  );
}
