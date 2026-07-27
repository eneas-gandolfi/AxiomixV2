/**
 * Arquivo: src/components/whatsapp/add-note-dialog.tsx
 * Propósito: Dialog de notas internas da conversa — lista, cria e apaga notas
 *            via /api/whatsapp/notes. Uso controlado (open/onClose, ex.: quick
 *            action da lista) ou não-controlado (renderiza o próprio trigger,
 *            ex.: hero do detalhe da conversa).
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Input } from "antd";
import { StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Note = {
  id: string;
  content: string;
  created_at: string | null;
};

type AddNoteDialogProps = {
  companyId: string;
  conversationId: string;
  /** Modo controlado: quando definido, o componente não renderiza trigger. */
  open?: boolean;
  onClose?: () => void;
};

export function AddNoteDialog({
  companyId,
  conversationId,
  open: controlledOpen,
  onClose,
}: AddNoteDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    setContent("");
    if (isControlled) onClose?.();
    else setInternalOpen(false);
  };

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const response = await fetch(
        `/api/whatsapp/notes?companyId=${companyId}&conversationId=${conversationId}`,
      );
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(), { code: data.code });
      setNotes(Array.isArray(data.notes) ? data.notes : []);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Não foi possível carregar as notas.");
    } finally {
      setLoadingNotes(false);
    }
  }, [companyId, conversationId]);

  useEffect(() => {
    if (open) void loadNotes();
  }, [open, loadNotes]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, conversationId, content: content.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(), { code: data.code });
      setContent("");
      await loadNotes();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const code = (err as { code?: string }).code;
      setError(
        code === "VALIDATION_ERROR"
          ? "Conteúdo da nota inválido."
          : "Não foi possível salvar a nota. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/whatsapp/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw Object.assign(new Error(), { code: data.code });
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Não foi possível apagar a nota.");
    }
  };

  const formatDate = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(iso))
      : "";

  return (
    <>
      {!isControlled ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setInternalOpen(true)}
        >
          <StickyNote className="h-4 w-4" />
          Notas
        </Button>
      ) : null}

      <div className="antd-scope">
        <Modal
          title="Notas internas"
          open={open}
          onOk={handleAdd}
          onCancel={close}
          okText="Adicionar nota"
          cancelText="Fechar"
          confirmLoading={saving}
          okButtonProps={{ disabled: !content.trim() }}
        >
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}

          <Input.TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva uma nota visível só pra equipe…"
            rows={3}
            maxLength={5000}
          />

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {loadingNotes ? (
              <p className="py-2 text-sm text-muted">Carregando notas…</p>
            ) : notes.length === 0 ? (
              <p className="py-2 text-sm italic text-muted">
                Nenhuma nota nesta conversa ainda.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-sm text-text">
                      {note.content}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {formatDate(note.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(note.id)}
                    className="rounded p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    aria-label="Apagar nota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Modal>
      </div>
    </>
  );
}
