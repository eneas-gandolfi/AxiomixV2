/**
 * Arquivo: src/components/social/demand-status-badge.tsx
 * Propósito: Badge colorido para exibir o status de uma demanda.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import {
  DEMAND_STATUS_LABELS,
  DEMAND_STATUS_COLORS,
  type DemandStatus,
} from "@/types/modules/content-demands.types";

type DemandStatusBadgeProps = {
  status: DemandStatus;
  size?: "sm" | "md";
};

export function DemandStatusBadge({ status, size = "sm" }: DemandStatusBadgeProps) {
  const label = DEMAND_STATUS_LABELS[status];
  const colorClass = DEMAND_STATUS_COLORS[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorClass} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      {label}
    </span>
  );
}
