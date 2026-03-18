/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/conversas/[id]/page.tsx
 * Propósito: Exibir histórico da conversa e insight de IA com ações recomendadas.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Headphones,
  HelpCircle,
  MoreHorizontal,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layouts/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AnalyzeConversationButton } from "@/components/whatsapp/analyze-conversation-button";
import { AssignSofiaAgentSelect } from "@/components/whatsapp/assign-sofia-agent-select";
import { ConversationChat } from "@/components/whatsapp/conversation-chat";
import { InsightFeedbackPanel } from "@/components/whatsapp/insight-feedback-panel";
import { SessionStatusBadge } from "@/components/whatsapp/session-status-badge";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

type ConversationDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ParsedInsightData = {
  actionItems: string[];
  urgency: number | null;
  suggestedResponse: string | null;
  keyTopics: string[];
};

function sentimentBadgeClass(sentiment?: string | null) {
  if (sentiment === "positivo") {
    return "bg-success-light text-success";
  }
  if (sentiment === "negativo") {
    return "bg-danger-light text-danger";
  }
  if (sentiment === "neutro") {
    return "bg-warning-light text-warning";
  }
  return "bg-background text-muted";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Sem data";
  }
  return new Date(value).toLocaleString("pt-BR");
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

function getIntentColor(intent?: string | null) {
  switch (intent) {
    case "compra":
      return "text-success";
    case "suporte":
      return "text-primary";
    case "reclamação":
      return "text-danger";
    case "dúvida":
      return "text-warning";
    case "cancelamento":
      return "text-danger";
    default:
      return "text-muted";
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
        typeof obj.suggested_response === "string" && obj.suggested_response.trim().length > 0
          ? obj.suggested_response
          : null,
      keyTopics: Array.isArray(obj.key_topics)
        ? obj.key_topics.filter((topic): topic is string => typeof topic === "string")
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

function getUrgencyConfig(urgency: number | null) {
  if (!urgency) return null;
  if (urgency <= 2) {
    return {
      label: "Baixa",
      color: "text-[var(--color-success)]",
      bg: "bg-[var(--color-success-bg)]",
    };
  }
  if (urgency === 3) {
    return {
      label: "Média",
      color: "text-[var(--color-warning)]",
      bg: "bg-[var(--color-warning-bg)]",
    };
  }
  if (urgency === 4) {
    return {
      label: "Alta",
      color: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary-dim)]",
    };
  }
  return {
    label: "Crítica",
    color: "text-[var(--color-danger)]",
    bg: "bg-[var(--color-danger-bg)]",
  };
}

function getStageLabel(stage?: string | null) {
  switch (stage) {
    case "discovery":
      return "Discovery";
    case "qualification":
      return "Qualificação";
    case "proposal":
      return "Proposta";
    case "negotiation":
      return "Negociação";
    case "closing":
      return "Fechamento";
    case "post_sale":
      return "Pós-venda";
    default:
      return "Indefinido";
  }
}

function parseStringArray(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function formatContactDisplay(contactName: string | null, remoteJid: string) {
  if (contactName && contactName.trim().length > 0) {
    return contactName.trim();
  }

  const phone = remoteJid.replace(/@s.whatsapp.net|@c.us/g, "");

  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const numero = phone.substring(4);

    if (numero.length === 9) {
      return `(${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
    }
    if (numero.length === 8) {
      return `(${ddd}) ${numero.substring(0, 4)}-${numero.substring(4)}`;
    }
  }

  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") || phone;
}

export default async function ConversationDetailsPage({ params }: ConversationDetailsPageProps) {
  const { id } = await params;
  const companyId = await getUserCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, external_id, remote_jid, contact_name, status, last_message_at")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!conversation) {
    notFound();
  }

  const { data: rawMessages } = await supabase
    .from("messages")
    .select("id, content, direction, sent_at")
    .eq("company_id", companyId)
    .eq("conversation_id", id)
    .order("sent_at", { ascending: true });

  const seenFingerprints = new Set<string>();
  const messages = (rawMessages ?? []).filter((message) => {
    const fingerprint = `${message.sent_at}::${message.direction}::${message.content ?? ""}`;
    if (seenFingerprints.has(fingerprint)) {
      return false;
    }
    seenFingerprints.add(fingerprint);
    return true;
  });

  const { data: insight } = await supabase
    .from("conversation_insights")
    .select("sentiment, intent, sales_stage, summary, implicit_need, explicit_need, objections, next_commitment, stall_reason, confidence_score, feedback_status, feedback_note, feedback_at, action_items, generated_at")
    .eq("company_id", companyId)
    .eq("conversation_id", id)
    .maybeSingle();

  let sofiaConversationUrl: string | null = null;
  if (conversation.external_id) {
    try {
      const sofiaClient = await getSofiaCrmClient(companyId);
      sofiaConversationUrl = sofiaClient.buildConversationUrl(conversation.external_id);
    } catch {
      sofiaConversationUrl = null;
    }
  }

  const insightData = parseInsightData(insight?.action_items);
  const urgencyConfig = getUrgencyConfig(insightData.urgency);
  const objections = parseStringArray(insight?.objections);

  return (
    <PageContainer
      title={formatContactDisplay(conversation.contact_name, conversation.remote_jid)}
      description={`Última mensagem: ${formatDate(conversation.last_message_at)}`}
      actions={
        <div className="flex gap-2">
          <Link href="/whatsapp-intelligence/conversas" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <AnalyzeConversationButton
            companyId={companyId}
            conversationId={conversation.id}
            hasInsight={Boolean(insight)}
          />
          {conversation.external_id ? (
            <AssignSofiaAgentSelect
              companyId={companyId}
              conversationExternalId={conversation.external_id}
            />
          ) : null}
          {sofiaConversationUrl ? (
            <Link
              href={sofiaConversationUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "secondary" })}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir no Sofia CRM
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-text">Histórico da conversa</CardTitle>
                <CardDescription className="text-xs text-muted">
                  Status atual: {conversation.status ?? "open"}
                </CardDescription>
              </div>
              {conversation.external_id ? (
                <SessionStatusBadge
                  companyId={companyId}
                  conversationExternalId={conversation.external_id}
                />
              ) : null}
            </div>
          </CardHeader>
          <ConversationChat
            companyId={companyId}
            conversationId={conversation.id}
            conversationExternalId={conversation.external_id}
            initialMessages={messages}
          />
        </Card>

        <Card className="flex flex-col rounded-xl border border-border bg-card lg:sticky lg:top-8 lg:max-h-[calc(100vh-12rem)]">
          <CardHeader className="shrink-0 p-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">Análise de IA</span>
            </div>
            <CardDescription className="text-xs text-muted">
              {insight?.generated_at ? `Gerado em ${formatDate(insight.generated_at)}` : "Ainda não analisado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto p-6 pt-0">
            {insight ? (
              <>
                <div className="border-b border-border pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-light">Sentimento</span>
                      <div className="mt-1">
                        <span
                          className={`inline-block rounded px-2.5 py-1 text-sm font-medium ${sentimentBadgeClass(
                            insight.sentiment
                          )}`}
                        >
                          {insight.sentiment}
                        </span>
                      </div>
                    </div>
                    {urgencyConfig ? (
                      <div className="text-right">
                        <span className="text-xs uppercase tracking-wide text-muted-light">Urgência</span>
                        <div className="mt-1">
                          <span
                            className={`inline-block rounded px-2.5 py-1 text-sm font-medium ${urgencyConfig.bg} ${urgencyConfig.color}`}
                          >
                            {insightData.urgency}/5 - {urgencyConfig.label}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="border-b border-border pb-3">
                  <span className="text-xs uppercase tracking-wide text-muted-light">Intenção</span>
                  <div className="mt-1 flex items-center gap-2">
                    {(() => {
                      const IntentIcon = getIntentIcon(insight.intent);
                      const intentColor = getIntentColor(insight.intent);
                      return (
                        <>
                          <IntentIcon className={`h-4 w-4 ${intentColor}`} />
                          <p className={`text-sm font-medium capitalize ${intentColor}`}>
                            {insight.intent || "sem intenção"}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  {insightData.keyTopics.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {insightData.keyTopics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="border-b border-border pb-3">
                  <span className="text-xs uppercase tracking-wide text-muted-light">Leitura estruturada</span>
                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-light">Estágio da venda</p>
                        <p className="mt-1 text-sm font-medium text-text">{getStageLabel(insight.sales_stage)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-light">Confiança da análise</p>
                        <p className="mt-1 text-sm font-medium text-text">
                          {typeof insight.confidence_score === "number"
                            ? `${insight.confidence_score}%`
                            : "Não informado"}
                        </p>
                      </div>
                    </div>

                    {insight.implicit_need || insight.explicit_need ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-light">Necessidade implícita</p>
                          <p className="mt-1 text-sm text-text">{insight.implicit_need || "Não identificada"}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-light">Necessidade explícita</p>
                          <p className="mt-1 text-sm text-text">{insight.explicit_need || "Não identificada"}</p>
                        </div>
                      </div>
                    ) : null}

                    {insight.next_commitment || insight.stall_reason ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-light">Próximo compromisso</p>
                          <p className="mt-1 text-sm text-text">{insight.next_commitment || "Não definido"}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-light">Motivo do travamento</p>
                          <p className="mt-1 text-sm text-text">{insight.stall_reason || "Não identificado"}</p>
                        </div>
                      </div>
                    ) : null}

                    {objections.length > 0 ? (
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-light">Objeções percebidas</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {objections.map((item) => (
                            <span
                              key={item}
                              className="rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-xs text-[var(--color-warning)]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="border-b border-border pb-3">
                  <span className="text-xs uppercase tracking-wide text-muted-light">Resumo</span>
                  <div className="mt-2 rounded-lg bg-sidebar p-3">
                    <p className="text-sm text-text">{insight.summary}</p>
                  </div>
                </div>

                {insightData.suggestedResponse ? (
                  <div className="border-b border-border pb-3">
                    <span className="text-xs uppercase tracking-wide text-muted-light">Resposta sugerida</span>
                    <div className="mt-2 rounded-lg border border-[var(--color-primary-dim)] bg-[var(--color-primary-dim)] p-3">
                      <p className="text-sm italic text-text">{insightData.suggestedResponse}</p>
                    </div>
                  </div>
                ) : null}

                <div className="pb-1">
                  <span className="text-xs uppercase tracking-wide text-muted-light">Ações sugeridas</span>
                  <ul className="mt-2 space-y-2">
                    {insightData.actionItems.map((item, index) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </>
            ) : (
              <p className="text-sm text-muted">
                Clique em &quot;Analisar com IA&quot; para gerar sentimento, intenção, resumo e próximas ações.
              </p>
            )}
          </CardContent>
          {insight ? (
            <div className="shrink-0 border-t border-border bg-card p-4">
              <InsightFeedbackPanel
                companyId={companyId}
                conversationId={conversation.id}
                initialStatus={insight.feedback_status}
                initialNote={insight.feedback_note}
                initialFeedbackAt={insight.feedback_at}
                compact
              />
            </div>
          ) : null}
        </Card>
      </div>
    </PageContainer>
  );
}
