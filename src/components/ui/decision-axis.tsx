/**
 * Arquivo: src/components/ui/decision-axis.tsx
 * Propósito: "Eixo de Decisão" — elemento assinatura do AXIOMIX.
 *            Linha vertical 2px laranja que aparece quando a IA conclui algo.
 *            Quando você vê o eixo, o Axiomix está dizendo: "Decidi."
 *
 * Uso: Envolva qualquer card/bloco de insight com <DecisionAxis> para marcar
 *      que aquele conteúdo é uma conclusão do sistema.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type DecisionAxisProps = {
  children: ReactNode;
  /** Mostra o eixo? Default: true */
  active?: boolean;
  /** Anima a entrada do eixo. Default: true */
  animated?: boolean;
  /** Posição do eixo. Default: "left" */
  side?: "left" | "right";
  className?: string;
};

export function DecisionAxis({
  children,
  active = true,
  animated = true,
  side = "left",
  className,
}: DecisionAxisProps) {
  return (
    <div className={cn("relative", className)}>
      {active && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0 bottom-0 w-[2px] rounded-full bg-[var(--color-primary)]",
            side === "left" ? "left-0" : "right-0",
            animated && "animate-ax-decision"
          )}
        />
      )}
      <div className={cn(side === "left" ? "pl-4" : "pr-4")}>
        {children}
      </div>
    </div>
  );
}
