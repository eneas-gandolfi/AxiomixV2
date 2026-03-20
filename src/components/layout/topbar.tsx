/**
 * Arquivo: src/components/layout/topbar.tsx
 * Propósito: Barra superior com ThemeToggle switch, notificações e logout.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopbarBreadcrumb } from "@/components/layout/topbar-breadcrumb";
import { TopbarClock } from "@/components/layout/topbar-clock";
import { TopbarNotifications } from "@/components/layout/topbar-notifications";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TopbarProps = {
  onMobileMenuOpen: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  const first = parts[0][0]?.toUpperCase() ?? "";
  const last = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return first + last || "?";
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [initials, setInitials] = useState("...");

  useEffect(() => {
    fetch("/api/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { company?: { name?: string } } | null) => {
        if (data?.company?.name) {
          setInitials(getInitials(data.company.name));
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--color-surface)]">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMobileMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <TopbarBreadcrumb />
          <TopbarClock />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <TopbarNotifications />

          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-dim)] text-xs font-bold text-[var(--color-primary)] sm:flex">
            {initials}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{isLoggingOut ? "Saindo..." : "Sair"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
