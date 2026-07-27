/**
 * Arquivo: src/components/whatsapp/conversation-contact-panel.tsx
 * Propósito: Aba "Contato" do painel lateral da conversa (Onda 3) — perfil
 *            360° do contato (reuso do ContactProfile360: métricas, timeline
 *            de sentimento, labels, resumo IA) + alerta de lead esfriado da
 *            conversa atual. "Contatos é consulta, não destino."
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

"use client";

import { Snowflake } from "lucide-react";
import { ContactProfile360 } from "@/components/whatsapp/contact-profile-360";
import type { ColdLeadMotivo } from "@/lib/whatsapp/cold-leads";

const MOTIVO_LABELS: Record<ColdLeadMotivo, string> = {
  vendedor_nao_respondeu: "o lead falou por último e ninguém respondeu",
  lead_silenciou: "o lead silenciou depois da última resposta",
  sem_followup: "sem follow-up há muito tempo",
};

export type ConversationColdLeadAlert = {
  motivo: ColdLeadMotivo;
  diasSemResposta: number;
};

type ConversationContactPanelProps = {
  companyId: string;
  remoteJid: string;
  /** Telefone cru como gravado em conversations.contact_phone — é a chave
   *  que o /api/whatsapp/contact-metrics usa pra agregar o histórico. */
  contactPhone: string | null;
  contactName: string | null;
  coldLead: ConversationColdLeadAlert | null;
};

export function ConversationContactPanel({
  companyId,
  remoteJid,
  contactPhone,
  contactName,
  coldLead,
}: ConversationContactPanelProps) {
  const phone = contactPhone ?? remoteJid.replace(/@s\.whatsapp\.net|@c\.us/g, "");

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {coldLead ? (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] p-3">
          <Snowflake
            className="h-4 w-4 flex-shrink-0 text-[var(--color-warning)]"
            aria-hidden="true"
          />
          <p className="text-[12.5px] leading-snug text-[var(--color-text)]">
            <strong className="font-semibold">
              Lead esfriando há {coldLead.diasSemResposta}{" "}
              {coldLead.diasSemResposta === 1 ? "dia" : "dias"}
            </strong>{" "}
            — {MOTIVO_LABELS[coldLead.motivo]}.
          </p>
        </div>
      ) : null}

      <ContactProfile360
        companyId={companyId}
        contactPhone={phone}
        contactName={contactName ?? undefined}
      />
    </div>
  );
}
