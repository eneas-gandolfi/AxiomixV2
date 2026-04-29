/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/base-conhecimento/[kbId]/page.tsx
 * Propósito: Detalhe de knowledge base — documentos, adicionar conteúdo, testar busca.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, FileText, Globe, Loader2, Plus, Search, Trash2, Type } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type KnowledgeBase = {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
};

type Document = {
  id: string;
  title: string | null;
  source_type: string;
  status: string;
  content_preview: string | null;
  created_at: string | null;
};

type SearchResult = {
  content: string;
  score: number;
};

type PageProps = { params: Promise<{ kbId: string }> };

export default function KBDetailPage({ params }: PageProps) {
  const { kbId } = use(params);
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState<string | null>(searchParams.get("companyId"));
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add content state
  const [addMode, setAddMode] = useState<"manual" | "url" | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [adding, setAdding] = useState(false);

  // Search test state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (companyId) return;
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
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    async function fetchData() {
      setLoading(true);
      try {
        const [kbRes, docsRes] = await Promise.all([
          fetch(`/api/whatsapp/knowledge-base/${kbId}?companyId=${companyId}`),
          fetch(`/api/whatsapp/knowledge-base/${kbId}?companyId=${companyId}&action=documents`),
        ]);
        if (kbRes.ok) {
          const data = await kbRes.json();
          setKb(data.knowledgeBase);
        }
        if (docsRes.ok) {
          const data = await docsRes.json();
          setDocuments(data.documents ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, kbId]);

  const handleAddContent = async () => {
    if (!companyId) return;
    setAdding(true);
    setError(null);
    try {
      const body = addMode === "manual"
        ? { companyId, type: "manual", title: manualTitle, content: manualContent }
        : { companyId, type: "url", url: urlInput };

      const res = await fetch(`/api/whatsapp/knowledge-base/${kbId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao adicionar.");
      }
      const data = await res.json();
      setDocuments((prev) => [...prev, data.document]);
      setAddMode(null);
      setManualTitle("");
      setManualContent("");
      setUrlInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setAdding(false);
    }
  };

  const handleSearch = async () => {
    if (!companyId || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/whatsapp/knowledge-base/${kbId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "search", query: searchQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    } catch { /* silently fail */ }
    finally {
      setSearching(false);
    }
  };

  if (loading || !companyId) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/whatsapp-intelligence/base-conhecimento"
          className="rounded-lg p-1.5 text-muted hover:bg-muted/10 hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--module-accent)]" />
            <h2 className="text-lg font-semibold text-text">{kb?.name ?? "Base de Conhecimento"}</h2>
          </div>
          {kb?.description && <p className="text-xs text-muted">{kb.description}</p>}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</div>
      )}

      {/* Adicionar conteúdo */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-text">Adicionar Conteúdo</h3>
        {!addMode ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAddMode("manual")} className="gap-1.5">
              <Type className="h-3.5 w-3.5" /> Texto Manual
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAddMode("url")} className="gap-1.5">
              <Globe className="h-3.5 w-3.5" /> URL
            </Button>
          </div>
        ) : addMode === "manual" ? (
          <div className="space-y-3">
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Título do documento"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none"
            />
            <textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Conteúdo em markdown..."
              rows={6}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddContent} disabled={adding || !manualTitle.trim() || !manualContent.trim()} className="gap-1.5">
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Adicionar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAddMode(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://exemplo.com/pagina"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddContent} disabled={adding || !urlInput.trim()} className="gap-1.5">
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Indexar URL
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAddMode(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Documentos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-text">
          Documentos ({documents.length})
        </h3>
        {documents.length === 0 ? (
          <p className="text-xs text-muted">Nenhum documento adicionado ainda.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-sm text-text">{doc.title ?? "Sem título"}</p>
                    <p className="text-xs text-muted">
                      {doc.source_type} · {doc.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Testar Busca */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-text">Testar Busca</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Digite uma pergunta para testar..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button size="sm" onClick={handleSearch} disabled={searching || !searchQuery.trim()} className="gap-1.5">
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Buscar
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((result, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--module-accent)]">
                    Score: {(result.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-text">{result.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
