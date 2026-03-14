/**
 * Arquivo: src/components/whatsapp/contact-picker-modal.tsx
 * Propósito: Modal para selecionar um contato existente ou digitar um número para iniciar conversa.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Input, Divider, Spin } from "antd";
import { Search, Phone } from "lucide-react";
import { ContactAvatar } from "@/components/whatsapp/contact-avatar";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";

type Contact = {
  id: string;
  name?: string | null;
  phone?: string | null;
  phone_e164?: string | null;
};

type ContactPickerModalProps = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  onSelectPhone: (phone: string) => void;
  loading: boolean;
  error: string | null;
};

export function ContactPickerModal({
  open,
  onClose,
  companyId,
  onSelectPhone,
  loading,
  error,
}: ContactPickerModalProps) {
  const [search, setSearch] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fetching, setFetching] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchContacts = useCallback(async (query: string) => {
    setFetching(true);
    try {
      const response = await fetch("/api/whatsapp/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          search: query || undefined,
          page: 1,
          limit: 50,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const list: Contact[] = data.contacts?.data ?? data.contacts ?? [];
      setContacts(list.filter((c) => c.phone || c.phone_e164));
    } catch {
      // silently ignore fetch errors for contact list
    } finally {
      setFetching(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!open) return;
    fetchContacts(debouncedSearch);
  }, [open, debouncedSearch, fetchContacts]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setManualPhone("");
      setContacts([]);
    }
  }, [open]);

  const handleSelectContact = (contact: Contact) => {
    if (loading) return;
    const phone = contact.phone_e164 ?? contact.phone;
    if (phone) onSelectPhone(phone);
  };

  const handleManualStart = () => {
    if (loading || !manualPhone.trim()) return;
    onSelectPhone(manualPhone.trim());
  };

  return (
    <div className="antd-scope">
      <Modal
        title="Nova Conversa"
        open={open}
        onCancel={onClose}
        footer={null}
        destroyOnHidden
        centered
        width={480}
      >
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        {/* Search */}
        <Input
          prefix={<Search className="h-4 w-4 text-muted" />}
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          disabled={loading}
        />

        {/* Contact list */}
        <div className="mt-3 max-h-72 overflow-y-auto">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Spin size="small" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhum contato encontrado.
            </p>
          ) : (
            <ul className="space-y-1">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSelectContact(contact)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-warm-100 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <ContactAvatar name={contact.name ?? null} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {contact.name || "Sem nome"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {contact.phone_e164 ?? contact.phone}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Manual phone input */}
        <Divider plain className="!my-3 !text-xs !text-muted">
          ou digite um número
        </Divider>

        <div className="flex items-center gap-2">
          <Input
            prefix={<Phone className="h-4 w-4 text-muted" />}
            placeholder="5511999999999"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            disabled={loading}
            onPressEnter={handleManualStart}
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleManualStart}
            disabled={loading || !manualPhone.trim()}
          >
            {loading ? "Iniciando..." : "Iniciar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
