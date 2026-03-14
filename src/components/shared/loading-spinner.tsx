/**
 * Arquivo: src/components/shared/loading-spinner.tsx
 * Propósito: Exibir spinner simples para estados de carregamento.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
};

const sizeClassMap: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  return (
    <span
      className={`${sizeClassMap[size]} inline-block animate-spin rounded-full border-2 border-border border-t-primary`}
      aria-label="Carregando"
    />
  );
}
