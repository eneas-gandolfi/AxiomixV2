/**
 * Arquivo: src/types/modules/content-demands.types.ts
 * Propósito: Tipos do módulo de Workflow de Aprovação de Conteúdo (Demandas).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type { SocialPlatform } from "./social-publisher.types";

export type DemandStatus =
  | "rascunho"
  | "em_revisao"
  | "alteracoes_solicitadas"
  | "aprovado"
  | "agendado"
  | "publicado";

export type ContentDemand = {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  platforms: SocialPlatform[];
  dueDate: string | null;
  status: DemandStatus;
  mediaFileIds: string[];
  caption: string | null;
  scheduledPostId: string | null;
  approvalToken: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentDemandWithMeta = ContentDemand & {
  assigneeName: string | null;
  creatorName: string | null;
  commentCount: number;
  thumbnailUrl: string | null;
};

export type DemandComment = {
  id: string;
  demandId: string;
  userId: string | null;
  authorName: string | null;
  content: string;
  createdAt: string;
  userName?: string | null;
};

export type DemandHistoryEntry = {
  id: string;
  demandId: string;
  fromStatus: DemandStatus;
  toStatus: DemandStatus;
  comment: string | null;
  createdAt: string;
  userName?: string | null;
};

export type DemandCreateInput = {
  companyId: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  platforms: SocialPlatform[];
  dueDate?: string | null;
  caption?: string | null;
  mediaFileIds?: string[];
  createdBy: string;
};

export type DemandUpdateInput = {
  title?: string;
  description?: string | null;
  assignedTo?: string | null;
  platforms?: SocialPlatform[];
  dueDate?: string | null;
  caption?: string | null;
  mediaFileIds?: string[];
};

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em Revisão",
  alteracoes_solicitadas: "Alterações Solicitadas",
  aprovado: "Aprovado",
  agendado: "Agendado",
  publicado: "Publicado",
};

export const DEMAND_STATUS_COLORS: Record<DemandStatus, string> = {
  rascunho: "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
  em_revisao: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  alteracoes_solicitadas: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  aprovado: "bg-[var(--color-success-bg)] text-[#22C55E]",
  agendado: "bg-[var(--color-primary-dim)] text-[#FA5E24]",
  publicado: "bg-[var(--color-success-bg)] text-[#22C55E]",
};

/**
 * Transições de status permitidas:
 * rascunho → em_revisao
 * em_revisao → aprovado | alteracoes_solicitadas
 * alteracoes_solicitadas → em_revisao
 * aprovado → agendado
 * agendado → publicado (sistema)
 */
export const ALLOWED_TRANSITIONS: Record<DemandStatus, DemandStatus[]> = {
  rascunho: ["em_revisao"],
  em_revisao: ["aprovado", "alteracoes_solicitadas"],
  alteracoes_solicitadas: ["em_revisao"],
  aprovado: ["agendado"],
  agendado: ["publicado"],
  publicado: [],
};
