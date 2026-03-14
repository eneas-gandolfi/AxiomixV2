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
        success:
          "bg-[var(--color-success-bg)] text-[#16A34A] dark:text-[#22C55E]",
        warning:
          "bg-[var(--color-warning-bg)] text-[#D97706] dark:text-[#F59E0B]",
        danger:
          "bg-[var(--color-danger-bg)] text-[#DC2626] dark:text-[#EF4444]",
        teal:
          "bg-[#E0FAF7] text-[#0D9488] dark:bg-[#164E4A] dark:text-[#2EC4B6]",
        gold:
          "bg-[#FDF6E3] text-[#B45309] dark:bg-[#6B5429] dark:text-[#D4A853]",
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
  success: "text-[#16A34A] dark:text-[#22C55E]",
  warning: "text-[#D97706] dark:text-[#F59E0B]",
  danger: "text-[#DC2626] dark:text-[#EF4444]",
  teal: "text-[#0D9488] dark:text-[#2EC4B6]",
  gold: "text-[#B45309] dark:text-[#D4A853]",
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
