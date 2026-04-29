/**
 * Arquivo: src/lib/module-theme.tsx
 * Propósito: Injeta CSS custom properties de cor por módulo baseado no pathname.
 *            Permite que componentes usem var(--module-accent) etc. para adaptar
 *            sua aparência ao módulo ativo.
 *
 * Cores derivadas de: src/lib/module-colors.ts (single source of truth)
 */

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode, CSSProperties } from "react";
import { MODULES, resolveModuleFromPath, moduleGlow } from "@/lib/module-colors";
import type { ModuleColorDef } from "@/lib/module-colors";

function buildTheme(mod: ModuleColorDef) {
  return {
    accent: mod.accent,
    accentLight: mod.light,
    accentBg: mod.bg,
    accentGlow: moduleGlow(mod),
  };
}

function buildDarkOverrides(mod: ModuleColorDef) {
  return {
    accentBg: mod.darkBg,
    accentLight: mod.darkLight,
  };
}

interface ModuleThemeProviderProps {
  children: ReactNode;
  isDark?: boolean;
}

export function ModuleThemeProvider({ children, isDark = false }: ModuleThemeProviderProps) {
  const pathname = usePathname();
  const moduleId = resolveModuleFromPath(pathname);

  if (!moduleId) {
    return <>{children}</>;
  }

  const mod = MODULES[moduleId];
  const theme = buildTheme(mod);
  const darkOverride = isDark ? buildDarkOverrides(mod) : undefined;
  const merged = darkOverride ? { ...theme, ...darkOverride } : theme;

  const style: CSSProperties & Record<string, string> = {
    "--module-accent": merged.accent,
    "--module-accent-light": merged.accentLight,
    "--module-accent-bg": merged.accentBg,
    "--module-accent-glow": merged.accentGlow,
    // Compatibilidade com .module-accent, .pulse-grid e layouts que usam --module-color
    "--module-color": merged.accent,
    "--module-color-bg": merged.accentBg,
  };

  return (
    <div style={style} className="contents">
      {children}
    </div>
  );
}
