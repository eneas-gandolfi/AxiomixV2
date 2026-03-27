/**
 * Arquivo: src/components/whatsapp/kanban-card-drawer.tsx
 * Propósito: Drawer lateral com detalhes completos e edição de card Kanban.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Drawer, Select, Modal, Tag as AntTag, Input as AntInput } from "antd";
import {
  Loader2,
  Pencil,
  Phone,
  User,
  DollarSign,
  MessageSquare,
  Calendar,
  Tag,
  ExternalLink,
  Save,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "./kanban-types";

type KanbanCardDrawerProps = {
  open: boolean;
  onClose: () => void;
  cardId: string | null;
  companyId: string;
  boardId: string;
  teamMembers: TeamMember[];
  stageName?: string | null;
  onRefresh: () => void;
};

type CardDetails = {
  id: string;
  title: string | null;
  description: string | null;
  stage_id: string | null;
  source: string | null;
  contact_id: string | null;
  created_at: string | null;
  updated_at?: string | null;
  assigned_to: string | null;
  value_amount: number | null;
  phone: string | null;
  priority: string | null;
  tags: string[] | null;
  conversation_id: string | null;
};

const PRIORITY_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

export function KanbanCardDrawer({
  open,
  onClose,
  cardId,
  companyId,
  boardId,
  teamMembers,
  stageName,
  onRefresh,
}: KanbanCardDrawerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [card, setCard] = useState<CardDetails | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [conversationInternalId, setConversationInternalId] = useState<string | null>(null);

  // Editable fields
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editValueAmount, setEditValueAmount] = useState("");
  const [editPriority, setEditPriority] = useState<string | undefined>(undefined);
  const [editAssignedTo, setEditAssignedTo] = useState<string | undefined>(undefined);
  const [editPhone, setEditPhone] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Edit mode per field
  const [editingField, setEditingField] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadDetails = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "get-details", cardId }),
      });
      if (res.ok) {
        const data = await res.json();
        const c = data.card as CardDetails;
        setCard(c);
        setContactName(data.contactName ?? null);
        setConversationInternalId(data.conversationInternalId ?? null);

        // Initialize edit fields
        setEditTitle(c.title ?? "");
        setEditDescription(c.description ?? "");
        setEditValueAmount(typeof c.value_amount === "number" ? String(c.value_amount) : "");
        setEditPriority(c.priority ?? undefined);
        setEditAssignedTo(c.assigned_to ?? undefined);
        setEditPhone(c.phone ?? "");
        setEditTags(c.tags ?? []);
        setDirty(false);
        setEditingField(null);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [cardId, companyId]);

  useEffect(() => {
    if (open && cardId) {
      loadDetails();
    }
    if (!open) {
      setCard(null);
      setDirty(false);
      setEditingField(null);
    }
  }, [open, cardId, loadDetails]);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const parsedValue = editValueAmount.trim() ? parseFloat(editValueAmount.replace(",", ".")) : null;
      await fetch("/api/whatsapp/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          action: "update",
          cardId: card.id,
          title: editTitle || null,
          description: editDescription || null,
          value_amount: parsedValue,
          priority: editPriority || null,
          assigned_to: editAssignedTo || null,
          phone: editPhone || null,
          tags: editTags,
        }),
      });
      setDirty(false);
      setEditingField(null);
      onRefresh();
      await loadDetails();
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!card) return;
    Modal.confirm({
      title: "Excluir card",
      content: "Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.",
      okText: "Excluir",
      cancelText: "Cancelar",
      okType: "danger",
      centered: true,
      async onOk() {
        try {
          await fetch("/api/whatsapp/kanban/cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "delete", cardId: card.id }),
          });
          onClose();
          onRefresh();
        } catch {
          // Silently fail
        }
      },
    });
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
      setDirty(true);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
    setDirty(true);
  };

  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  return (
    <div className="antd-scope">
      <Drawer
        title={stageName ? <span className="text-sm text-muted font-normal">Card em: <span className="font-medium text-text">{stageName}</span></span> : null}
        open={open}
        onClose={onClose}
        placement="right"
        size="default"
        styles={{
          header: { borderBottom: "1px solid #EDE9E0", padding: "16px 24px" },
          body: { background: "#FDFCF9", padding: "0" },
        }}
        footer={
          card ? (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
              <Button
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Salvar
              </Button>
            </div>
          ) : null
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : card ? (
          <div className="divide-y divide-[#EDE9E0]">
            {/* Title */}
            <div className="px-6 py-4">
              {editingField === "title" ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); markDirty(); }}
                  onBlur={() => setEditingField(null)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-lg font-semibold text-text focus:outline-none focus:border-[#2EC4B6]"
                  autoFocus
                />
              ) : (
                <div
                  className="group flex items-start gap-2 cursor-pointer"
                  onClick={() => setEditingField("title")}
                >
                  <h3 className="text-lg font-semibold text-text flex-1">
                    {editTitle || "Sem título"}
                  </h3>
                  <Pencil className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 mt-1.5 shrink-0" />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="px-6 py-4">
              <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-wide">Descrição</label>
              {editingField === "description" ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => { setEditDescription(e.target.value); markDirty(); }}
                  onBlur={() => setEditingField(null)}
                  rows={4}
                  className="w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-sm text-text focus:outline-none focus:border-[#2EC4B6]"
                  autoFocus
                />
              ) : (
                <div
                  className="group flex items-start gap-2 cursor-pointer min-h-[32px]"
                  onClick={() => setEditingField("description")}
                >
                  <p className="text-sm text-text whitespace-pre-wrap flex-1">
                    {editDescription || <span className="text-muted">Adicionar descrição...</span>}
                  </p>
                  <Pencil className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 mt-0.5 shrink-0" />
                </div>
              )}
            </div>

            {/* Data fields */}
            <div className="px-6 py-4 space-y-4">
              {/* Value */}
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-[#2EC4B6] shrink-0" />
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">Valor</label>
                  {editingField === "value" ? (
                    <input
                      type="text"
                      value={editValueAmount}
                      onChange={(e) => { setEditValueAmount(e.target.value); markDirty(); }}
                      onBlur={() => setEditingField(null)}
                      placeholder="0,00"
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-text focus:outline-none focus:border-[#2EC4B6]"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="group flex items-center gap-1 cursor-pointer"
                      onClick={() => setEditingField("value")}
                    >
                      <span className="text-sm text-text">
                        {editValueAmount ? `R$ ${parseFloat(editValueAmount.replace(",", ".")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : <span className="text-muted">—</span>}
                      </span>
                      <Pencil className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 shrink-0 flex items-center justify-center">
                  <span className="block h-2.5 w-2.5 rounded-full bg-amber-400" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">Prioridade</label>
                  <Select
                    value={editPriority}
                    onChange={(val) => { setEditPriority(val); markDirty(); }}
                    placeholder="Selecionar..."
                    allowClear
                    options={PRIORITY_OPTIONS}
                    size="small"
                    style={{ width: "100%" }}
                    popupClassName="antd-scope"
                  />
                </div>
              </div>

              {/* Assigned to */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted shrink-0" />
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">Responsável</label>
                  {teamMembers.length > 0 ? (
                    <Select
                      value={editAssignedTo}
                      onChange={(val) => { setEditAssignedTo(val); markDirty(); }}
                      placeholder="Selecionar..."
                      allowClear
                      options={teamMembers.map((m) => ({ value: m.id, label: m.name ?? m.email ?? m.id }))}
                      size="small"
                      style={{ width: "100%" }}
                      popupClassName="antd-scope"
                    />
                  ) : editingField === "assigned_to" ? (
                    <input
                      type="text"
                      value={editAssignedTo ?? ""}
                      onChange={(e) => { setEditAssignedTo(e.target.value); markDirty(); }}
                      onBlur={() => setEditingField(null)}
                      placeholder="ID do responsável"
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-text focus:outline-none focus:border-[#2EC4B6]"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="group flex items-center gap-1 cursor-pointer"
                      onClick={() => setEditingField("assigned_to")}
                    >
                      <span className="text-sm text-text">
                        {editAssignedTo ?? <span className="text-muted">—</span>}
                      </span>
                      <Pencil className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted shrink-0" />
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-0.5">Telefone</label>
                  {editingField === "phone" ? (
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => { setEditPhone(e.target.value); markDirty(); }}
                      onBlur={() => setEditingField(null)}
                      placeholder="+55..."
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-text focus:outline-none focus:border-[#2EC4B6]"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="group flex items-center gap-1 cursor-pointer"
                      onClick={() => setEditingField("phone")}
                    >
                      <span className="text-sm text-text">
                        {editPhone || <span className="text-muted">—</span>}
                      </span>
                      <Pencil className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted" />
                <label className="text-xs font-medium text-muted uppercase tracking-wide">Tags</label>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editTags.map((tag) => (
                  <AntTag
                    key={tag}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                  >
                    {tag}
                  </AntTag>
                ))}
                {editTags.length === 0 && (
                  <span className="text-xs text-muted">Nenhuma tag</span>
                )}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Nova tag..."
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-text placeholder:text-muted focus:outline-none focus:border-[#2EC4B6]"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-text hover:bg-sidebar transition-colors disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Conversation link */}
            {conversationInternalId && (
              <div className="px-6 py-4">
                <button
                  onClick={() => router.push(`/whatsapp-intelligence/conversas/${conversationInternalId}`)}
                  className="flex items-center gap-2 rounded-lg border border-[#2EC4B6] px-3 py-2 text-sm text-[#2EC4B6] hover:bg-[#E0FAF7] transition-colors w-full justify-center"
                >
                  <MessageSquare className="h-4 w-4" />
                  Ver conversa
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Metadata */}
            <div className="px-6 py-4 space-y-2">
              <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-2">Metadados</label>
              {card.source && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Origem</span>
                  <span className="rounded bg-[#E0FAF7] px-1.5 py-0.5 text-[#2EC4B6]">{card.source}</span>
                </div>
              )}
              {contactName && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Contato</span>
                  <span className="text-text">{contactName}</span>
                </div>
              )}
              {card.created_at && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Criado em</span>
                  <span className="text-text">
                    {new Date(card.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              )}
              {card.updated_at && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Atualizado em</span>
                  <span className="text-text">
                    {new Date(card.updated_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-muted text-center">Card não encontrado.</p>
        )}
      </Drawer>
    </div>
  );
}
