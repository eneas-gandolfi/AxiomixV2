/**
 * Arquivo: src/lib/dashboard/insights/types.ts
 * Propósito: Tipos do "Insight prioritário" do dashboard global. Heurística
 *            determinística por nicho — IA descreve "o quê" via dado, nunca
 *            "porquê" (Mary's red line). Strategy pattern pra que adicionar
 *            uma nova regra (ex: spike de intent, queda de sentimento) seja
 *            uma linha no registry, não um refactor.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

import type { NicheSlug } from "@/lib/niches";
import type { StalledConversations } from "@/lib/dashboard/selectors/stalledConversations";

export type InsightSeverity = "info" | "amber" | "red";

/** Métrica concreta exibida em destaque no card de insight. Sally + Caravaggio
 *  + John + Mary alinharam: insight sem número é fofoca. Esse campo dá ao
 *  insight a magnitude que o HeroMetric (contagem) não cobre. */
export type InsightMetric = {
  /** Valor principal em destaque (ex: "18min", "R$ 4.280", "+38%"). */
  value: string;
  /** Contexto curto opcional (ex: "meta 5min · em 3 conversas"). */
  sub?: string;
};

export type Insight = {
  /** Identificador da regra que produziu este insight (ex: "tfr-breach"). */
  ruleId: string;
  /** Severidade pra ordenação e cor do card. */
  severity: InsightSeverity;
  /** Score de prioridade (0-100). Maior = mais prioritário. Tie-break: red > amber > info. */
  priority: number;
  /** Título curto do card (ex: "3 conversas estouraram o tempo de resposta hoje"). */
  title: string;
  /** Corpo explicativo em 1-2 frases, em tom de pergunta acionável. */
  body: string;
  /** Texto do CTA (ex: "Ver fila"). */
  ctaLabel: string;
  /** Destino do CTA (rota interna). */
  ctaHref: string;
  /** Métrica concreta a destacar no topo do card (opcional). Quando ausente,
   *  o card é só texto + CTA — fallback pra strategies que não têm número. */
  metric?: InsightMetric;
};

export type InsightContext = {
  nicheSlug: NicheSlug;
  stalled: StalledConversations;
};

export type InsightStrategy = {
  /** Identificador estável (debug, telemetria, dedup). */
  id: string;
  /** Avalia o contexto. Retorna `null` quando a regra não dispara. */
  run(context: InsightContext): Insight | null;
};
