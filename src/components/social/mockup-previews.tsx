/**
 * Arquivo: src/components/social/mockup-previews.tsx
 * Propósito: Mockups realistas de Instagram Feed/Story, LinkedIn, TikTok e Facebook
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useState, useEffect } from "react";
import {
  Instagram,
  Linkedin,
  PlayCircle,
  Facebook,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  User,
  ThumbsUp,
  Share2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";

type MockupType = "instagram-feed" | "instagram-story" | "linkedin" | "tiktok" | "facebook";

type MockupPreviewsProps = {
  imageUrl: string | null;
  caption: string;
  companyName?: string;
  platforms?: SocialPlatform[];
};

const PLATFORM_MOCKUP_MAP: Record<SocialPlatform, MockupType[]> = {
  instagram: ["instagram-feed", "instagram-story"],
  linkedin: ["linkedin"],
  tiktok: ["tiktok"],
  facebook: ["facebook"],
};

const MOCKUP_BUTTONS: { type: MockupType; label: string; icon: typeof Instagram }[] = [
  { type: "instagram-feed", label: "Insta Feed", icon: Instagram },
  { type: "instagram-story", label: "Insta Story", icon: Instagram },
  { type: "linkedin", label: "LinkedIn", icon: Linkedin },
  { type: "tiktok", label: "TikTok", icon: PlayCircle },
  { type: "facebook", label: "Facebook", icon: Facebook },
];

function getVisibleMockups(platforms?: SocialPlatform[]): MockupType[] {
  if (!platforms || platforms.length === 0) {
    return MOCKUP_BUTTONS.map((b) => b.type);
  }
  const allowed = new Set<MockupType>();
  for (const p of platforms) {
    for (const m of PLATFORM_MOCKUP_MAP[p]) {
      allowed.add(m);
    }
  }
  return MOCKUP_BUTTONS.filter((b) => allowed.has(b.type)).map((b) => b.type);
}

export function MockupPreviews({
  imageUrl,
  caption,
  companyName = "Sua Empresa",
  platforms,
}: MockupPreviewsProps) {
  const visibleMockups = getVisibleMockups(platforms);
  const [activeMockup, setActiveMockup] = useState<MockupType>(
    visibleMockups[0] ?? "instagram-feed"
  );

  useEffect(() => {
    if (!visibleMockups.includes(activeMockup)) {
      setActiveMockup(visibleMockups[0] ?? "instagram-feed");
    }
  }, [platforms]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Seletor de Mockup */}
      <Card className="border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm text-text">Preview nas Plataformas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MOCKUP_BUTTONS.filter((b) => visibleMockups.includes(b.type)).map((btn) => (
              <Button
                key={btn.type}
                type="button"
                size="sm"
                variant={activeMockup === btn.type ? "default" : "secondary"}
                onClick={() => setActiveMockup(btn.type)}
              >
                <btn.icon className="h-4 w-4" />
                {btn.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mockups */}
      <Card className="border border-border rounded-xl bg-background">
        <CardContent className="p-6">
          <div className="flex justify-center">
            {activeMockup === "instagram-feed" && (
              <InstagramFeedMockup
                imageUrl={imageUrl}
                caption={caption}
                username={companyName}
              />
            )}
            {activeMockup === "instagram-story" && (
              <InstagramStoryMockup
                imageUrl={imageUrl}
                username={companyName}
              />
            )}
            {activeMockup === "linkedin" && (
              <LinkedInMockup
                imageUrl={imageUrl}
                caption={caption}
                companyName={companyName}
              />
            )}
            {activeMockup === "tiktok" && (
              <TikTokMockup
                imageUrl={imageUrl}
                caption={caption}
                username={companyName}
              />
            )}
            {activeMockup === "facebook" && (
              <FacebookMockup
                imageUrl={imageUrl}
                caption={caption}
                companyName={companyName}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Instagram Feed Mockup
function InstagramFeedMockup({
  imageUrl,
  caption,
  username,
}: {
  imageUrl: string | null;
  caption: string;
  username: string;
}) {
  return (
    <div className="w-full max-w-sm bg-white rounded-lg border-2 border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
            <User className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <span className="text-sm font-semibold text-gray-900">{username}</span>
        <MoreHorizontal className="h-5 w-5 text-gray-900 ml-auto" />
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-100 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Post preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">Imagem aparecerá aqui</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 text-gray-900" />
          <MessageCircle className="h-6 w-6 text-gray-900" />
          <Send className="h-6 w-6 text-gray-900" />
          <Bookmark className="h-6 w-6 text-gray-900 ml-auto" />
        </div>

        <div className="text-sm">
          <p className="font-semibold text-gray-900">2.345 curtidas</p>
        </div>

        {/* Caption */}
        {caption && (
          <div className="text-sm text-gray-900">
            <span className="font-semibold">{username}</span>{" "}
            <span className="whitespace-pre-wrap">
              {caption.length > 100 ? `${caption.substring(0, 100)}...` : caption}
            </span>
          </div>
        )}

        <p className="text-xs text-gray-400 uppercase">Há 2 minutos</p>
      </div>
    </div>
  );
}

// Instagram Story Mockup
function InstagramStoryMockup({
  imageUrl,
  username,
}: {
  imageUrl: string | null;
  username: string;
}) {
  return (
    <div className="w-[280px] aspect-[9/16] bg-black rounded-3xl border-4 border-gray-900 shadow-2xl overflow-hidden relative">
      {/* Progress bar */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
        <div className="flex-1 h-0.5 bg-white/80 rounded-full" />
        <div className="flex-1 h-0.5 bg-white/30 rounded-full" />
        <div className="flex-1 h-0.5 bg-white/30 rounded-full" />
      </div>

      {/* Header */}
      <div className="absolute top-6 left-4 right-4 flex items-center gap-2 z-10">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
            <User className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <span className="text-sm font-semibold text-white drop-shadow-lg">
          {username}
        </span>
        <span className="text-xs text-white/80 drop-shadow-lg">há 2m</span>
      </div>

      {/* Image */}
      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Story preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="text-sm text-white/60">Imagem aparecerá aqui</p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Enviar mensagem"
          className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/60"
          readOnly
        />
        <Heart className="h-6 w-6 text-white drop-shadow-lg" />
        <Send className="h-6 w-6 text-white drop-shadow-lg" />
      </div>
    </div>
  );
}

// LinkedIn Mockup
function LinkedInMockup({
  imageUrl,
  caption,
  companyName,
}: {
  imageUrl: string | null;
  caption: string;
  companyName: string;
}) {
  return (
    <div className="w-full max-w-lg bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="h-12 w-12 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
          {companyName.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{companyName}</p>
          <p className="text-xs text-gray-500">1.234 seguidores</p>
          <p className="text-xs text-gray-500">há 2 minutos • 🌎</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-gray-500" />
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {caption.length > 150 ? `${caption.substring(0, 150)}...` : caption}
          </p>
        </div>
      )}

      {/* Image */}
      {imageUrl && (
        <div className="w-full bg-gray-100">
          <img
            src={imageUrl}
            alt="Post preview"
            className="w-full object-contain max-h-96"
          />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-b border-gray-100">
        <span>👍 ❤️ 💡 123</span>
        <span>45 comentários • 12 repostagens</span>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 flex items-center justify-around">
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
          <Heart className="h-5 w-5" />
          Curtir
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
          <MessageCircle className="h-5 w-5" />
          Comentar
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-3 py-2 rounded">
          <Send className="h-5 w-5" />
          Compartilhar
        </button>
      </div>
    </div>
  );
}

// TikTok Mockup
function TikTokMockup({
  imageUrl,
  caption,
  username,
}: {
  imageUrl: string | null;
  caption: string;
  username: string;
}) {
  return (
    <div className="w-[280px] aspect-[9/16] bg-black rounded-3xl border-4 border-gray-900 shadow-2xl overflow-hidden relative">
      {/* Video/Image */}
      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="TikTok preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="text-sm text-white/60">Vídeo/Imagem aparecerá aqui</p>
        )}
      </div>

      {/* Right sidebar */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 z-10">
        <div className="flex flex-col items-center gap-1">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center border-2 border-white">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-black text-white text-xs font-bold">
            +
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Heart className="h-8 w-8 text-white drop-shadow-lg" fill="white" />
          <span className="text-xs text-white font-semibold drop-shadow-lg">
            12.3k
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-semibold drop-shadow-lg">
            234
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Bookmark className="h-8 w-8 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-semibold drop-shadow-lg">
            567
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Send className="h-8 w-8 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-semibold drop-shadow-lg">
            89
          </span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-16 z-10 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm drop-shadow-lg">
            @{username.toLowerCase().replace(/\s+/g, "")}
          </span>
        </div>
        {caption && (
          <p className="text-white text-xs drop-shadow-lg line-clamp-2">
            {caption}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-white text-xs drop-shadow-lg">
            ♪ som original - {username}
          </span>
        </div>
      </div>
    </div>
  );
}

// Facebook Feed Mockup
function FacebookMockup({
  imageUrl,
  caption,
  companyName,
}: {
  imageUrl: string | null;
  caption: string;
  companyName: string;
}) {
  return (
    <div className="w-full max-w-lg bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
          {companyName.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{companyName}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>há 2 minutos</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-gray-500" />
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {caption.length > 200
              ? `${caption.substring(0, 200)}... `
              : caption}
            {caption.length > 200 && (
              <span className="text-blue-600 font-medium">Ver mais</span>
            )}
          </p>
        </div>
      )}

      {/* Image */}
      {imageUrl ? (
        <div className="w-full bg-gray-100">
          <img
            src={imageUrl}
            alt="Post preview"
            className="w-full object-contain max-h-96"
          />
        </div>
      ) : (
        <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
          <p className="text-sm text-gray-400">Imagem aparecerá aqui</p>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500">
            <ThumbsUp className="h-3 w-3 text-white" fill="white" />
          </span>
          <span>123</span>
        </div>
        <span>45 comentários · 12 compartilhamentos</span>
      </div>

      {/* Actions */}
      <div className="px-4 py-1 flex items-center justify-around border-t border-gray-100">
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-4 py-2 rounded flex-1 justify-center">
          <ThumbsUp className="h-5 w-5" />
          Curtir
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-4 py-2 rounded flex-1 justify-center">
          <MessageCircle className="h-5 w-5" />
          Comentar
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 px-4 py-2 rounded flex-1 justify-center">
          <Share2 className="h-5 w-5" />
          Compartilhar
        </button>
      </div>
    </div>
  );
}
