/**
 * Arquivo: src/components/social/demands-kanban.tsx
 * Propósito: Visualização kanban das demandas com 6 colunas de status.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { DemandCard } from "./demand-card";
import {
  DEMAND_STATUS_LABELS,
  type ContentDemandWithMeta,
  type DemandStatus,
} from "@/types/modules/content-demands.types";

type DemandsKanbanProps = {
  demands: ContentDemandWithMeta[];
  onViewDemand: (demand: ContentDemandWithMeta) => void;
};

const COLUMNS: DemandStatus[] = [
  "rascunho",
  "em_revisao",
  "alteracoes_solicitadas",
  "aprovado",
  "agendado",
  "publicado",
];

const COLUMN_COLORS: Record<DemandStatus, string> = {
  rascunho: "border-t-gray-400",
  em_revisao: "border-t-amber-400",
  alteracoes_solicitadas: "border-t-red-400",
  aprovado: "border-t-green-400",
  agendado: "border-t-orange-400",
  publicado: "border-t-emerald-400",
};

export function DemandsKanban({ demands, onViewDemand }: DemandsKanbanProps) {
  const grouped = new Map<DemandStatus, ContentDemandWithMeta[]>();
  for (const status of COLUMNS) {
    grouped.set(status, []);
  }
  for (const demand of demands) {
    const list = grouped.get(demand.status);
    if (list) list.push(demand);
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div className="flex gap-3 min-w-[900px]">
        {COLUMNS.map((status) => {
          const items = grouped.get(status) ?? [];
          return (
            <div
              key={status}
              className={`flex-1 min-w-[150px] rounded-xl border border-[var(--color-border)] border-t-4 ${COLUMN_COLORS[status]} bg-[var(--color-surface-2)]/50`}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    {DEMAND_STATUS_LABELS[status]}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[200px]">
                {items.map((demand) => (
                  <DemandCard key={demand.id} demand={demand} onClick={onViewDemand} />
                ))}

                {items.length === 0 && (
                  <p className="text-center text-[10px] text-[var(--color-text-tertiary)] py-8">
                    Nenhuma demanda
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
