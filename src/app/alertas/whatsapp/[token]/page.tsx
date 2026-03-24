/**
 * Arquivo: src/app/alertas/whatsapp/[token]/page.tsx
 * Proposito: Exibir alerta publico de WhatsApp e redirecionar usuarios autorizados para a conversa interna.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Building2, LockKeyhole, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyWhatsappAlertAccessToken } from "@/lib/alerts/access-token";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

type ViewerAccess = {
  isAuthenticated: boolean;
  hasCompanyAccess: boolean;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function formatContactDisplay(contactName: string | null, remoteJid: string) {
  if (contactName && contactName.trim().length > 0) {
    return contactName.trim();
  }

  const phone = remoteJid.replace(/@s.whatsapp.net|@c.us/g, "");

  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const number = phone.substring(4);

    if (number.length === 9) {
      return `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
    }

    if (number.length === 8) {
      return `(${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
    }
  }

  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") || phone;
}

function resolveInsightBadge(sentiment?: string | null) {
  switch (sentiment) {
    case "positivo":
      return { label: "Sentimento positivo", variant: "success" as const };
    case "negativo":
      return { label: "Sentimento negativo", variant: "danger" as const };
    case "neutro":
      return { label: "Sentimento neutro", variant: "warning" as const };
    default:
      return { label: "Sem classificacao", variant: "default" as const };
  }
}

async function resolveViewerAccess(companyId: string): Promise<ViewerAccess> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAuthenticated: false, hasCompanyAccess: false };
  }

  try {
    await resolveCompanyAccess(supabase, companyId);
    return { isAuthenticated: true, hasCompanyAccess: true };
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return { isAuthenticated: true, hasCompanyAccess: false };
    }

    throw error;
  }
}

export default async function WhatsappAlertPage({ params }: PageProps) {
  const { token } = await params;

  let payload: ReturnType<typeof verifyWhatsappAlertAccessToken>;
  try {
    payload = verifyWhatsappAlertAccessToken(token);
  } catch {
    notFound();
  }

  const viewerAccess = await resolveViewerAccess(payload.companyId);
  if (viewerAccess.hasCompanyAccess) {
    redirect(`/whatsapp-intelligence/conversas/${payload.conversationId}`);
  }

  const admin = createSupabaseAdminClient();
  const [{ data: company }, { data: conversation }, { data: rawMessages }, { data: insight }] =
    await Promise.all([
      admin
        .from("companies")
        .select("name, niche")
        .eq("id", payload.companyId)
        .maybeSingle(),
      admin
        .from("conversations")
        .select("id, contact_name, contact_phone, remote_jid, last_message_at, status")
        .eq("id", payload.conversationId)
        .eq("company_id", payload.companyId)
        .maybeSingle(),
      admin
        .from("messages")
        .select("id, content, direction, sent_at")
        .eq("company_id", payload.companyId)
        .eq("conversation_id", payload.conversationId)
        .order("sent_at", { ascending: false })
        .limit(20),
      admin
        .from("conversation_insights")
        .select("sentiment, intent, summary, generated_at")
        .eq("company_id", payload.companyId)
        .eq("conversation_id", payload.conversationId)
        .maybeSingle(),
    ]);

  if (!company || !conversation) {
    notFound();
  }

  const messages = [...(rawMessages ?? [])].reverse();
  const sentiment = resolveInsightBadge(insight?.sentiment);
  const loginHref = `/login?next=${encodeURIComponent(
    `/whatsapp-intelligence/conversas/${conversation.id}`
  )}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,94,36,0.12),_transparent_38%),linear-gradient(180deg,_#fff7f3_0%,_#ffffff_52%,_#fffaf7_100%)] px-4 py-10 text-[var(--color-text)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="primary" size="md">
              Alerta AXIOMIX
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-text)]">
              Conversa sinalizada no WhatsApp Intelligence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
              Este link abre uma visao segura do alerta no navegador. Usuarios com acesso a empresa
              sao redirecionados automaticamente para a conversa completa.
            </p>
          </div>

          {viewerAccess.isAuthenticated ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-white/80 p-4 backdrop-blur">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Conta autenticada sem vinculo com esta empresa</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Peca ao administrador para adicionar seu usuario como membro antes de abrir o
                    painel interno.
                  </p>
                  <Link
                    href={loginHref}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Entrar com outra conta
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Link href={loginHref} className={buttonVariants({ variant: "default", size: "lg" })}>
              Entrar para abrir no painel
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card accent>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
                {insight?.intent ? <Badge variant="gold">Intencao: {insight.intent}</Badge> : null}
                <Badge variant="default">{conversation.status ?? "open"}</Badge>
              </div>
              <CardTitle className="mt-2 text-2xl">
                {formatContactDisplay(conversation.contact_name, conversation.remote_jid)}
              </CardTitle>
              <CardDescription>
                Ultima mensagem em {formatDate(conversation.last_message_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="h-4 w-4 text-[var(--color-primary)]" />
                    Empresa
                  </div>
                  <p className="mt-2 text-base font-semibold">{company.name}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {company.niche || "Nicho nao informado"}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-white/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquareText className="h-4 w-4 text-[var(--color-primary)]" />
                    Contato
                  </div>
                  <p className="mt-2 text-base font-semibold">
                    {conversation.contact_name || formatContactDisplay(null, conversation.remote_jid)}
                  </p>
                  {conversation.contact_phone ? (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {conversation.contact_phone}
                    </p>
                  ) : null}
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Canal: WhatsApp
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  Resumo da IA
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text)]">
                  {insight?.summary || "Ainda nao ha um resumo gerado para esta conversa."}
                </p>
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                  {insight?.generated_at
                    ? `Analise atualizada em ${formatDate(insight.generated_at)}`
                    : "Analise pendente"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Ultimas mensagens</CardTitle>
              <CardDescription>Modo leitura para consulta rapida do alerta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-secondary)]">
                  Nenhuma mensagem sincronizada para esta conversa.
                </div>
              ) : (
                messages.map((message) => {
                  const isOutbound = message.direction === "outbound";

                  return (
                    <div
                      key={message.id}
                      className={[
                        "max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        isOutbound
                          ? "ml-auto bg-[var(--color-primary)] text-white"
                          : "mr-auto border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
                      ].join(" ")}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content?.trim() || "Mensagem sem texto"}
                      </p>
                      <p
                        className={[
                          "mt-2 text-[11px]",
                          isOutbound ? "text-white/80" : "text-[var(--color-text-secondary)]",
                        ].join(" ")}
                      >
                        {formatDate(message.sent_at)}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
