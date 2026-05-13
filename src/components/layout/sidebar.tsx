/**
 * Arquivo: src/components/layout/sidebar.tsx
 * Propósito: Sidebar de navegação — design Marker.
 *            Workspace switcher no topo, brackets de canto no item ativo,
 *            footer com user + collapse toggle.
 * Autor: AXIOMIX
 * Data: 2026-05-12
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  PanelLeft,
  Settings,
  Share2,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCriticalCount } from "@/lib/whatsapp/use-critical-count";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const FEATURE_INTELLIGENCE = process.env.NEXT_PUBLIC_FEATURE_INTELLIGENCE === "true";
const FEATURE_SOCIAL_PUBLISHER = process.env.NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER === "true";
const FEATURE_KB = process.env.NEXT_PUBLIC_FEATURE_KB === "true";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "WhatsApp Intelligence",
        href: "/whatsapp-intelligence",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "crescimento",
    label: "Crescimento",
    items: [
      {
        label: "Intelligence",
        href: "/intelligence",
        icon: TrendingUp,
        comingSoon: !FEATURE_INTELLIGENCE,
      },
      {
        label: "Social Publisher",
        href: "/social-publisher",
        icon: Share2,
        comingSoon: !FEATURE_SOCIAL_PUBLISHER,
      },
      ...(FEATURE_KB
        ? [
            {
              label: "Base de Conhecimento",
              href: "/base-conhecimento",
              icon: BookOpen,
            },
          ]
        : []),
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [{ label: "Configurações", href: "/settings", icon: Settings }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function initialsFrom(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firstNameFrom(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  const first = name.split(/[\s@]/).filter(Boolean)[0];
  if (!first) return fallback;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const { count: criticalCount } = useCriticalCount();
  const [userName, setUserName] = useState<string | null>(null);
  const isExpanded = !collapsed || hovered;
  const showTooltip = collapsed && !hovered;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled || !data.user) return;
        const meta = data.user.user_metadata as { full_name?: unknown } | null;
        const fullName =
          typeof meta?.full_name === "string" && meta.full_name.trim()
            ? meta.full_name.trim()
            : (data.user.email ?? null);
        if (fullName) setUserName(fullName);
      } catch (error) {
        console.error("[sidebar] erro ao buscar usuário:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const userInitials = initialsFrom(userName, "U");
  const userFirstName = firstNameFrom(userName, "Conta");

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        role="navigation"
        aria-label="Menu principal"
        onMouseEnter={() => {
          if (collapsed) setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: isExpanded ? "260px" : "64px",
          transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="sticky top-0 flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-[rgba(255,255,255,0.05)] bg-[var(--color-sidebar-nav)]"
      >
        {/* Brand · Axiomix favicon */}
        <div
          className={cn(
            "flex flex-shrink-0 items-center border-b border-[rgba(255,255,255,0.05)]",
            isExpanded ? "gap-2.5 px-4 py-3" : "justify-center px-2 py-3"
          )}
        >
          <Image
            src="/axiomix-favicon.png"
            alt="Axiomix"
            width={22}
            height={22}
            priority
            className="flex-shrink-0 rounded-[6px]"
          />
          <span
            className="text-[11px] font-bold tracking-[0.22em] text-[var(--color-primary-hover)]"
            style={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
              transition: "opacity 180ms ease, width 180ms ease",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            aria-hidden={!isExpanded}
          >
            AXIOMIX
          </span>
        </div>

        {/* Navigation */}
        <nav
          id="sidebar-nav"
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5"
        >
          {NAV_GROUPS.map((group, groupIdx) => {
            if (group.items.length === 0) return null;
            return (
              <div
                key={group.id}
                className={cn("flex flex-col gap-[1px]", groupIdx > 0 && "mt-5")}
              >
                {isExpanded ? (
                  <div
                    className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3A4252]"
                    style={{
                      opacity: isExpanded ? 1 : 0,
                      transition: "opacity 180ms ease",
                    }}
                  >
                    {group.label}
                  </div>
                ) : null}
                {group.items.map((item) => {
                  const isActive =
                    !item.comingSoon &&
                    (pathname === item.href ||
                      pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  const isComingSoon = Boolean(item.comingSoon);
                  const showBadge =
                    item.href === "/whatsapp-intelligence" && criticalCount > 0;
                  const tooltipLabel = isComingSoon
                    ? `${item.label} (Em breve)`
                    : item.label;

                  const itemContent = (
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      aria-disabled={isComingSoon ? true : undefined}
                      tabIndex={isComingSoon ? -1 : undefined}
                      onClick={
                        isComingSoon ? (e) => e.preventDefault() : undefined
                      }
                      title={showTooltip ? tooltipLabel : undefined}
                      data-active={isActive ? "true" : undefined}
                      data-coming-soon={isComingSoon ? "true" : undefined}
                      className={cn(
                        "sidebar-item group relative flex w-full items-center rounded-[10px] transition-colors duration-150",
                        !isExpanded ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                      )}
                    >
                      <Icon
                        size={18}
                        aria-hidden="true"
                        className="sidebar-item__icon flex-shrink-0"
                      />
                      <span
                        className="sidebar-item__label min-w-0 flex-1 overflow-hidden truncate whitespace-nowrap text-[13.5px] font-medium"
                        style={{
                          opacity: isExpanded ? 1 : 0,
                          width: isExpanded ? "auto" : 0,
                          transition: "opacity 180ms ease, width 180ms ease",
                        }}
                      >
                        {item.label}
                      </span>
                      {isComingSoon && isExpanded ? (
                        <span
                          aria-hidden="true"
                          className="ml-auto flex-shrink-0 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-[#3A4252]"
                        >
                          breve
                        </span>
                      ) : null}
                      {showBadge && isExpanded ? (
                        <span className="sidebar-item__count ml-auto flex-shrink-0 font-mono text-[11px] font-semibold tracking-[0.04em]">
                          {criticalCount > 99 ? "99+" : criticalCount}
                        </span>
                      ) : null}
                      {showBadge && !isExpanded ? (
                        <span
                          aria-hidden="true"
                          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"
                        />
                      ) : null}
                    </Link>
                  );

                  return showTooltip ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {tooltipLabel}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={item.href}>{itemContent}</div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer: user + collapse toggle */}
        <div
          className={cn(
            "mt-auto flex flex-shrink-0 items-center border-t border-[rgba(255,255,255,0.05)]",
            isExpanded ? "justify-between px-4 py-3" : "justify-center px-2 py-3"
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold"
              style={{
                backgroundColor: "rgb(var(--color-primary-rgb) / 0.16)",
                color: "var(--color-primary-hover)",
              }}
              aria-hidden="true"
            >
              {userInitials}
            </div>
            <span
              className="min-w-0 truncate text-[12px] font-medium text-[#8892A4]"
              style={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                transition: "opacity 180ms ease, width 180ms ease",
              }}
            >
              {userFirstName}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#3A4252] transition-colors hover:text-[#8892A4]"
            style={{
              display: isExpanded ? "flex" : "none",
            }}
          >
            <PanelLeft size={15} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
