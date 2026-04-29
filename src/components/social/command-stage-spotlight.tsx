/**
 * Arquivo: src/components/social/command-stage-spotlight.tsx
 * Propósito: Next Post Spotlight — cue card do próximo post a publicar.
 *            Countdown ao vivo, thumbnail, plataforma e CTAs.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Edit3,
  Image as ImageIcon,
  Send,
  Video,
  GalleryHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "./platform-icons";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";

export type SpotlightPost = {
  id: string;
  scheduledAt: string;
  platform: SocialPlatform;
  postType: "photo" | "video" | "carousel";
  contentPreview: string;
  thumbnailUrl?: string;
};

type SpotlightProps = {
  post: SpotlightPost | null;
  onCreatePost?: () => void;
  onPublishNow?: (postId: string) => void;
};

function formatCountdown(targetMs: number): string {
  const now = Date.now();
  const diff = targetMs - now;

  if (diff <= 0) return "agora";

  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `em ${days}d ${hours % 24}h`;
  }

  if (hours > 0) return `em ${hours}h ${minutes}min`;
  return `em ${minutes}min`;
}

function PostTypeIcon({ type }: { type: SpotlightPost["postType"] }) {
  switch (type) {
    case "video":
      return <Video className="h-3.5 w-3.5" />;
    case "carousel":
      return <GalleryHorizontal className="h-3.5 w-3.5" />;
    default:
      return <ImageIcon className="h-3.5 w-3.5" />;
  }
}

export function NextPostSpotlight({
  post,
  onCreatePost,
  onPublishNow,
}: SpotlightProps) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!post) return;

    const targetMs = new Date(post.scheduledAt).getTime();
    setCountdown(formatCountdown(targetMs));

    const interval = setInterval(() => {
      setCountdown(formatCountdown(targetMs));
    }, 60_000);

    return () => clearInterval(interval);
  }, [post]);

  // Empty state — sem post agendado
  if (!post) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.03] p-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-2)]">
          <Calendar className="h-6 w-6 text-[var(--color-text-tertiary)]" />
        </div>
        <div>
          <p className="ax-t3 text-[var(--color-text)]">
            Nenhum post agendado
          </p>
          <p className="mt-1 ax-caption">
            Que tal criar agora e agendar para o melhor horário?
          </p>
        </div>
        {onCreatePost && (
          <Button onClick={onCreatePost} className="mt-1">
            Criar agora
          </Button>
        )}
      </div>
    );
  }

  const isUrgent =
    new Date(post.scheduledAt).getTime() - Date.now() < 3_600_000; // < 1h

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#8B5CF6]/20 bg-gradient-to-b from-[#8B5CF6]/[0.04] to-[var(--color-surface)] p-5 transition-all duration-200 hover:border-[#8B5CF6]/40 hover:shadow-card-hover">
      {/* Header */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="ax-kpi-label !text-[10px]">Próximo post</span>
          <div className="flex items-center gap-1.5">
            <PlatformIcon platform={post.platform} className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
              {post.platform}
            </span>
          </div>
        </div>

        {/* Thumbnail ou preview de texto */}
        {post.thumbnailUrl ? (
          <div className="mb-3 overflow-hidden rounded-xl">
            <img
              src={post.thumbnailUrl}
              alt="Preview do post"
              className="h-[120px] w-full object-cover"
            />
          </div>
        ) : (
          <div className="mb-3 rounded-xl bg-[var(--color-surface-2)] p-4">
            <p className="line-clamp-3 text-sm text-[var(--color-text)]">
              {post.contentPreview}
            </p>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1">
            <PostTypeIcon type={post.postType} />
            {post.postType === "photo"
              ? "Foto"
              : post.postType === "video"
                ? "Vídeo"
                : "Carrossel"}
          </span>
        </div>
      </div>

      {/* Countdown + Actions */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock
            className={`h-4 w-4 ${isUrgent ? "text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]"}`}
          />
          <span
            className={`text-sm font-medium tabular-nums ${isUrgent ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"}`}
          >
            {countdown}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex-1 border border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
          >
            <Link href={`/social-publisher?edit=${post.id}`}>
              <Edit3 className="h-3.5 w-3.5" />
              Editar
            </Link>
          </Button>
          {onPublishNow && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onPublishNow(post.id)}
            >
              <Send className="h-3.5 w-3.5" />
              Publicar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
