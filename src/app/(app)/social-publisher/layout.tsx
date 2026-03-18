/**
 * Arquivo: src/app/(app)/social-publisher/layout.tsx
 * Propósito: Layout compartilhado do módulo Social Publisher com navegação por abas.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type React from "react";
import { SocialModuleNav } from "@/components/social/social-module-nav";

export default function SocialPublisherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ '--module-color': '#FA5E24', '--module-color-bg': '#FFF0EB' } as React.CSSProperties}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-display text-xl font-bold text-[var(--color-text)] md:text-2xl">
            Social Publisher
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Crie, edite e agende posts profissionais para Instagram, LinkedIn, TikTok e Facebook.
          </p>
        </header>

        <SocialModuleNav />

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
