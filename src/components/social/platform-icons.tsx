/**
 * Arquivo: src/components/social/platform-icons.tsx
 * Propósito: Ícones das redes sociais com cores oficiais das marcas.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import {
  FaInstagram,
  FaLinkedinIn,
  FaTiktok,
  FaFacebookF,
} from "react-icons/fa6";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";
import type { ComponentType } from "react";

type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

/** Cor oficial de cada plataforma */
export const PLATFORM_BRAND_COLORS: Record<SocialPlatform, string> = {
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  tiktok: "#000000",
  facebook: "#1877F2",
};

/** Ícone react-icons de cada plataforma */
export const PLATFORM_ICON_COMPONENTS: Record<SocialPlatform, ComponentType<IconProps>> = {
  instagram: FaInstagram,
  linkedin: FaLinkedinIn,
  tiktok: FaTiktok,
  facebook: FaFacebookF,
};

/** Ícone com cor da marca embutida */
export function PlatformIcon({
  platform,
  className = "h-4 w-4",
  colored = true,
}: {
  platform: SocialPlatform;
  className?: string;
  colored?: boolean;
}) {
  const Icon = PLATFORM_ICON_COMPONENTS[platform] ?? FaInstagram;
  return (
    <Icon
      className={className}
      style={colored ? { color: PLATFORM_BRAND_COLORS[platform] } : undefined}
    />
  );
}

/** Label humano de cada plataforma */
export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  facebook: "Facebook",
};
