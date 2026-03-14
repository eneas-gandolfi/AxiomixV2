"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TooltipContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip components must be used inside <Tooltip>.");
  }
  return context;
}

function mergeHandlers<E>(
  external?: (event: E) => void,
  internal?: (event: E) => void
) {
  return (event: E) => {
    external?.(event);
    internal?.(event);
  };
}

export function TooltipProvider({
  children,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative flex w-full">{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const { setOpen } = useTooltipContext();

  if (asChild) {
    const child = children as React.ReactElement<{
      onMouseEnter?: (event: React.MouseEvent) => void;
      onMouseLeave?: (event: React.MouseEvent) => void;
      onFocus?: (event: React.FocusEvent) => void;
      onBlur?: (event: React.FocusEvent) => void;
    }>;

    return React.cloneElement(child, {
      onMouseEnter: mergeHandlers(child.props.onMouseEnter, () => setOpen(true)),
      onMouseLeave: mergeHandlers(child.props.onMouseLeave, () => setOpen(false)),
      onFocus: mergeHandlers(child.props.onFocus, () => setOpen(true)),
      onBlur: mergeHandlers(child.props.onBlur, () => setOpen(false)),
    });
  }

  return (
    <button
      type="button"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
    </button>
  );
}

export function TooltipContent({
  children,
  className,
  side = "right",
}: {
  children: React.ReactNode;
  className?: string;
  side?: "right" | "left" | "top" | "bottom";
}) {
  const { open } = useTooltipContext();

  if (!open) {
    return null;
  }

  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs text-[var(--color-text)] shadow-[var(--shadow-card)]",
        side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
        side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
        side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
        side === "bottom" && "left-1/2 top-full mt-2 -translate-x-1/2",
        className
      )}
    >
      {children}
    </div>
  );
}
