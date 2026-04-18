/**
 * Arquivo: src/components/forms/integrations-settings-form.tsx
 * Propósito: Conectar Evo CRM e Evolution API com fluxo simplificado por modal.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { z } from "zod";
import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Link2, Loader2, QrCode, Smartphone, Trash2, UsersRound, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenRouterModelSettings } from "@/components/settings/openrouter-model-settings";

const evoSchema = z.object({
  baseUrl: z.string().trim().url("URL base inválida."),
  apiToken: z.string().trim().min(1, "API token é obrigatório."),
});

const evolutionConnectSchema = z.object({
  vendorName: z.string().trim().min(2, "Nome da conexão inválido."),
  managerPhone: z.string().trim().min(8, "WhatsApp do gestor inválido."),
});

type IntegrationStatus = {
  isActive: boolean;
  testStatus: "ok" | "error" | null;
  lastTestedAt: string | null;
};

type EvoForm = {
  baseUrl: string;
  apiToken: string;
};

type FormErrors = {
  evo: Partial<Record<keyof EvoForm | "form", string>>;
  evolution: Partial<Record<"vendorName" | "managerPhone" | "form", string>>;
};

type IntegrationsApiItem = {
  type: string;
  isActive: boolean;
  testStatus: "ok" | "error" | null;
  lastTestedAt: string | null;
  config: Record<string, string | number | null>;
};

type IntegrationMutationResponse = {
  integration?: IntegrationsApiItem;
  testDetail?: string;
  message?: string;
  error?: string;
};

type EvolutionVendor = {
  id: string;
  vendorName: string;
  instanceName: string;
  status: "pending" | "connected" | "error";
  qrCodeSource?: string | null;
  lastQrAt?: string | null;
  connectedAt?: string | null;
  lastError?: string | null;
};

type EvolutionVendorsResponse = {
  vendors?: EvolutionVendor[];
  managerPhone?: string;
  error?: string;
};

type EvolutionConnectResponse = {
  vendor?: EvolutionVendor;
  managerPhone?: string;
  qrCodeDataUrl?: string;
  testDetail?: string;
  error?: string;
};

type EvolutionDeleteResponse = {
  deletedInstanceName?: string;
  managerPhone?: string;
  vendors?: EvolutionVendor[];
  message?: string;
  error?: string;
};

type ModalMeta = {
  key: "evo" | "evolution";
  title: string;
  subtitle: string;
};

const initialErrors: FormErrors = {
  evo: {},
  evolution: {},
};

const initialEvoStatus: IntegrationStatus = {
  isActive: false,
  testStatus: null,
  lastTestedAt: null,
};

const initialEvolutionStatus: IntegrationStatus = {
  isActive: false,
  testStatus: null,
  lastTestedAt: null,
};

function formatStatus(status: IntegrationStatus) {
  if (status.testStatus === "ok") {
    return "Conectada";
  }
  if (status.testStatus === "error") {
    return "Falha no teste";
  }
  return "Não testada";
}

function formatLastTestedAt(value: string | null) {
  if (!value) {
    return "Nunca testada";
  }
  return new Date(value).toLocaleString("pt-BR");
}

function statusTextClass(status: IntegrationStatus) {
  if (status.testStatus === "ok") {
    return "text-success";
  }
  if (status.testStatus === "error") {
    return "text-danger";
  }
  return "text-muted-light";
}

type ConnectionModalProps = {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
};

function ConnectionModal({ title, subtitle, onClose, children }: ConnectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(28,25,23,0.12)]">
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-text">{title}</h3>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-muted-light hover:text-text hover:bg-sidebar transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto pt-4">{children}</div>
      </div>
    </div>
  );
}

type IntegrationOverviewCardProps = {
  title: string;
  description: string;
  status: IntegrationStatus;
  icon: ReactNode;
  onConnect: () => void;
  extra?: ReactNode;
};

function IntegrationOverviewCard({
  title,
  description,
  status,
  icon,
  onConnect,
  extra,
}: IntegrationOverviewCardProps) {
  return (
    <Card className="h-full bg-card rounded-xl border border-border">
      <CardHeader className="p-6">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
          {icon}
        </div>
        <CardTitle className="text-base font-semibold text-text">{title}</CardTitle>
        <CardDescription className="text-muted">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-light uppercase tracking-wide mb-1">Status de conexão</p>
          {status.testStatus === "ok" ? (
            <div className="bg-success-light border border-success/20 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-xs text-success">{formatStatus(status)}</p>
            </div>
          ) : (
            <div className="rounded-lg bg-sidebar border border-border p-3">
              <p className={`text-sm font-medium ${statusTextClass(status)}`}>{formatStatus(status)}</p>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-light">Último teste: {formatLastTestedAt(status.lastTestedAt)}</p>
        </div>

        {extra}

        <Button type="button" onClick={onConnect} className="w-full">
          {status.testStatus === "ok" ? "Reconfigurar conexão" : "Conectar agora"}
        </Button>
      </CardContent>
    </Card>
  );
}

function vendorStatusClass(status: EvolutionVendor["status"]) {
  if (status === "connected") {
    return "text-success";
  }
  if (status === "error") {
    return "text-danger";
  }
  return "text-warning";
}

function resolveEvolutionUiStatus(vendors: EvolutionVendor[], fallback: IntegrationStatus): IntegrationStatus {
  const hasConnectedVendor = vendors.some((vendor) => vendor.status === "connected");

  if (hasConnectedVendor) {
    return {
      isActive: true,
      testStatus: "ok",
      lastTestedAt: fallback.lastTestedAt ?? new Date().toISOString(),
    };
  }

  if (fallback.testStatus === "error") {
    return fallback;
  }

  return {
    isActive: false,
    testStatus: null,
    lastTestedAt: fallback.lastTestedAt,
  };
}

export function IntegrationsSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalMeta | null>(null);

  const [evoForm, setEvoForm] = useState<EvoForm>({
    baseUrl: "https://crm.getlead.capital",
    apiToken: "",
  });
  const [evolutionManagerPhone, setEvolutionManagerPhone] = useState("");
  const [evolutionVendorName, setEvolutionVendorName] = useState("");
  const [evolutionVendors, setEvolutionVendors] = useState<EvolutionVendor[]>([]);
  const [evolutionQrCode, setEvolutionQrCode] = useState<string | null>(null);
  const [pendingEvolutionInstance, setPendingEvolutionInstance] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>(initialErrors);
  const [evoStatus, setEvoStatus] = useState<IntegrationStatus>(initialEvoStatus);
  const [evolutionStatus, setEvolutionStatus] = useState<IntegrationStatus>(initialEvolutionStatus);
  const [evoFeedback, setEvoFeedback] = useState<string | null>(null);
  const [evolutionFeedback, setEvolutionFeedback] = useState<string | null>(null);
  const [isConnectingEvo, setIsConnectingEvo] = useState(false);
  const [isConnectingEvolution, setIsConnectingEvolution] = useState(false);
  const [deletingEvolutionInstance, setDeletingEvolutionInstance] = useState<string | null>(null);
  const [confirmingDeleteInstance, setConfirmingDeleteInstance] = useState<string | null>(null);
  const [isResettingEvo, setIsResettingEvo] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      try {
        const [integrationsRequest, vendorsRequest] = await Promise.all([
          fetch("/api/integrations"),
          fetch("/api/integrations/evolution-api/vendors"),
        ]);

        const integrationsResponse = (await integrationsRequest.json()) as {
          items?: IntegrationsApiItem[];
          error?: string;
        };
        const vendorsResponse = (await vendorsRequest.json()) as EvolutionVendorsResponse;

        if (!mounted) {
          return;
        }

        if (!integrationsRequest.ok) {
          setGlobalError(integrationsResponse.error ?? "Não foi possível carregar integrações.");
          setIsLoading(false);
          return;
        }

        if (!vendorsRequest.ok) {
          setGlobalError(vendorsResponse.error ?? "Não foi possível carregar conexões da Evolution.");
          setIsLoading(false);
          return;
        }

        const items = integrationsResponse.items ?? [];
        const evo = items.find((item) => item.type === "evo_crm");
        const evolution = items.find((item) => item.type === "evolution_api");

        if (evo) {
          setEvoStatus({
            isActive: evo.isActive,
            testStatus: evo.testStatus,
            lastTestedAt: evo.lastTestedAt,
          });
          setEvoForm((previous) => ({
            ...previous,
            baseUrl: typeof evo.config.baseUrl === "string" ? evo.config.baseUrl : "",
          }));
        }

        const nextEvolutionStatus: IntegrationStatus = {
          isActive: evolution?.isActive ?? false,
          testStatus: evolution?.testStatus ?? null,
          lastTestedAt: evolution?.lastTestedAt ?? null,
        };
        const nextVendors = vendorsResponse.vendors ?? [];

        setEvolutionStatus(resolveEvolutionUiStatus(nextVendors, nextEvolutionStatus));
        setEvolutionManagerPhone(vendorsResponse.managerPhone ?? "");
        setEvolutionVendors(nextVendors);
      } catch {
        if (mounted) {
          setGlobalError("Não foi possível carregar integrações. Verifique sua conexão e recarregue a página.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeModal) {
      return;
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeActiveModal();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [activeModal]);

  const closeActiveModal = () => {
    setActiveModal(null);
    setPendingEvolutionInstance(null);
  };

  const openModal = (key: "evo" | "evolution") => {
    if (key === "evo") {
      setActiveModal({
        key,
        title: "Conectar Evo CRM",
        subtitle: "Informe credenciais da conta para liberar sincronização de conversas.",
      });
      return;
    }

    setEvolutionQrCode(null);
    setEvolutionVendorName("");
    setPendingEvolutionInstance(null);
    setActiveModal({
      key,
      title: "Conectar Evolution API",
      subtitle: "Conecte o WhatsApp do gestor para receber relatórios e alertas.",
    });
  };

  const handleEvoChange = (field: keyof EvoForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEvoForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, evo: { ...previous.evo, [field]: undefined, form: undefined } }));
    setEvoFeedback(null);
  };

  const connectEvo = async () => {
    const parsed = evoSchema.safeParse(evoForm);
    if (!parsed.success) {
      const nextError: FormErrors["evo"] = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "baseUrl" || field === "apiToken") {
          nextError[field] = issue.message;
        }
      }
      setErrors((previous) => ({ ...previous, evo: nextError }));
      return;
    }

    setIsConnectingEvo(true);
    const request = await fetch("/api/integrations/test/evo_crm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const response = (await request.json()) as IntegrationMutationResponse;
    setIsConnectingEvo(false);

    if (!request.ok) {
      setErrors((previous) => ({
        ...previous,
        evo: { ...previous.evo, form: response.error ?? "Falha ao conectar Evo CRM." },
      }));
      return;
    }

    if (response.integration) {
      setEvoStatus({
        isActive: response.integration.isActive,
        testStatus: response.integration.testStatus,
        lastTestedAt: response.integration.lastTestedAt,
      });
    }

    setErrors((previous) => ({ ...previous, evo: {} }));
    setEvoFeedback(response.testDetail ?? "Conexão validada com sucesso.");
    closeActiveModal();
  };

  const resetEvoSyncData = async () => {
    const confirmed = window.confirm(
      "Isso vai remover as conversas e jobs sincronizados do Evo CRM nesta empresa. Deseja continuar?"
    );

    if (!confirmed) {
      return;
    }

    setIsResettingEvo(true);
    setErrors((previous) => ({ ...previous, evo: { ...previous.evo, form: undefined } }));

    try {
      const request = await fetch("/api/evo-crm/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const response = (await request.json()) as { message?: string; error?: string };

      if (!request.ok) {
        setErrors((previous) => ({
          ...previous,
          evo: { ...previous.evo, form: response.error ?? "Falha ao limpar dados do Evo CRM." },
        }));
        return;
      }

      setEvoFeedback(
        response.message ??
          "Dados sincronizados removidos. A próxima sincronização vai trazer apenas a conta atual do Evo CRM."
      );
    } catch (resetError) {
      const detail =
        resetError instanceof Error ? resetError.message : "Erro inesperado ao limpar dados do Evo CRM.";
      setErrors((previous) => ({
        ...previous,
        evo: { ...previous.evo, form: detail },
      }));
    } finally {
      setIsResettingEvo(false);
    }
  };

  const connectEvolutionVendor = async () => {
    const parsed = evolutionConnectSchema.safeParse({
      vendorName: evolutionVendorName,
      managerPhone: evolutionManagerPhone,
    });

    if (!parsed.success) {
      const nextError: FormErrors["evolution"] = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "vendorName" || field === "managerPhone") {
          nextError[field] = issue.message;
        }
      }
      setErrors((previous) => ({ ...previous, evolution: nextError }));
      return;
    }

    setIsConnectingEvolution(true);
    setErrors((previous) => ({ ...previous, evolution: { ...previous.evolution, form: undefined } }));

    try {
      const request = await fetch("/api/integrations/evolution-api/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });
      const response = (await request.json()) as EvolutionConnectResponse;

      if (!request.ok) {
        setErrors((previous) => ({
          ...previous,
          evolution: {
            ...previous.evolution,
            form: response.error ?? "Falha ao gerar QR Code.",
          },
        }));
        return;
      }

      if (response.vendor) {
        const vendor = response.vendor;
        setEvolutionVendors((previous) => {
          const map = new Map(previous.map((vendor) => [vendor.instanceName, vendor]));
          map.set(vendor.instanceName, vendor);
          return Array.from(map.values());
        });
      }

      setEvolutionManagerPhone(response.managerPhone ?? evolutionManagerPhone);
      setEvolutionQrCode(response.qrCodeDataUrl ?? null);
      setPendingEvolutionInstance(response.vendor?.instanceName ?? null);
      setErrors((previous) => ({ ...previous, evolution: {} }));
      setEvolutionFeedback(
        response.testDetail ??
          "QR Code gerado. Escaneie no WhatsApp do gestor para concluir a conexão."
      );
    } catch {
      setErrors((previous) => ({
        ...previous,
        evolution: {
          ...previous.evolution,
          form: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
        },
      }));
    } finally {
      setIsConnectingEvolution(false);
    }
  };

  const refreshEvolutionVendors = useCallback(async (options?: {
    silent?: boolean;
    closeOnConnectedInstance?: string | null;
  }) => {
    try {
      const request = await fetch("/api/integrations/evolution-api/vendors");
      const response = (await request.json()) as EvolutionVendorsResponse;
      if (!request.ok) {
        if (!options?.silent) {
          setErrors((previous) => ({
            ...previous,
            evolution: { ...previous.evolution, form: response.error ?? "Falha ao atualizar conexões." },
          }));
        }
        return null;
      }

      const nextManagerPhone = response.managerPhone ?? evolutionManagerPhone;
      const nextVendors = response.vendors ?? [];
      const nowIso = new Date().toISOString();

      setEvolutionManagerPhone(nextManagerPhone);
      setEvolutionVendors(nextVendors);
      setEvolutionStatus((previous) =>
        resolveEvolutionUiStatus(nextVendors, {
          ...previous,
          lastTestedAt: nowIso,
        })
      );
      setErrors((previous) => ({ ...previous, evolution: { ...previous.evolution, form: undefined } }));

      const targetInstance = options?.closeOnConnectedInstance?.trim();
      if (!targetInstance) {
        return nextVendors;
      }

      const connectedVendor = nextVendors.find(
        (vendor) => vendor.instanceName === targetInstance && vendor.status === "connected"
      );

      if (connectedVendor) {
        setEvolutionQrCode(null);
        setPendingEvolutionInstance(null);
        setEvolutionFeedback(
          `${connectedVendor.vendorName} conectado com sucesso. Modal fechado automaticamente.`
        );
        setActiveModal((current) => (current?.key === "evolution" ? null : current));
      }

      return nextVendors;
    } catch {
      if (!options?.silent) {
        setErrors((previous) => ({
          ...previous,
          evolution: {
            ...previous.evolution,
            form: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
          },
        }));
      }
      return null;
    }
  }, [evolutionManagerPhone]);

  const deleteEvolutionVendor = async (vendor: EvolutionVendor) => {
    setDeletingEvolutionInstance(vendor.instanceName);
    setConfirmingDeleteInstance(null);
    setEvolutionFeedback(null);
    setErrors((previous) => ({ ...previous, evolution: { ...previous.evolution, form: undefined } }));

    try {
      const request = await fetch("/api/integrations/evolution-api/vendors", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName: vendor.instanceName,
        }),
      });
      const response = (await request.json()) as EvolutionDeleteResponse;

      if (!request.ok) {
        setErrors((previous) => ({
          ...previous,
          evolution: {
            ...previous.evolution,
            form: response.error ?? "Falha ao excluir conexão.",
          },
        }));
        return;
      }

      const nextVendors =
        response.vendors ?? evolutionVendors.filter((item) => item.instanceName !== vendor.instanceName);
      const nowIso = new Date().toISOString();

      setEvolutionManagerPhone(response.managerPhone ?? evolutionManagerPhone);
      setEvolutionVendors(nextVendors);
      setEvolutionStatus((previous) =>
        resolveEvolutionUiStatus(nextVendors, {
          ...previous,
          lastTestedAt: nowIso,
        })
      );

      if (pendingEvolutionInstance === vendor.instanceName) {
        setPendingEvolutionInstance(null);
        setEvolutionQrCode(null);
      }

      setEvolutionFeedback(response.message ?? `${vendor.vendorName} removido com sucesso.`);
    } catch (deleteError) {
      const detail =
        deleteError instanceof Error ? deleteError.message : "Erro inesperado ao excluir conexão.";
      setErrors((previous) => ({
        ...previous,
        evolution: {
          ...previous.evolution,
          form: detail,
        },
      }));
    } finally {
      setDeletingEvolutionInstance(null);
    }
  };

  useEffect(() => {
    if (activeModal?.key !== "evolution" || !pendingEvolutionInstance) {
      return;
    }

    let stopped = false;

    const pollStatus = async () => {
      if (stopped) {
        return;
      }

      await refreshEvolutionVendors({
        silent: true,
        closeOnConnectedInstance: pendingEvolutionInstance,
      });
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 2500);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [activeModal, pendingEvolutionInstance, refreshEvolutionVendors]);

  const renderEvoModal = () => (
    <div className="grid gap-4">
      <div className="space-y-1">
        <label htmlFor="evo-base-url" className="text-sm font-medium text-text">
          URL base
        </label>
        <input
          id="evo-base-url"
          value={evoForm.baseUrl}
          readOnly
          className="h-10 w-full rounded-lg border border-border bg-sidebar px-3 text-sm text-muted cursor-not-allowed"
        />
        {errors.evo.baseUrl ? <p className="text-xs text-danger">{errors.evo.baseUrl}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="evo-api-token" className="text-sm font-medium text-text">
          API token
        </label>
        <input
          id="evo-api-token"
          value={evoForm.apiToken}
          onChange={handleEvoChange("apiToken")}
          placeholder="Cole o token da API"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
        />
        {errors.evo.apiToken ? <p className="text-xs text-danger">{errors.evo.apiToken}</p> : null}
      </div>

      {errors.evo.form ? <p className="text-sm text-danger">{errors.evo.form}</p> : null}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="secondary" onClick={closeActiveModal}>
          Cancelar
        </Button>
        <Button type="button" onClick={connectEvo} disabled={isConnectingEvo}>
          {isConnectingEvo ? "Conectando..." : "Conectar e testar"}
        </Button>
      </div>
    </div>
  );

  const connectedVendorsCount = evolutionVendors.filter((vendor) => vendor.status === "connected").length;

  const renderEvolutionModal = () => (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Credenciais da Evolution estão no servidor. Informe o WhatsApp do gestor e escaneie o QR Code para conectar.
      </p>

      <div className="space-y-1">
        <label htmlFor="evolution-manager-phone" className="text-sm font-medium text-text">
          WhatsApp do gestor
        </label>
        <input
          id="evolution-manager-phone"
          value={evolutionManagerPhone}
          onChange={(event) => {
            setEvolutionManagerPhone(event.target.value);
            setErrors((previous) => ({
              ...previous,
              evolution: { ...previous.evolution, managerPhone: undefined, form: undefined },
            }));
          }}
          placeholder="5511999999999"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
        />
        {errors.evolution.managerPhone ? (
          <p className="text-xs text-danger">{errors.evolution.managerPhone}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="evolution-vendor-name" className="text-sm font-medium text-text">
          Nome da conexão
        </label>
        <input
          id="evolution-vendor-name"
          value={evolutionVendorName}
          onChange={(event) => {
            setEvolutionVendorName(event.target.value);
            setErrors((previous) => ({
              ...previous,
              evolution: { ...previous.evolution, vendorName: undefined, form: undefined },
            }));
          }}
          placeholder="Ex.: Gestor Principal"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
        />
        {errors.evolution.vendorName ? (
          <p className="text-xs text-danger">{errors.evolution.vendorName}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={connectEvolutionVendor} disabled={isConnectingEvolution}>
          <QrCode className="h-4 w-4" />
          {isConnectingEvolution ? "Gerando..." : "Gerar QR Code"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void refreshEvolutionVendors()}>
          Atualizar status
        </Button>
      </div>

      {evolutionQrCode ? (
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex flex-col items-center gap-2">
            <Image
              src={evolutionQrCode}
              alt="QR Code Evolution"
              width={224}
              height={224}
              unoptimized
              className="h-56 w-56 rounded-lg border border-border bg-card p-2"
            />
            <p className="text-xs text-muted">
              Abra o WhatsApp do gestor no celular e escaneie este QR Code.
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-text">Conexões ativas</p>
          <p className="text-xs text-muted">
            {connectedVendorsCount}/{evolutionVendors.length} conectados
          </p>
        </div>
        {evolutionVendors.length === 0 ? (
          <p className="text-xs text-muted-light">Nenhuma conexão cadastrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {evolutionVendors.map((vendor) => (
              <div key={vendor.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{vendor.vendorName}</p>
                    <p className="text-xs text-muted">Instância: {vendor.instanceName}</p>
                    <p className={`text-xs font-medium ${vendorStatusClass(vendor.status)}`}>
                      Status: {vendor.status}
                    </p>
                  </div>

                  {confirmingDeleteInstance === vendor.instanceName ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void deleteEvolutionVendor(vendor)}
                        disabled={deletingEvolutionInstance === vendor.instanceName}
                      >
                        {deletingEvolutionInstance === vendor.instanceName ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Confirmar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDeleteInstance(null)}
                        disabled={deletingEvolutionInstance === vendor.instanceName}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDeleteInstance(vendor.instanceName)}
                      disabled={deletingEvolutionInstance != null}
                      className="shrink-0 text-danger hover:bg-danger-light hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {errors.evolution.form ? (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-light p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-danger">{errors.evolution.form}</p>
        </div>
      ) : null}
      {evolutionFeedback ? <p className="text-sm text-success">{evolutionFeedback}</p> : null}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="secondary" onClick={closeActiveModal}>
          Fechar
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return <p className="text-sm text-muted">Carregando integrações...</p>;
  }

  if (globalError) {
    return <p className="text-sm text-danger">{globalError}</p>;
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrationOverviewCard
          title="Evo CRM"
          description="Sincroniza conversas e oportunidades comerciais."
          status={evoStatus}
          icon={<Link2 className="h-5 w-5" />}
          onConnect={() => openModal("evo")}
          extra={
            <div className="space-y-3">
              {evoFeedback ? (
                <p className="text-xs text-success">{evoFeedback}</p>
              ) : null}
              {errors.evo.form ? (
                <p className="text-xs text-danger">{errors.evo.form}</p>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetEvoSyncData}
                disabled={isResettingEvo}
                className="w-full"
              >
                {isResettingEvo ? "Limpando dados..." : "Limpar dados sincronizados"}
              </Button>
            </div>
          }
        />

        <IntegrationOverviewCard
          title="Evolution API"
          description="Envia relatórios e alertas via WhatsApp para o gestor."
          status={evolutionStatus}
          icon={<Smartphone className="h-5 w-5" />}
          onConnect={() => openModal("evolution")}
          extra={
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted">Conexões cadastradas:{evolutionVendors.length}</p>
              <p className="text-xs text-muted">Conectados: {connectedVendorsCount}</p>
            </div>
          }
        />
      </div>

      <Card className="mt-4 border border-dashed border-border rounded-xl">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Upload-Post e redes sociais agora ficam na aba Settings da empresa.
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-muted">
                <UsersRound className="h-4 w-4 text-primary" />
                Cada empresa possui seu próprio perfil de redes sociais.
              </p>
            </div>
            <Link href="/settings?tab=social" className={buttonVariants({ variant: "secondary" })}>
              Ir para Settings de redes sociais
            </Link>
          </div>
        </CardContent>
      </Card>

      <OpenRouterModelSettings />

      {activeModal ? (
        <ConnectionModal
          title={activeModal.title}
          subtitle={activeModal.subtitle}
          onClose={closeActiveModal}
        >
          {activeModal.key === "evo" ? renderEvoModal() : renderEvolutionModal()}
        </ConnectionModal>
      ) : null}
    </>
  );
}
