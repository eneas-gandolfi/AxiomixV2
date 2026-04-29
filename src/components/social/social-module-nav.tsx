/**
 * Arquivo: src/components/social/social-module-nav.tsx
 * Propósito: Navegação por abas do módulo Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenSquare, Calendar, History, ClipboardList, FolderOpen } from "lucide-react";

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof PenSquare;
  exact?: boolean;
};

const TABS: TabItem[] = [
  { key: "agendar", label: "Agendar", href: "/social-publisher", icon: PenSquare, exact: true },
  { key: "calendario", label: "Calendário", href: "/social-publisher/calendario", icon: Calendar },
  { key: "historico", label: "Histórico", href: "/social-publisher/historico", icon: History },
  { key: "biblioteca", label: "Biblioteca", href: "/social-publisher/biblioteca", icon: FolderOpen },
  { key: "demandas", label: "Demandas", href: "/social-publisher/demandas", icon: ClipboardList },
];

function isTabActive(pathname: string, tab: TabItem) {
  if (tab.exact) return pathname === tab.href;
  return pathname.startsWith(tab.href);
}

export function SocialModuleNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-[var(--color-border)]">
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
