/**
 * Arquivo: src/components/ui/button.tsx
 * Propósito: Componente base de botão com variantes do AXIOMIX Design System v2.0.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-accent,var(--color-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-white btn-glow hover:bg-[var(--color-primary-hover)] hover:text-white active:scale-[0.98]",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
        ghost:
          "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
        destructive:
          "bg-[var(--color-danger)] text-white hover:bg-red-600 hover:text-white",
        link:
          "text-[var(--color-primary)] underline-offset-4 hover:underline bg-transparent",
        /* Usa a cor de acento do módulo ativo (--module-accent) */
        module:
          "bg-[var(--module-accent,var(--color-primary))] text-white hover:brightness-110 hover:text-white active:scale-[0.98]",
        /* Fundo claro do módulo, texto na cor do acento */
        subtle:
          "bg-[var(--module-accent-light,var(--color-primary-dim))] text-[var(--module-accent,var(--color-primary))] hover:brightness-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const composedClassName = cn(buttonVariants({ variant, size, className }));

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;

      return React.cloneElement(child, {
        className: cn(composedClassName, child.props.className),
      });
    }

    return (
      <button ref={ref} className={composedClassName} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
