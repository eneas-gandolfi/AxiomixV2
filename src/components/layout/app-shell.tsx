"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/lib/hooks/use-sidebar-state";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ModuleThemeProvider } from "@/lib/module-theme";
import { useTheme } from "@/lib/theme-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, toggle] = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <div className="hidden lg:flex">
        <Sidebar collapsed={collapsed} onToggle={() => toggle()} />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <button
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />
        <ModuleThemeProvider isDark={theme === "dark"}>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </ModuleThemeProvider>
      </div>
    </div>
  );
}
