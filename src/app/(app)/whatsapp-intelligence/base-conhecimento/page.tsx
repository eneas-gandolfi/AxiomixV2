/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/base-conhecimento/page.tsx
 * Propósito: Listagem de knowledge bases com cards e status de documentos.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

"use client";

import { useState, useEffect } from "react";
import { BookOpen, Loader2, Plus, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type KnowledgeBase = {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  document_count: number;
};

export default function KnowledgeBasesPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    async function getCompany() {
      try {
        const res = await fetch("/api/auth/company-id");
        if (res.ok) {
          const data = await res.json();
          setCompanyId(data.companyId);
        }
      } catch { /* silently fail */ }
    }
    getCompany();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    async function fetchKBs() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/whatsapp/knowledge-base?companyId=${companyId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erro ao carregar.");
        }
        const data = await res.json();
        setKbs(data.knowledgeBases ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    }
    fetchKBs();
  }, [companyId]);

  const handleCreate = async () => {
    if (!companyId || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/whatsapp/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao criar.");
      }
      const data = await res.json();
      setKbs((prev) => [...prev, data.knowledgeBase]);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setCreating(false);
    }
  };

  if (!companyId || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--module-accent)]" />
          <h2 className="text-lg font-semibold text-text">Bases de Conhecimento</h2>
          <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
            {kbs.length}
          </span>
        </div>
      </div>

      {/* Criar nova KB inline */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da nova base..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()} className="gap-1.5">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>
      )}

      {kbs.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-sm font-medium text-text">Nenhuma base de conhecimento</p>
          <p className="mt-1 text-xs text-muted">
            Crie uma base para alimentar os agentes IA com contexto.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kbs.map((kb) => (
            <Link
              key={kb.id}
              href={`/whatsapp-intelligence/base-conhecimento/${kb.id}?companyId=${companyId}`}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-[var(--module-accent)]/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--module-accent)]/10">
                  <BookOpen className="h-4.5 w-4.5 text-[var(--module-accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text group-hover:text-[var(--module-accent)] transition-colors">
                    {kb.name}
                  </h3>
                  {kb.description && (
                    <p className="text-xs text-muted line-clamp-1">{kb.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {kb.document_count} documento{kb.document_count !== 1 ? "s" : ""}
                </span>
                {kb.provider && (
                  <span className="rounded bg-muted/15 px-1.5 py-0.5">{kb.provider}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
