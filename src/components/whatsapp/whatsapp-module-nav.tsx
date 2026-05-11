/**
 * Arquivo: src/components/whatsapp/whatsapp-module-nav.tsx
 * Propósito: Navegação por abas do módulo Inteligência. Reduzida para 4 abas
 *            como parte do redesign 7→3 (onda 1):
 *              [Operação · Análise] | [Conversas] | [Agentes IA]
 *
 *            Removidas da nav (rotas continuam vivas como fallback ate
 *            ondas 2/3 finalizarem):
 *              - Contatos -> futuro drill-down lateral em Conversas
 *              - Pipeline -> feature flag, volta como feature futura
 *              - Sessões  -> migra para /settings/conexoes em onda 2
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
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
 * Ordem importa: visões consolidadas → fluxo de atendimento → config de IA.
 * Onda 1 do redesign 7→3: Contatos, Pipeline e Sessões saem da navegação
 * principal. Operação + Análise continuam separados até onda 2 (Painel
 * unificado com toggle Ao Vivo/Histórico).
 */
const NAV: NavEntry[] = [
  {
    kind: "tab",
    key: "operacao",
    label: "Operação",
    href: "/whatsapp-intelligence/operacao",
    icon: Activity,
  },
  {
    kind: "tab",
    key: "analise",
    label: "Análise",
    href: "/whatsapp-intelligence",
    icon: LayoutDashboard,
    exact: true,
  },
  { kind: "separator" },
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
