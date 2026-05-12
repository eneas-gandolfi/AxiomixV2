import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme-provider";
import { AntProvider } from "@/components/providers/AntProvider";
import { AppShell } from "@/components/layout/app-shell";
import { IdleTimeoutProvider } from "@/components/layout/idle-timeout-provider";
import { IdleTimeoutModal } from "@/components/layout/idle-timeout-modal";

// Segmento autenticado é multi-tenant: toda página acessa dados específicos do
// usuário (Supabase com RLS, Evo CRM por company). Forçar render dinâmico evita
// que o Next prerender uma rota com dados de um tenant e sirva para outro —
// risco real desde a mudança de cache semantics do Next 16.
//
// Páginas individuais podem sobrescrever para estático (force-static) caso não
// dependam de cookies/auth; ver docs/architecture/rendering-strategy.md.
export const dynamic = "force-dynamic";

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
