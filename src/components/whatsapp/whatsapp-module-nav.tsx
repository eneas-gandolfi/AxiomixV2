/**
 * Arquivo: src/components/whatsapp/whatsapp-module-nav.tsx
 * Propósito: Navegação por abas do módulo WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Clock,
  LayoutDashboard,
  MessageSquare,
  Users,
  Kanban,
  UserCog,
} from "lucide-react";

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const TABS: TabItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/whatsapp-intelligence",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    key: "conversas",
    label: "Conversas",
    href: "/whatsapp-intelligence/conversas",
    icon: MessageSquare,
  },
  {
    key: "contatos",
    label: "Contatos",
    href: "/whatsapp-intelligence/contatos",
    icon: Users,
  },
  {
    key: "pipeline",
    label: "Pipeline",
    href: "/whatsapp-intelligence/pipeline",
    icon: Kanban,
  },
  {
    key: "agentes",
    label: "Agentes IA",
    href: "/whatsapp-intelligence/agentes",
    icon: Bot,
  },
  {
    key: "sessoes",
    label: "Sessões",
    href: "/whatsapp-intelligence/sessoes",
    icon: Clock,
  },
  {
    key: "equipe",
    label: "Equipe",
    href: "/whatsapp-intelligence/equipe",
    icon: UserCog,
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
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(pathname, tab);

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm rounded-t-lg transition-all border-b-2 ${
                active
                  ? "border-[var(--module-accent)] text-[var(--module-accent)] font-medium bg-[var(--module-accent-light)]/30"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
