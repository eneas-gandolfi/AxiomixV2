/**
 * Arquivo: src/components/whatsapp/whatsapp-module-nav.tsx
 * Propósito: Navegação por abas do módulo Inteligência (anteriormente
 *            "WhatsApp Intelligence"). Estrutura em 3 grupos visuais separados
 *            por divider sutil:
 *              [Operação · Análise] | [Conversas · Contatos · Pipeline] | [Agentes IA · Sessões]
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Clock,
  LayoutDashboard,
  MessageSquare,
  Users,
  Kanban,
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
 * Ordem importa: agrupada por frequência de uso e tipo.
 *   Visões consolidadas → fluxo de atendimento → config de IA + canais.
 * Equipe foi pra Configurações (cross-módulo, não pertence à Inteligência).
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
  {
    kind: "tab",
    key: "contatos",
    label: "Contatos",
    href: "/whatsapp-intelligence/contatos",
    icon: Users,
  },
  {
    kind: "tab",
    key: "pipeline",
    label: "Pipeline",
    href: "/whatsapp-intelligence/pipeline",
    icon: Kanban,
  },
  { kind: "separator" },
  {
    kind: "tab",
    key: "agentes",
    label: "Agentes IA",
    href: "/whatsapp-intelligence/agentes",
    icon: Bot,
  },
  {
    kind: "tab",
    key: "sessoes",
    label: "Sessões",
    href: "/whatsapp-intelligence/sessoes",
    icon: Clock,
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
