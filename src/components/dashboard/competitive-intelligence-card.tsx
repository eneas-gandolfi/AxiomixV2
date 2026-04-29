/**
 * Arquivo: src/components/dashboard/competitive-intelligence-card.tsx
 * Propósito: Card de destaques de inteligência competitiva para o dashboard
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { Zap, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DecisionAxis } from "@/components/ui/decision-axis";
import type { CompetitiveIntelligenceData } from "@/types/modules/dashboard.types";

type CompetitiveIntelligenceCardProps = {
  data: CompetitiveIntelligenceData;
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  facebook: "Facebook",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-[#E1306C]/10 text-[#E1306C]",
  linkedin: "bg-[#0A66C2]/10 text-[#0A66C2]",
  tiktok: "bg-text/10 text-text",
  facebook: "bg-[#1877F2]/10 text-[#1877F2]",
};

export function CompetitiveIntelligenceCard({ data }: CompetitiveIntelligenceCardProps) {
  const isEmpty =
    data.viralPosts.length === 0 &&
    data.trendingThemes.length === 0 &&
    data.recommendations.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light">
            <Zap className="h-3.5 w-3.5 text-muted" />
          </span>
          <h3 className="text-sm font-medium text-text">Inteligência competitiva</h3>
        </div>
        <p className="mb-3 text-xs text-muted">Destaques do radar e concorrentes</p>
        <div className="flex h-[140px] flex-col items-center justify-center gap-3 rounded-lg bg-surface-subtle">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sidebar">
            <Zap className="h-5 w-5 text-muted-light" aria-hidden="true" />
          </span>
          <p className="max-w-xs text-center text-sm text-muted">
            O radar ainda não encontrou dados. Configure concorrentes ou aguarde a próxima coleta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </span>
        <h3 className="text-sm font-medium text-text">Inteligência competitiva</h3>
      </div>
      <p className="mb-3 text-xs text-muted">Destaques do radar e concorrentes</p>

      {/* Viral posts */}
      {data.viralPosts.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Posts virais
          </p>
          <div className="space-y-2">
            {data.viralPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-subtle"
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        PLATFORM_COLORS[post.platform] ?? "bg-sidebar text-muted"
                      }`}
                    >
                      {PLATFORM_LABELS[post.platform] ?? post.platform}
                    </span>
                    <span className="text-[10px] text-muted">
                      {post.competitorName ?? "Radar"}
                    </span>
                  </div>
                  <p className="text-xs text-text line-clamp-2">{post.content || "Sem conteúdo"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                    {post.engagementScore.toLocaleString("pt-BR")}
                  </span>
                  {post.postUrl && (
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending themes */}
      {data.trendingThemes.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Temas em alta
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.trendingThemes.map((theme) => (
              <span
                key={theme}
                className="rounded-full border border-border bg-sidebar px-2.5 py-1 text-xs text-text transition-colors duration-150 hover:border-border-strong hover:bg-surface-subtle"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI recommendations — Eixo de Decisão marca conclusões da IA */}
      {data.recommendations.length > 0 && (
        <div className="mb-3">
          <DecisionAxis>
            <p className="mb-2 ax-kpi-label !text-[10px]">
              Recomendações da IA
            </p>
            <ul className="space-y-1.5">
              {data.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {rec}
                </li>
              ))}
            </ul>
          </DecisionAxis>
        </div>
      )}

      {/* Footer */}
      <Link
        href="/intelligence?tab=radar"
        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Ver tudo no Radar
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
