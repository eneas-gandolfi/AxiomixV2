/**
 * Arquivo: src/components/whatsapp/whatsapp-module-nav.tsx
 * Propósito: Navegação por áreas do módulo Inteligência:
 *              [Grupos] | [Conversas individuais] | [Histórico] | [Agentes IA]
 *
 *            Remove o seletor mental duplicado dentro do Painel e deixa claro
 *            se o usuário está monitorando grupos, atendendo conversas
 *            individuais ou lendo histórico analítico.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  Clock,
  KanbanSquare,
  MessageSquare,
  Users2,
  type LucideIcon,
} from "lucide-react";

type TabItem = {
  kind: "tab";
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match:
    | { type: "mode"; value: "grupos" | "agora" | "historico" }
    | { type: "path"; value: string };
};

type Separator = { kind: "separator" };

type NavEntry = TabItem | Separator;

const PIPELINE_ENABLED = process.env.NEXT_PUBLIC_FEATURE_PIPELINE === "true";

const NAV: NavEntry[] = [
  {
    kind: "tab",
    key: "grupos",
    label: "Grupos",
    href: "/whatsapp-intelligence",
    icon: Users2,
    match: { type: "mode", value: "grupos" },
  },
  {
    kind: "tab",
    key: "conversas-individuais",
    label: "Conversas individuais",
    href: "/whatsapp-intelligence?modo=agora",
    icon: MessageSquare,
    match: { type: "mode", value: "agora" },
  },
  {
    kind: "tab",
    key: "historico",
    label: "Histórico",
    href: "/whatsapp-intelligence?modo=historico",
    icon: Clock,
    match: { type: "mode", value: "historico" },
  },
  // F6: Pipeline kanban real — só entra no chrome com a flag ligada.
  ...(PIPELINE_ENABLED
    ? [
        {
          kind: "tab",
          key: "pipeline",
          label: "Pipeline",
          href: "/whatsapp-intelligence/pipeline",
          icon: KanbanSquare,
          match: { type: "path", value: "/whatsapp-intelligence/pipeline" },
        } satisfies TabItem,
      ]
    : []),
  { kind: "separator" },
  {
    kind: "tab",
    key: "agentes",
    label: "Agentes IA",
    href: "/whatsapp-intelligence/agentes",
    icon: Bot,
    match: { type: "path", value: "/whatsapp-intelligence/agentes" },
  },
];

function getActiveMode(pathname: string, modo: string | null) {
  if (pathname.startsWith("/whatsapp-intelligence/conversas")) return "agora";
  if (pathname !== "/whatsapp-intelligence") return null;
  if (modo === "agora" || modo === "historico") return modo;
  return "grupos";
}

function isTabActive(pathname: string, activeMode: string | null, tab: TabItem) {
  if (tab.match.type === "mode") {
    return activeMode === tab.match.value;
  }
  return pathname.startsWith(tab.match.value);
}

export function WhatsAppModuleNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeMode = getActiveMode(pathname, searchParams.get("modo"));

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
          const active = isTabActive(pathname, activeMode, entry);

          return (
            <Link
              key={entry.key}
              href={entry.href}
              aria-current={active ? "page" : undefined}
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
