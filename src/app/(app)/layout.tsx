import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme-provider";
import { AntProvider } from "@/components/providers/AntProvider";
import { AppShell } from "@/components/layout/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <AntProvider>
        <AppShell>{children}</AppShell>
      </AntProvider>
    </ThemeProvider>
  );
}
