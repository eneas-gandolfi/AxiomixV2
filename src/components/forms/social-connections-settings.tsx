/**
 * Arquivo: src/components/forms/social-connections-settings.tsx
 * Propósito: Gerenciar conexão de redes sociais da empresa via Upload-Post.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon, PLATFORM_LABELS } from "@/components/social/platform-icons";

type SocialPlatform = "instagram" | "linkedin" | "tiktok" | "facebook";

type SocialConnection = {
  id: string;
  platform: SocialPlatform;
  status: "pending" | "connected" | "error";
  externalConnectionId?: string | null;
  accountName?: string | null;
  connectUrl?: string | null;
  connectedAt?: string | null;
  lastError?: string | null;
};

type UploadPostProfile = {
  id: string | null;
  name: string | null;
  status: "pending" | "connected" | "error" | null;
  createdAt: string | null;
};

type SocialConnectionsResponse = {
  role?: "owner" | "admin" | "member";
  companyName?: string;
  profile?: UploadPostProfile;
  integrationStatus?: {
    isActive: boolean;
    testStatus: "ok" | "error" | null;
    lastTestedAt: string | null;
  };
  uploadPostAccount?: {
    email: string | null;
    plan: string | null;
  } | null;
  connections?: SocialConnection[];
  error?: string;
};

type ConnectResponse = {
  profile?: Omit<UploadPostProfile, "createdAt">;
  connection?: SocialConnection;
  connectUrl?: string;
  testDetail?: string;
  error?: string;
};

function platformLabel(platform: SocialPlatform) {
  return PLATFORM_LABELS[platform] ?? platform;
}

function connectionStatusLabel(status: SocialConnection["status"]) {
  if (status === "connected") {
    return "Conectada";
  }
  if (status === "error") {
    return "Erro";
  }
  return "Pendente";
}

function connectionStatusClass(status: SocialConnection["status"]) {
  if (status === "connected") {
    return "text-success";
  }
  if (status === "error") {
    return "text-danger";
  }
  return "text-warning";
}

function profileStatusLabel(status: UploadPostProfile["status"]) {
  if (status === "connected") {
    return "Perfil ativo";
  }
  if (status === "error") {
    return "Perfil com erro";
  }
  if (status === "pending") {
    return "Perfil criado (aguardando conexão)";
  }
  return "Não criado";
}

function platformIcon(platform: SocialPlatform) {
  return <PlatformIcon platform={platform} className="h-4 w-4" />;
}

export function SocialConnectionsSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [profile, setProfile] = useState<UploadPostProfile>({
    id: null,
    name: null,
    status: null,
    createdAt: null,
  });
  const [role, setRole] = useState<"owner" | "admin" | "member">("member");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);
  const [uploadPostAccount, setUploadPostAccount] = useState<{
    email: string | null;
    plan: string | null;
  } | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const popupClosedWatcherRef = useRef<number | null>(null);
  const popupSyncWatcherRef = useRef<number | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);

  const stopPopupWatchers = () => {
    if (popupClosedWatcherRef.current !== null) {
      window.clearInterval(popupClosedWatcherRef.current);
      popupClosedWatcherRef.current = null;
    }
    if (popupSyncWatcherRef.current !== null) {
      window.clearInterval(popupSyncWatcherRef.current);
      popupSyncWatcherRef.current = null;
    }
    if (popupTimeoutRef.current !== null) {
      window.clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
  };

  const closePopupWindow = () => {
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.close();
    }
    popupWindowRef.current = null;
  };

  const applyConnectionsResponse = useCallback((response: SocialConnectionsResponse) => {
    setRole(response.role ?? "member");
    setProfile(
      response.profile ?? {
        id: null,
        name: null,
        status: null,
        createdAt: null,
      }
    );
    setConnections(response.connections ?? []);
    setUploadPostAccount(response.uploadPostAccount ?? null);
  }, []);

  const fetchConnections = useCallback(async (sync = false) => {
    const request = await fetch(`/api/settings/social/connections${sync ? "?sync=1" : ""}`, {
      cache: "no-store",
    });
    const response = (await request.json()) as SocialConnectionsResponse;

    if (!request.ok) {
      if (!sync) {
        setError(response.error ?? "Não foi possível carregar redes sociais.");
      }
      return;
    }

    applyConnectionsResponse(response);
    return response;
  }, [applyConnectionsResponse]);

  useEffect(() => {
    setIsLoading(true);
    void fetchConnections(false).finally(() => {
      setIsLoading(false);
    });
  }, [fetchConnections]);

  useEffect(() => {
    return () => {
      stopPopupWatchers();
      closePopupWindow();
    };
  }, [fetchConnections]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isModalOpen]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload =
        typeof event.data === "object" && event.data !== null
          ? (event.data as Record<string, unknown>)
          : null;

      if (!payload || payload.type !== "AXIOMIX_UPLOAD_POST_CONNECTED") {
        return;
      }

      const platform =
        payload.platform === "instagram" || payload.platform === "linkedin" || payload.platform === "tiktok" || payload.platform === "facebook"
          ? payload.platform
          : null;

      stopPopupWatchers();
      closePopupWindow();
      setConnectingPlatform(null);
      setIsModalOpen(false);

      if (!platform) {
        void fetchConnections(true);
        return;
      }

      void (async () => {
        const synced = await fetchConnections(true);
        const target = synced?.connections?.find((connection) => connection.platform === platform);

        if (target?.status === "connected") {
          const accountSuffix = target.accountName ? ` (${target.accountName})` : "";
          setFeedback(`${platformLabel(platform)} conectada com sucesso${accountSuffix}.`);
          return;
        }

        setFeedback(
          `A janela foi finalizada para ${platformLabel(platform)}, mas nenhuma conta foi confirmada na Upload-Post ainda.`
        );
      })();
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [fetchConnections]);

  const startPopupConnectionWatcher = (platform: SocialPlatform, popup: Window) => {
    stopPopupWatchers();
    popupWindowRef.current = popup;

    const syncAndCheckStatus = async () => {
      const synced = await fetchConnections(true);
      const target = synced?.connections?.find((connection) => connection.platform === platform);

      if (target?.status !== "connected") {
        return;
      }

      stopPopupWatchers();
      closePopupWindow();
      setConnectingPlatform(null);
      setFeedback(`${platformLabel(platform)} conectada com sucesso.`);
      setIsModalOpen(false);
      await fetchConnections(true);
    };

    void syncAndCheckStatus();

    popupSyncWatcherRef.current = window.setInterval(() => {
      void syncAndCheckStatus();
    }, 2500);

    popupClosedWatcherRef.current = window.setInterval(() => {
      if (!popupWindowRef.current || popupWindowRef.current.closed) {
        stopPopupWatchers();
        popupWindowRef.current = null;
        setConnectingPlatform(null);
        void fetchConnections(true);
      }
    }, 600);

    popupTimeoutRef.current = window.setTimeout(() => {
      stopPopupWatchers();
      setConnectingPlatform(null);
      setFeedback("Finalize a autorização na janela aberta para concluir a conexão.");
    }, 8 * 60 * 1000);
  };

  const connectPlatform = async (platform: SocialPlatform) => {
    stopPopupWatchers();
    closePopupWindow();
    setConnectingPlatform(platform);
    setError(null);
    setFeedback(null);

    const popup = window.open(
      "",
      `axiomix-social-connect-${platform}`,
      "width=540,height=760,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes,status=no"
    );

    if (!popup) {
      setConnectingPlatform(null);
      setError("Seu navegador bloqueou a janela de autorização. Libere pop-ups para continuar.");
      return;
    }

    popup.document.title = "Conectar rede social";
    popup.document.body.innerHTML =
      "<p style='font-family:system-ui;padding:20px'>Abrindo autorização...</p>";

    const request = await fetch("/api/settings/social/connections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform,
      }),
    });
    const response = (await request.json()) as ConnectResponse;

    if (!request.ok) {
      popup.close();
      setConnectingPlatform(null);
      setError(response.error ?? `Falha ao conectar ${platformLabel(platform)}.`);
      return;
    }

    if (!response.connectUrl) {
      popup.close();
      setConnectingPlatform(null);
      setError("A Upload-Post não retornou URL de autorização.");
      return;
    }

    if (response.profile) {
      setProfile((previous) => ({
        ...previous,
        id: response.profile?.id ?? previous.id,
        name: response.profile?.name ?? previous.name,
        status: response.profile?.status ?? previous.status,
      }));
    }

    if (response.connection) {
      const connection = response.connection;
      setConnections((previous) => {
        const map = new Map(previous.map((item) => [item.platform, item]));
        map.set(connection.platform, connection);
        return Array.from(map.values());
      });
    }

    popup.location.href = response.connectUrl;
    setFeedback(
      response.testDetail ??
        `Janela de autorização aberta para ${platformLabel(platform)}. Finalize a conexão nela.`
    );
    startPopupConnectionWatcher(platform, popup);
  };

  const connectedCount = connections.filter((item) => item.status === "connected").length;
  const isEditor = role === "owner" || role === "admin";

  if (isLoading) {
    return <p className="text-sm text-muted">Carregando conexões sociais...</p>;
  }

  return (
    <>
      <Card className="mt-4 max-w-3xl border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-text">Redes sociais</CardTitle>
          <CardDescription className="text-muted">
            Conecte Instagram, LinkedIn e TikTok ao perfil da sua empresa no Upload-Post.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium text-text">Perfil Upload-Post: {profileStatusLabel(profile.status)}</p>
            <p className="mt-1 text-xs text-muted">
              {profile.id ? `Profile ID: ${profile.id}` : "Perfil será criado automaticamente na primeira conexão."}
            </p>
            {uploadPostAccount?.email ? (
              <p className="mt-1 text-xs text-muted">
                Conta Upload-Post API: {uploadPostAccount.email}
                {uploadPostAccount.plan ? ` (${uploadPostAccount.plan})` : ""}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted">
              Redes conectadas: {connectedCount}/{connections.length || 3}
            </p>
          </div>

          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {(["instagram", "linkedin", "tiktok", "facebook"] as const).map((platform) => {
              const existing = connections.find((item) => item.platform === platform);
              return (
                <div key={platform} className="rounded-xl border border-border bg-card p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-text">
                    {platformIcon(platform)}
                    {platformLabel(platform)}
                  </p>
                  <p className={`mt-1 text-xs ${connectionStatusClass(existing?.status ?? "pending")}`}>
                    Status: {connectionStatusLabel(existing?.status ?? "pending")}
                  </p>
                  {existing?.accountName ? (
                    <p className="mt-1 text-xs text-muted">Conta: {existing.accountName}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {feedback ? (
            <p className="inline-flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              {feedback}
            </p>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => setIsModalOpen(true)} disabled={!isEditor}>
              <PlusCircle className="h-4 w-4" />
              Conectar redes sociais
            </Button>
            {!isEditor ? (
              <p className="text-xs text-muted-light">Apenas owner/admin podem conectar redes.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(28,25,23,0.12)]">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-text">Conectar redes sociais</h3>
                <p className="mt-1 text-sm text-muted">
                  O AXIOMIX cria o perfil da empresa no Upload-Post e abre a autorização da rede.
                </p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 text-muted-light hover:text-text hover:bg-sidebar transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {(["instagram", "linkedin", "tiktok", "facebook"] as const).map((platform) => (
                <div key={platform} className="flex items-center justify-between rounded-xl border border-border bg-card hover:bg-background p-3 transition-colors">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-text">
                      {platformIcon(platform)}
                      {platformLabel(platform)}
                    </p>
                    <p className="text-xs text-muted">
                      {connections.find((item) => item.platform === platform)?.status === "connected"
                        ? "Já conectada"
                        : "Conectar agora"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => connectPlatform(platform)}
                    disabled={Boolean(connectingPlatform)}
                  >
                    {connectingPlatform === platform ? "Conectando..." : "Conectar"}
                  </Button>
                </div>
              ))}

              {connectingPlatform ? (
                <p className="text-xs text-muted-light">
                  A janela de autorização foi aberta. Assim que a rede conectar, ela fecha automaticamente.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
