/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/sessoes/page.tsx
 * Propósito: Pagina do painel de sessoes WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SessionsPanelClient } from "@/components/whatsapp/sessions-panel-client";

export default function SessoesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function getCompany() {
      try {
        const res = await fetch("/api/auth/company-id", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setCompanyId(data.companyId);
        }
      } catch {
        // Silently fail
      }
    }
    getCompany();
  }, []);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return <SessionsPanelClient companyId={companyId} />;
}
