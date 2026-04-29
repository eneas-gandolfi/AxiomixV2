/**
 * Arquivo: src/components/whatsapp/contact-detail-drawer.tsx
 * Propósito: Drawer lateral com detalhes e labels de um contato Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect } from "react";
import { Drawer, Tag } from "antd";
import { Phone, Mail, X, Plus, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactProfile360 } from "./contact-profile-360";

type ContactLabel = {
  id: string;
  name: string | null;
  color: string | null;
};

type ContactDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  contactId: string | null;
};

export function ContactDetailDrawer({ open, onClose, companyId, contactId }: ContactDetailDrawerProps) {
  const [contact, setContact] = useState<Record<string, unknown> | null>(null);
  const [labels, setLabels] = useState<ContactLabel[]>([]);
  const [allLabels, setAllLabels] = useState<ContactLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingLabel, setAddingLabel] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "360">("info");

  useEffect(() => {
    if (!open || !contactId) return;

    async function loadContact() {
      setLoading(true);
      try {
        const [contactRes, labelsRes, allLabelsRes] = await Promise.all([
          fetch(`/api/whatsapp/contacts/${contactId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "get" }),
          }),
          fetch(`/api/whatsapp/contacts/${contactId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "listLabels" }),
          }),
          fetch("/api/whatsapp/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "list" }),
          }),
        ]);

        if (contactRes.ok) {
          const data = await contactRes.json();
          setContact(data.contact);
        }
        if (labelsRes.ok) {
          const data = await labelsRes.json();
          setLabels(data.labels ?? []);
        }
        if (allLabelsRes.ok) {
          const data = await allLabelsRes.json();
          setAllLabels(data.labels ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    loadContact();
  }, [open, contactId, companyId]);

  const handleAddLabel = async (labelName: string) => {
    if (!contactId) return;
    setAddingLabel(true);
    try {
      await fetch(`/api/whatsapp/contacts/${contactId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "addLabel", label: labelName }),
      });
      // Refresh labels
      const res = await fetch(`/api/whatsapp/contacts/${contactId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "listLabels" }),
      });
      if (res.ok) {
        const data = await res.json();
        setLabels(data.labels ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setAddingLabel(false);
    }
  };

  const handleRemoveLabel = async (labelId: string) => {
    if (!contactId) return;
    try {
      await fetch(`/api/whatsapp/contacts/${contactId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "removeLabel", labelId }),
      });
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
    } catch {
      // Silently fail
    }
  };

  const labelIds = new Set(labels.map((l) => l.id));
  const availableLabels = allLabels.filter((l) => !labelIds.has(l.id));

  return (
    <div className="antd-scope">
      <Drawer
        title="Detalhes do Contato"
        open={open}
        onClose={onClose}
        size="default"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : contact ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text">
                {typeof contact.name === "string" ? contact.name : "Sem nome"}
              </h3>
            </div>

            <div className="space-y-3">
              {typeof contact.phone === "string" && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Phone className="h-4 w-4" />
                  {typeof contact.phone_e164 === "string" ? contact.phone_e164 : String(contact.phone)}
                </div>
              )}
              {typeof contact.email === "string" && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Mail className="h-4 w-4" />
                  {String(contact.email)}
                </div>
              )}
            </div>

            {/* Tabs: Info / 360° */}
            <div className="flex gap-1 border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "info"
                    ? "border-[var(--module-accent)] text-[var(--module-accent)]"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                Labels
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("360")}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === "360"
                    ? "border-[var(--module-accent)] text-[var(--module-accent)]"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                <BarChart3 className="h-3 w-3" />
                Perfil 360°
              </button>
            </div>

            {activeTab === "info" && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-text">Labels</h4>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <Tag
                      key={label.id}
                      color={label.color ?? undefined}
                      closable
                      onClose={() => handleRemoveLabel(label.id)}
                    >
                      {label.name}
                    </Tag>
                  ))}
                  {labels.length === 0 && (
                    <span className="text-xs text-muted">Nenhum label</span>
                  )}
                </div>

                {availableLabels.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-muted">Adicionar label:</p>
                    <div className="flex flex-wrap gap-1">
                      {availableLabels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => handleAddLabel(label.name ?? "")}
                          disabled={addingLabel}
                          className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:bg-sidebar transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "360" && (
              <ContactProfile360
                companyId={companyId}
                contactPhone={
                  typeof contact.phone_e164 === "string"
                    ? contact.phone_e164
                    : typeof contact.phone === "string"
                      ? contact.phone
                      : ""
                }
                contactName={typeof contact.name === "string" ? contact.name : undefined}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Contato não encontrado.</p>
        )}
      </Drawer>
    </div>
  );
}
