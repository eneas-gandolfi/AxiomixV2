/**
 * Arquivo: src/components/ui/scan-loader.tsx
 * Propósito: Loading state "inteligente" — scan line horizontal tipo radar.
 *            Substitui skeleton genérico com identidade Axiomix.
 *            O sistema está varrendo dados, não apenas esperando.
 */

import { cn } from "@/lib/utils";

type ScanLoaderProps = {
  /** Altura do loader. Default: "h-[200px]" */
  height?: string;
  /** Texto opcional abaixo do scan */
  label?: string;
  /** Classes extras */
  className?: string;
  /** Variante: "card" adiciona borda e border-radius */
  variant?: "inline" | "card";
};

export function ScanLoader({
  height = "h-[200px]",
  label,
  className,
  variant = "card",
}: ScanLoaderProps) {
  return (
    <div
      className={cn(
        "scan-loader flex flex-col items-center justify-center gap-3",
        height,
        variant === "card" && "rounded-xl border border-[var(--color-border)]",
        className
      )}
    >
      {label && (
        <p className="ax-caption text-[var(--color-text-tertiary)]">{label}</p>
      )}
    </div>
  );
}

/**
 * Grid de scan loaders para substituir skeleton grids.
 * Cada item aparece com stagger delay (cascade).
 */
export function ScanLoaderGrid({
  count = 4,
  height = "h-[120px]",
  columns = "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
}: {
  count?: number;
  height?: string;
  columns?: string;
}) {
  return (
    <div className={cn("grid gap-3", columns)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="opacity-0 animate-ax-cascade"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards" }}
        >
          <ScanLoader height={height} />
        </div>
      ))}
    </div>
  );
}
