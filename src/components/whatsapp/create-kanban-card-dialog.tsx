/**
 * Arquivo: src/components/whatsapp/create-kanban-card-dialog.tsx
 * Propósito: Dialog "Adicionar ao pipeline" — cria card no kanban do Evo CRM
 *            a partir da conversa (POST /api/whatsapp/evo-actions/kanban),
 *            com select de board vindo de /api/whatsapp/kanban/boards.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

"use client";

import { useEffect, useState } from "react";
import { Modal, Input, Select } from "antd";
import { KanbanSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

type Board = { id: string | number; name: string };

type CreateKanbanCardDialogProps = {
  companyId: string;
  conversationId: string;
  /** Título sugerido do card (ex.: nome do contato). */
  defaultTitle?: string;
};

export function CreateKanbanCardDialog({
  companyId,
  conversationId,
  defaultTitle = "",
}: CreateKanbanCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingBoards(true);
    setError(null);
    (async () => {
      try {
        const response = await fetch("/api/whatsapp/kanban/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        const data = await response.json();
        if (!response.ok) throw Object.assign(new Error(), { code: data.code });
        if (cancelled) return;
        const list: Board[] = Array.isArray(data.boards) ? data.boards : [];
        setBoards(list);
        if (list.length > 0) setBoardId(String(list[0].id));
      } catch (err) {
        if ((err as Error).name === "AbortError" || cancelled) return;
        setError("Não foi possível carregar os pipelines.");
      } finally {
        if (!cancelled) setLoadingBoards(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const close = () => {
    setOpen(false);
    setError(null);
    setDescription("");
    setTitle(defaultTitle);
  };

  const handleCreate = async () => {
    if (!boardId || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/evo-actions/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          conversationId,
          boardId,
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(), { code: data.code });
      close();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const code = (err as { code?: string }).code;
      setError(
        code === "VALIDATION_ERROR"
          ? "Preencha o título e escolha um pipeline."
          : "Não foi possível criar o card. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <KanbanSquare className="h-4 w-4" />
        Adicionar ao pipeline
      </Button>

      <div className="antd-scope">
        <Modal
          title="Adicionar ao pipeline"
          open={open}
          onOk={handleCreate}
          onCancel={close}
          okText="Criar card"
          cancelText="Cancelar"
          confirmLoading={saving}
          okButtonProps={{ disabled: !boardId || !title.trim() }}
        >
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Pipeline</label>
              <Select
                className="w-full"
                value={boardId}
                onChange={(value) => setBoardId(value)}
                loading={loadingBoards}
                placeholder={loadingBoards ? "Carregando…" : "Escolha o pipeline"}
                options={boards.map((b) => ({ value: String(b.id), label: b.name }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Ex.: Maria — orçamento vestido"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">
                Descrição <span className="font-normal text-muted">(opcional)</span>
              </label>
              <Input.TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
