/**
 * Arquivo: src/components/whatsapp/contacts-manager-sheet.tsx
 * Proposito: Drawer/sheet de drill-down de contatos a partir de /conversas
 *            (Onda 3 do redesign 7->3). Engloba o que antes era a aba /contatos:
 *            busca, tabela, criar contato e gestao de etiquetas. Detalhes de
 *            contato individual continuam abrindo via ContactDetailDrawer
 *            (drawer-em-drawer e suportado pelo antd).
 *
 *            Botao de gatilho mora na toolbar de /conversas. Abre com
 *            ?contatos=1 (preserva o redirect de /whatsapp-intelligence/contatos).
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer } from "antd";
import { Search, Users, Loader2, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactsTable } from "@/components/whatsapp/contacts-table";
import { ContactDetailDrawer } from "@/components/whatsapp/contact-detail-drawer";
import { CreateContactModal } from "@/components/whatsapp/create-contact-modal";
import { LabelsManager } from "@/components/whatsapp/labels-manager";

type ContactsManagerSheetProps = {
  companyId: string;
  /** Abre o sheet inicialmente — usado quando a URL chega com ?contatos=1 */
  defaultOpen?: boolean;
};

type ContactData = {
  id: string;
  name: string | null;
  phone: string | null;
  phone_e164: string | null;
  email: string | null;
  created_at: string | null;
  labels: Array<{ id: string; name: string | null; color: string | null }> | null;
};

export function ContactsManagerSheet({ companyId, defaultOpen = false }: ContactsManagerSheetProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeView, setActiveView] = useState<"list" | "labels">("list");
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/whatsapp/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, search: search || undefined, page: 1, limit: 50 }),
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts ?? []);
      }
    } catch (error) {
      console.error("[contacts-manager-sheet] fetchContacts failed", {
        companyId,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, search]);

  useEffect(() => {
    if (!open) return;
    fetchContacts();
  }, [open, fetchContacts]);

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setDetailOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Users className="h-4 w-4" />
        Contatos
      </Button>

      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--module-accent)]" />
            <span className="text-base font-semibold">Contatos</span>
          </div>
        }
        placement="right"
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
      >
        {/* View toggle: Lista | Etiquetas */}
        <div className="mb-4 inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5">
          <button
            type="button"
            onClick={() => setActiveView("list")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              activeView === "list"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setActiveView("labels")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              activeView === "labels"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            <TagIcon className="h-3.5 w-3.5" />
            Etiquetas
          </button>
        </div>

        {activeView === "list" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
                />
              </div>
              <CreateContactModal companyId={companyId} onCreated={fetchContacts} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              </div>
            ) : (
              <div className="antd-scope">
                <ContactsTable contacts={contacts} onContactClick={handleContactClick} />
              </div>
            )}
          </div>
        ) : (
          <LabelsManager companyId={companyId} />
        )}
      </Drawer>

      <ContactDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        companyId={companyId}
        contactId={selectedContactId}
      />
    </>
  );
}
