/**
 * Arquivo: src/components/ui/insight-card.tsx
 * Propósito: Card de insight/conclusão da IA com Eixo de Decisão integrado.
 *            Usado quando o sistema tem algo a dizer — não para dados brutos.
 */

import { cn } from "@/lib/utils";
import { DecisionAxis } from "@/components/ui/decision-axis";
import type { ReactNode } from "react";

type InsightCardProps = {
  /** Rótulo pequeno acima do título (ex: "Insight prioritário") */
  label?: string;
  /** Título principal */
  title: string;
  /** Conteúdo descritivo */
  children: ReactNode;
  /** Ícone ou badge à direita do label */
  badge?: ReactNode;
  /** Mostra o Eixo de Decisão. Default: true */
  axis?: boolean;
  /** Classes extras no card externo */
  className?: string;
};

export function InsightCard({
  label,
  title,
  children,
  badge,
  axis = true,
  className,
}: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all duration-200",
        className
      )}
    >
      <DecisionAxis active={axis}>
        {(label || badge) && (
          <div className="mb-3 flex items-center justify-between gap-3">
            {label && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-primary-rgb)/0.10)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
                {label}
              </span>
            )}
            {badge}
          </div>
        )}
        <h3 className="ax-t2">{title}</h3>
        <div className="mt-2 ax-body text-[var(--color-text-secondary)]">
          {children}
        </div>
      </DecisionAxis>
    </div>
  );
}
