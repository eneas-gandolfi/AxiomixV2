/**
 * Arquivo: src/components/whatsapp/contact-avatar.tsx
 * Propósito: Avatar colorido com iniciais do contato.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useEffect, useState } from "react";

type ContactAvatarProps = {
  name: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const AVATAR_COLORS = [
  { bg: "bg-[#FF6B6B]", text: "text-white" },
  { bg: "bg-[#4ECDC4]", text: "text-white" },
  { bg: "bg-[#45B7D1]", text: "text-white" },
  { bg: "bg-[#FFA07A]", text: "text-white" },
  { bg: "bg-[#98D8C8]", text: "text-white" },
  { bg: "bg-[#F7DC6F]", text: "text-gray-800" },
  { bg: "bg-[#BB8FCE]", text: "text-white" },
  { bg: "bg-[#85C1E2]", text: "text-white" },
  { bg: "bg-[#F8B739]", text: "text-white" },
  { bg: "bg-[#52B788]", text: "text-white" },
];

function getInitials(name: string | null): string {
  if (!name || name.trim().length === 0) {
    return "?";
  }

  // Remove emojis e caracteres especiais
  const cleaned = name
    .trim()
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "") // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, "") // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
    .trim();

  if (cleaned.length === 0) {
    return "?";
  }

  const parts = cleaned.split(/\s+/);

  if (parts.length === 1) {
    // Pega o primeiro caractere de forma segura
    return Array.from(parts[0])[0]?.toUpperCase() ?? "?";
  }

  // Pega primeiro caractere do primeiro e último nome
  const first = Array.from(parts[0])[0]?.toUpperCase() ?? "";
  const last = Array.from(parts[parts.length - 1])[0]?.toUpperCase() ?? "";
  return (first + last) || "?";
}

function getColorForName(name: string | null): { bg: string; text: string } {
  if (!name || name.trim().length === 0) {
    return { bg: "bg-muted", text: "text-muted-light" };
  }

  // Gera um índice consistente baseado no nome
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getSizeClasses(size?: "sm" | "md" | "lg") {
  switch (size) {
    case "sm":
      return "h-8 w-8 text-xs";
    case "lg":
      return "h-12 w-12 text-lg";
    case "md":
    default:
      return "h-10 w-10 text-sm";
  }
}

export function ContactAvatar({ name, avatarUrl, size = "md", className = "" }: ContactAvatarProps) {
  const [mounted, setMounted] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = getInitials(name);
  const colors = getColorForName(name);
  const sizeClasses = getSizeClasses(size);
  const proxiedUrl = avatarUrl
    ? `/api/whatsapp/avatar-proxy?url=${encodeURIComponent(avatarUrl)}`
    : null;
  const showImage = mounted && !!proxiedUrl && !imgError;

  // Durante SSR e hydration inicial, usa uma versão simplificada
  if (!mounted) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full font-semibold bg-muted text-muted-light ${sizeClasses} ${className}`}
        aria-label={name ?? "Contato sem nome"}
      >
        {initials}
      </div>
    );
  }

  if (showImage) {
    return (
      <img
        src={proxiedUrl!}
        alt={name ?? "Contato sem nome"}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`shrink-0 rounded-full object-cover ${sizeClasses} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${colors.bg} ${colors.text} ${sizeClasses} ${className}`}
      aria-label={name ?? "Contato sem nome"}
    >
      {initials}
    </div>
  );
}
