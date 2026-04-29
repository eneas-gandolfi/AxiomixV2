/**
 * Arquivo: src/components/ui/badge.tsx
 * Propósito: Componente Badge com variantes semânticas e de módulo.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
        primary:
          "bg-[var(--color-primary-dim)] text-[var(--color-primary)]",
        /* Usa a cor de acento do módulo ativo */
        module:
          "bg-[var(--module-accent-light,var(--color-primary-dim))] text-[var(--module-accent,var(--color-primary))]",
        success:
          "bg-[var(--color-success-bg)] text-[var(--color-success)]",
        warning:
          "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
        danger:
          "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
        teal:
          "bg-teal-light text-teal dark:bg-teal-dim dark:text-teal",
        gold:
          "bg-gold-light text-gold dark:bg-gold-dim dark:text-gold",
      },
      size: {
        sm: "text-xs px-2 py-0.5 rounded-sm",
        md: "text-xs px-2.5 py-1 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const dotColors: Record<string, string> = {
  default: "text-[var(--color-text-tertiary)]",
  primary: "text-[var(--color-primary)]",
  module: "text-[var(--module-accent,var(--color-primary))]",
  success: "text-[var(--color-success)]",
  warning: "text-[var(--color-warning)]",
  danger: "text-[var(--color-danger)]",
  teal: "text-teal",
  gold: "text-gold",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot = false, children, ...props }, ref) => {
    const variantKey = variant ?? "default";

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span className={cn("text-[8px] leading-none", dotColors[variantKey])} aria-hidden="true">
            ●
          </span>
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
