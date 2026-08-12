/**
 * Arquivo: src/components/settings/group-agent-settings.tsx
 * Propósito: UI de configuração do agente IA para grupos WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Trash2,
  Loader2,
  MessageSquare,
  Database,
  Power,
  PowerOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  EyeOff,
  Eye,
  Users,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type GroupAgentConfig = {
  id: string;
  company_id: string;
  group_jid: string;
  group_name: string | null;
  is_active: boolean;
  trigger_keywords: string[];
  agent_name: string;
  agent_tone: string;
  feed_to_rag: boolean;
  rag_min_message_length: number;
  max_responses_per_hour: number;
  cooldown_seconds: number;
  evolution_instance_name: string | null;
  proactive_summary: boolean;
  proactive_summary_hour: number;
  proactive_sales_alert: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  stats: {
    totalMessages: number;
    totalResponses: number;
  };
  activity?: {
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    messages24h: number;
    uniqueSenders24h: number;
  };
};

function groupTimestamp(config: GroupAgentConfig) {
  const timestamp = config.activity?.lastMessageAt || config.updated_at || config.created_at;
  const time = new Date(timestamp).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortGroupsByRecentDate(a: GroupAgentConfig, b: GroupAgentConfig) {
  return groupTimestamp(b) - groupTimestamp(a);
}

export function GroupAgentSettings({ companyId }: { companyId: string }) {
  void companyId;

  const [configs, setConfigs] = useState<GroupAgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"visible" | "hidden">("visible");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/group-agent");
      if (!res.ok) throw new Error("Falha ao carregar configurações.");
      const data = await res.json();
      setConfigs(data.configs ?? []);
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar as configurações.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSyncGroups = async () => {
    if (syncing) return;

    setSyncing(true);
    setSyncProgress(8);
    let completed = false;
    const progressTimer = window.setInterval(() => {
      setSyncProgress((current) => {
        if (current === null) return 8;
        if (current < 50) return Math.min(current + 12, 50);
        if (current < 75) return Math.min(current + 8, 75);
        return Math.min(current + 4, 92);
      });
    }, 450);

    try {
      const res = await fetch("/api/settings/group-agent/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao sincronizar.");
      }
      const data = await res.json();
      toast({
        title: "Grupos sincronizados",
        description: `${data.created} novo(s), ${data.updated} atualizado(s)${data.hidden ? `, ${data.hidden} oculto(s)` : ""} de ${data.total} grupo(s).`,
      });
      await fetchConfigs();
      completed = true;
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível sincronizar os grupos.",
        variant: "destructive",
      });
    } finally {
      window.clearInterval(progressTimer);
      setSyncProgress(completed ? 100 : null);
      setSyncing(false);
      if (completed) {
        window.setTimeout(() => setSyncProgress(null), 900);
      }
    }
  };

  const handleToggle = async (configId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/settings/group-agent/${configId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar.");
      fetchConfigs();
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    }
  };

  const handleUpdateSettings = async (configId: string, updates: Record<string, unknown>) => {
    setSaving(configId);
    try {
      const res = await fetch(`/api/settings/group-agent/${configId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Falha ao salvar.");
      toast({ title: "Salvo", description: "Configurações atualizadas." });
      fetchConfigs();
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      const res = await fetch(`/api/settings/group-agent/${configId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir.");
      toast({ title: "Removido", description: "Grupo removido da lista." });
      fetchConfigs();
    } catch {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

  const handleToggleHidden = async (configId: string, isHidden: boolean) => {
    try {
      const res = await fetch(`/api/settings/group-agent/${configId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !isHidden }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar.");
      toast({ title: isHidden ? "Grupo restaurado" : "Grupo oculto", description: isHidden ? "O grupo voltou para a lista principal." : "O grupo foi movido para ocultos." });
      fetchConfigs();
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    }
  };

  const handleBulkToggleHidden = async (hide: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/settings/group-agent/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isHidden: hide }),
          })
        )
      );
      toast({
        title: hide ? "Grupos ocultos" : "Grupos restaurados",
        description: `${selectedIds.size} grupo(s) ${hide ? "oculto(s)" : "restaurado(s)"}.`,
      });
      setSelectedIds(new Set());
      fetchConfigs();
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar os grupos.", variant: "destructive" });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleConfigs = configs
    .filter((c) => !c.is_hidden)
    .sort(sortGroupsByRecentDate);
  const hiddenConfigs = configs.filter((c) => c.is_hidden).sort(sortGroupsByRecentDate);
  const currentConfigs = activeTab === "visible" ? visibleConfigs : hiddenConfigs;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Agente de Grupo WhatsApp</h2>
        <p className="mt-0.5 text-sm text-muted">
          A IA detecta automaticamente os grupos. Ative os que deseja monitorar.
        </p>
      </div>

      {/* Sincronizar grupos */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {configs.length} grupo(s) detectado(s)
        </p>
        <div className="flex w-full max-w-[320px] flex-col gap-2 sm:w-[320px]">
          <button
            type="button"
            onClick={handleSyncGroups}
            disabled={syncing}
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text hover:bg-sidebar transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar Grupos"}
          </button>
          {syncProgress !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>{syncing ? "Sincronizando grupos" : "Sincronização concluída"}</span>
                <span className="tabular-nums text-text">{syncProgress}%</span>
              </div>
              <div
                aria-label="Progresso da sincronização"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={syncProgress}
                className="h-1.5 overflow-hidden rounded-full bg-sidebar"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Grupos / Ocultos */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          type="button"
          onClick={() => { setActiveTab("visible"); setSelectedIds(new Set()); }}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "visible"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          Grupos ({visibleConfigs.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("hidden"); setSelectedIds(new Set()); }}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "hidden"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5" />
            Ocultos ({hiddenConfigs.length})
          </span>
        </button>
      </div>

      {/* Ações em lote */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-sidebar px-4 py-2">
          <span className="text-sm text-muted">{selectedIds.size} selecionado(s)</span>
          <button
            type="button"
            onClick={() => handleBulkToggleHidden(activeTab === "visible")}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
          >
            {activeTab === "visible" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {activeTab === "visible" ? "Ocultar selecionados" : "Restaurar selecionados"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted hover:text-text transition-colors"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {/* Lista de grupos */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {currentConfigs.length > 0 ? (
          <div className="space-y-3">
            {currentConfigs.map((config) => (
              <GroupCard
                key={config.id}
                config={config}
                expanded={expandedId === config.id}
                saving={saving === config.id}
                selected={selectedIds.has(config.id)}
                onToggle={() => handleToggle(config.id, config.is_active)}
                onExpand={() => setExpandedId(expandedId === config.id ? null : config.id)}
                onDelete={() => handleDelete(config.id)}
                onSave={(updates) => handleUpdateSettings(config.id, updates)}
                onToggleHidden={() => handleToggleHidden(config.id, config.is_hidden)}
                onToggleSelect={() => toggleSelection(config.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="border border-border rounded-xl bg-sidebar/30">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              {activeTab === "visible" ? (
                <>
                  <Bot className="h-10 w-10 text-muted" />
                  <p className="text-sm text-muted text-center max-w-md">
                    Nenhum grupo detectado ainda. Clique em &quot;Sincronizar Grupos&quot; para buscar os grupos
                    da Evolution API, ou aguarde mensagens chegarem via webhook.
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncGroups}
                    disabled={syncing}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Sincronizando..." : "Sincronizar Grupos"}
                  </button>
                </>
              ) : (
                <>
                  <Eye className="h-10 w-10 text-muted" />
                  <p className="text-sm text-muted text-center max-w-md">
                    Nenhum grupo oculto. Use o botão <EyeOff className="inline h-3.5 w-3.5" /> nos grupos para ocultá-los da lista principal.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <GroupEngagementCard groups={visibleConfigs} />
      </div>
    </div>
  );
}

function GroupEngagementCard({ groups }: { groups: GroupAgentConfig[] }) {
  const activeGroups = groups
    .filter((group) => group.activity?.lastMessageAt || (group.activity?.messages24h ?? 0) > 0)
    .sort((a, b) => {
      const messageDelta = (b.activity?.messages24h ?? 0) - (a.activity?.messages24h ?? 0);
      if (messageDelta !== 0) return messageDelta;
      return groupTimestamp(b) - groupTimestamp(a);
    });
  const topGroup = activeGroups[0] ?? null;
  const totalMessages24h = groups.reduce((sum, group) => sum + (group.activity?.messages24h ?? 0), 0);
  const engagedPeople24h = groups.reduce((sum, group) => sum + (group.activity?.uniqueSenders24h ?? 0), 0);

  return (
    <Card className="border border-border rounded-xl bg-card">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text">Assuntos e engajamento</h3>
            <p className="mt-0.5 text-xs text-muted">Leitura rápida dos grupos nas últimas 24h.</p>
          </div>
          <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
            24h
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-sidebar/40 px-3 py-2">
            <p className="text-lg font-semibold tabular-nums text-text">{totalMessages24h}</p>
            <p className="text-xs text-muted">mensagens</p>
          </div>
          <div className="rounded-lg border border-border bg-sidebar/40 px-3 py-2">
            <p className="text-lg font-semibold tabular-nums text-text">{engagedPeople24h}</p>
            <p className="text-xs text-muted">participações</p>
          </div>
        </div>

        {topGroup ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-start gap-2">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Mais ativo</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-text">
                  {topGroup.group_name ?? topGroup.group_jid}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1 rounded-md bg-sidebar px-2 py-1">
                    <MessageSquare className="h-3 w-3" />
                    {topGroup.activity?.messages24h ?? 0} msgs
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-sidebar px-2 py-1">
                    <Users className="h-3 w-3" />
                    {topGroup.activity?.uniqueSenders24h ?? 0} pessoas
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                  {topGroup.activity?.lastMessagePreview ?? "Sem assunto recente registrado."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-sm text-muted">
            Ainda não há mensagens recentes para resumir. Assim que os grupos receberem novas mensagens,
            este painel mostra assunto e engajamento.
          </div>
        )}

        {activeGroups.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Outros sinais</p>
            {activeGroups.slice(1, 3).map((group) => (
              <div key={group.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{group.group_name ?? group.group_jid}</p>
                  <p className="truncate text-xs text-muted">
                    {group.activity?.lastMessagePreview ?? "Sem preview recente."}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                  {group.activity?.messages24h ?? 0} msgs
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GroupCard({
  config,
  expanded,
  saving,
  selected,
  onToggle,
  onExpand,
  onDelete,
  onSave,
  onToggleHidden,
  onToggleSelect,
}: {
  config: GroupAgentConfig;
  expanded: boolean;
  saving: boolean;
  selected: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onDelete: () => void;
  onSave: (updates: Record<string, unknown>) => void;
  onToggleHidden: () => void;
  onToggleSelect: () => void;
}) {
  const [localName, setLocalName] = useState(config.group_name ?? "");
  const [localKeywords, setLocalKeywords] = useState(config.trigger_keywords.join(", "));
  const [localAgentName, setLocalAgentName] = useState(config.agent_name);
  const [localTone, setLocalTone] = useState(config.agent_tone);
  const [localMaxResp, setLocalMaxResp] = useState(config.max_responses_per_hour);
  const [localFeedRag, setLocalFeedRag] = useState(config.feed_to_rag);
  const [localProactiveSummary, setLocalProactiveSummary] = useState(config.proactive_summary);
  const [localProactiveSummaryHour, setLocalProactiveSummaryHour] = useState(config.proactive_summary_hour);
  const [localProactiveSalesAlert, setLocalProactiveSalesAlert] = useState(config.proactive_sales_alert);

  return (
    <Card className={`border rounded-xl transition-colors ${selected ? "border-primary/60 bg-primary/[0.02]" : config.is_active ? "border-success/40" : "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <label className="flex items-center pt-2.5 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                className="rounded border-border"
              />
            </label>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              config.is_active ? "bg-success/10" : "bg-sidebar"
            }`}>
              <Bot className={`h-5 w-5 ${config.is_active ? "text-success" : "text-muted"}`} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-text truncate" data-testid="group-agent-card-name">
                {config.group_name ?? config.group_jid}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {config.stats.totalMessages} msgs
                </span>
                <span className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  {config.stats.totalResponses} respostas
                </span>
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  RAG {config.feed_to_rag ? "ativo" : "off"}
                </span>
              </div>
              {config.is_active && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {config.trigger_keywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center rounded-md bg-primary-light px-2 py-0.5 text-xs text-primary font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleHidden}
              className="rounded-lg p-2 text-muted hover:text-text hover:bg-sidebar transition-colors"
              title={config.is_hidden ? "Restaurar grupo" : "Ocultar grupo"}
            >
              {config.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onToggle}
              className={`rounded-lg p-2 transition-colors ${
                config.is_active
                  ? "text-success hover:bg-success/10"
                  : "text-muted hover:bg-sidebar"
              }`}
              title={config.is_active ? "Desativar" : "Ativar"}
            >
              {config.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onExpand}
              className="rounded-lg p-2 text-muted hover:text-text hover:bg-sidebar transition-colors"
              title="Configurações"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Painel de configurações expandido */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Nome do Grupo</label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Ex: Vendas Equipe"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">Keywords de Ativação</label>
                <input
                  type="text"
                  value={localKeywords}
                  onChange={(e) => setLocalKeywords(e.target.value)}
                  placeholder="@axiomix, /ia"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-muted mt-1">Separadas por vírgula.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">Nome do Agente</label>
                <input
                  type="text"
                  value={localAgentName}
                  onChange={(e) => setLocalAgentName(e.target.value)}
                  placeholder="Axiomix IA"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">Tom do Agente</label>
                <select
                  value={localTone}
                  onChange={(e) => setLocalTone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                >
                  <option value="profissional">Profissional</option>
                  <option value="casual">Casual</option>
                  <option value="tecnico">Técnico</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">Max Respostas/Hora</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={localMaxResp}
                  onChange={(e) => setLocalMaxResp(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={localFeedRag}
                    onChange={(e) => setLocalFeedRag(e.target.checked)}
                    className="rounded border-border"
                  />
                  Alimentar base de conhecimento (RAG)
                </label>
              </div>
            </div>

            {/* Proatividade */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-text mb-3">Mensagens Proativas</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localProactiveSummary}
                      onChange={(e) => setLocalProactiveSummary(e.target.checked)}
                      className="rounded border-border"
                    />
                    Resumo diário automático
                  </label>
                  {localProactiveSummary && (
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">Horário (UTC)</label>
                      <select
                        value={localProactiveSummaryHour}
                        onChange={(e) => setLocalProactiveSummaryHour(Number(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localProactiveSalesAlert}
                      onChange={(e) => setLocalProactiveSalesAlert(e.target.checked)}
                      className="rounded border-border"
                    />
                    Alertas de vendas
                  </label>
                  <p className="text-xs text-muted mt-1">Compara o volume de conversas de hoje com ontem. Se houver variação acima de 20%, envia um alerta ao grupo com os números.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  onSave({
                    groupName: localName.trim() || undefined,
                    triggerKeywords: localKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                    agentName: localAgentName.trim() || undefined,
                    agentTone: localTone,
                    maxResponsesPerHour: localMaxResp,
                    feedToRag: localFeedRag,
                    proactiveSummary: localProactiveSummary,
                    proactiveSummaryHour: localProactiveSummaryHour,
                    proactiveSalesAlert: localProactiveSalesAlert,
                  })
                }
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-danger hover:border-danger/30 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
