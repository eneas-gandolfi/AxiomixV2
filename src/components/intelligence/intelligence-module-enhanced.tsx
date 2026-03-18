/**
 * Arquivo: src/components/intelligence/intelligence-module-enhanced.tsx
 * Propósito: Interface aprimorada do Intelligence com dashboard, analytics e funcionalidades avançadas
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState, useMemo, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Lightbulb,
  Radar,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Star,
  Copy,
  Download,
  Filter,
  Search,
  BookmarkPlus,
  BookMarked,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Hash,
  Clock,
  Zap,
  Eye,
  ExternalLink,
  MessageSquare,
  Heart,
  Share2,
  Users,
  Activity,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformFilter = "all" | "instagram" | "linkedin" | "tiktok";
type TabKey = "overview" | "competitors" | "radar" | "saved";
type SortOption = "engagement" | "recent" | "viral";

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

type SavedPrompt = {
  id: string;
  title: string;
  content: string;
  postId: string;
  createdAt: string;
  tags: string[];
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

type CollectResponse = {
  companyId: string;
  queued: Array<{ id: string; type: string; scheduledFor: string | null }>;
  processed: { done: number; failed: number; pending: number } | null;
};

const competitorFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do concorrente."),
  websiteUrl: z.string().trim().url("Website inválido.").optional().or(z.literal("")),
  instagramUrl: z.string().trim().url("Instagram inválido.").optional().or(z.literal("")),
  linkedinUrl: z.string().trim().url("LinkedIn inválido.").optional().or(z.literal("")),
});

const PROMPT_TEMPLATES = [
  {
    id: "engaging",
    name: "Post Engajador",
    prompt: `Crie um post altamente engajador para {{platform}} baseado neste conteúdo viral.

Referência: {{content}}
Score de engajamento: {{score}}

Estruture o post assim:
1. Gancho impactante (primeira linha deve parar o scroll)
2. Storytelling com dados ou exemplo prático
3. Insights valiosos (3-5 pontos)
4. CTA claro para ação no WhatsApp

Tom: Autêntico, direto e conversacional.
Nicho: {{niche}}`,
  },
  {
    id: "educational",
    name: "Post Educativo",
    prompt: `Transforme este conteúdo viral em um post educativo poderoso.

Conteúdo de referência: {{content}}
Performance: {{score}} de engajamento

Crie um post que:
• Ensine algo valioso em 90 segundos de leitura
• Use framework "Problema → Solução → Ação"
• Inclua 1 estatística impactante
• Termine com CTA para WhatsApp

Nicho: {{niche}}
Plataforma: {{platform}}`,
  },
  {
    id: "viral",
    name: "Fórmula Viral",
    prompt: `Analise o que tornou este post viral e replique a fórmula:

Post original: {{content}}
Métricas: {{likes}} likes, {{comments}} comentários, {{shares}} compartilhamentos

Identifique:
1. O gatilho emocional usado
2. A estrutura narrativa
3. O timing perfeito

Então crie uma versão ORIGINAL para {{niche}} que:
- Mantenha a mesma estrutura emocional
- Adapte para nosso público
- Termine com CTA WhatsApp forte

Plataforma alvo: {{platform}}`,
  },
  {
    id: "storytelling",
    name: "Storytelling",
    prompt: `Use este post viral como inspiração para criar uma história envolvente:

Inspiração: {{content}}
Engajamento alcançado: {{score}}

Estruture a história:
Situação: Apresente o cenário/problema
Complicação: Mostre o desafio enfrentado
Resolução: Como foi solucionado
Lição: O aprendizado principal

Finalize com CTA para conversa no WhatsApp.
Tom: Humano e inspirador
Nicho: {{niche}}`,
  },
];

function formatDate(value?: string | null) {
  if (!value) {
    return "Sem coleta";
  }
  return new Date(value).toLocaleString("pt-BR");
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Nunca";

  const now = new Date();
  const date = new Date(value);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return formatDate(value);
}

function formatPlatform(platform: RadarPostData["platform"]) {
  if (!platform) return "desconhecida";
  return platform;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

function buildContentPrompt(
  post: RadarPostData,
  niche: string | null,
  subNiche: string | null,
  template: typeof PROMPT_TEMPLATES[0]
) {
  const nicheLine = [niche, subNiche].filter(Boolean).join(" / ");

  return template.prompt
    .replace(/\{\{platform\}\}/g, formatPlatform(post.platform))
    .replace(/\{\{content\}\}/g, post.content ?? "Sem conteúdo")
    .replace(/\{\{score\}\}/g, post.engagementScore.toString())
    .replace(/\{\{likes\}\}/g, formatNumber(post.likesCount))
    .replace(/\{\{comments\}\}/g, formatNumber(post.commentsCount))
    .replace(/\{\{shares\}\}/g, formatNumber(post.sharesCount))
    .replace(/\{\{niche\}\}/g, nicheLine || "marketing");
}

export function IntelligenceModuleEnhanced({
  companyId,
  niche,
  subNiche,
  competitors,
  radarPosts,
}: IntelligenceModuleProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("engagement");
  const [searchTerm, setSearchTerm] = useState("");
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
  const [selectedTemplate, setSelectedTemplate] = useState(PROMPT_TEMPLATES[0]);
  const [promptText, setPromptText] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [addPostForm, setAddPostForm] = useState({
    platform: "instagram" as "instagram" | "linkedin" | "tiktok",
    postUrl: "",
    content: "",
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
  });

  const limitReached = competitors.length >= 3;

  // Métricas do overview
  const overviewMetrics = useMemo(() => {
    const totalPosts = radarPosts.length;
    const avgEngagement = totalPosts > 0
      ? Math.round(radarPosts.reduce((sum, p) => sum + p.engagementScore, 0) / totalPosts)
      : 0;

    const highestEngagement = radarPosts.reduce((max, p) => Math.max(max, p.engagementScore), 0);
    const viralThreshold = Math.max(160, Math.round(highestEngagement * 0.72));
    const viralPosts = radarPosts.filter(p => p.engagementScore >= viralThreshold).length;

    const competitorsAvg = competitors.length > 0
      ? Math.round(competitors.reduce((sum, c) => sum + c.avgEngagement, 0) / competitors.length)
      : 0;

    return {
      totalPosts,
      avgEngagement,
      viralPosts,
      viralThreshold,
      competitorsAvg,
      topCompetitor: competitors.sort((a, b) => b.avgEngagement - a.avgEngagement)[0] || null,
    };
  }, [radarPosts, competitors]);

  // Filtrar e ordenar posts
  const filteredPosts = useMemo(() => {
    let filtered = radarPosts.filter((post) => {
      const matchesPlatform = platformFilter === "all" || post.platform === platformFilter;
      const matchesSearch = !searchTerm ||
        post.content?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPlatform && matchesSearch;
    });

    // Ordenar
    switch (sortBy) {
      case "engagement":
        filtered.sort((a, b) => b.engagementScore - a.engagementScore);
        break;
      case "recent":
        filtered.sort((a, b) => {
          const dateA = a.collectedAt ? new Date(a.collectedAt).getTime() : 0;
          const dateB = b.collectedAt ? new Date(b.collectedAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case "viral":
        filtered.sort((a, b) => {
          const viralScoreA = a.likesCount + a.commentsCount * 2 + a.sharesCount * 3;
          const viralScoreB = b.likesCount + b.commentsCount * 2 + b.sharesCount * 3;
          return viralScoreB - viralScoreA;
        });
        break;
    }

    return filtered.slice(0, 5);
  }, [radarPosts, platformFilter, searchTerm, sortBy]);

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

    try {
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

      const payload = await response.json();
      setIsCollectingKey(null);

      if (!response.ok) {
        const errorPayload = payload as ApiErrorPayload;
        setError(errorPayload.error ?? "Falha ao coletar dados.");
        return;
      }

      const collectData = payload as CollectResponse;

      // Feedback detalhado
      let feedbackMsg = "Coleta executada! ";
      if (collectData.processed) {
        const { done, failed, pending } = collectData.processed;
        if (done > 0) {
          feedbackMsg += `${done} job(s) processado(s) com sucesso. `;
        }
        if (failed > 0) {
          feedbackMsg += `${failed} falharam. `;
        }
        if (pending > 0) {
          feedbackMsg += `${pending} pendente(s). `;
        }
        if (done === 0 && pending === 0) {
          feedbackMsg = "Coleta enfileirada. Aguarde alguns segundos e recarregue a página.";
        }
      } else {
        feedbackMsg += "Jobs enfileirados para processamento.";
      }

      refreshWithFeedback(feedbackMsg);

      // Recarregar novamente após 2 segundos para pegar dados processados
      if (collectData.processed && collectData.processed.done > 0) {
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      setIsCollectingKey(null);
      setError("Erro ao coletar dados. Verifique sua conexão.");
      console.error("Erro na coleta:", err);
    }
  };

  const openContentModal = (post: RadarPostData) => {
    setSelectedPost(post);
    setPromptText(buildContentPrompt(post, niche, subNiche, selectedTemplate));
    setCopied(false);
  };

  const closeModal = () => {
    setSelectedPost(null);
    setPromptText("");
    setSelectedTemplate(PROMPT_TEMPLATES[0]);
  };

  const handleCopyPrompt = async () => {
    if (!promptText) return;
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTemplateChange = (template: typeof PROMPT_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    if (selectedPost) {
      setPromptText(buildContentPrompt(selectedPost, niche, subNiche, template));
    }
  };

  const toggleSavePost = (postId: string) => {
    setSavedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleSavePrompt = () => {
    if (!selectedPost || !promptText) return;

    const newPrompt: SavedPrompt = {
      id: `prompt-${Date.now()}`,
      title: `Prompt ${formatPlatform(selectedPost.platform)} - ${new Date().toLocaleDateString()}`,
      content: promptText,
      postId: selectedPost.id,
      createdAt: new Date().toISOString(),
      tags: [formatPlatform(selectedPost.platform), selectedTemplate.name],
    };

    setSavedPrompts((prev) => [newPrompt, ...prev]);
    setFeedback("Prompt salvo com sucesso!");
  };

  const handleAddPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    if (!addPostForm.content.trim() || addPostForm.content.trim().length < 10) {
      setError("O conteúdo deve ter pelo menos 10 caracteres.");
      return;
    }

    setIsAddingPost(true);

    try {
      const response = await fetch("/api/intelligence/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          ...addPostForm,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Falha ao adicionar post.");
        setIsAddingPost(false);
        return;
      }

      // Resetar formulário
      setAddPostForm({
        platform: "instagram",
        postUrl: "",
        content: "",
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
      });
      setShowAddPostModal(false);
      setIsAddingPost(false);

      refreshWithFeedback(`Post adicionado! Engagement score: ${payload.engagementScore}`);
    } catch (err) {
      setIsAddingPost(false);
      setError("Erro ao adicionar post. Verifique sua conexão.");
      console.error("Erro ao adicionar post:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja deletar este post?")) {
      return;
    }

    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/intelligence/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Falha ao deletar post.");
        return;
      }

      refreshWithFeedback("Post deletado com sucesso!");
    } catch (err) {
      setError("Erro ao deletar post. Verifique sua conexão.");
      console.error("Erro ao deletar post:", err);
    }
  };

  const toggleSelectPost = (postId: string) => {
    setSelectedPostIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (posts: RadarPostData[]) => {
    if (selectedPostIds.size === posts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(posts.map(p => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPostIds.size === 0) return;

    if (!confirm(`Tem certeza que deseja deletar ${selectedPostIds.size} post(s) selecionado(s)?`)) {
      return;
    }

    setError(null);
    setFeedback(null);

    try {
      const deletePromises = Array.from(selectedPostIds).map(postId =>
        fetch(`/api/intelligence/posts/${postId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId,
          }),
        })
      );

      await Promise.all(deletePromises);
      setSelectedPostIds(new Set());
      refreshWithFeedback(`${selectedPostIds.size} post(s) deletado(s) com sucesso!`);
    } catch (err) {
      setError("Erro ao deletar posts. Verifique sua conexão.");
      console.error("Erro ao deletar posts:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex gap-6 border-b border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`whitespace-nowrap px-1 pb-3 text-sm transition-colors ${
            activeTab === "overview"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-muted hover:text-text"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("competitors")}
          className={`whitespace-nowrap px-1 pb-3 text-sm transition-colors ${
            activeTab === "competitors"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-muted hover:text-text"
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
          className={`whitespace-nowrap px-1 pb-3 text-sm transition-colors ${
            activeTab === "radar"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-muted hover:text-text"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Radar className="h-4 w-4" />
            Content Radar
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`whitespace-nowrap px-1 pb-3 text-sm transition-colors ${
            activeTab === "saved"
              ? "border-b-2 border-primary text-primary font-medium"
              : "text-muted hover:text-text"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BookMarked className="h-4 w-4" />
            Salvos ({savedPosts.size})
          </div>
        </button>
      </div>

      {feedback ? (
        <div className="rounded-md border border-success bg-success-light px-4 py-3 text-sm text-success flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {feedback}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFeedback(null);
              router.refresh();
            }}
            className="text-success hover:text-success"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar dados
          </Button>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-danger bg-danger-light px-4 py-3 text-sm text-danger flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {error}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-danger hover:text-danger"
          >
            Fechar
          </Button>
        </div>
      ) : null}

      {/* Overview Tab */}
      {activeTab === "overview" ? (
        <div className="space-y-6">
          {/* Métricas principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted">Posts Coletados</p>
                    <p className="text-2xl font-bold tabular-nums text-text">
                      {overviewMetrics.totalPosts}
                    </p>
                    <p className="text-xs text-muted">Última semana</p>
                  </div>
                  <div className="rounded-full bg-primary-light p-3">
                    <Radar className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted">Engajamento Médio</p>
                    <p className="text-2xl font-bold tabular-nums text-text">
                      {formatNumber(overviewMetrics.avgEngagement)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>Acima da média</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-success-light p-3">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted">Posts Virais</p>
                    <p className="text-2xl font-bold tabular-nums text-text">
                      {overviewMetrics.viralPosts}
                    </p>
                    <p className="text-xs text-muted">Score &gt; {overviewMetrics.viralThreshold}</p>
                  </div>
                  <div className="rounded-full bg-danger-light p-3">
                    <Zap className="h-5 w-5 text-danger" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted">Concorrentes</p>
                    <p className="text-2xl font-bold tabular-nums text-text">
                      {competitors.length}/3
                    </p>
                    <p className="text-xs text-muted">
                      Média: {formatNumber(overviewMetrics.competitorsAvg)}
                    </p>
                  </div>
                  <div className="rounded-full bg-warning-light p-3">
                    <Users className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performer */}
          {overviewMetrics.topCompetitor ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-warning fill-warning" />
                      Top Performer
                    </CardTitle>
                    <CardDescription>Concorrente com melhor desempenho</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab("competitors")}
                  >
                    Ver detalhes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg text-text">
                      {overviewMetrics.topCompetitor.name}
                    </p>
                    <p className="text-sm text-muted mt-1">
                      Última coleta: {formatRelativeTime(overviewMetrics.topCompetitor.lastCollectedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary tabular-nums">
                      {formatNumber(overviewMetrics.topCompetitor.avgEngagement)}
                    </p>
                    <p className="text-xs text-muted mt-1">Engajamento médio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              <CardDescription>Acelere sua análise de intelligence</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                className="justify-start h-auto py-4"
                disabled={isCollectingKey === "radar"}
                onClick={() => handleCollectNow("radar")}
              >
                <div className="flex items-center gap-3 text-left">
                  <RefreshCw className={`h-5 w-5 ${isCollectingKey === "radar" ? "animate-spin" : ""}`} />
                  <div>
                    <p className="font-semibold text-sm">Coletar Posts Virais</p>
                    <p className="text-xs text-muted">Atualizar content radar</p>
                  </div>
                </div>
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="justify-start h-auto py-4"
                disabled={isCollectingKey === "competitor"}
                onClick={() => handleCollectNow("competitor")}
              >
                <div className="flex items-center gap-3 text-left">
                  <Target className={`h-5 w-5 ${isCollectingKey === "competitor" ? "animate-spin" : ""}`} />
                  <div>
                    <p className="font-semibold text-sm">Analisar Concorrentes</p>
                    <p className="text-xs text-muted">Coletar dados de todos</p>
                  </div>
                </div>
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="justify-start h-auto py-4"
                onClick={() => setActiveTab("radar")}
              >
                <div className="flex items-center gap-3 text-left">
                  <Sparkles className="h-5 w-5" />
                  <div>
                    <p className="font-semibold text-sm">Criar Conteúdo</p>
                    <p className="text-xs text-muted">Baseado em posts virais</p>
                  </div>
                </div>
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="justify-start h-auto py-4"
                onClick={() => setActiveTab("saved")}
              >
                <div className="flex items-center gap-3 text-left">
                  <BookMarked className="h-5 w-5" />
                  <div>
                    <p className="font-semibold text-sm">Ver Salvos</p>
                    <p className="text-xs text-muted">{savedPosts.size} posts e prompts</p>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Competitors Tab */}
      {activeTab === "competitors" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Gerenciar concorrentes</CardTitle>
                  <CardDescription>
                    Maximo de 3 concorrentes. {competitors.length}/3 cadastrados
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCollectingKey === "competitor"}
                  onClick={() => handleCollectNow("competitor")}
                >
                  <RefreshCw className={`h-4 w-4 ${isCollectingKey === "competitor" ? "animate-spin" : ""}`} />
                  {isCollectingKey === "competitor" ? "Coletando..." : "Coletar todos"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddCompetitor}>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-text" htmlFor="competitor-name">
                    Nome do concorrente
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
                  <Button type="submit" disabled={isSavingCompetitor || limitReached}>
                    {isSavingCompetitor ? "Salvando..." : limitReached ? "Limite atingido" : "Adicionar concorrente"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {competitors.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="py-16 text-center">
                  <Target className="h-12 w-12 text-muted-light mx-auto mb-4" />
                  <p className="text-base font-semibold text-text mb-2">Nenhum concorrente cadastrado</p>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Adicione até 3 concorrentes para monitorar performance e gerar insights automaticamente
                  </p>
                </CardContent>
              </Card>
            ) : (
              competitors.map((competitor, index) => (
                <Card key={competitor.id} className="relative overflow-hidden rounded-xl border border-border bg-card hover:border-border-strong transition-colors">
                  {/* Badge de ranking */}
                  {index === 0 ? (
                    <div className="absolute top-3 right-3">
                      <div className="rounded-full bg-warning-light px-2 py-1 flex items-center gap-1">
                        <Star className="h-3 w-3 text-warning fill-warning" />
                        <span className="text-xs font-medium text-warning">Top</span>
                      </div>
                    </div>
                  ) : null}

                  <CardHeader className="space-y-2 pb-3 p-6">
                    <div className="text-base font-semibold text-text line-clamp-1 pr-12">{competitor.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-light">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(competitor.lastCollectedAt)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Métrica principal */}
                    <div className="rounded-lg bg-gradient-to-br from-primary-light to-background p-4">
                      <p className="text-xs font-medium text-muted mb-1">Engajamento médio</p>
                      <p className="text-3xl font-bold tabular-nums text-primary">
                        {formatNumber(competitor.avgEngagement)}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-success">
                        <TrendingUp className="h-3 w-3" />
                        <span>Performance positiva</span>
                      </div>
                    </div>

                    {/* Links sociais */}
                    {(competitor.instagramUrl || competitor.linkedinUrl || competitor.websiteUrl) ? (
                      <div className="flex flex-wrap gap-2">
                        {competitor.instagramUrl ? (
                          <a
                            href={competitor.instagramUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Instagram
                          </a>
                        ) : null}
                        {competitor.linkedinUrl ? (
                          <a
                            href={competitor.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            LinkedIn
                          </a>
                        ) : null}
                        {competitor.websiteUrl ? (
                          <a
                            href={competitor.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Insight da IA */}
                    <div className="rounded-md bg-background p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-medium text-text">Insight da IA</p>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted leading-relaxed">
                        {competitor.latestInsight ?? "Execute uma coleta para gerar insights automáticos sobre este concorrente"}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
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
                        Coletar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCompetitor(competitor.id)}
                        className="text-danger hover:text-danger hover:bg-danger-light"
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
      ) : null}

      {/* Radar Tab */}
      {activeTab === "radar" ? (
        <div className="space-y-6">
          {/* Filtros e busca */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Content Radar</CardTitle>
                    <CardDescription>
                      {filteredPosts.length} posts • Viral acima de {overviewMetrics.viralThreshold}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => setShowAddPostModal(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Adicionar Post
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4" />
                      Filtros
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isCollectingKey === "radar"}
                      onClick={() => handleCollectNow("radar")}
                    >
                      <RefreshCw className={`h-4 w-4 ${isCollectingKey === "radar" ? "animate-spin" : ""}`} />
                      {isCollectingKey === "radar" ? "Coletando..." : "Atualizar"}
                    </Button>
                  </div>
                </div>

                {/* Barra de busca sempre visível */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-light" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 w-full pl-10 pr-3 rounded-md border border-border bg-card text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Buscar por conteúdo..."
                  />
                </div>

                {/* Filtros expansíveis */}
                {showFilters ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted">Plataforma</label>
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
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted">Ordenar por</label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={sortBy === "engagement" ? "default" : "secondary"}
                          size="sm"
                          onClick={() => setSortBy("engagement")}
                        >
                          Engajamento
                        </Button>
                        <Button
                          type="button"
                          variant={sortBy === "recent" ? "default" : "secondary"}
                          size="sm"
                          onClick={() => setSortBy("recent")}
                        >
                          Recentes
                        </Button>
                        <Button
                          type="button"
                          variant={sortBy === "viral" ? "default" : "secondary"}
                          size="sm"
                          onClick={() => setSortBy("viral")}
                        >
                          Viralidade
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardHeader>
          </Card>

          {/* Controles de seleção */}
          {filteredPosts.length > 0 ? (
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPostIds.size === filteredPosts.length && filteredPosts.length > 0}
                      onChange={() => toggleSelectAll(filteredPosts)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-muted">
                      {selectedPostIds.size > 0
                        ? `${selectedPostIds.size} post(s) selecionado(s)`
                        : "Selecionar todos"}
                    </span>
                  </div>
                  {selectedPostIds.size > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="text-danger hover:text-danger hover:bg-danger-light"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deletar selecionados
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Grid de posts */}
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Radar className="h-12 w-12 text-muted-light mx-auto mb-4" />
                <p className="text-base font-semibold text-text mb-2">Nenhum post encontrado</p>
                <p className="text-sm text-muted max-w-md mx-auto mb-6">
                  {searchTerm || platformFilter !== "all"
                    ? "Tente ajustar os filtros ou buscar por outros termos"
                    : "Execute uma coleta para começar a identificar conteúdos virais"}
                </p>
                {!searchTerm && platformFilter === "all" ? (
                  <Button
                    type="button"
                    disabled={isCollectingKey === "radar"}
                    onClick={() => handleCollectNow("radar")}
                  >
                    <RefreshCw className={`h-4 w-4 ${isCollectingKey === "radar" ? "animate-spin" : ""}`} />
                    Executar coleta
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPosts.map((post, index) => {
                const isViral = post.engagementScore >= overviewMetrics.viralThreshold;
                const isSaved = savedPosts.has(post.id);

                return (
                  <Card key={post.id} className="group hover:shadow-dropdown transition-all duration-200">
                    <CardContent className="p-5">
                      {/* Header do post */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPostIds.has(post.id)}
                            onChange={() => toggleSelectPost(post.id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="rounded-full bg-primary-light p-2">
                            <Hash className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text">
                              #{index + 1} • {formatPlatform(post.platform)}
                            </p>
                            <p className="text-xs text-muted">{formatRelativeTime(post.collectedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isViral ? (
                            <span className="rounded-full bg-danger-light px-2 py-1 text-xs font-medium text-danger flex items-center gap-1">
                              <Zap className="h-3 w-3 fill-danger" />
                              Viral
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggleSavePost(post.id)}
                            className={`rounded-full p-1.5 transition-colors ${
                              isSaved
                                ? "bg-warning-light text-warning"
                                : "bg-background text-muted hover:bg-warning-light hover:text-warning"
                            }`}
                          >
                            <Star className={`h-4 w-4 ${isSaved ? "fill-warning" : ""}`} />
                          </button>
                        </div>
                      </div>

                      {/* Conteúdo do post */}
                      <p className="line-clamp-3 text-sm text-text mb-4 leading-relaxed">
                        {post.content ?? "Sem conteúdo"}
                      </p>

                      {/* Métricas */}
                      <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-md bg-background">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-danger mb-1">
                            <Heart className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-semibold tabular-nums text-text">
                            {formatNumber(post.likesCount)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-primary mb-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-semibold tabular-nums text-text">
                            {formatNumber(post.commentsCount)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-success mb-1">
                            <Share2 className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-semibold tabular-nums text-text">
                            {formatNumber(post.sharesCount)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-warning mb-1">
                            <Activity className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-semibold tabular-nums text-text">
                            {formatNumber(post.engagementScore)}
                          </p>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          onClick={() => openContentModal(post)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Criar conteúdo
                        </Button>
                        {post.postUrl ? (
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button type="button" variant="ghost" size="sm">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-danger hover:text-danger hover:bg-danger-light"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Saved Tab */}
      {activeTab === "saved" ? (
        <div className="space-y-6">
          {/* Posts salvos */}
          <Card>
            <CardHeader>
              <CardTitle>Posts Salvos ({savedPosts.size})</CardTitle>
              <CardDescription>Sua biblioteca de referências inspiradoras</CardDescription>
            </CardHeader>
            <CardContent>
              {savedPosts.size === 0 ? (
                <div className="py-12 text-center">
                  <BookmarkPlus className="h-12 w-12 text-muted-light mx-auto mb-4" />
                  <p className="text-base font-semibold text-text mb-2">Nenhum post salvo ainda</p>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Salve posts interessantes clicando na estrela para acessá-los facilmente depois
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {radarPosts
                    .filter((post) => savedPosts.has(post.id))
                    .map((post) => (
                      <div
                        key={post.id}
                        className="rounded-lg border border-border bg-card p-4 hover:shadow-card transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-sm font-semibold text-text">
                            {formatPlatform(post.platform)}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleSavePost(post.id)}
                            className="text-warning"
                          >
                            <Star className="h-4 w-4 fill-warning" />
                          </button>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted mb-3">
                          {post.content ?? "Sem conteúdo"}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" onClick={() => openContentModal(post)}>
                            <Sparkles className="h-3.5 w-3.5" />
                            Usar
                          </Button>
                          {post.postUrl ? (
                            <a href={post.postUrl} target="_blank" rel="noreferrer">
                              <Button type="button" variant="ghost" size="sm">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prompts salvos */}
          <Card>
            <CardHeader>
              <CardTitle>Prompts Salvos ({savedPrompts.length})</CardTitle>
              <CardDescription>Biblioteca de prompts para reutilização</CardDescription>
            </CardHeader>
            <CardContent>
              {savedPrompts.length === 0 ? (
                <div className="py-12 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-light mx-auto mb-4" />
                  <p className="text-base font-semibold text-text mb-2">Nenhum prompt salvo</p>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Salve seus melhores prompts ao criar conteúdo para reutilizá-los depois
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm text-text">{prompt.title}</p>
                          <p className="text-xs text-muted">{formatDate(prompt.createdAt)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(prompt.content);
                              setFeedback("Prompt copiado!");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        {prompt.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted">{prompt.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Modal de adicionar post manualmente */}
      {showAddPostModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !isAddingPost && setShowAddPostModal(false)}
        >
          <Card
            className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgba(28,25,23,0.12)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Adicionar Post Viral
                  </CardTitle>
                  <CardDescription className="mt-1 text-muted">
                    Adicione posts que você viu viralizando para usar como referência
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPostModal(false)}
                  disabled={isAddingPost}
                  className="rounded-lg p-1.5 text-muted-light hover:text-text hover:bg-sidebar transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleAddPost} className="space-y-4">
                {/* Plataforma */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Plataforma</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAddPostForm((prev) => ({ ...prev, platform: "instagram" }))}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        addPostForm.platform === "instagram"
                          ? "bg-primary text-white"
                          : "bg-background text-text hover:bg-border"
                      }`}
                    >
                      Instagram
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddPostForm((prev) => ({ ...prev, platform: "linkedin" }))}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        addPostForm.platform === "linkedin"
                          ? "bg-primary text-white"
                          : "bg-background text-text hover:bg-border"
                      }`}
                    >
                      LinkedIn
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddPostForm((prev) => ({ ...prev, platform: "tiktok" }))}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        addPostForm.platform === "tiktok"
                          ? "bg-primary text-white"
                          : "bg-background text-text hover:bg-border"
                      }`}
                    >
                      TikTok
                    </button>
                  </div>
                </div>

                {/* URL (opcional) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text" htmlFor="post-url">
                    URL do Post (opcional)
                  </label>
                  <input
                    id="post-url"
                    type="url"
                    value={addPostForm.postUrl}
                    onChange={(e) => setAddPostForm((prev) => ({ ...prev, postUrl: e.target.value }))}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://instagram.com/p/..."
                  />
                  <p className="text-xs text-muted">Cole o link do post original (opcional)</p>
                </div>

                {/* Conteúdo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text" htmlFor="post-content">
                    Conteúdo do Post *
                  </label>
                  <textarea
                    id="post-content"
                    value={addPostForm.content}
                    onChange={(e) => setAddPostForm((prev) => ({ ...prev, content: e.target.value }))}
                    className="min-h-[120px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Cole ou digite o conteúdo do post..."
                    required
                  />
                  <p className="text-xs text-muted">
                    Mínimo 10 caracteres • {addPostForm.content.length} caracteres
                  </p>
                </div>

                {/* Métricas */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Métricas</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted" htmlFor="likes">
                        Likes
                      </label>
                      <input
                        id="likes"
                        type="number"
                        min="0"
                        value={addPostForm.likesCount}
                        onChange={(e) =>
                          setAddPostForm((prev) => ({
                            ...prev,
                            likesCount: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted" htmlFor="comments">
                        Comentários
                      </label>
                      <input
                        id="comments"
                        type="number"
                        min="0"
                        value={addPostForm.commentsCount}
                        onChange={(e) =>
                          setAddPostForm((prev) => ({
                            ...prev,
                            commentsCount: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted" htmlFor="shares">
                        Compartilhamentos
                      </label>
                      <input
                        id="shares"
                        type="number"
                        min="0"
                        value={addPostForm.sharesCount}
                        onChange={(e) =>
                          setAddPostForm((prev) => ({
                            ...prev,
                            sharesCount: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    Score calculado: {addPostForm.likesCount + addPostForm.commentsCount * 2 + addPostForm.sharesCount * 3}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAddPostModal(false)}
                    disabled={isAddingPost}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isAddingPost || addPostForm.content.trim().length < 10}>
                    {isAddingPost ? "Adicionando..." : "Adicionar Post"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Modal de criação de conteúdo */}
      {selectedPost ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <Card
            className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgba(28,25,23,0.12)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Criar Conteúdo com IA
                  </CardTitle>
                  <CardDescription className="mt-1 text-muted">
                    Base: {formatPlatform(selectedPost.platform)} • Score {formatNumber(selectedPost.engagementScore)}
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

            <CardContent className="space-y-4 pt-6">
              {/* Seletor de template */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Template de Prompt</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PROMPT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateChange(template)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        selectedTemplate.id === template.id
                          ? "bg-primary text-white"
                          : "bg-background text-text hover:bg-border"
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post de referência */}
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-medium text-muted mb-2">Post de Referência</p>
                <p className="text-sm text-text line-clamp-3 mb-3">
                  {selectedPost.content ?? "Sem conteúdo"}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {formatNumber(selectedPost.likesCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {formatNumber(selectedPost.commentsCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    {formatNumber(selectedPost.sharesCount)}
                  </span>
                </div>
              </div>

              {/* Editor de prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text">Prompt Personalizado</label>
                <textarea
                  value={promptText}
                  onChange={(event) => setPromptText(event.target.value)}
                  className="min-h-[300px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  placeholder="Edite o prompt conforme necessário..."
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={handleSavePrompt}>
                  <BookmarkPlus className="h-4 w-4" />
                  Salvar prompt
                </Button>
                <Button type="button" variant="secondary" onClick={handleCopyPrompt}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button type="button" onClick={closeModal}>
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
