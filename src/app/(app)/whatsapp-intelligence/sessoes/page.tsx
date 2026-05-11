/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/sessoes/page.tsx
 * Proposito: Redirect 308 — a antiga aba "Sessoes" migrou para a aba
 *            "Conexoes WhatsApp" dentro de /settings (Onda 3 do redesign
 *            7->3). Mantemos a rota viva apenas para preservar bookmarks,
 *            notificacoes e emails que apontam aqui.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { permanentRedirect } from "next/navigation";

export default function SessoesPage() {
  permanentRedirect("/settings?tab=connections");
}
