/**
 * Arquivo: src/components/campaigns/campaigns-module-nav.tsx
 * Propósito: Navegacao por abas do modulo Campanhas em Massa.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, PlusCircle } from "lucide-react";

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof List;
  exact?: boolean;
};

const TABS: TabItem[] = [
  {
    key: "campanhas",
    label: "Campanhas",
    href: "/campanhas",
    icon: List,
    exact: true,
  },
  {
    key: "nova",
    label: "Nova Campanha",
    href: "/campanhas/nova",
    icon: PlusCircle,
  },
];

function isTabActive(pathname: string, tab: TabItem) {
  if (tab.exact) {
    return pathname === tab.href;
  }
  return pathname.startsWith(tab.href);
}

export function CampaignsModuleNav() {
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
