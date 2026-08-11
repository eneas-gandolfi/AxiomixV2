/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/operacao/page.tsx
 * Proposito: Redirect 308 — a antiga aba "Operacao" agora cai na entrada
 *            padrão da Inteligência para evitar reabrir a superfície legada.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { permanentRedirect } from "next/navigation";

export default function OperacaoPage() {
  permanentRedirect("/whatsapp-intelligence");
}
