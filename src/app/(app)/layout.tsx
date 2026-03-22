import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme-provider";
import { AntProvider } from "@/components/providers/AntProvider";
import { AppShell } from "@/components/layout/app-shell";
import { IdleTimeoutProvider } from "@/components/layout/idle-timeout-provider";
import { IdleTimeoutModal } from "@/components/layout/idle-timeout-modal";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <AntProvider>
        <IdleTimeoutProvider>
          <AppShell>{children}</AppShell>
          <IdleTimeoutModal />
        </IdleTimeoutProvider>
      </AntProvider>
    </ThemeProvider>
  );
}
