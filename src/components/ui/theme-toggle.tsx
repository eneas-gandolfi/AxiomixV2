/**
 * Arquivo: src/components/ui/theme-toggle.tsx
 * Propósito: Toggle switch animado para alternar entre modo claro e escuro.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={`relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 cursor-pointer focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--color-background)]
        ${isDark ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-strong)]"}`}
    >
      <span
        className={`absolute h-4 w-4 rounded-full bg-white shadow-sm
          transition-transform duration-200 flex items-center justify-center
          ${isDark ? "translate-x-6" : "translate-x-1"}`}
      >
        {isDark ? (
          <Moon size={9} className="text-[var(--color-primary)]" />
        ) : (
          <Sun size={9} className="text-[var(--color-warning)]" />
        )}
      </span>
    </button>
  );
}
