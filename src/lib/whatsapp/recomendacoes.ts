/**
 * Arquivo: src/lib/whatsapp/recomendacoes.ts
 * Proposito: Gerar recomendacoes acionaveis a partir do estado agregado da
 *            Inteligencia Comercial. Heuristicas v0:
 *
 *              (a) Vendedor com N>=3 cold leads — sugere redistribuir
 *              (b) Horario com gap critico (TFR > 2x SLA) — sugere escalar
 *              (c) Objecao recorrente (>=20% das insights) — sugere treinar
 *              (d) Equipe acima do SLA medio (TFR > SLA) — sugere otimizar
 *
 *            Cada recomendacao tem nivel ('urgente' | 'importante') e categoria.
 *            Funcao pura — recebe estado pre-computado, devolve lista ordenada.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import type { ColdLead } from "@/lib/whatsapp/cold-leads";
import type { ObjecaoBucket } from "@/lib/whatsapp/objecoes";
import type { HeatmapCell } from "@/lib/whatsapp/heatmap-resposta";
import { DAY_LABEL } from "@/lib/whatsapp/heatmap-resposta";

export type RecomendacaoNivel = "urgente" | "importante";
export type RecomendacaoCategoria =
  | "redistribuicao"
  | "escalonamento"
  | "treinamento"
  | "otimizacao";

export type Recomendacao = {
  id: string;
  nivel: RecomendacaoNivel;
  categoria: RecomendacaoCategoria;
  titulo: string;
  descricao: string;
};

export type RecomendacoesInput = {
  coldLeads: ColdLead[];
  vendorNameById: Map<string, string>;
  worstGap: HeatmapCell | null;
  objections: ObjecaoBucket[];
  totalInsights: number;
  tfrAvgSec: number | null;
  slaSec: number;
};

const NIVEL_RANK: Record<RecomendacaoNivel, number> = {
  urgente: 0,
  importante: 1,
};

function formatGapWindow(cell: HeatmapCell): string {
  const day = DAY_LABEL[cell.day];
  const hStart = String(cell.hour).padStart(2, "0");
  const hEnd = String((cell.hour + 1) % 24).padStart(2, "0");
  return `${day} ${hStart}h-${hEnd}h`;
}

export function generateRecomendacoes(input: RecomendacoesInput): Recomendacao[] {
  const out: Recomendacao[] = [];

  // (a) Vendedor com muitos cold leads
  const coldByVendor = new Map<string, ColdLead[]>();
  for (const lead of input.coldLeads) {
    if (!lead.assignedTo) continue;
    const list = coldByVendor.get(lead.assignedTo) ?? [];
    list.push(lead);
    coldByVendor.set(lead.assignedTo, list);
  }
  for (const [vendorId, leads] of coldByVendor.entries()) {
    if (leads.length < 3) continue;
    const nome = input.vendorNameById.get(vendorId) ?? "Vendedor";
    out.push({
      id: `redistribuicao-${vendorId}`,
      nivel: "urgente",
      categoria: "redistribuicao",
      titulo: `Redistribuir ${leads.length} leads frios de ${nome}`,
      descricao: `${nome} acumula ${leads.length} conversas paradas. Considere transferir as mais antigas para outro vendedor com agenda mais leve.`,
    });
  }

  // (b) Horario com gap critico
  if (
    input.worstGap &&
    input.worstGap.medianTfrSec !== null &&
    input.worstGap.medianTfrSec > input.slaSec * 2
  ) {
    const tfrMin = Math.round(input.worstGap.medianTfrSec / 60);
    out.push({
      id: `escalonamento-${input.worstGap.day}-${input.worstGap.hour}`,
      nivel: "importante",
      categoria: "escalonamento",
      titulo: `Escalar atendimento no horario ${formatGapWindow(input.worstGap)}`,
      descricao: `Pico de chegada de leads concentra ${input.worstGap.inboundCount} contatos nessa faixa, mas o tempo medio de resposta sobe para ${tfrMin}min. Reveze almoco ou ligue resposta automatica.`,
    });
  }

  // (c) Objecao recorrente
  if (input.totalInsights > 0 && input.objections.length > 0) {
    const top = input.objections[0];
    const share = top.count / input.totalInsights;
    if (share >= 0.2 && top.count >= 3) {
      const pct = Math.round(share * 100);
      out.push({
        id: `treinamento-${top.categoria}`,
        nivel: "importante",
        categoria: "treinamento",
        titulo: `Objecao "${top.label}" aparece em ${pct}% das conversas`,
        descricao: `Treinar a equipe para contornar "${top.label}" — citacoes recentes: ${top.examples.slice(0, 2).join(" / ")}.`,
      });
    }
  }

  // (d) TFR medio acima do SLA
  if (input.tfrAvgSec !== null && input.tfrAvgSec > input.slaSec) {
    const tfrMin = Math.round(input.tfrAvgSec / 60);
    const slaMin = Math.round(input.slaSec / 60);
    out.push({
      id: `otimizacao-tfr-equipe`,
      nivel: tfrMin > slaMin * 2 ? "urgente" : "importante",
      categoria: "otimizacao",
      titulo: `Tempo medio de 1a resposta esta acima do SLA`,
      descricao: `Equipe responde em media em ${tfrMin}min — meta e <=${slaMin}min. Verifique notificacoes, escala e priorizacao de fila.`,
    });
  }

  out.sort((a, b) => NIVEL_RANK[a.nivel] - NIVEL_RANK[b.nivel]);
  return out.slice(0, 4);
}
