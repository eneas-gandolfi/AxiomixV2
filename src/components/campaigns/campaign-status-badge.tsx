/**
 * Arquivo: src/components/campaigns/campaign-status-badge.tsx
 * Propósito: Badge visual de status de campanha e de destinatario.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { Loader2 } from "lucide-react";
import {
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_STATUS_LABELS,
  RECIPIENT_STATUS_COLORS,
  RECIPIENT_STATUS_LABELS,
  type CampaignStatus,
  type RecipientStatus,
} from "@/types/modules/campaigns.types";

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const color = CAMPAIGN_STATUS_COLORS[status];
  const label = CAMPAIGN_STATUS_LABELS[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {status === "running" && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {label}
    </span>
  );
}

export function RecipientStatusBadge({ status }: { status: RecipientStatus }) {
  const color = RECIPIENT_STATUS_COLORS[status];
  const label = RECIPIENT_STATUS_LABELS[status];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {label}
    </span>
  );
}
