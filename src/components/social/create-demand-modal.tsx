/**
 * Arquivo: src/components/social/create-demand-modal.tsx
 * Propósito: Modal de criação de demanda de conteúdo.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { Modal, Input, DatePicker } from "antd";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";

type CreateDemandModalProps = {
  companyId: string;
  teamMembers: Array<{ id: string; name: string }>;
  onCreated?: () => void;
};

const PLATFORM_OPTIONS: Array<{ value: SocialPlatform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

export function CreateDemandModal({ companyId, teamMembers, onCreated }: CreateDemandModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (platform: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Título é obrigatório.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/social/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          title: title.trim(),
          description: description.trim() || null,
          assignedTo: assignedTo || null,
          platforms,
          caption: caption.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao criar demanda.");
      }

      setOpen(false);
      resetForm();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar demanda.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPlatforms([]);
    setCaption("");
    setError(null);
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova Demanda
      </Button>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[var(--module-accent)]" />
            <span>Nova Demanda de Conteúdo</span>
          </div>
        }
        open={open}
        onOk={handleCreate}
        onCancel={() => {
          setOpen(false);
          resetForm();
        }}
        okText="Criar"
        cancelText="Cancelar"
        confirmLoading={loading}
        width={560}
        destroyOnHidden
      >
        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Título *
            </label>
            <Input
              placeholder="Ex: Post de lançamento do novo produto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="!rounded-lg"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Descrição
            </label>
            <Input.TextArea
              placeholder="Descreva o que é esperado nesta demanda..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="!rounded-lg"
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Responsável
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--module-accent,#8B5CF6)] focus:border-transparent"
            >
              <option value="">Sem responsável</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Platforms */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Plataformas
            </label>
            <div className="flex gap-2">
              {PLATFORM_OPTIONS.map((opt) => {
                const isActive = platforms.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => togglePlatform(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--module-accent)] text-white"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">
              Legenda (rascunho)
            </label>
            <Input.TextArea
              placeholder="Rascunho da legenda do post..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="!rounded-lg"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--color-danger)]">{error}</p>
          )}
        </div>
      </Modal>
    </>
  );
}
