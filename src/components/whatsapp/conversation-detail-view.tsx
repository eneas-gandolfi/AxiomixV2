/**
 * Arquivo: src/components/whatsapp/conversation-detail-view.tsx
 * Propósito: Detalhes da conversa — reutilizado pela rota cheia [id] e pelo
 *            drawer interceptado @drawer/(.)[id].
 *            Visual: Marker · Inter pesado, brackets de canto, restrição de cor.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Headphones,
  HelpCircle,
  MessageSquare,
  MoreHorizontal,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AnalyzeConversationButton } from "@/components/whatsapp/analyze-conversation-button";
import { AssignEvoAgentSelect } from "@/components/whatsapp/assign-evo-agent-select";
import { ConversationChat } from "@/components/whatsapp/conversation-chat";
import { InsightFeedbackPanel } from "@/components/whatsapp/insight-feedback-panel";
import { SessionStatusBadge } from "@/components/whatsapp/session-status-badge";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canonicalIntent,
  canonicalSentiment,
  canonicalStage,
  fixAccents,
} from "@/lib/whatsapp/normalize-ia-text";
import { getEvoCrmClient } from "@/services/evo-crm/client";

export type ConversationDetailMode = "full" | "drawer";

type ParsedInsightData = {
  actionItems: string[];
  urgency: number | null;
  suggestedResponse: string | null;
  keyTopics: string[];
};

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const mm = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${mm} · ${hh}:${mi}`;
}

function getIntentIcon(intent?: string | null) {
  switch (intent) {
    case "compra":
      return ShoppingCart;
    case "suporte":
      return Headphones;
    case "reclamação":
      return AlertTriangle;
    case "dúvida":
      return HelpCircle;
    case "cancelamento":
      return XCircle;
    default:
      return MoreHorizontal;
  }
}

function parseInsightData(raw: unknown): ParsedInsightData {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      actionItems: Array.isArray(obj.items)
        ? obj.items.filter((i): i is string => typeof i === "string")
        : [],
      urgency:
        typeof obj.urgency === "number" && obj.urgency >= 1 && obj.urgency <= 5
          ? obj.urgency
          : null,
      suggestedResponse:
        typeof obj.suggested_response === "string" &&
        obj.suggested_response.trim().length > 0
          ? obj.suggested_response
          : null,
      keyTopics: Array.isArray(obj.key_topics)
        ? obj.key_topics.filter(
            (topic): topic is string => typeof topic === "string",
          )
        : [],
    };
  }
  if (Array.isArray(raw)) {
    return {
      actionItems: raw.filter((item): item is string => typeof item === "string"),
      urgency: null,
      suggestedResponse: null,
      keyTopics: [],
    };
  }
  return { actionItems: [], urgency: null, suggestedResponse: null, keyTopics: [] };
}

function getStageLabel(stage?: string | null) {
  return canonicalStage(stage);
}

function parseStringArray(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function splitName(name: string): { first: string; rest: string } {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return { first: trimmed, rest: "" };
  return { first: parts[0], rest: parts.slice(1).join(" ") };
}

function formatPhone(remoteJid: string) {
  const phone = remoteJid.replace(/@s\.whatsapp\.net|@c\.us/g, "");
  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const numero = phone.substring(4);
    if (numero.length === 9) {
      return `+55 ${ddd} 9 ${numero.substring(1, 5)}-${numero.substring(5)}`;
    }
    if (numero.length === 8) {
      return `+55 ${ddd} ${numero.substring(0, 4)}-${numero.substring(4)}`;
    }
  }
  return phone;
}

function avatarInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts[0][0].toUpperCase();
}

interface ConversationDetailViewProps {
  id: string;
  mode?: ConversationDetailMode;
}

export async function ConversationDetailView({
  id,
  mode = "full",
}: ConversationDetailViewProps) {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect(
      `/login?next=${encodeURIComponent(`/whatsapp-intelligence/conversas/${id}`)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, external_id, remote_jid, contact_name, status, last_message_at")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: rawMessages } = await supabase
    .from("messages")
    .select("id, content, direction, sent_at, message_type")
    .eq("company_id", companyId)
    .eq("conversation_id", id)
    .order("sent_at", { ascending: true });

  const seenFingerprints = new Set<string>();
  const messages = (rawMessages ?? []).filter((message) => {
    const fingerprint = `${message.sent_at}::${message.direction}::${message.content ?? ""}`;
    if (seenFingerprints.has(fingerprint)) return false;
    seenFingerprints.add(fingerprint);
    return true;
  });

  const { data: insight } = await supabase
    .from("conversation_insights")
    .select(
      "sentiment, intent, sales_stage, summary, implicit_need, explicit_need, objections, next_commitment, stall_reason, confidence_score, feedback_status, feedback_note, feedback_at, action_items, generated_at",
    )
    .eq("company_id", companyId)
    .eq("conversation_id", id)
    .maybeSingle();

  let evoConversationUrl: string | null = null;
  if (conversation.external_id) {
    try {
      const evoClient = await getEvoCrmClient(companyId);
      evoConversationUrl = evoClient.buildConversationUrl(conversation.external_id);
    } catch {
      evoConversationUrl = null;
    }
  }

  const insightData = parseInsightData(insight?.action_items);
  const objections = parseStringArray(insight?.objections);

  const displayName =
    conversation.contact_name?.trim() || formatPhone(conversation.remote_jid);
  const nameParts = splitName(displayName);
  const initial = avatarInitial(displayName);
  const phoneLabel = formatPhone(conversation.remote_jid);

  // ===== HERO =====
  const hero = (
    <header className="flex flex-col gap-4 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 min-w-0">
        {mode === "full" ? (
          <Link
            href="/whatsapp-intelligence/conversas"
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}

        <div className="relative flex-shrink-0">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[22px] font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, #ffc498 0%, #ff7a2e 60%, #d54f00 100%)",
              letterSpacing: "-0.02em",
            }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[3px] text-white"
            style={{
              backgroundColor: "#25d366",
              borderColor: "var(--color-canvas)",
            }}
            aria-hidden="true"
          >
            <MessageSquare className="h-2.5 w-2.5" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1
              className="truncate text-[28px] font-bold leading-none text-[var(--color-text)]"
              style={{ letterSpacing: "-0.03em" }}
            >
              {nameParts.first}
            </h1>
            {nameParts.rest ? (
              <span className="truncate text-[13px] font-medium text-[var(--color-text-secondary)]">
                {nameParts.rest}
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1 font-medium text-[var(--color-text)]">
              <MessageSquare className="h-3 w-3" style={{ color: "#25d366" }} />
              WhatsApp Business
            </span>
            <span className="font-mono text-[11.5px] text-[var(--color-text)]">
              {phoneLabel}
            </span>
            {conversation.status ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{
                  color: "var(--color-success)",
                  backgroundColor: "var(--color-success-bg)",
                  borderColor: "rgba(21, 128, 61, 0.25)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--color-success)" }}
                  aria-hidden="true"
                />
                {conversation.status}
              </span>
            ) : null}
            {conversation.external_id ? (
              <SessionStatusBadge
                companyId={companyId}
                conversationExternalId={conversation.external_id}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AnalyzeConversationButton
          companyId={companyId}
          conversationId={conversation.id}
          hasInsight={Boolean(insight)}
        />
        {conversation.external_id ? (
          <AssignEvoAgentSelect
            companyId={companyId}
            conversationExternalId={conversation.external_id}
          />
        ) : null}
        {evoConversationUrl ? (
          <Link
            href={evoConversationUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary" })}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir no CRM
          </Link>
        ) : null}
      </div>
    </header>
  );

  // ===== BODY =====
  const body = (
    <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
      {/* Thread column */}
      <div className="flex flex-col border-r border-[var(--color-border)] bg-[var(--color-canvas)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5">
          <div className="font-mono text-[10.5px] tracking-[0.04em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
            histórico ·{" "}
            <span className="font-semibold text-[var(--color-text)]">
              {messages.length}
            </span>{" "}
            {messages.length === 1 ? "mensagem" : "mensagens"}
          </div>
          <div className="font-mono text-[10.5px] tracking-[0.04em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
            id · {conversation.id.slice(0, 8)}
          </div>
        </div>
        <ConversationChat
          companyId={companyId}
          conversationId={conversation.id}
          conversationExternalId={conversation.external_id}
          initialMessages={messages}
        />
      </div>

      {/* Briefing column */}
      <aside className="flex flex-col overflow-y-auto bg-[var(--color-canvas)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2
              className="text-[19px] font-bold leading-none text-[var(--color-text)]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Briefing
            </h2>
            <span className="font-mono text-[10.5px] tracking-[0.02em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
              {insight?.generated_at
                ? formatShortDate(insight.generated_at)
                : "ainda não analisado"}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] font-medium text-[var(--color-text-secondary)]">
            Leitura desta conversa em uma olhada
          </p>
        </div>

        {insight ? (
          <>
            {/* Diagnóstico */}
            <section className="border-b border-[var(--color-border)] px-5 py-4">
              <h3 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                Diagnóstico
              </h3>
              <div
                className="relative rounded-xl border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-canvas)] p-4"
              >
                {/* Brackets · canto superior esquerdo */}
                <span
                  aria-hidden="true"
                  className="absolute left-1.5 top-1.5 h-2 w-2 border-l border-t opacity-60"
                  style={{ borderColor: "var(--color-primary)", borderWidth: "1.2px 0 0 1.2px" }}
                />
                {/* Brackets · canto inferior direito */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 right-1.5 h-2 w-2 border-b border-r opacity-60"
                  style={{ borderColor: "var(--color-primary)", borderWidth: "0 1.2px 1.2px 0" }}
                />

                <div className="grid grid-cols-2 items-end gap-4">
                  <div>
                    <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                      Sentimento
                    </div>
                    <div
                      className="text-[26px] font-bold leading-none"
                      style={{
                        letterSpacing: "-0.03em",
                        color: getSentimentColor(insight.sentiment),
                      }}
                    >
                      {canonicalSentiment(insight.sentiment) || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                      <span>Urgência</span>
                      {insightData.urgency ? (
                        <span className="font-mono text-[10px] font-medium tracking-normal normal-case text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                          {insightData.urgency}/5
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="text-[26px] font-bold leading-none"
                      style={{
                        letterSpacing: "-0.03em",
                        color: "var(--color-primary)",
                      }}
                    >
                      {urgencyLabel(insightData.urgency)}
                    </div>
                    {insightData.urgency ? (
                      <div className="mt-2 flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className="h-1 flex-1 rounded"
                            style={{
                              backgroundColor:
                                insightData.urgency != null && n <= insightData.urgency
                                  ? "var(--color-primary)"
                                  : "var(--color-border-strong, var(--color-border))",
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {insight.intent ? (
                  <div className="mt-4 flex items-center gap-3 border-t border-dashed border-[var(--color-border)] pt-4">
                    {(() => {
                      const Icon = getIntentIcon(insight.intent);
                      return (
                        <span
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                          style={{
                            backgroundColor: "var(--color-surface)",
                            color: "var(--color-text-secondary)",
                          }}
                          aria-hidden="true"
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      );
                    })()}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                        Intenção
                      </span>
                      <span
                        className="text-[15.5px] font-semibold leading-none text-[var(--color-text)]"
                        style={{ letterSpacing: "-0.015em" }}
                      >
                        {canonicalIntent(insight.intent)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Leitura estruturada */}
            <section className="border-b border-[var(--color-border)] px-5 py-4">
              <h3 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                Leitura
              </h3>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <BriefCell label="Estágio" value={getStageLabel(insight.sales_stage)} dim={!insight.sales_stage} />
                <BriefCell
                  label="Confiança"
                  value={
                    typeof insight.confidence_score === "number"
                      ? `${insight.confidence_score}%`
                      : "—"
                  }
                  pct={
                    typeof insight.confidence_score === "number"
                      ? insight.confidence_score
                      : null
                  }
                />
                <BriefCell
                  label="Próximo"
                  value={fixAccents(insight.next_commitment) || "não definido"}
                  dim={!insight.next_commitment}
                />
                <BriefCell
                  label="Travamento"
                  value={fixAccents(insight.stall_reason) || "não identificado"}
                  dim={!insight.stall_reason}
                />
                {insight.implicit_need ? (
                  <BriefCell label="Necessidade implícita" value={fixAccents(insight.implicit_need)} fullWidth />
                ) : null}
                {insight.explicit_need ? (
                  <BriefCell label="Necessidade explícita" value={fixAccents(insight.explicit_need)} fullWidth />
                ) : null}
              </div>

              {objections.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                    Objeções percebidas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {objections.map((item) => (
                      <span
                        key={item}
                        className="rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                        style={{
                          color: "var(--color-warning)",
                          backgroundColor: "var(--color-warning-bg)",
                        }}
                      >
                        {fixAccents(item)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {/* Resumo */}
            {insight.summary ? (
              <section className="border-b border-[var(--color-border)] px-5 py-4">
                <h3 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                  Resumo
                </h3>
                <div
                  className="rounded-r-lg border-l-2 bg-[var(--color-surface)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]"
                  style={{ borderColor: "var(--color-warning)" }}
                >
                  {fixAccents(insight.summary)}
                </div>
              </section>
            ) : null}

            {/* Resposta sugerida */}
            {insightData.suggestedResponse ? (
              <section className="border-b border-[var(--color-border)] px-5 py-4">
                <h3 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                  Resposta sugerida
                </h3>
                <div
                  className="rounded-lg border px-4 py-3 text-[13px] leading-relaxed"
                  style={{
                    color: "var(--color-text)",
                    backgroundColor: "var(--color-primary-dim)",
                    borderColor: "rgba(232, 96, 15, 0.25)",
                  }}
                >
                  {fixAccents(insightData.suggestedResponse)}
                </div>
              </section>
            ) : null}

            {/* Ações sugeridas */}
            {insightData.actionItems.length > 0 ? (
              <section className="border-b border-[var(--color-border)] px-5 py-4">
                <h3 className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
                  Ações
                </h3>
                <ul className="space-y-2">
                  {insightData.actionItems.map((rawItem, index) => {
                    const item = fixAccents(rawItem);
                    return (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[13px] text-[var(--color-text-secondary)]"
                    >
                      <span
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="leading-snug">{item}</span>
                    </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* Feedback */}
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
              <InsightFeedbackPanel
                companyId={companyId}
                conversationId={conversation.id}
                initialStatus={
                  insight.feedback_status as
                    | "helpful"
                    | "needs_review"
                    | "incorrect"
                    | null
                }
                initialNote={insight.feedback_note}
                initialFeedbackAt={insight.feedback_at}
                compact
              />
            </div>
          </>
        ) : (
          <div className="px-5 py-8 text-[13px] text-[var(--color-text-secondary)]">
            Clique em <b>&quot;Analisar com IA&quot;</b> pra gerar sentimento,
            intenção, resumo e próximas ações.
          </div>
        )}
      </aside>
    </div>
  );

  if (mode === "drawer") {
    return (
      <div className="flex flex-col">
        {hero}
        {body}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto -mt-6 w-full max-w-7xl overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)]",
      )}
    >
      {hero}
      {body}
    </div>
  );
}

// =========== sub-components & helpers ===========

function getSentimentColor(sentiment?: string | null): string {
  if (sentiment === "positivo") return "var(--color-success)";
  if (sentiment === "negativo") return "var(--color-danger)";
  if (sentiment === "neutro") return "var(--color-warning)";
  return "var(--color-text-secondary)";
}

function urgencyLabel(urgency: number | null): string {
  if (!urgency) return "—";
  if (urgency <= 2) return "baixa";
  if (urgency === 3) return "média";
  if (urgency === 4) return "alta";
  return "crítica";
}

interface BriefCellProps {
  label: string;
  value: string;
  dim?: boolean;
  fullWidth?: boolean;
  pct?: number | null;
}

function BriefCell({ label, value, dim, fullWidth, pct }: BriefCellProps) {
  return (
    <div className={fullWidth ? "col-span-2" : undefined}>
      <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-tertiary,var(--color-text-secondary))]">
        {label}
      </div>
      {pct != null ? (
        <>
          <div
            className="text-[22px] font-bold leading-none text-[var(--color-text)]"
            style={{
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {pct}
            <span className="ml-0.5 font-mono text-[10px] font-medium text-[var(--color-text-tertiary,var(--color-text-secondary))]">
              %
            </span>
          </div>
          <div
            className="mt-1.5 h-[3px] overflow-hidden rounded bg-[var(--color-border-strong,var(--color-border))]"
          >
            <span
              className="block h-full"
              style={{
                width: `${Math.max(0, Math.min(100, pct))}%`,
                backgroundColor: "var(--color-primary)",
              }}
            />
          </div>
        </>
      ) : (
        <div
          className={cn(
            "text-[13.5px] leading-snug",
            dim
              ? "font-normal text-[var(--color-text-secondary)]"
              : "font-medium text-[var(--color-text)]",
          )}
        >
          {value}
        </div>
      )}
    </div>
  );
}
