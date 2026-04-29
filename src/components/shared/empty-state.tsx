/**
 * Arquivo: src/components/shared/empty-state.tsx
 * Propósito: Estado vazio com personalidade — convite, não aviso.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  /** Título em Bricolage Bold — convida, não informa */
  title: string;
  /** Descrição breve — ensina, não só descreve */
  description: string;
  /** Ícone Lucide (fallback se não houver illustration) */
  icon?: LucideIcon;
  /** Ilustração SVG customizada (substitui o ícone) */
  illustration?: ReactNode;
  /** Botão ou link de CTA */
  action?: ReactNode;
  /** Dica contextual com ícone 💡 */
  tip?: string;
  /** Classe adicional no container */
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  illustration,
  action,
  tip,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-8 py-20 text-center",
        className
      )}
    >
      {/* Ilustração ou ícone — usa cor do módulo ativo */}
      {illustration ? (
        <div className="mb-6 text-[var(--module-accent,var(--color-text-tertiary))] opacity-60">
          {illustration}
        </div>
      ) : Icon ? (
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--module-accent-light,var(--color-surface-2))]">
          <Icon
            className="h-8 w-8 text-[var(--module-accent,var(--color-text-tertiary))]"
            strokeWidth={1.5}
          />
        </div>
      ) : null}

      {/* Título — Bricolage, com personalidade */}
      <h3 className="ax-t2 max-w-md">{title}</h3>

      {/* Descrição — Instrument, ensina e convida */}
      <p className="ax-body mx-auto mt-2 max-w-sm text-[var(--color-text-secondary)]">
        {description}
      </p>

      {/* CTA */}
      {action ? <div className="mt-6">{action}</div> : null}

      {/* Dica contextual */}
      {tip ? (
        <p className="ax-caption mt-8 max-w-sm rounded-lg border border-[var(--module-accent-light,var(--color-border))] bg-[var(--module-accent-bg,var(--color-surface-2))] px-4 py-2">
          💡 {tip}
        </p>
      ) : null}
    </div>
  );
}
