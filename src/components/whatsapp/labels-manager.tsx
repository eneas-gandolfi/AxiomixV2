/**
 * Arquivo: src/components/whatsapp/labels-manager.tsx
 * Propósito: Painel de gestão de labels/tags do Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect } from "react";
import { Tag, Input, ColorPicker } from "antd";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LabelData = {
  id: string;
  name: string | null;
  color: string | null;
};

type LabelsManagerProps = {
  companyId: string;
};

export function LabelsManager({ companyId }: LabelsManagerProps) {
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabelName, setNewLabelName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const fetchLabels = async () => {
    try {
      const response = await fetch("/api/whatsapp/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "list" }),
      });
      if (response.ok) {
        const data = await response.json();
        setLabels(data.labels ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, [companyId]);

  const handleCreate = async () => {
    if (!newLabelName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/whatsapp/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "create", name: newLabelName.trim() }),
      });
      if (response.ok) {
        setNewLabelName("");
        await fetchLabels();
      }
    } catch {
      // Silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (labelId: string) => {
    try {
      await fetch("/api/whatsapp/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          action: "update",
          labelId,
          name: editName || undefined,
          color: editColor || undefined,
        }),
      });
      setEditingId(null);
      await fetchLabels();
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (labelId: string) => {
    try {
      await fetch("/api/whatsapp/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "delete", labelId }),
      });
      await fetchLabels();
    } catch {
      // Silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando labels...
      </div>
    );
  }

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-text">Gerenciar Labels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Criar novo label */}
        <div className="flex items-center gap-2">
          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Nome do novo label"
            size="small"
            onPressEnter={handleCreate}
            className="max-w-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={creating || !newLabelName.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Criar
          </Button>
        </div>

        {/* Lista de labels */}
        <div className="space-y-2">
          {labels.map((label) => (
            <div key={label.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              {editingId === label.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    size="small"
                    className="w-32"
                  />
                  <div className="antd-scope">
                    <ColorPicker
                      value={editColor || label.color || "#000000"}
                      onChange={(color) => setEditColor(color.toHexString())}
                      size="small"
                    />
                  </div>
                  <Button size="sm" variant="default" onClick={() => handleUpdate(label.id)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <Tag color={label.color ?? undefined}>{label.name ?? "?"}</Tag>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingId(label.id); setEditName(label.name ?? ""); setEditColor(label.color ?? ""); }}
                      className="rounded p-1 text-muted hover:text-text transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="rounded p-1 text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {labels.length === 0 && (
            <p className="text-sm text-muted">Nenhum label criado ainda.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
