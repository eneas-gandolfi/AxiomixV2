/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/agentes/novo/page.tsx
 * Propósito: Página de criação de novo agente IA (admin only).
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { AgentForm } from "@/components/whatsapp/agents/agent-form";

export const dynamic = "force-dynamic";

export default function NewAgentPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function getCompany() {
      try {
        const res = await fetch("/api/auth/company-id");
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/whatsapp-intelligence/agentes"
          className="rounded-lg p-1.5 text-muted hover:bg-muted/10 hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-text">Novo Agente IA</h2>
          <p className="text-xs text-muted">Configure nome, tipo, comportamento e modelo.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <AgentForm
          mode="create"
          companyId={companyId}
          onSuccess={() => router.push("/whatsapp-intelligence/agentes")}
        />
      </div>
    </div>
  );
}
