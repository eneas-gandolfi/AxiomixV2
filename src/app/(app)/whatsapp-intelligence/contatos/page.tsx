/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/contatos/page.tsx
 * Propósito: Gestão de contatos e labels do Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ContactsTable } from "@/components/whatsapp/contacts-table";
import { ContactDetailDrawer } from "@/components/whatsapp/contact-detail-drawer";
import { CreateContactModal } from "@/components/whatsapp/create-contact-modal";
import { LabelsManager } from "@/components/whatsapp/labels-manager";

export const dynamic = "force-dynamic";

type ContactData = {
  id: string;
  name: string | null;
  phone: string | null;
  phone_e164: string | null;
  email: string | null;
  created_at: string | null;
  labels: Array<{ id: string; name: string | null; color: string | null }> | null;
};

export default function ContatosPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Get companyId from auth
  useEffect(() => {
    async function getCompany() {
      try {
        const res = await fetch("/api/auth/company-id", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setCompanyId(data.companyId);
        }
      } catch {
        // Silently fail
      }
    }
    getCompany();
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/whatsapp/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          search: search || undefined,
          page,
          limit: 50,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [companyId, search, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setDrawerOpen(true);
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <>
      {/* Ações */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome ou telefone..."
            className="h-9 w-72 rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-text placeholder:text-muted focus:border-[#2EC4B6] focus:outline-none focus:ring-1 focus:ring-[#2EC4B6]"
          />
        </div>
        <CreateContactModal companyId={companyId} onCreated={fetchContacts} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tabela de contatos */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#2EC4B6]" />
                <span className="text-base font-semibold text-text">
                  Contatos
                  {contacts.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted">
                      ({contacts.length})
                    </span>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" />
                </div>
              ) : (
                <div className="antd-scope">
                  <ContactsTable
                    contacts={contacts}
                    onContactClick={handleContactClick}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Labels manager */}
        <div>
          <LabelsManager companyId={companyId} />
        </div>
      </div>

      <ContactDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        companyId={companyId}
        contactId={selectedContactId}
      />
    </>
  );
}
