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
  Plus,
  Trash2,
  Loader2,
  Copy,
  CheckCircle2,
  MessageSquare,
  Database,
  Settings2,
  Power,
  PowerOff,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  created_at: string;
  updated_at: string;
  stats: {
    totalMessages: number;
    totalResponses: number;
  };
};

type EvolutionGroup = {
  id: string;
  subject: string;
  size: number;
};

type FormState = {
  groupJid: string;
  groupName: string;
  triggerKeywords: string;
  agentName: string;
  agentTone: string;
  feedToRag: boolean;
  maxResponsesPerHour: number;
  cooldownSeconds: number;
};

const DEFAULT_FORM: FormState = {
  groupJid: "",
  groupName: "",
  triggerKeywords: "@axiomix, /ia",
  agentName: "Axiomix IA",
  agentTone: "profissional",
  feedToRag: true,
  maxResponsesPerHour: 20,
  cooldownSeconds: 10,
};

export function GroupAgentSettings() {
  const [configs, setConfigs] = useState<GroupAgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [copied, setCopied] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<EvolutionGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsFetched, setGroupsFetched] = useState(false);
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

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/integrations/evolution-api/groups");
      if (!res.ok) throw new Error("Falha ao buscar grupos.");
      const data = await res.json();
      setAvailableGroups(data.groups ?? []);
      setGroupsFetched(true);
    } catch {
      toast({ title: "Erro", description: "Não foi possível buscar os grupos do WhatsApp. Verifique a integração Evolution API.", variant: "destructive" });
    } finally {
      setLoadingGroups(false);
    }
  }, [toast]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/evolution/group?token=${process.env.NEXT_PUBLIC_EVOLUTION_WEBHOOK_TOKEN ?? "SEU_TOKEN"}`
    : "";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    if (!form.groupJid.trim()) {
      toast({ title: "Erro", description: "JID do grupo é obrigatório.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/group-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupJid: form.groupJid.trim(),
          groupName: form.groupName.trim() || undefined,
          triggerKeywords: form.triggerKeywords.split(",").map((k) => k.trim()).filter(Boolean),
          agentName: form.agentName.trim() || undefined,
          agentTone: form.agentTone,
          feedToRag: form.feedToRag,
          maxResponsesPerHour: form.maxResponsesPerHour,
          cooldownSeconds: form.cooldownSeconds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Falha ao criar.");
      }

      toast({ title: "Grupo adicionado", description: "Agente configurado com sucesso." });
      setForm(DEFAULT_FORM);
      setShowForm(false);
      fetchConfigs();
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado.", variant: "destructive" });
    } finally {
      setSaving(false);
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

  const handleDelete = async (configId: string) => {
    try {
      const res = await fetch(`/api/settings/group-agent/${configId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir.");
      toast({ title: "Removido", description: "Configuração do grupo removida." });
      fetchConfigs();
    } catch {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    }
  };

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
          Configure a IA para escutar e responder em grupos WhatsApp.
        </p>
      </div>

      {/* Webhook URL */}
      <Card className="border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm text-text">URL do Webhook</CardTitle>
          <CardDescription className="text-muted">
            Configure este URL na Evolution API para receber mensagens de grupo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-sidebar px-3 py-2 text-xs text-text font-mono break-all">
              {webhookUrl}
            </code>
            <button
              onClick={handleCopyWebhook}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-text hover:bg-sidebar transition-colors"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de grupos configurados */}
      {configs.length > 0 && (
        <div className="space-y-3">
          {configs.map((config) => (
            <Card key={config.id} className="border border-border rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      config.is_active ? "bg-success/10" : "bg-sidebar"
                    }`}>
                      <Bot className={`h-5 w-5 ${config.is_active ? "text-success" : "text-muted"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-text truncate">
                        {config.group_name ?? config.group_jid}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate font-mono">
                        {config.group_jid}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted">
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
                          RAG {config.feed_to_rag ? "ativo" : "inativo"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {config.trigger_keywords.map((kw, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-primary-light px-2 py-0.5 text-xs text-primary font-medium">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(config.id, config.is_active)}
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
                      onClick={() => handleDelete(config.id)}
                      className="rounded-lg p-2 text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Formulário de novo grupo */}
      {showForm ? (
        <Card className="border border-primary/30 rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm text-text flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Adicionar Grupo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text mb-1">
                  Grupo WhatsApp *
                </label>
                {loadingGroups ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-sidebar px-3 py-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando grupos da Evolution API...
                  </div>
                ) : availableGroups.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={form.groupJid}
                        onChange={(e) => {
                          const jid = e.target.value;
                          const group = availableGroups.find((g) => g.id === jid);
                          setForm((p) => ({
                            ...p,
                            groupJid: jid,
                            groupName: group?.subject ?? p.groupName,
                          }));
                        }}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                      >
                        <option value="">Selecione um grupo...</option>
                        {availableGroups
                          .filter((g) => !configs.some((c) => c.group_jid === g.id))
                          .map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.subject} ({group.size} membros)
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={fetchGroups}
                        disabled={loadingGroups}
                        className="shrink-0 rounded-lg border border-border px-3 py-2 text-muted hover:text-text hover:bg-sidebar transition-colors"
                        title="Recarregar grupos"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingGroups ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    {form.groupJid && (
                      <p className="text-xs text-muted font-mono">JID: {form.groupJid}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="120363XXXXX@g.us"
                      value={form.groupJid}
                      onChange={(e) => setForm((p) => ({ ...p, groupJid: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted">
                        {groupsFetched
                          ? "Nenhum grupo encontrado. Digite o JID manualmente."
                          : "Digite o JID ou busque os grupos disponíveis."}
                      </p>
                      <button
                        type="button"
                        onClick={fetchGroups}
                        disabled={loadingGroups}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Buscar grupos
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Nome do Grupo (opcional)"
                      value={form.groupName}
                      onChange={(e) => setForm((p) => ({ ...p, groupName: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Keywords de Ativação
                </label>
                <input
                  type="text"
                  placeholder="@axiomix, /ia"
                  value={form.triggerKeywords}
                  onChange={(e) => setForm((p) => ({ ...p, triggerKeywords: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-muted mt-1">Separadas por vírgula.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Nome do Agente
                </label>
                <input
                  type="text"
                  placeholder="Axiomix IA"
                  value={form.agentName}
                  onChange={(e) => setForm((p) => ({ ...p, agentName: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Tom do Agente
                </label>
                <select
                  value={form.agentTone}
                  onChange={(e) => setForm((p) => ({ ...p, agentTone: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                >
                  <option value="profissional">Profissional</option>
                  <option value="casual">Casual</option>
                  <option value="tecnico">Técnico</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Max Respostas/Hora
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.maxResponsesPerHour}
                  onChange={(e) => setForm((p) => ({ ...p, maxResponsesPerHour: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.feedToRag}
                  onChange={(e) => setForm((p) => ({ ...p, feedToRag: e.target.checked }))}
                  className="rounded border-border"
                />
                Alimentar base de conhecimento (RAG)
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Grupo"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-text transition-colors"
              >
                Cancelar
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => { setShowForm(true); if (!groupsFetched) fetchGroups(); }}
          className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted hover:text-text hover:border-border-strong transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Adicionar Grupo
        </button>
      )}

      {/* Empty state */}
      {configs.length === 0 && !showForm && (
        <Card className="border border-border rounded-xl bg-sidebar/30">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Bot className="h-10 w-10 text-muted" />
            <p className="text-sm text-muted text-center">
              Nenhum grupo configurado. Adicione um grupo WhatsApp para que o agente comece a escutar e responder.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
