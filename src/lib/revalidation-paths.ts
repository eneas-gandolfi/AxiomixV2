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
    contatos: "/whatsapp-intelligence/contatos",
    pipeline: "/whatsapp-intelligence/pipeline",
  },
  intelligence: "/intelligence",
  social: {
    root: "/social-publisher",
    historico: "/social-publisher/historico",
    calendario: "/social-publisher/calendario",
    biblioteca: "/social-publisher/biblioteca",
    demandas: "/social-publisher/demandas",
  },
  campanhas: "/campanhas",
  rag: "/base-conhecimento",
  onboarding: "/onboarding",
} as const;
