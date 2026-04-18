/**
 * Arquivo: src/components/whatsapp/create-contact-modal.tsx
 * Propósito: Modal para criar um novo contato no Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { Modal, Input } from "antd";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type CreateContactModalProps = {
  companyId: string;
  onCreated?: () => void;
};

export function CreateContactModal({ companyId, onCreated }: CreateContactModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "create", name: name.trim(), phone: phone.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Erro ao criar contato.");
      }

      setOpen(false);
      setName("");
      setPhone("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar contato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="default" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Novo Contato
      </Button>

      <div className="antd-scope">
        <Modal
          title="Criar Contato"
          open={open}
          onOk={handleCreate}
          onCancel={() => { setOpen(false); setError(null); }}
          okText="Criar"
          cancelText="Cancelar"
          confirmLoading={loading}
          okButtonProps={{ disabled: !name.trim() || !phone.trim() }}
        >
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Nome</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">Telefone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511999999999"
              />
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
