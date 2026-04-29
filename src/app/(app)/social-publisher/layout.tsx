/**
 * Arquivo: src/app/(app)/social-publisher/layout.tsx
 * Propósito: Layout compartilhado do módulo Social Publisher com navegação por abas.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type React from "react";
import { Share2 } from "lucide-react";
import { SocialModuleNav } from "@/components/social/social-module-nav";

export default function SocialPublisherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ '--module-color-bg': 'var(--module-accent-bg, #F5F3FF)' } as React.CSSProperties}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-start gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--module-accent-bg,#F5F3FF)] text-[var(--module-accent,#8B5CF6)] shadow-card"
          >
            <Share2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="ax-t1 text-xl md:text-2xl">
              Social Publisher
            </h1>
            <p className="mt-1 ax-body text-[var(--color-text-secondary)]">
              Crie, edite e agende posts profissionais para Instagram, LinkedIn, TikTok e Facebook.
            </p>
          </div>
        </header>

        <SocialModuleNav />

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
