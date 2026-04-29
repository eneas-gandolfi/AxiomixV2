/**
 * Arquivo: src/components/social/post-energy-bar.tsx
 * Propósito: Barra de vitalidade do post — feedback sensorial em tempo real.
 *            Reage a conteúdo, hashtags, CTA, mídia e comprimento.
 *            Não é gamificação — é feedback cognitivo.
 *
 * Cores: vermelho (fraco) → amarelo (bom começo) → violeta (ótimo) → laranja shimmer (pronto para bombar)
 * Violeta = criação, Laranja = pronto para ação (regra Caravaggio)
 */

"use client";

import { useMemo } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";

const OPTIMAL_LENGTH: Record<SocialPlatform, number> = {
  instagram: 400,
  linkedin: 600,
  tiktok: 300,
  facebook: 500,
};

type PostEnergyBarProps = {
  caption: string;
  platform: SocialPlatform | null;
  hasMedia: boolean;
  className?: string;
};

function calculateEnergy(
  caption: string,
  platform: SocialPlatform | null,
  hasMedia: boolean
): number {
  let score = 0;
  const text = caption.trim();

  if (text.length === 0 && !hasMedia) return 0;

  // Comprimento adequado (0–25 pts)
  if (platform) {
    const optimal = OPTIMAL_LENGTH[platform];
    const ratio = text.length / optimal;
    if (ratio >= 0.3 && ratio <= 1.5) {
      score += Math.round(25 * Math.min(ratio, 1));
    } else if (ratio > 1.5) {
      score += 15; // longo demais, menos pontos
    }
  } else if (text.length > 20) {
    score += 15;
  }

  // Hashtags relevantes (0–20 pts)
  const hashtags = text.match(/#\w+/g)?.length ?? 0;
  score += Math.min(hashtags, 5) * 4;

  // Emoji (0–10 pts) — humaniza
  const emojis = [...text].filter((c) => /\p{Emoji_Presentation}/u.test(c)).length;
  if (emojis > 0 && emojis <= 5) score += 10;
  else if (emojis > 5) score += 5;

  // CTA ou pergunta (0–20 pts)
  const hasCTA =
    /\?|clique|acesse|comente|compartilhe|saiba mais|link na bio|arraste|confira|veja/i.test(
      text
    );
  if (hasCTA) score += 20;

  // Mídia anexada (0–25 pts)
  if (hasMedia) score += 25;

  return Math.min(Math.round(score), 100);
}

function getEnergyLevel(score: number) {
  if (score >= 86) return { label: "Pronto para bombar", tier: "max" as const };
  if (score >= 61) return { label: "Ótimo post", tier: "high" as const };
  if (score >= 31) return { label: "Bom começo", tier: "medium" as const };
  if (score > 0) return { label: "Precisa de mais conteúdo", tier: "low" as const };
  return { label: "Comece a criar", tier: "empty" as const };
}

function getBarColor(tier: ReturnType<typeof getEnergyLevel>["tier"]) {
  switch (tier) {
    case "max":
      return "bg-[var(--color-primary)]";
    case "high":
      return "bg-[#8B5CF6]";
    case "medium":
      return "bg-[var(--color-warning)]";
    case "low":
      return "bg-[var(--color-danger)]";
    default:
      return "bg-[var(--color-surface-3)]";
  }
}

function getSuggestion(
  score: number,
  caption: string,
  hasMedia: boolean
): string | null {
  if (score >= 86) return null;

  if (!hasMedia) return "Adicionar uma imagem ou vídeo aumenta o impacto.";

  const hashtags = caption.match(/#\w+/g)?.length ?? 0;
  if (hashtags === 0) return "Hashtags ajudam na descoberta do conteúdo.";

  const hasCTA =
    /\?|clique|acesse|comente|compartilhe|saiba mais|link na bio/i.test(
      caption
    );
  if (!hasCTA)
    return "Uma pergunta ou call-to-action pode aumentar o engajamento.";

  if (caption.length < 100) return "Legendas mais detalhadas tendem a performar melhor.";

  return null;
}

export function PostEnergyBar({
  caption,
  platform,
  hasMedia,
  className,
}: PostEnergyBarProps) {
  const score = useMemo(
    () => calculateEnergy(caption, platform, hasMedia),
    [caption, platform, hasMedia]
  );

  const { label, tier } = getEnergyLevel(score);
  const suggestion = getSuggestion(score, caption, hasMedia);
  const barColor = getBarColor(tier);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Bar + label */}
      <div className="flex items-center gap-3">
        <Zap
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200",
            tier === "max"
              ? "text-[var(--color-primary)]"
              : tier === "high"
                ? "text-[#8B5CF6]"
                : "text-[var(--color-text-tertiary)]"
          )}
        />
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                barColor,
                tier === "max" && "animate-shimmer"
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        <span className="flex-shrink-0 text-[11px] font-medium tabular-nums text-[var(--color-text-tertiary)]">
          {score}%
        </span>
      </div>

      {/* Label + suggestion */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[11px] font-medium",
            tier === "max"
              ? "text-[var(--color-primary)]"
              : tier === "high"
                ? "text-[#8B5CF6]"
                : "text-[var(--color-text-tertiary)]"
          )}
        >
          {label}
        </span>
      </div>

      {suggestion && (
        <p className="text-[11px] text-[var(--color-text-tertiary)] italic">
          {suggestion}
        </p>
      )}
    </div>
  );
}
