/**
 * Arquivo: src/app/(app)/settings/integrations/page.tsx
 * Propósito: Redirecionar para settings principal (agora com tabs unificados)
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { redirect } from "next/navigation";

export default function IntegrationsPage() {
  // Redirect to main settings page with integrations tab active
  redirect("/settings?tab=integrations");
}
