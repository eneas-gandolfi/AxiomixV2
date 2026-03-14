/**
 * Arquivo: src/components/layout/topbar.tsx
 * Propósito: Barra superior com ThemeToggle switch, notificações e logout.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TopbarClock } from "@/components/layout/topbar-clock";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TopbarProps = {
  onMobileMenuOpen: () => void;
};

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--color-surface)]">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMobileMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <TopbarClock />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            aria-label="Notificações"
            className="flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <Bell size={18} aria-hidden="true" />
          </button>

          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-dim)] text-xs font-bold text-[var(--color-primary)] sm:flex">
            AX
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </div>
    </header>
  );
}
