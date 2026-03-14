/**
 * Arquivo: src/components/shared/empty-state.tsx
 * Propósito: Exibir estado vazio padrão para páginas sem dados.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="p-10 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-muted-light">
          <Icon className="h-12 w-12" />
        </div>
      ) : null}
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted text-center">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
