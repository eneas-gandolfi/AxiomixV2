/**
 * Arquivo: src/components/layout/coming-soon-section.tsx
 * Propósito: Holding page compartilhada para módulos em desenvolvimento.
 * Autor: AXIOMIX
 * Data: 2026-05-04
 */

import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

interface ComingSoonSectionProps {
  moduleLabel: string;
  icon: LucideIcon;
  description?: string;
}

export function ComingSoonSection({
  moduleLabel,
  icon: Icon,
  description,
}: ComingSoonSectionProps) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <Icon
        className="h-16 w-16 text-[var(--color-text-secondary)] opacity-30"
        aria-hidden="true"
        strokeWidth={1.5}
      />
      <div className="space-y-2">
        <h1 className="ax-t1 text-2xl md:text-3xl">Quase lá.</h1>
        <p className="ax-body mx-auto max-w-md text-[var(--color-text-secondary)]">
          {description ??
            `O módulo ${moduleLabel} está em desenvolvimento. Você será um dos primeiros a saber quando estiver disponível.`}
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-card transition-colors hover:bg-[rgba(0,0,0,0.04)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao Dashboard
      </Link>
    </main>
  );
}
