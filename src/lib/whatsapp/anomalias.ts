/**
 * Arquivo: src/lib/whatsapp/anomalias.ts
 * Proposito: Deteccao de anomalias vs baseline PROPRIO do tenant (Intelligence
 *            Layer). Compara a janela atual (7d) com o baseline anterior
 *            (21d, normalizado por semana) em 3 metricas:
 *              - TFR medio (tempo de primeira resposta)
 *              - % de sentimento negativo nos insights
 *              - volume de mensagens inbound
 *            Regra: desvio relativo >= 40% + amostra minima na janela atual
 *            vira Anomalia (>= 80% = critica). Funcao pura, sem I/O.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

import {
  computeTfrStats,
  classifyMessageDirection,
  type MessageLight,
} from "@/lib/whatsapp/pulso-comercial";

const DAY_MS = 86_400_000;
export const ANOMALIA_JANELA_DIAS = 7;
export const ANOMALIA_BASELINE_DIAS = 21;
const DESVIO_MINIMO = 0.4;
const DESVIO_CRITICO = 0.8;
const AMOSTRA_MINIMA = 10;

export type AnomaliaMetrica = "tfr" | "sentimento_negativo" | "volume_inbound";
export type AnomaliaDirecao = "piora" | "melhora";
export type AnomaliaSeveridade = "atencao" | "critica";

export type Anomalia = {
  metrica: AnomaliaMetrica;
  direcao: AnomaliaDirecao;
  /** Desvio relativo vs baseline em % (positivo = metrica subiu). */
  deltaPct: number;
  severidade: AnomaliaSeveridade;
  atual: number;
  baseline: number;
};

export type InsightLight = {
  sentiment: string | null;
  generatedAt: string | null;
};

export type DetectAnomaliasInput = {
  /** Mensagens cobrindo pelo menos os ultimos 28 dias. */
  messages: MessageLight[];
  /** Insights cobrindo pelo menos os ultimos 28 dias. */
  insights: InsightLight[];
  now: Date;
};

function severidadeFor(absDesvio: number): AnomaliaSeveridade {
  return absDesvio >= DESVIO_CRITICO ? "critica" : "atencao";
}

function pushIfAnomalous(
  out: Anomalia[],
  metrica: AnomaliaMetrica,
  atual: number,
  baseline: number,
  pioraQuandoSobe: boolean,
) {
  if (baseline <= 0) return;
  const desvio = (atual - baseline) / baseline;
  if (Math.abs(desvio) < DESVIO_MINIMO) return;
  const subiu = desvio > 0;
  out.push({
    metrica,
    direcao: subiu === pioraQuandoSobe ? "piora" : "melhora",
    deltaPct: Math.round(desvio * 100),
    severidade: severidadeFor(Math.abs(desvio)),
    atual: Math.round(atual * 100) / 100,
    baseline: Math.round(baseline * 100) / 100,
  });
}

export function detectAnomalias(input: DetectAnomaliasInput): Anomalia[] {
  const { messages, insights, now } = input;
  const out: Anomalia[] = [];

  const janelaStart = new Date(now.getTime() - ANOMALIA_JANELA_DIAS * DAY_MS);
  const baselineStart = new Date(
    janelaStart.getTime() - ANOMALIA_BASELINE_DIAS * DAY_MS,
  );

  // ---- TFR medio (piora quando sobe) ----
  const tfrAtual = computeTfrStats(messages, janelaStart, now);
  const tfrBaseline = computeTfrStats(messages, baselineStart, janelaStart);
  if (
    tfrAtual.sampleSize >= AMOSTRA_MINIMA &&
    tfrBaseline.sampleSize >= AMOSTRA_MINIMA &&
    tfrAtual.avgSeconds !== null &&
    tfrBaseline.avgSeconds !== null
  ) {
    pushIfAnomalous(out, "tfr", tfrAtual.avgSeconds, tfrBaseline.avgSeconds, true);
  }

  // ---- % sentimento negativo (piora quando sobe) ----
  const janelaStartMs = janelaStart.getTime();
  const baselineStartMs = baselineStart.getTime();
  let atualTotal = 0;
  let atualNeg = 0;
  let baseTotal = 0;
  let baseNeg = 0;
  for (const insight of insights) {
    if (!insight.generatedAt) continue;
    const ts = new Date(insight.generatedAt).getTime();
    if (Number.isNaN(ts) || ts > now.getTime()) continue;
    const negativo = insight.sentiment === "negativo";
    if (ts >= janelaStartMs) {
      atualTotal += 1;
      if (negativo) atualNeg += 1;
    } else if (ts >= baselineStartMs) {
      baseTotal += 1;
      if (negativo) baseNeg += 1;
    }
  }
  if (atualTotal >= AMOSTRA_MINIMA && baseTotal >= AMOSTRA_MINIMA) {
    pushIfAnomalous(
      out,
      "sentimento_negativo",
      (atualNeg / atualTotal) * 100,
      (baseNeg / baseTotal) * 100,
      true,
    );
  }

  // ---- Volume inbound semanal (piora quando cai) ----
  let atualInbound = 0;
  let baseInbound = 0;
  for (const m of messages) {
    if (classifyMessageDirection(m.direction) !== "inbound") continue;
    const ts = new Date(m.sentAt).getTime();
    if (Number.isNaN(ts) || ts > now.getTime()) continue;
    if (ts >= janelaStartMs) atualInbound += 1;
    else if (ts >= baselineStartMs) baseInbound += 1;
  }
  const baselineSemanal = baseInbound / (ANOMALIA_BASELINE_DIAS / 7);
  if (atualInbound + baseInbound >= AMOSTRA_MINIMA * 2) {
    pushIfAnomalous(out, "volume_inbound", atualInbound, baselineSemanal, false);
  }

  // Pioras criticas primeiro.
  const rank = (a: Anomalia) =>
    (a.direcao === "piora" ? 0 : 2) + (a.severidade === "critica" ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b));
}
