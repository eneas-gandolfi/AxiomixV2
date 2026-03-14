/**
 * Arquivo: src/components/layout/sidebar.tsx
 * Propósito: Sidebar de navegação com cores por módulo (Design System v2.0).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
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

type ModuleColors = {
  color: string;
  bgLight: string;
  bgDark: string;
};

const MODULE_COLORS: Record<string, ModuleColors> = {
  "/dashboard": { color: "#8A8A8A", bgLight: "#F1F5F9", bgDark: "#222222" },
  "/whatsapp-intelligence": { color: "#2EC4B6", bgLight: "#E0FAF7", bgDark: "#164E4A" },
  "/intelligence": { color: "#D4A853", bgLight: "#FDF6E3", bgDark: "#6B5429" },
  "/social-publisher": { color: "#FA5E24", bgLight: "#FFF0EB", bgDark: "#7A2D11" },
  "/settings": { color: "#8A8A8A", bgLight: "#F1F5F9", bgDark: "#222222" },
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "WhatsApp Intelligence",
    href: "/whatsapp-intelligence",
    icon: MessageSquare,
  },
  { label: "Intelligence", href: "/intelligence", icon: TrendingUp },
  { label: "Social Publisher", href: "/social-publisher", icon: Share2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [criticalCount, setCriticalCount] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const isExpanded = !collapsed || hovered;
  const showTooltip = collapsed && !hovered;

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchCriticalCount = async () => {
      try {
        const response = await fetch("/api/company");
        if (!response.ok) return;

        const companyData = (await response.json()) as { company?: { id: string } };
        const companyId = companyData.company?.id;
        if (!companyId) return;

        const countResponse = await fetch("/api/whatsapp/critical-count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });

        if (countResponse.ok) {
          const data = (await countResponse.json()) as { count: number };
          setCriticalCount(data.count ?? 0);
        }
      } catch (error) {
        console.error("Erro ao buscar contagem de alertas críticos:", error);
      }
    };

    fetchCriticalCount();
    const interval = setInterval(fetchCriticalCount, 120000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        role="navigation"
        aria-label="Menu principal"
        onMouseEnter={() => {
          if (collapsed) {
            setHovered(true);
          }
        }}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: isExpanded ? "240px" : "64px",
          transition:
            "width 220ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms ease",
          borderRightColor:
            hovered && collapsed
              ? "rgba(250, 94, 36, 0.2)"
              : "var(--color-border)",
        }}
        className="sticky top-0 flex h-screen flex-shrink-0 flex-col overflow-hidden border-r bg-[var(--color-surface-2)]"
      >
        {/* Header */}
        <div
          className="relative flex h-16 flex-shrink-0 items-center border-b px-3"
          style={{ justifyContent: isExpanded ? "space-between" : "center" }}
        >
          <div
            className="flex items-center gap-2 overflow-hidden"
            style={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
              transition: "opacity 180ms ease, width 180ms ease",
            }}
            aria-hidden={!isExpanded}
          >
            <Image
              src="/logo.png"
              alt="AXIOMIX logo"
              width={24}
              height={24}
              className="flex-shrink-0 rounded-sm"
            />
            <span className="whitespace-nowrap font-display text-sm font-bold tracking-wide text-[var(--color-primary)]">
              AXIOMIX
            </span>
          </div>

          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            className="z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} aria-hidden="true" />
            )}
          </button>
        </div>

        {!isExpanded ? (
          <div className="flex justify-center py-2">
            <Image
              src="/logo.png"
              alt="AXIOMIX"
              width={24}
              height={24}
              className="flex-shrink-0 rounded-sm"
            />
          </div>
        ) : null}

        {/* Navigation */}
        <nav
          id="sidebar-nav"
          className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-2"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const moduleColor = MODULE_COLORS[item.href];
            const showBadge = item.href === "/whatsapp-intelligence" && criticalCount > 0;

            const activeBg = moduleColor
              ? isDark ? moduleColor.bgDark : moduleColor.bgLight
              : undefined;
            const activeColor = moduleColor?.color;

            const itemContent = (
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={showTooltip ? item.label : undefined}
                className={cn(
                  "relative flex w-full items-center rounded-lg transition-colors duration-150",
                  !isExpanded ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  !isActive && "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)]"
                )}
                style={
                  isActive && activeColor
                    ? {
                        color: activeColor,
                        backgroundColor: activeBg,
                      }
                    : undefined
                }
              >
                {/* Left accent bar for active item */}
                {isActive && (
                  <span
                    className="absolute left-0 inset-y-1.5 w-[3px] rounded-r"
                    style={{ backgroundColor: activeColor }}
                    aria-hidden="true"
                  />
                )}
                <Icon size={18} aria-hidden="true" className="flex-shrink-0" />
                <span
                  className="overflow-hidden whitespace-nowrap text-sm font-medium"
                  style={{
                    opacity: isExpanded ? 1 : 0,
                    width: isExpanded ? "auto" : 0,
                    transition: "opacity 180ms ease, width 180ms ease",
                  }}
                >
                  {item.label}
                </span>
                {showBadge && isExpanded && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-danger)] px-1.5 text-xs font-bold text-white">
                    {criticalCount > 99 ? "99+" : criticalCount}
                  </span>
                )}
                {showBadge && !isExpanded && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
                )}
              </Link>
            );

            return showTooltip ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.href}>{itemContent}</div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t p-3">
          <div
            className={cn(
              "cursor-pointer rounded-lg px-2 py-2 transition-colors hover:bg-[var(--color-surface-3)]",
              isExpanded ? "flex items-center gap-3" : "flex items-center justify-center"
            )}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-dim)] text-xs font-bold text-[var(--color-primary)]">
              AX
            </div>
            <div
              className="overflow-hidden"
              style={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                transition: "opacity 180ms ease, width 180ms ease",
              }}
            >
              <p className="truncate text-xs font-medium leading-none text-[var(--color-text)]">
                Minha Conta
              </p>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
