/*
 * Arquivo: tailwind.config.ts
 * Propósito: Tokens visuais do AXIOMIX Design System v2.0 no TailwindCSS.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type { Config } from "tailwindcss";
import { TAILWIND_MODULE_COLORS } from "./src/lib/module-colors";

const config: Config = {
  important: false,
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Primary (invariante) ── */
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          muted: "var(--color-primary-muted)",
          dim: "var(--color-primary-dim)",
          light: "var(--color-primary-light)", // alias backward-compat
        },

        /* ── Superfícies ── */
        background: "var(--color-background)",
        surface: {
          DEFAULT: "var(--color-surface)",
          2: "var(--color-surface-2)",
          3: "var(--color-surface-3)",
          subtle: "var(--color-surface-subtle)",
        },

        /* ── Bordas ── */
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },

        /* ── Texto ── */
        text: "var(--color-text)",
        tx: {
          DEFAULT: "var(--color-text)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
        },

        /* ── Semânticas ── */
        success: {
          DEFAULT: "var(--color-success)",
          bg: "var(--color-success-bg)",
          light: "var(--color-success-light)", // alias
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          bg: "var(--color-warning-bg)",
          light: "var(--color-warning-light)", // alias
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          bg: "var(--color-danger-bg)",
          light: "var(--color-danger-light)", // alias
        },
        info: {
          DEFAULT: "var(--color-info)",
          bg: "var(--color-info-bg)",
          light: "var(--color-info-light)", // alias
        },

        /* ── Módulos (single source: src/lib/module-colors.ts) ── */
        teal: TAILWIND_MODULE_COLORS.teal,
        gold: TAILWIND_MODULE_COLORS.gold,
        violet: TAILWIND_MODULE_COLORS.violet,

        /* ── Backward-compat aliases ── */
        card: "var(--color-card)",
        sidebar: "var(--color-sidebar)",
        "sidebar-nav": "var(--color-sidebar-nav)",
        muted: {
          DEFAULT: "var(--color-muted)",
          light: "var(--color-muted-light)",
        },
      },

      fontFamily: {
        display: ["var(--font-bricolage)", "Bricolage Grotesque", "sans-serif"],
        sans: ["var(--font-instrument)", "Instrument Sans", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "monospace"],
      },

      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.6" }],
        lg: ["20px", { lineHeight: "1.4" }],
        xl: ["24px", { lineHeight: "1.3" }],
        "2xl": ["32px", { lineHeight: "1.2" }],
        hero: ["48px", { lineHeight: "1.1" }],
        /* ── Typography Tokens (companion to .ax-* classes) ── */
        kpi: ["2.5rem", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "800" }],
        "section-title": ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "500" }],
        "page-title": ["2rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" }],
      },

      boxShadow: {
        /* ── Orange Command Shadow System ── */
        "card-sm": "0 1px 3px rgb(var(--color-primary-rgb) / 0.05), 0 1px 2px rgba(15,23,42,0.04)",
        card: "0 1px 3px rgb(var(--color-primary-rgb) / 0.05), 0 6px 16px rgba(15,23,42,0.04)",
        "card-hover": "0 2px 8px rgb(var(--color-primary-rgb) / 0.08), 0 12px 28px rgba(15,23,42,0.06)",
        "card-modern": "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.03), 0 0 0 1px rgb(var(--color-primary-rgb) / 0.06)",
        "card-hover-modern": "0 4px 16px rgb(var(--color-primary-rgb) / 0.08), 0 8px 32px rgba(15,23,42,0.04)",
        "card-elevated": "0 8px 24px rgb(var(--color-primary-rgb) / 0.08), 0 16px 48px rgba(15,23,42,0.04), 0 0 0 1px rgb(var(--color-primary-rgb) / 0.06)",
        /* ── Elementos flutuantes mantêm sombra neutra ── */
        dropdown: "0 4px 16px rgba(0,0,0,0.10)",
        modal: "0 20px 60px rgba(0,0,0,0.15)",
      },

      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.4)" },
        },
        /* ── Axiomix Animation Vocabulary ── */
        "ax-emerge": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)", filter: "blur(4px)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)" },
        },
        "ax-breathe": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--color-primary-rgb) / 0.3)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 0 6px rgb(var(--color-primary-rgb) / 0)", transform: "scale(1.02)" },
        },
        "ax-module-shift": {
          "0%": { opacity: "0.7", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "ax-decision": {
          "0%": { opacity: "0", height: "0", boxShadow: "0 0 8px rgb(var(--color-primary-rgb) / 0.6)" },
          "40%": { opacity: "1", height: "100%", boxShadow: "0 0 12px rgb(var(--color-primary-rgb) / 0.4)" },
          "100%": { opacity: "1", height: "100%", boxShadow: "0 0 0 rgb(var(--color-primary-rgb) / 0)" },
        },
        "ax-cascade": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ax-value-pulse": {
          "0%": { color: "inherit", textShadow: "none" },
          "30%": { color: "var(--color-primary)", textShadow: "0 0 8px rgb(var(--color-primary-rgb) / 0.3)" },
          "100%": { color: "inherit", textShadow: "none" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "fade-in-up": "fade-in-up 500ms ease-out forwards",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        /* ── Axiomix Animation Vocabulary ── */
        "ax-emerge": "ax-emerge 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "ax-breathe": "ax-breathe 2.4s ease-in-out infinite",
        "ax-module-shift": "ax-module-shift 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        "ax-decision": "ax-decision 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "ax-cascade": "ax-cascade 150ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "ax-value-pulse": "ax-value-pulse 600ms ease-out forwards",
      },


      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
