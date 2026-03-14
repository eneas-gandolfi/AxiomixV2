/**
 * Arquivo: src/components/social/hashtag-group-manager.tsx
 * Propósito: Modal de gerenciamento completo de grupos de hashtags (CRUD).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Table, Input } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Trash2, Plus, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { axiomixTableProps } from "@/lib/ant-table-defaults";
import type { HashtagGroup } from "@/types/modules/social-publisher.types";

type HashtagGroupManagerProps = {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onGroupsChange: () => void;
};

type FormState = {
  mode: "idle" | "create" | "edit";
  editingId: string | null;
  name: string;
  hashtagsText: string;
};

const INITIAL_FORM: FormState = {
  mode: "idle",
  editingId: null,
  name: "",
  hashtagsText: "",
};

export function HashtagGroupManager({
  companyId,
  isOpen,
  onClose,
  onGroupsChange,
}: HashtagGroupManagerProps) {
  const [groups, setGroups] = useState<HashtagGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/social/hashtag-groups?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      setForm(INITIAL_FORM);
      setError(null);
    }
  }, [isOpen, fetchGroups]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Nome do grupo é obrigatório.");
      return;
    }

    const hashtags = form.hashtagsText
      .split(/[\n,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (hashtags.length === 0) {
      setError("Informe ao menos uma hashtag.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const isEdit = form.mode === "edit" && form.editingId;
      const url = isEdit
        ? `/api/social/hashtag-groups/${form.editingId}`
        : "/api/social/hashtag-groups";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, name: form.name.trim(), hashtags }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar grupo.");
      }

      setForm(INITIAL_FORM);
      await fetchGroups();
      onGroupsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar grupo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      const res = await fetch(
        `/api/social/hashtag-groups/${groupId}?companyId=${companyId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao excluir grupo.");
      }
      await fetchGroups();
      onGroupsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir grupo.");
    }
  };

  const startEdit = (group: HashtagGroup) => {
    setForm({
      mode: "edit",
      editingId: group.id,
      name: group.name,
      hashtagsText: group.hashtags.join("\n"),
    });
    setError(null);
  };

  const columns: ColumnsType<HashtagGroup> = [
    {
      title: "Nome",
      dataIndex: "name",
      key: "name",
      width: 160,
      render: (name: string) => (
        <span className="font-medium text-[var(--color-text)]">{name}</span>
      ),
    },
    {
      title: "Qtd",
      key: "count",
      width: 60,
      align: "center",
      render: (_, record) => (
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {record.hashtags.length}
        </span>
      ),
    },
    {
      title: "Preview",
      key: "preview",
      ellipsis: true,
      render: (_, record) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {record.hashtags.slice(0, 4).join(" ")}
          {record.hashtags.length > 4 ? " ..." : ""}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => startEdit(record)}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(record.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--color-danger-bg)] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-[#FA5E24]" />
          <span>Gerenciar Grupos de Hashtags</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <div className="space-y-4 mt-4">
        {/* Form */}
        {form.mode !== "idle" ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 space-y-3">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {form.mode === "create" ? "Novo Grupo" : "Editar Grupo"}
            </p>
            <Input
              placeholder="Nome do grupo (ex: Marketing Digital)"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="!rounded-lg"
            />
            <Input.TextArea
              placeholder="Hashtags (uma por linha ou separadas por vírgula)"
              value={form.hashtagsText}
              onChange={(e) => setForm((prev) => ({ ...prev, hashtagsText: e.target.value }))}
              rows={4}
              className="!rounded-lg"
            />
            {error && (
              <p className="text-xs text-[var(--color-danger)]">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setForm({ ...INITIAL_FORM, mode: "create" })}
          >
            <Plus className="h-4 w-4" />
            Novo Grupo
          </Button>
        )}

        {/* Table */}
        <div className="antd-scope">
          <Table
            {...axiomixTableProps}
            columns={columns}
            dataSource={groups}
            rowKey="id"
            loading={isLoading}
            pagination={false}
            locale={{ emptyText: "Nenhum grupo de hashtags criado." }}
          />
        </div>
      </div>
    </Modal>
  );
}
