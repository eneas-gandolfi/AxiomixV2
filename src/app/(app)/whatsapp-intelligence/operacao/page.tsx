/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/operacao/page.tsx
 * Proposito: Redirect 308 — a antiga aba "Operacao" virou modo do Painel
 *            unificado em ?modo=agora (Onda 2 do redesign 7->3). Mantemos
 *            a rota viva apenas para preservar bookmarks e links externos
 *            (notificacoes, emails).
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { permanentRedirect } from "next/navigation";

export default function OperacaoPage() {
  permanentRedirect("/whatsapp-intelligence?modo=agora");
}
