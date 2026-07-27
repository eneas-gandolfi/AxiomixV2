/**
 * Arquivo: src/components/whatsapp/conversation-aside-tabs.tsx
 * Propósito: Toggle Briefing | Contato na coluna direita do detalhe da
 *            conversa (Onda 3 do redesign — Contatos deixou de ser aba do
 *            módulo e virou consulta contextual dentro de Conversas).
 *            Recebe os dois painéis como ReactNode: o Briefing continua
 *            server-rendered; só o toggle é client.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

"use client";

import { useState, type ReactNode } from "react";

type ConversationAsideTabsProps = {
  briefing: ReactNode;
  contact: ReactNode;
};

const TABS = [
  { key: "briefing" as const, label: "Briefing" },
  { key: "contact" as const, label: "Contato" },
];

export function ConversationAsideTabs({ briefing, contact }: ConversationAsideTabsProps) {
  const [active, setActive] = useState<"briefing" | "contact">("briefing");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex gap-1 border-b border-[var(--color-border)] px-5 pt-3"
        role="tablist"
        aria-label="Painel lateral da conversa"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={`-mb-px rounded-t-md px-3 py-2 text-[12px] font-semibold transition-colors ${
                isActive
                  ? "border-b-2 border-[var(--color-primary)] text-[var(--color-text)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Os dois painéis ficam montados (o Briefing é server-rendered e não
          pode remontar no client); o inativo só fica oculto. */}
      <div className={active === "briefing" ? "contents" : "hidden"}>{briefing}</div>
      <div className={active === "contact" ? "contents" : "hidden"}>{contact}</div>
    </div>
  );
}
