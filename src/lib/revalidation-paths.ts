/**
 * Arquivo: src/lib/revalidation-paths.ts
 * Propósito: Caminhos centralizados para revalidatePath() — evita strings hardcoded espalhadas.
 * Autor: AXIOMIX
 * Data: 2026-04-28
 *
 * Uso: import { paths } from "@/lib/revalidation-paths";
 *      revalidatePath(paths.whatsapp.root);
 */

export const paths = {
  dashboard: "/dashboard",
  settings: "/settings",
  whatsapp: {
    root: "/whatsapp-intelligence",
    conversas: "/whatsapp-intelligence/conversas",
    // Onda 3: contatos virou drill-down lateral em /conversas e pipeline
    // foi gated por NEXT_PUBLIC_FEATURE_PIPELINE. Mantemos os caminhos para
    // revalidar a aba Conversas quando dados de contato/pipeline mudam.
    contatos: "/whatsapp-intelligence/conversas",
    pipeline: "/whatsapp-intelligence/conversas",
  },
  intelligence: "/intelligence",
  social: {
    root: "/social-publisher",
    historico: "/social-publisher/historico",
    calendario: "/social-publisher/calendario",
    biblioteca: "/social-publisher/biblioteca",
    demandas: "/social-publisher/demandas",
  },
  rag: "/base-conhecimento",
  onboarding: "/onboarding",
} as const;
