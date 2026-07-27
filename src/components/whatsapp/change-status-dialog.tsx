/**
 * Arquivo: src/components/whatsapp/change-status-dialog.tsx
 * Propósito: Dialog pra mudar o status da conversa (aberta/pendente/
 *            resolvida/fechada) via POST /api/whatsapp/resolve.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Select } from "antd";
import { CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "open", label: "Aberta" },
  { value: "pending", label: "Pendente" },
  { value: "resolved", label: "Resolvida" },
  { value: "closed", label: "Fechada" },
];

type ChangeStatusDialogProps = {
  companyId: string;
  conversationId: string;
  currentStatus: string | null;
};

export function ChangeStatusDialog({
  companyId,
  conversationId,
  currentStatus,
}: ChangeStatusDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(currentStatus ?? "open");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setError(null);
    setStatus(currentStatus ?? "open");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, conversationId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(), { code: data.code });
      setOpen(false);
      router.refresh();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Não foi possível alterar o status. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <CircleDot className="h-4 w-4" />
        Status
      </Button>

      <div className="antd-scope">
        <Modal
          title="Alterar status da conversa"
          open={open}
          onOk={handleSave}
          onCancel={close}
          okText="Salvar"
          cancelText="Cancelar"
          confirmLoading={saving}
          okButtonProps={{ disabled: status === (currentStatus ?? "open") }}
        >
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          <Select
            className="w-full"
            value={status}
            onChange={(value) => setStatus(value)}
            options={STATUS_OPTIONS}
          />
        </Modal>
      </div>
    </>
  );
}
