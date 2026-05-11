/**
 * Arquivo: src/lib/whatsapp/painel-modo.ts
 * Proposito: Helper compartilhado server+client para o modo do Painel da
 *            Inteligencia. Mantido em modulo isomorfico (sem "use client")
 *            para que page.tsx (Server Component) possa importar sem cruzar
 *            a fronteira client/server.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

export type PainelModo = "agora" | "historico";

export const PAINEL_MODO_DEFAULT: PainelModo = "agora";

export function parsePainelModo(value: string | string[] | undefined): PainelModo {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "historico" ? "historico" : "agora";
}
