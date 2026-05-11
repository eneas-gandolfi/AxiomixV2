/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/contatos/page.tsx
 * Proposito: Redirect 308 — a antiga aba "Contatos" virou drill-down lateral
 *            dentro de /conversas (Onda 3 do redesign 7->3). O ?contatos=1
 *            faz o sheet abrir ja no primeiro paint para preservar a UX de
 *            quem chegou por bookmark/email/link externo.
 *
 *            UI completa (busca, tabela, etiquetas, criar contato, detalhe)
 *            mora em src/components/whatsapp/contacts-manager-sheet.tsx.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { permanentRedirect } from "next/navigation";

export default function ContatosPage() {
  permanentRedirect("/whatsapp-intelligence/conversas?contatos=1");
}
