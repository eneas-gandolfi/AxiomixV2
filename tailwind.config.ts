/*
 * Arquivo: tailwind.config.ts
 * Propósito: Tokens visuais do AXIOMIX Design System v2.0 no TailwindCSS.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type { Config } from "tailwindcss";

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

        /* ── Módulos ── */
        teal: {
          DEFAULT: "#2EC4B6",
          dim: "#164E4A",
          light: "#E0FAF7",
        },
        gold: {
          DEFAULT: "#D4A853",
          dim: "#6B5429",
          light: "#FDF6E3",
        },

        /* ── Backward-compat aliases ── */
        card: "var(--color-card)",
        sidebar: "var(--color-sidebar)",
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
      },

      boxShadow: {
        "card-sm": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.08)",
        "card-modern": "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)",
        "card-hover-modern": "0 4px 16px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.04)",
        "card-elevated": "0 8px 24px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)",
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
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "fade-in-up": "fade-in-up 500ms ease-out forwards",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
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
