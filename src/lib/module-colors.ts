/**
 * Arquivo: src/lib/module-colors.ts
 * Propósito: Single source of truth para cores de módulo do AXIOMIX.
 *            Todos os consumidores (module-theme, sidebar, tailwind.config)
 *            devem importar deste arquivo — nunca hardcodar cores de módulo.
 */

export type ModuleId =
  | "dashboard"
  | "whatsapp-intelligence"
  | "intelligence"
  | "social-publisher"
  | "campanhas"
  | "base-conhecimento"
  | "settings";

export interface ModuleColorDef {
  /** Cor de acento principal do módulo */
  accent: string;
  /** RGB space-separated para composição com opacidade (ex: "136 146 164") */
  accentRgb: string;
  /** Fundo claro (light mode) */
  light: string;
  /** Fundo muito claro (light mode) */
  bg: string;
  /** Fundo escuro (dark mode — Deep Night) */
  darkBg: string;
  /** Acento claro (dark mode) */
  darkLight: string;
}

/**
 * Definições core de cada módulo.
 * Mude aqui → propaga para sidebar, module-theme e tailwind.
 */
export const MODULES: Record<ModuleId, ModuleColorDef> = {
  dashboard: {
    accent: "#8892A4",
    accentRgb: "136 146 164",
    light: "#ECEEF2",
    bg: "#F7F8FA",
    darkBg: "#0D1117",
    darkLight: "#1C2230",
  },
  "whatsapp-intelligence": {
    accent: "#0D9488",
    accentRgb: "13 148 136",
    light: "#CCFBF1",
    bg: "#F0FDFA",
    darkBg: "#081614",
    darkLight: "#0F2D2A",
  },
  intelligence: {
    accent: "#D97706",
    accentRgb: "217 119 6",
    light: "#FEF3C7",
    bg: "#FFFBEB",
    darkBg: "#12100A",
    darkLight: "#2A2010",
  },
  "social-publisher": {
    accent: "#8B5CF6",
    accentRgb: "139 92 246",
    light: "#EDE9FE",
    bg: "#F5F3FF",
    darkBg: "#0F0C18",
    darkLight: "#1E1538",
  },
  campanhas: {
    accent: "#16A34A",
    accentRgb: "22 163 74",
    light: "#DCFCE7",
    bg: "#F0FDF4",
    darkBg: "#08140C",
    darkLight: "#0F2D1A",
  },
  "base-conhecimento": {
    accent: "#7C3AED",
    accentRgb: "124 58 237",
    light: "#EDE9FE",
    bg: "#F5F3FF",
    darkBg: "#0F0C18",
    darkLight: "#1E1538",
  },
  settings: {
    accent: "#8892A4",
    accentRgb: "136 146 164",
    light: "#ECEEF2",
    bg: "#F7F8FA",
    darkBg: "#0D1117",
    darkLight: "#1C2230",
  },
};

/** Mapeamento pathname → ModuleId */
const PATH_MAP: Record<string, ModuleId> = {
  "/dashboard": "dashboard",
  "/whatsapp-intelligence": "whatsapp-intelligence",
  "/intelligence": "intelligence",
  "/social-publisher": "social-publisher",
  "/campanhas": "campanhas",
  "/base-conhecimento": "base-conhecimento",
  "/settings": "settings",
};

/** Resolve um pathname para o ModuleId correspondente */
export function resolveModuleFromPath(pathname: string): ModuleId | undefined {
  for (const [prefix, id] of Object.entries(PATH_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return id;
    }
  }
  return undefined;
}

/**
 * Gera o glow rgba a partir do accentRgb.
 * Ex: "13 148 136" → "rgba(13, 148, 136, 0.12)"
 */
export function moduleGlow(mod: ModuleColorDef, opacity = 0.12): string {
  const [r, g, b] = mod.accentRgb.split(" ");
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Cores para sidebar (sempre dark — bg é rgba sobre fundo escuro).
 */
export function sidebarColors(mod: ModuleColorDef) {
  const isNeutral = mod.accent === "#8892A4";
  const opacity = isNeutral ? 0.10 : 0.12;
  const bg = moduleGlow(mod, opacity);
  return { color: mod.accent, bg };
}

/**
 * Subset para Tailwind config — apenas módulos que precisam de utility classes.
 * Retorna no formato { DEFAULT, dim, light } para cada nome.
 */
export const TAILWIND_MODULE_COLORS = {
  teal: {
    DEFAULT: MODULES["whatsapp-intelligence"].accent,
    dim: MODULES["whatsapp-intelligence"].darkBg,
    light: MODULES["whatsapp-intelligence"].light,
  },
  gold: {
    DEFAULT: MODULES.intelligence.accent,
    dim: MODULES.intelligence.darkBg,
    light: MODULES.intelligence.light,
  },
  violet: {
    DEFAULT: MODULES["social-publisher"].accent,
    dim: MODULES["social-publisher"].darkBg,
    light: MODULES["social-publisher"].light,
  },
} as const;
