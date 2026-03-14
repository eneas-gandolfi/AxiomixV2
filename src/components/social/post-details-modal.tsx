/**
 * Arquivo: src/components/social/post-details-modal.tsx
 * Propósito: Modal de detalhes de uma publicação agendada.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  PlatformProgressState,
  SocialPlatform,
  SocialPostType,
  SocialPublishStatus,
  PublishProgressMap,
  PublishResultMap,
  PublishErrorMap,
} from "@/types/modules/social-publisher.types";

type ScheduledHistoryItem = {
  id: string;
  postType: SocialPostType;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduledAt: string;
  status: SocialPublishStatus;
  progress: PublishProgressMap;
  externalPostIds: PublishResultMap;
  errorDetails: PublishErrorMap;
  publishedAt: string | null;
  createdAt: string;
  qstashMessageId: string | null;
  mediaFileIds: string[];
  thumbnailUrl: string | null;
  thumbnailType: string | null;
};

type PostDetailsModalProps = {
  details: ScheduledHistoryItem | null;
  onClose: () => void;
};

const STATUS_COLORS: Record<SocialPublishStatus, string> = {
  scheduled: "bg-warning-light text-warning",
  processing: "bg-primary-light text-primary",
  published: "bg-success-light text-success",
  partial: "bg-warning-light text-warning",
  failed: "bg-danger-light text-danger",
  cancelled: "bg-background text-muted",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  return new Date(value).toLocaleString("pt-BR");
}

function postTypeLabel(postType: SocialPostType) {
  if (postType === "photo") return "Foto";
  if (postType === "video") return "Vídeo";
  return "Carrossel";
}

function progressStateLabel(status: PlatformProgressState) {
  if (status === "pending") return "pendente";
  if (status === "processing") return "processando";
  if (status === "ok") return "ok";
  return "erro";
}

export function PostDetailsModal({ details, onClose }: PostDetailsModalProps) {
  if (!details) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-auto border border-border rounded-2xl shadow-[0_20px_60px_rgba(28,25,23,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-text">
                Detalhes da Publicação
              </CardTitle>
              <CardDescription className="mt-2 text-muted">
                {postTypeLabel(details.postType)} • {formatDate(details.scheduledAt)}
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-light hover:text-text hover:bg-sidebar transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          {/* Thumbnail */}
          {details.thumbnailUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img
                src={details.thumbnailUrl}
                alt="Post thumbnail"
                className="w-full max-h-64 object-contain bg-background"
              />
            </div>
          )}

          {/* Caption */}
          {details.caption && (
            <div>
              <h4 className="text-sm font-medium text-text mb-2">Legenda:</h4>
              <p className="text-sm text-text whitespace-pre-wrap bg-background rounded-lg p-3 border border-border">
                {details.caption}
              </p>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text">Status:</h4>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[details.status]}`}
            >
              {details.status}
            </span>
          </div>

          {/* Platforms */}
          <div>
            <h4 className="text-sm font-medium text-text mb-3">Plataformas:</h4>
            <div className="space-y-3">
              {details.platforms.map((platform) => {
                const progress = details.progress[platform];
                return (
                  <div
                    key={`${details.id}-${platform}`}
                    className="rounded-lg border border-border p-4 bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium capitalize text-text">
                        {platform}
                      </p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          progress?.status === "ok"
                            ? "bg-success-light text-success"
                            : progress?.status === "error"
                            ? "bg-danger-light text-danger"
                            : progress?.status === "processing"
                            ? "bg-warning-light text-warning"
                            : "bg-sidebar text-muted"
                        }`}
                      >
                        {progressStateLabel(progress?.status ?? "pending")}
                      </span>
                    </div>

                    {progress?.externalPostId && (
                      <p className="text-xs text-success mb-1">
                        Post ID: {progress.externalPostId}
                      </p>
                    )}

                    {progress?.error && (
                      <p className="text-xs text-danger bg-danger-light rounded p-2">
                        {progress.error}
                      </p>
                    )}

                    {progress?.updatedAt && (
                      <p className="text-xs text-muted mt-2">
                        Atualizado: {formatDate(progress.updatedAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2 text-xs text-muted bg-background rounded-lg p-3 border border-border">
            <p>Criado em: {formatDate(details.createdAt)}</p>
            {details.publishedAt && (
              <p>Publicado em: {formatDate(details.publishedAt)}</p>
            )}
            {details.qstashMessageId && (
              <p>QStash ID: {details.qstashMessageId}</p>
            )}
          </div>

          {/* Close button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
