/**
 * Arquivo: src/components/layouts/page-container.tsx
 * Propósito: Padronizar espaçamento e cabeçalho das páginas internas (Design System v2.0).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
};

export function PageContainer({
  children,
  title,
  description,
  actions,
}: PageContainerProps) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {(title || description || actions) && (
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {title ? (
              <h1 className="ax-t1 text-xl md:text-2xl">
                {title}
              </h1>
            ) : null}
            {description ? (
              <p className="ax-body text-[var(--color-text-secondary)]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      {children}
    </main>
  );
}
