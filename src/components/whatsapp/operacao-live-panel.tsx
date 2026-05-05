/**
 * Arquivo: src/components/whatsapp/operacao-live-panel.tsx
 * Propósito: Painel ao vivo da aba Operação. Client Component que pollinga
 *            /api/whatsapp/live-operation a cada 30s e renderiza:
 *              - Hero "Cliente esquecido AGORA" (cronômetro + nome)
 *              - Trilho lateral com outras conversas em risco
 *              - Grid de operadores com workload
 *
 *            Polling com setInterval (zero deps novas). Hero animado: cor
 *            âmbar/vermelho conforme severity, ponto pulsando no eyebrow.
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Loader2,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  ConversationSeverity,
  LiveOperationData,
  OperatorWorkload,
  WaitingConversation,
} from "@/lib/whatsapp/live-operation";

type LiveOperationContext = {
  currentUserId: string;
  companyId: string;
};

const POLL_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1_000; // pra cronômetro contar localmente entre polls

// =============================================================================
// Helpers de formatação
// =============================================================================

/** Formato "longo" pra waits >= 24h — substitui o cronometro h:mm:ss
 *  por uma narrativa "Há N dias" porque o numero absurdo nao agrega
 *  decisao (cliente abandonado != cliente em espera ativa). */
function formatLongWait(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  if (days >= 1) {
    return `Há ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  return `Há ${hours} h`;
}

function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const LONG_WAIT_THRESHOLD_SECONDS = 86400; // 24h
const DATETIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formata "desde dd/MM às HH:mm" pro subtitle do cronometro longo. */
function formatSinceLabel(isoTimestamp: string): string {
  return `desde ${DATETIME_FORMATTER.format(new Date(isoTimestamp))}`;
}

function formatCompact(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatRelative(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "agora";
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 30) return "agora";
  if (seconds < 90) return "1min";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  return `${Math.floor(seconds / 3600)}h`;
}

/** Beep curto via Web Audio API. Pure JS, sem asset externo. */
function playAlertChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Dois tons rápidos descendentes (efeito "alerta")
    const playTone = (freq: number, startSec: number, durSec: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + startSec);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + startSec + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + startSec + durSec,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startSec);
      osc.stop(ctx.currentTime + startSec + durSec + 0.02);
    };
    playTone(880, 0, 0.15);
    playTone(660, 0.18, 0.18);
    // Cleanup do contexto após ~600ms
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Audio bloqueado ou não suportado — falha silenciosa
  }
}

/** Formata "Atualizado X" sem o "atrás" final que dobrava com 'agora'. */
function formatLastFetched(date: Date): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 30) return "Atualizado agora";
  if (diffSec < 90) return "Atualizado há 1 minuto";
  if (diffSec < 3600) return `Atualizado há ${Math.floor(diffSec / 60)} min`;
  return `Atualizado há ${Math.floor(diffSec / 3600)} h`;
}

/** Formata preview de mensagem com indicador visual de tipo de mídia. */
function formatMessagePreview(
  content: string | null,
  messageType: string | null,
): string | null {
  // Mensagem de texto com conteúdo: usa o conteúdo direto.
  if (content && content.trim().length > 0) {
    return content.length > 80 ? `${content.slice(0, 80)}…` : content;
  }
  // Sem texto: tenta inferir o tipo de mídia.
  switch (messageType) {
    case "audio":
    case "ptt":
    case "voice":
      return "🎤 Mensagem de áudio";
    case "image":
    case "photo":
      return "📷 Foto";
    case "video":
      return "🎥 Vídeo";
    case "document":
    case "file":
      return "📎 Documento";
    case "sticker":
      return "✨ Sticker";
    case "location":
      return "📍 Localização";
    case "contact":
    case "vcard":
      return "👤 Contato";
    default:
      return null;
  }
}

/** Iniciais a partir de um nome ("Maria Silva" → "MS"). */
function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (
    (parts[0][0]?.toUpperCase() ?? "") +
    (parts[parts.length - 1][0]?.toUpperCase() ?? "")
  );
}

// =============================================================================
// Componente principal
// =============================================================================

export function OperacaoLivePanel() {
  const { toast } = useToast();
  const [data, setData] = useState<LiveOperationData | null>(null);
  const [context, setContext] = useState<LiveOperationContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [pendingActionConvId, setPendingActionConvId] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // re-render pra atualizar cronômetro
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const previousRedSetRef = useRef<Set<string>>(new Set());

  // Função reutilizável de fetch — fora do useEffect pra ser chamada após ações.
  const fetchData = useCallback(async (): Promise<void> => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/whatsapp/live-operation", {
        method: "GET",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        data?: LiveOperationData;
        context?: LiveOperationContext;
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? "Falha ao carregar painel ao vivo.");
      } else if (json.data) {
        setData(json.data);
        if (json.context) setContext(json.context);
        setError(null);
        setLastFetchedAt(new Date());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha de rede.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Handler "Assumir conversa" — atribui pra usuário atual via API existente.
  const handleAssumeConversation = useCallback(
    async (conversationId: string) => {
      if (!context) return;
      setPendingActionConvId(conversationId);
      try {
        const res = await fetch("/api/whatsapp/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: context.companyId,
            conversationId,
            assignedTo: context.currentUserId,
          }),
        });
        const json = (await res.json()) as { error?: string; message?: string };
        if (!res.ok) {
          toast({
            title: "Não foi possível assumir",
            description: json.error ?? "Tente novamente em alguns segundos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conversa assumida",
            description: "Você é o novo responsável. Atualizando painel...",
          });
          // Refetch imediato pra UI refletir
          await fetchData();
        }
      } catch (e) {
        toast({
          title: "Erro de rede",
          description: e instanceof Error ? e.message : "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setPendingActionConvId(null);
      }
    },
    [context, fetchData, toast],
  );

  // Handler "Avisar [Operador]" — cria notificação in-app via
  //   /api/whatsapp/operator-nudges. O operador vê o aviso no sino do topbar
  //   na próxima vez que abrir qualquer página do Axiomix.
  const handleNudgeOperator = useCallback(
    async (conversation: WaitingConversation) => {
      if (!conversation.assigneeId) {
        toast({
          title: "Sem atendente atribuído",
          description: "Atribua a conversa a alguém antes de avisar.",
          variant: "destructive",
        });
        return;
      }
      setPendingActionConvId(conversation.conversationId);
      try {
        const res = await fetch("/api/whatsapp/operator-nudges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.conversationId,
            toUserId: conversation.assigneeId,
            customerName: conversation.customerName,
            waitSeconds: conversation.waitSeconds,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast({
            title: "Não foi possível avisar",
            description: json.error ?? "Tente novamente em alguns segundos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: `${conversation.assigneeName ?? "Atendente"} foi notificado`,
            description: "O aviso aparece no sino do topbar dele.",
          });
        }
      } catch (e) {
        toast({
          title: "Erro de rede",
          description: e instanceof Error ? e.message : "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setPendingActionConvId(null);
      }
    },
    [toast],
  );

  // Fetch inicial + polling
  useEffect(() => {
    let mounted = true;

    void fetchData();

    if (isPaused) return () => {
      mounted = false;
    };

    const interval = setInterval(() => {
      if (mounted) void fetchData();
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isPaused, fetchData]);

  // Tick local pra cronômetro contar entre polls
  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => setTick((v) => v + 1), TICK_INTERVAL_MS);
    return () => clearInterval(t);
  }, [isPaused]);

  // Detecção de transição pra vermelho — toca beep + vibra quando uma
  // conversa nova entra em severity=red. Só age se alertsEnabled (toggle do
  // gestor) — autoplay sem gesto do usuário é bloqueado pelos browsers.
  useEffect(() => {
    if (!data) return;
    const currentRedSet = new Set<string>();
    if (data.mostForgotten?.severity === "red") {
      currentRedSet.add(data.mostForgotten.conversationId);
    }
    for (const item of data.inRiskQueue) {
      if (item.severity === "red") currentRedSet.add(item.conversationId);
    }

    // Detecta novidades (red conversa que não estava no set anterior)
    let hasNew = false;
    for (const id of currentRedSet) {
      if (!previousRedSetRef.current.has(id)) {
        hasNew = true;
        break;
      }
    }

    if (hasNew && alertsEnabled) {
      playAlertChime();
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.([200, 100, 200]);
        }
      } catch {
        // Vibração silenciosa se a API não estiver disponível
      }
    }

    previousRedSetRef.current = currentRedSet;
  }, [data, alertsEnabled]);

  // Cronômetro local: usa o waitSeconds do server como base (já respeita
  // business_hours) e adiciona o delta local desde o último poll APENAS
  // se a loja está aberta agora. Quando fechada, mostra o valor congelado
  // do server — cronômetro pausa visualmente.
  const computeWaitNow = (
    lastInboundAt: string,
    serverWaitSeconds: number,
  ): number => {
    if (!data?.isCurrentlyOpen) return serverWaitSeconds;
    const fetchTime = lastFetchedAt?.getTime() ?? Date.now();
    const localDelta = Math.floor((Date.now() - fetchTime) / 1000);
    return serverWaitSeconds + Math.max(0, localDelta);
  };

  if (error && !data) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-light/40 p-6">
        <p className="text-sm text-danger font-medium">Erro ao carregar painel</p>
        <p className="mt-1 text-xs text-muted">{error}</p>
        <button
          onClick={() => setIsPaused(false)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-surface-2"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="skeleton-shimmer animate-shimmer h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Suprime warning de tick não usado — o setState força re-render do cronômetro.
  void tick;

  return (
    <div className="space-y-4">
      <PollingHeader
        lastFetchedAt={lastFetchedAt}
        isFetching={isFetching}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((p) => !p)}
        totalWaiting={data.totalWaiting}
        isCurrentlyOpen={data.isCurrentlyOpen}
        hasBusinessHours={data.hasBusinessHours}
        alertsEnabled={alertsEnabled}
        onToggleAlerts={() => {
          // Primeiro click: ativa + dispara um chime curto pra confirmar
          // (ao mesmo tempo desbloqueia autoplay no Chrome via gesto do user).
          if (!alertsEnabled) playAlertChime();
          setAlertsEnabled((v) => !v);
        }}
      />

      {data.hasBusinessHours && !data.isCurrentlyOpen ? <ClosedBanner /> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          {data.mostForgotten ? (
            <HeroCard
              conversation={data.mostForgotten}
              currentWaitSeconds={computeWaitNow(
                data.mostForgotten.lastInboundAt,
                data.mostForgotten.waitSeconds,
              )}
              amberSeconds={data.thresholds.amberSeconds}
              redSeconds={data.thresholds.redSeconds}
              isPending={pendingActionConvId === data.mostForgotten.conversationId}
              onAssume={handleAssumeConversation}
              onNudge={handleNudgeOperator}
            />
          ) : (
            <EmptyHero />
          )}
        </div>

        <QueueCard
          queue={data.inRiskQueue}
          computeWaitNow={computeWaitNow}
        />
      </div>

      <OperatorsGrid operators={data.operators} />
    </div>
  );
}

// =============================================================================
// Header com status de polling
// =============================================================================

function PollingHeader({
  lastFetchedAt,
  isFetching,
  isPaused,
  onTogglePause,
  totalWaiting,
  isCurrentlyOpen,
  hasBusinessHours,
  alertsEnabled,
  onToggleAlerts,
}: {
  lastFetchedAt: Date | null;
  isFetching: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  totalWaiting: number;
  isCurrentlyOpen: boolean;
  hasBusinessHours: boolean;
  alertsEnabled: boolean;
  onToggleAlerts: () => void;
}) {
  const showClosedPill = hasBusinessHours && !isCurrentlyOpen;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-muted">
          <Activity className="h-3 w-3" />
          Tempo quase-real · polling 30s
        </span>
        {showClosedPill ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-light/30 bg-surface-2 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-muted-light">
            <Moon className="h-3 w-3" />
            Loja fechada
          </span>
        ) : null}
        {totalWaiting > 0 ? (
          <span className="text-xs font-mono text-muted">
            {totalWaiting} {totalWaiting === 1 ? "cliente esperando" : "clientes esperando"}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-muted">
          {isFetching
            ? "Atualizando..."
            : lastFetchedAt
              ? formatLastFetched(lastFetchedAt)
              : "Aguardando..."}
        </span>
        <button
          onClick={onToggleAlerts}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
            alertsEnabled
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-soft,_rgba(250,94,36,0.1))]"
              : "border-border text-muted hover:bg-surface-2"
          }`}
          aria-label={alertsEnabled ? "Desativar alerta sonoro" : "Ativar alerta sonoro"}
          aria-pressed={alertsEnabled}
          title={
            alertsEnabled
              ? "Som ativado · toca beep + vibra quando aparecer cliente em vermelho"
              : "Som desativado · click pra ativar alerta sonoro"
          }
        >
          {alertsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onTogglePause}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted hover:bg-surface-2"
          aria-label={isPaused ? "Retomar polling" : "Pausar polling"}
          title={isPaused ? "Retomar polling" : "Pausar polling"}
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Hero card — cliente mais esquecido
// =============================================================================

function HeroCard({
  conversation,
  currentWaitSeconds,
  amberSeconds,
  redSeconds,
  isPending,
  onAssume,
  onNudge,
}: {
  conversation: WaitingConversation;
  currentWaitSeconds: number;
  amberSeconds: number;
  redSeconds: number;
  isPending: boolean;
  onAssume: (conversationId: string) => void;
  onNudge: (conversation: WaitingConversation) => void;
}) {
  const severity: ConversationSeverity =
    currentWaitSeconds >= redSeconds
      ? "red"
      : currentWaitSeconds >= amberSeconds
        ? "amber"
        : "ok";

  const bgClass =
    severity === "red"
      ? "bg-gradient-to-br from-card to-danger-light/60 border-danger/30"
      : severity === "amber"
        ? "bg-gradient-to-br from-card to-warning-light/60 border-warning/30"
        : "bg-card border-border";

  const eyebrowText =
    severity === "red"
      ? "▲ Cliente prestes a desistir"
      : severity === "amber"
        ? "⚠ Cliente esquecido"
        : "Cliente esperando há mais tempo";

  const eyebrowColor =
    severity === "red"
      ? "text-danger"
      : severity === "amber"
        ? "text-warning"
        : "text-muted";

  const timerColor =
    severity === "red"
      ? "text-danger"
      : severity === "amber"
        ? "text-warning"
        : "text-text";

  const buttonClass =
    severity === "red"
      ? "bg-danger hover:bg-danger/90 text-white"
      : severity === "amber"
        ? "bg-primary hover:bg-primary-hover text-white"
        : "bg-card border border-border hover:bg-surface-2 text-text";

  const buttonLabel =
    severity === "red"
      ? "Assumir conversa agora"
      : severity === "amber"
        ? `Avisar ${conversation.assigneeName ?? "atendente"}`
        : "Ver conversa";

  return (
    <section className={`rounded-2xl border p-7 transition-colors ${bgClass}`}>
      <p
        className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowColor}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${severity === "ok" ? "bg-muted-light" : "bg-current animate-ax-breathe"}`}
        />
        {eyebrowText}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <CustomerAvatar
          name={conversation.customerName}
          avatarUrl={conversation.customerAvatar}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-bricolage text-2xl font-bold tracking-tight md:text-3xl text-text truncate">
            {conversation.customerName}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            com{" "}
            <strong className="font-medium text-text">
              {conversation.assigneeName ?? "operador não atribuído"}
            </strong>
            {conversation.pipelineStage ? (
              <span className="ml-2 inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                {conversation.pipelineStage}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {(() => {
        const preview = formatMessagePreview(
          conversation.lastMessage,
          conversation.lastMessageType,
        );
        return preview ? (
          <p className="mt-2 text-sm italic text-muted">&ldquo;{preview}&rdquo;</p>
        ) : null;
      })()}

      {currentWaitSeconds >= LONG_WAIT_THRESHOLD_SECONDS ? (
        // Espera longa (>=24h) — narrativa "Há N dias" + data exata.
        // Cronometro h:mm:ss perde sentido aqui (cliente ja foi).
        <div className="mt-4 flex flex-col gap-1">
          <span
            className={`font-bricolage text-4xl font-bold leading-tight tracking-tight md:text-5xl ${timerColor}`}
          >
            {formatLongWait(currentWaitSeconds)}
          </span>
          <span className="text-xs text-muted">
            <span className="uppercase tracking-[0.18em]">sem resposta</span>
            {" · "}
            <span className="font-mono">
              {formatSinceLabel(conversation.lastInboundAt)}
            </span>
          </span>
        </div>
      ) : (
        // Espera curta (<24h) — cronometro acionavel padrao h:mm:ss.
        <div className="mt-4 flex items-baseline gap-4">
          <span
            className={`font-mono text-6xl font-bold leading-none tracking-tight tabular-nums md:text-7xl ${timerColor}`}
          >
            {formatTimer(currentWaitSeconds)}
          </span>
          <span className="text-xs uppercase tracking-[0.18em] text-muted">
            sem resposta
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {severity === "red" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onAssume(conversation.conversationId)}
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${buttonClass}`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assumindo...
              </>
            ) : (
              <>
                {buttonLabel}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : severity === "amber" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onNudge(conversation)}
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${buttonClass}`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Avisando...
              </>
            ) : (
              <>
                {buttonLabel}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <Link
            href={`/whatsapp-intelligence/conversas/${conversation.conversationId}`}
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${buttonClass}`}
          >
            {buttonLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <Link
          href={`/whatsapp-intelligence/conversas/${conversation.conversationId}`}
          className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-medium text-text hover:bg-surface-2"
        >
          Ver conversa
        </Link>
      </div>
    </section>
  );
}

// =============================================================================
// Empty state — ninguém esperando
// =============================================================================

function EmptyHero() {
  return (
    <section className="rounded-2xl border border-border bg-card p-12 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-success-light/40 flex items-center justify-center">
        <span className="h-3.5 w-3.5 rounded-full bg-success animate-ax-breathe" />
      </div>
      <h2 className="mt-4 font-bricolage text-xl font-bold text-text">
        Tudo respondendo. Respira.
      </h2>
      <p className="mt-2 text-sm text-muted">
        Nenhum cliente esperando agora. O cronômetro acende sozinho quando alguém precisar.
      </p>
    </section>
  );
}

// =============================================================================
// Queue lateral — outras conversas em risco
// =============================================================================

function QueueCard({
  queue,
  computeWaitNow,
}: {
  queue: WaitingConversation[];
  computeWaitNow: (lastInboundAt: string, serverWaitSeconds: number) => number;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bricolage text-base font-bold text-text">
          Outras conversas em risco
        </h3>
        <span className="font-mono text-xs text-muted">{queue.length}</span>
      </div>
      <p className="mt-1 text-xs text-muted-light">
        Acima do limiar âmbar · ordenado por tempo
      </p>

      {queue.length === 0 ? (
        <p className="mt-6 text-center text-sm italic text-muted-light">
          Nenhuma outra em risco no momento.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {queue.map((item) => {
            const waitNow = computeWaitNow(item.lastInboundAt, item.waitSeconds);
            const dotClass =
              item.severity === "red"
                ? "bg-danger animate-ax-breathe"
                : item.severity === "amber"
                  ? "bg-warning"
                  : "bg-success";
            const timeClass =
              item.severity === "red"
                ? "text-danger"
                : item.severity === "amber"
                  ? "text-warning"
                  : "text-muted";
            return (
              <li key={item.conversationId} className="flex items-center gap-3 py-2.5">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} />
                <CustomerAvatar
                  name={item.customerName}
                  avatarUrl={item.customerAvatar}
                  size="sm"
                />
                <Link
                  href={`/whatsapp-intelligence/conversas/${item.conversationId}`}
                  className="flex-1 min-w-0 hover:underline"
                >
                  <p className="truncate text-sm font-medium text-text">
                    {item.customerName}
                    {item.customerPhone ? (
                      <span className="ml-1.5 font-mono text-[10px] font-normal text-muted-light">
                        {item.customerPhone}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    com {item.assigneeName ?? "não atribuído"}
                    {item.pipelineStage ? (
                      <span className="ml-1.5 text-muted-light">
                        · {item.pipelineStage}
                      </span>
                    ) : null}
                    {(() => {
                      const preview = formatMessagePreview(
                        item.lastMessage,
                        item.lastMessageType,
                      );
                      return preview ? (
                        <span className="ml-1.5 italic text-muted-light">
                          · &ldquo;{preview}&rdquo;
                        </span>
                      ) : null;
                    })()}
                  </p>
                </Link>
                <span
                  className={`flex-shrink-0 font-mono text-xs font-semibold tabular-nums ${timeClass}`}
                >
                  {formatCompact(waitNow)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// =============================================================================
// Grid de operadores
// =============================================================================

function OperatorsGrid({ operators }: { operators: OperatorWorkload[] }) {
  if (operators.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h3 className="font-bricolage text-base font-bold text-text">
          Operadores agora
        </h3>
        <span className="font-mono text-xs text-muted">
          {operators.length} {operators.length === 1 ? "ativo" : "ativos"} · ordenado por urgência
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {operators.map((op) => (
          <OperatorCard key={op.operatorId ?? "unassigned"} operator={op} />
        ))}
      </div>
    </section>
  );
}

function OperatorCard({ operator }: { operator: OperatorWorkload }) {
  const borderClass =
    operator.severity === "red"
      ? "border-danger/30 bg-danger-light/30"
      : operator.severity === "amber"
        ? "border-warning/30 bg-warning-light/30"
        : "border-border bg-card";

  const dotClass =
    operator.severity === "red"
      ? "bg-danger animate-ax-breathe"
      : operator.severity === "amber"
        ? "bg-warning"
        : "bg-success";

  const timeClass =
    operator.severity === "red"
      ? "text-danger"
      : operator.severity === "amber"
        ? "text-warning"
        : "text-muted-light";

  const initials = (operator.operatorName ?? "??")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "??";

  const displayName = operator.operatorName ?? "Não atribuído";

  return (
    <article className={`rounded-xl border p-4 ${borderClass}`}>
      <header className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 font-bricolage text-xs font-bold text-text">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{displayName}</p>
          {operator.worstCustomerName ? (
            <p className="truncate text-[11px] text-muted">
              com {operator.worstCustomerName}
            </p>
          ) : (
            <p className="truncate text-[11px] text-muted-light">livre</p>
          )}
        </div>
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`} />
      </header>

      <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-muted-light">
        Pior conversa
      </p>
      <p className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${timeClass}`}>
        {operator.worstWaitSeconds !== null
          ? formatCompact(operator.worstWaitSeconds)
          : "—"}
      </p>

      <div className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted">
        {operator.activeCount} {operator.activeCount === 1 ? "ativa" : "ativas"}
      </div>
    </article>
  );
}

// =============================================================================
// Avatar do cliente · usa imagem se disponível, senão iniciais com cor estável
// =============================================================================

const AVATAR_PALETTE = [
  "bg-rose-500/20 text-rose-700 dark:text-rose-300",
  "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  "bg-violet-500/20 text-violet-700 dark:text-violet-300",
  "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300",
];

/** Cor estável determinística a partir do nome (mesmo cliente sempre mesma cor). */
function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function CustomerAvatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "md"
        ? "h-9 w-9 text-xs"
        : "h-12 w-12 text-sm";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} flex-shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center rounded-full font-bricolage font-bold ${paletteFor(name)}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </div>
  );
}

// =============================================================================
// Banner "Loja fechada" — exclusão de janela em ação
// =============================================================================

function ClosedBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-muted-light/30 bg-surface-2 p-4">
      <Moon
        className="h-5 w-5 flex-shrink-0 text-muted-light"
        aria-hidden="true"
      />
      <div className="flex-1 text-sm">
        <p className="font-medium text-text">Loja fora do horário</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          O cronômetro está pausado. Clientes esperando agora não estão sendo
          contabilizados — quando a operação reabrir, o tempo retoma de onde
          parou.
        </p>
      </div>
    </div>
  );
}
