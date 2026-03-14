/**
 * Arquivo: src/components/intelligence/intelligence-module.tsx
 * Proposito: Interface completa da Task 5 (Concorrentes + Content Radar).
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Lightbulb, Radar, RefreshCw, Sparkles, Target, Trash2, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformFilter = "all" | "instagram" | "linkedin" | "tiktok";
type TabKey = "competitors" | "radar";

type CompetitorCardData = {
  id: string;
  name: string;
  websiteUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  avgEngagement: number;
  lastCollectedAt: string | null;
  latestInsight: string | null;
};

type RadarPostData = {
  id: string;
  platform: "instagram" | "linkedin" | "tiktok" | null;
  postUrl: string | null;
  content: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  engagementScore: number;
  postedAt: string | null;
  collectedAt: string | null;
};

type IntelligenceModuleProps = {
  companyId: string;
  niche: string | null;
  subNiche: string | null;
  competitors: CompetitorCardData[];
  radarPosts: RadarPostData[];
};

type ApiErrorPayload = {
  error?: string;
};

const competitorFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do concorrente."),
  websiteUrl: z.string().trim().url("Website invalido.").optional().or(z.literal("")),
  instagramUrl: z.string().trim().url("Instagram invalido.").optional().or(z.literal("")),
  linkedinUrl: z.string().trim().url("LinkedIn invalido.").optional().or(z.literal("")),
});

function formatDate(value?: string | null) {
  if (!value) {
    return "Sem coleta";
  }
  return new Date(value).toLocaleString("pt-BR");
}

function formatPlatform(platform: RadarPostData["platform"]) {
  if (!platform) {
    return "desconhecida";
  }
  return platform;
}

function buildContentPrompt(
  post: RadarPostData,
  niche: string | null,
  subNiche: string | null
) {
  const nicheLine = [niche, subNiche].filter(Boolean).join(" / ");
  return [
    "Voce e um estrategista de conteudo para pequenas e medias empresas.",
    `Nicho do cliente: ${nicheLine || "marketing"}.`,
    `Plataforma de referencia: ${formatPlatform(post.platform)}.`,
    `Engagement do post de referencia: ${post.engagementScore}.`,
    `Texto de referencia: ${post.content ?? "Sem conteudo"}.`,
    "Crie uma versao original para esta empresa com:",
    "1) Gancho forte na primeira frase",
    "2) Corpo em ate 5 linhas",
    "3) CTA final para conversa no WhatsApp",
    "Entregue em portugues simples e direto.",
  ].join("\n");
}

export function IntelligenceModule({
  companyId,
  niche,
  subNiche,
  competitors,
  radarPosts,
}: IntelligenceModuleProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("competitors");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [isSavingCompetitor, setIsSavingCompetitor] = useState(false);
  const [isCollectingKey, setIsCollectingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<"name" | "websiteUrl" | "instagramUrl" | "linkedinUrl", string>>>({});
  const [fields, setFields] = useState({
    name: "",
    websiteUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
  });
  const [selectedPost, setSelectedPost] = useState<RadarPostData | null>(null);
  const [promptText, setPromptText] = useState("");
  const [copied, setCopied] = useState(false);

  const limitReached = competitors.length >= 3;
  const highestEngagement = radarPosts.reduce((maxValue, post) => Math.max(maxValue, post.engagementScore), 0);
  const viralThreshold = Math.max(160, Math.round(highestEngagement * 0.72));
  const topRadarPosts = radarPosts
    .filter((post) => (platformFilter === "all" ? true : post.platform === platformFilter))
    .sort((left, right) => right.engagementScore - left.engagementScore)
    .slice(0, 10);

  const handleFieldChange =
    (field: keyof typeof fields) => (event: ChangeEvent<HTMLInputElement>) => {
      setFields((previous) => ({ ...previous, [field]: event.target.value }));
      setFormErrors((previous) => ({ ...previous, [field]: undefined }));
      setError(null);
      setFeedback(null);
    };

  const refreshWithFeedback = (nextFeedback: string) => {
    setFeedback(nextFeedback);
    router.refresh();
  };

  const handleAddCompetitor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setFormErrors({});

    if (limitReached) {
      setError("Limite de 3 concorrentes por empresa atingido.");
      return;
    }

    const parsed = competitorFormSchema.safeParse(fields);
    if (!parsed.success) {
      const nextErrors: Partial<Record<"name" | "websiteUrl" | "instagramUrl" | "linkedinUrl", string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === "name" ||
          field === "websiteUrl" ||
          field === "instagramUrl" ||
          field === "linkedinUrl"
        ) {
          nextErrors[field] = issue.message;
        }
      }
      setFormErrors(nextErrors);
      return;
    }

    setIsSavingCompetitor(true);
    const response = await fetch("/api/intelligence/competitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        ...parsed.data,
      }),
    });
    const payload = (await response.json()) as ApiErrorPayload;
    setIsSavingCompetitor(false);

    if (!response.ok) {
      setError(payload.error ?? "Falha ao adicionar concorrente.");
      return;
    }

    setFields({
      name: "",
      websiteUrl: "",
      instagramUrl: "",
      linkedinUrl: "",
    });
    refreshWithFeedback("Concorrente adicionado com sucesso.");
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    setError(null);
    setFeedback(null);

    const response = await fetch(`/api/intelligence/competitors/${competitorId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
      }),
    });
    const payload = (await response.json()) as ApiErrorPayload;

    if (!response.ok) {
      setError(payload.error ?? "Falha ao remover concorrente.");
      return;
    }

    refreshWithFeedback("Concorrente removido.");
  };

  const handleCollectNow = async (
    sourceType: "competitor" | "radar",
    competitorId?: string
  ) => {
    setError(null);
    setFeedback(null);
    const collectKey = competitorId ? `${sourceType}:${competitorId}` : sourceType;
    setIsCollectingKey(collectKey);

    const response = await fetch("/api/intelligence/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        sourceType,
        competitorId,
        processNow: true,
      }),
    });
    const payload = (await response.json()) as ApiErrorPayload;
    setIsCollectingKey(null);

    if (!response.ok) {
      setError(payload.error ?? "Falha ao coletar dados.");
      return;
    }

    refreshWithFeedback("Coleta executada com sucesso.");
  };

  const openContentModal = (post: RadarPostData) => {
    setSelectedPost(post);
    setPromptText(buildContentPrompt(post, niche, subNiche));
    setCopied(false);
  };

  const closeModal = () => {
    setSelectedPost(null);
    setPromptText("");
  };

  const handleCopyPrompt = async () => {
    if (!promptText) {
      return;
    }
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setActiveTab("competitors")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "competitors"
              ? "bg-primary-light text-primary"
              : "text-muted hover:bg-background hover:text-text"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Concorrentes
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("radar")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "radar"
              ? "bg-primary-light text-primary"
              : "text-muted hover:bg-background hover:text-text"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Radar className="h-4 w-4" />
            Content Radar
          </div>
        </button>
      </div>

      {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {activeTab === "competitors" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Gerenciar concorrentes</CardTitle>
                  <CardDescription>
                    Maximo de 3 concorrentes por empresa. Limite validado no servidor.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCollectingKey === "competitor"}
                  onClick={() => handleCollectNow("competitor")}
                >
                  <RefreshCw className={`h-4 w-4 ${isCollectingKey === "competitor" ? "animate-spin" : ""}`} />
                  {isCollectingKey === "competitor" ? "Coletando..." : "Coletar agora"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddCompetitor}>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-text" htmlFor="competitor-name">
                    Nome
                  </label>
                  <input
                    id="competitor-name"
                    type="text"
                    value={fields.name}
                    onChange={handleFieldChange("name")}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Ex.: Empresa Alpha"
                  />
                  {formErrors.name ? <p className="text-xs text-danger">{formErrors.name}</p> : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text" htmlFor="competitor-website">
                    Website (opcional)
                  </label>
                  <input
                    id="competitor-website"
                    type="url"
                    value={fields.websiteUrl}
                    onChange={handleFieldChange("websiteUrl")}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://exemplo.com"
                  />
                  {formErrors.websiteUrl ? <p className="text-xs text-danger">{formErrors.websiteUrl}</p> : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text" htmlFor="competitor-instagram">
                    Instagram (opcional)
                  </label>
                  <input
                    id="competitor-instagram"
                    type="url"
                    value={fields.instagramUrl}
                    onChange={handleFieldChange("instagramUrl")}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://instagram.com/..."
                  />
                  {formErrors.instagramUrl ? (
                    <p className="text-xs text-danger">{formErrors.instagramUrl}</p>
                  ) : null}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-text" htmlFor="competitor-linkedin">
                    LinkedIn (opcional)
                  </label>
                  <input
                    id="competitor-linkedin"
                    type="url"
                    value={fields.linkedinUrl}
                    onChange={handleFieldChange("linkedinUrl")}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://linkedin.com/company/..."
                  />
                  {formErrors.linkedinUrl ? <p className="text-xs text-danger">{formErrors.linkedinUrl}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <span
                    title={
                      limitReached
                        ? "Limite de 3 concorrentes atingido. Remova um concorrente para adicionar outro."
                        : "Adicione um novo concorrente para monitoramento."
                    }
                    className="inline-flex"
                  >
                    <Button type="submit" disabled={isSavingCompetitor || limitReached}>
                      {isSavingCompetitor ? "Salvando..." : "Adicionar concorrente"}
                    </Button>
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {competitors.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="py-10 text-center text-sm text-muted">
                  Nenhum concorrente cadastrado. Adicione ate 3 para iniciar monitoramento.
                </CardContent>
              </Card>
            ) : (
              competitors.map((competitor) => (
                <Card key={competitor.id}>
                  <CardHeader className="space-y-2">
                    <CardTitle className="line-clamp-1 text-base">{competitor.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Target className="h-3 w-3" />
                      Ultima coleta: {formatDate(competitor.lastCollectedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-md bg-background p-3">
                      <p className="text-xs text-muted">Engajamento medio</p>
                      <p className="text-xl font-semibold tabular-nums text-text">
                        {competitor.avgEngagement}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-muted">Insight da IA</p>
                      <p className="line-clamp-2 text-sm text-text">
                        {competitor.latestInsight ?? "Ainda sem insight. Execute uma coleta."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isCollectingKey === `competitor:${competitor.id}`}
                        onClick={() => handleCollectNow("competitor", competitor.id)}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            isCollectingKey === `competitor:${competitor.id}` ? "animate-spin" : ""
                          }`}
                        />
                        Coletar agora
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCompetitor(competitor.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Top 10 posts da semana</CardTitle>
                  <CardDescription>
                    Ordenado por engagement_score. Viral acima de {viralThreshold}.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={platformFilter === "all" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setPlatformFilter("all")}
                  >
                    Todas
                  </Button>
                  <Button
                    type="button"
                    variant={platformFilter === "instagram" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setPlatformFilter("instagram")}
                  >
                    Instagram
                  </Button>
                  <Button
                    type="button"
                    variant={platformFilter === "linkedin" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setPlatformFilter("linkedin")}
                  >
                    LinkedIn
                  </Button>
                  <Button
                    type="button"
                    variant={platformFilter === "tiktok" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setPlatformFilter("tiktok")}
                  >
                    TikTok
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isCollectingKey === "radar"}
                    onClick={() => handleCollectNow("radar")}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCollectingKey === "radar" ? "animate-spin" : ""}`} />
                    {isCollectingKey === "radar" ? "Coletando..." : "Coletar agora"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topRadarPosts.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhum post coletado para este filtro. Execute uma coleta de radar.
                </p>
              ) : (
                topRadarPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text">
                        #{index + 1} • {formatPlatform(post.platform)}
                      </p>
                      <div className="flex items-center gap-2">
                        {post.engagementScore >= viralThreshold ? (
                          <span className="rounded-full bg-danger-light px-2 py-1 text-xs font-medium text-danger">
                            Viral
                          </span>
                        ) : null}
                        <span className="rounded-full bg-background px-2 py-1 text-xs font-medium text-text tabular-nums">
                          Score {post.engagementScore}
                        </span>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-text">
                      {post.content ?? "Sem conteudo"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>Likes: {post.likesCount}</span>
                      <span>Comentarios: {post.commentsCount}</span>
                      <span>Shares: {post.sharesCount}</span>
                      <span>Coletado: {formatDate(post.collectedAt)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" onClick={() => openContentModal(post)}>
                        <Sparkles className="h-3.5 w-3.5" />
                        Criar conteudo baseado nesse post
                      </Button>
                      {post.postUrl ? (
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Abrir referencia
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedPost ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <Card className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgba(28,25,23,0.12)]" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg text-text">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Prompt de criacao de conteudo
                  </CardTitle>
                  <CardDescription className="mt-1 text-muted">
                    Post base: {formatPlatform(selectedPost.platform)} • score {selectedPost.engagementScore}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-1.5 text-muted-light hover:text-text hover:bg-sidebar transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <textarea
                value={promptText}
                onChange={(event) => setPromptText(event.target.value)}
                className="min-h-[220px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={handleCopyPrompt}>
                  {copied ? "Copiado" : "Copiar prompt"}
                </Button>
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
