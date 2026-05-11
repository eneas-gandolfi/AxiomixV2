/**
 * Arquivo: src/components/whatsapp/whatsapp-module-nav.tsx
 * Propósito: Navegação por abas do módulo Inteligência. Reduzida para 3 abas
 *            (Onda 2 do redesign 7→3):
 *              [Painel] | [Conversas] | [Agentes IA]
 *
 *            Painel engole Operacao + Analise via toggle interno
 *            (?modo=agora | ?modo=historico). Outras rotas removidas da nav
 *            (Contatos, Pipeline, Sessoes) continuam vivas como fallback ate
 *            ondas seguintes.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";

type TabItem = {
  kind: "tab";
  key: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

type Separator = { kind: "separator" };

type NavEntry = TabItem | Separator;

/**
 * Onda 2 do redesign 7→3: Operacao virou modo do Painel (?modo=agora).
 * Apenas 3 abas no chrome — separators sumiram (so ha 1 grupo + Agentes IA).
 */
const NAV: NavEntry[] = [
  {
    kind: "tab",
    key: "painel",
    label: "Painel",
    href: "/whatsapp-intelligence",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    kind: "tab",
    key: "conversas",
    label: "Conversas",
    href: "/whatsapp-intelligence/conversas",
    icon: MessageSquare,
  },
  { kind: "separator" },
  {
    kind: "tab",
    key: "agentes",
    label: "Agentes IA",
    href: "/whatsapp-intelligence/agentes",
    icon: Bot,
  },
];

function isTabActive(pathname: string, tab: TabItem) {
  if (tab.exact) {
    return pathname === tab.href;
  }
  return pathname.startsWith(tab.href);
}

export function WhatsAppModuleNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border">
      <div className="flex gap-1 overflow-x-auto px-1 pb-px">
        {NAV.map((entry, index) => {
          if (entry.kind === "separator") {
            return (
              <span
                key={`sep-${index}`}
                aria-hidden="true"
                className="self-center mx-1 h-5 w-px bg-border"
              />
            );
          }

          const Icon = entry.icon;
          const active = isTabActive(pathname, entry);

          return (
            <Link
              key={entry.key}
              href={entry.href}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm rounded-t-lg transition-all border-b-2 ${
                active
                  ? "border-[var(--module-accent)] text-[var(--module-accent)] font-medium bg-[var(--module-accent-light)]/30"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
