/**
 * Arquivo: src/components/whatsapp/start-conversation-button.tsx
 * Propósito: Botão para iniciar uma nova conversa WhatsApp via modal de seleção de contato.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactPickerModal } from "@/components/whatsapp/contact-picker-modal";

type StartConversationButtonProps = {
  companyId: string;
};

export function StartConversationButton({ companyId }: StartConversationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (phone: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/start-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao iniciar conversa.");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar conversa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="default" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova Conversa
      </Button>

      <ContactPickerModal
        open={open}
        onClose={() => { setOpen(false); setError(null); }}
        companyId={companyId}
        onSelectPhone={handleStart}
        loading={loading}
        error={error}
      />
    </>
  );
}
