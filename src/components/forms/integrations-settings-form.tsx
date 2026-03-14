/**
 * Arquivo: src/components/forms/integrations-settings-form.tsx
 * Proposito: Conectar Sofia CRM e Evolution API com fluxo simplificado por modal.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { z } from "zod";
import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Link2, QrCode, Smartphone, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sofiaSchema = z.object({
  baseUrl: z.string().trim().url("URL base invalida."),
  apiToken: z.string().trim().min(1, "API token e obrigatorio."),
  inboxId: z.string().trim().min(1, "Inbox ID e obrigatorio."),
});

const evolutionConnectSchema = z.object({
  vendorName: z.string().trim().min(2, "Nome do vendedor invalido."),
  managerPhone: z.string().trim().min(8, "WhatsApp do gestor invalido."),
});

type IntegrationStatus = {
  isActive: boolean;
  testStatus: "ok" | "error" | null;
  lastTestedAt: string | null;
};

type SofiaForm = {
  baseUrl: string;
  apiToken: string;
  inboxId: string;
};

type FormErrors = {
  sofia: Partial<Record<keyof SofiaForm | "form", string>>;
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

type ModalMeta = {
  key: "sofia" | "evolution";
  title: string;
  subtitle: string;
};

const initialErrors: FormErrors = {
  sofia: {},
  evolution: {},
};

const initialSofiaStatus: IntegrationStatus = {
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
  return "Nao testada";
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
          <p className="mt-2 text-xs text-muted-light">Ultimo teste: {formatLastTestedAt(status.lastTestedAt)}</p>
        </div>

        {extra}

        <Button type="button" onClick={onConnect} className="w-full">
          {status.testStatus === "ok" ? "Reconfigurar conexao" : "Conectar agora"}
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

export function IntegrationsSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalMeta | null>(null);

  const [sofiaForm, setSofiaForm] = useState<SofiaForm>({
    baseUrl: "",
    apiToken: "",
    inboxId: "",
  });
  const [evolutionManagerPhone, setEvolutionManagerPhone] = useState("");
  const [evolutionVendorName, setEvolutionVendorName] = useState("");
  const [evolutionVendors, setEvolutionVendors] = useState<EvolutionVendor[]>([]);
  const [evolutionQrCode, setEvolutionQrCode] = useState<string | null>(null);
  const [pendingEvolutionInstance, setPendingEvolutionInstance] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>(initialErrors);
  const [sofiaStatus, setSofiaStatus] = useState<IntegrationStatus>(initialSofiaStatus);
  const [evolutionStatus, setEvolutionStatus] = useState<IntegrationStatus>(initialEvolutionStatus);
  const [sofiaFeedback, setSofiaFeedback] = useState<string | null>(null);
  const [evolutionFeedback, setEvolutionFeedback] = useState<string | null>(null);
  const [isConnectingSofia, setIsConnectingSofia] = useState(false);
  const [isConnectingEvolution, setIsConnectingEvolution] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
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
        setGlobalError(integrationsResponse.error ?? "Nao foi possivel carregar integracoes.");
        setIsLoading(false);
        return;
      }

      if (!vendorsRequest.ok) {
        setGlobalError(vendorsResponse.error ?? "Nao foi possivel carregar vendedores da Evolution.");
        setIsLoading(false);
        return;
      }

      const items = integrationsResponse.items ?? [];
      const sofia = items.find((item) => item.type === "sofia_crm");
      const evolution = items.find((item) => item.type === "evolution_api");

      if (sofia) {
        setSofiaStatus({
          isActive: sofia.isActive,
          testStatus: sofia.testStatus,
          lastTestedAt: sofia.lastTestedAt,
        });
        setSofiaForm((previous) => ({
          ...previous,
          baseUrl: typeof sofia.config.baseUrl === "string" ? sofia.config.baseUrl : "",
          inboxId: typeof sofia.config.inboxId === "string" ? sofia.config.inboxId : "",
        }));
      }

      if (evolution) {
        setEvolutionStatus({
          isActive: evolution.isActive,
          testStatus: evolution.testStatus,
          lastTestedAt: evolution.lastTestedAt,
        });
      }

      setEvolutionManagerPhone(vendorsResponse.managerPhone ?? "");
      setEvolutionVendors(vendorsResponse.vendors ?? []);
      setIsLoading(false);
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

  const openModal = (key: "sofia" | "evolution") => {
    if (key === "sofia") {
      setActiveModal({
        key,
        title: "Conectar Sofia CRM",
        subtitle: "Informe credenciais da conta para liberar sincronizacao de conversas.",
      });
      return;
    }

    setEvolutionQrCode(null);
    setEvolutionVendorName("");
    setPendingEvolutionInstance(null);
    setActiveModal({
      key,
      title: "Conectar Evolution API",
      subtitle: "A API base e chave ja estao no servidor. Conecte vendedores por QR Code.",
    });
  };

  const handleSofiaChange = (field: keyof SofiaForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSofiaForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, sofia: { ...previous.sofia, [field]: undefined, form: undefined } }));
    setSofiaFeedback(null);
  };

  const connectSofia = async () => {
    const parsed = sofiaSchema.safeParse(sofiaForm);
    if (!parsed.success) {
      const nextError: FormErrors["sofia"] = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "baseUrl" || field === "apiToken" || field === "inboxId") {
          nextError[field] = issue.message;
        }
      }
      setErrors((previous) => ({ ...previous, sofia: nextError }));
      return;
    }

    setIsConnectingSofia(true);
    const request = await fetch("/api/integrations/test/sofia_crm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const response = (await request.json()) as IntegrationMutationResponse;
    setIsConnectingSofia(false);

    if (!request.ok) {
      setErrors((previous) => ({
        ...previous,
        sofia: { ...previous.sofia, form: response.error ?? "Falha ao conectar Sofia CRM." },
      }));
      return;
    }

    if (response.integration) {
      setSofiaStatus({
        isActive: response.integration.isActive,
        testStatus: response.integration.testStatus,
        lastTestedAt: response.integration.lastTestedAt,
      });
    }

    setErrors((previous) => ({ ...previous, sofia: {} }));
    setSofiaFeedback(response.testDetail ?? "Conexao validada com sucesso.");
    closeActiveModal();
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
    const request = await fetch("/api/integrations/evolution-api/vendors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const response = (await request.json()) as EvolutionConnectResponse;
    setIsConnectingEvolution(false);

    if (!request.ok) {
      setErrors((previous) => ({
        ...previous,
        evolution: {
          ...previous.evolution,
          form: response.error ?? "Falha ao gerar QR Code para este vendedor.",
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
        "QR Code gerado. Escaneie no WhatsApp do vendedor para concluir a conexao."
    );
  };

  const refreshEvolutionVendors = useCallback(async (options?: {
    silent?: boolean;
    closeOnConnectedInstance?: string | null;
  }) => {
    const request = await fetch("/api/integrations/evolution-api/vendors");
    const response = (await request.json()) as EvolutionVendorsResponse;
    if (!request.ok) {
      if (!options?.silent) {
        setErrors((previous) => ({
          ...previous,
          evolution: { ...previous.evolution, form: response.error ?? "Falha ao atualizar vendedores." },
        }));
      }
      return null;
    }

    const nextManagerPhone = response.managerPhone ?? evolutionManagerPhone;
    const nextVendors = response.vendors ?? [];
    const nowIso = new Date().toISOString();

    setEvolutionManagerPhone(nextManagerPhone);
    setEvolutionVendors(nextVendors);
    setEvolutionStatus((previous) => ({
      ...previous,
      isActive: nextVendors.some((vendor) => vendor.status === "connected"),
      testStatus: nextVendors.some((vendor) => vendor.status === "connected") ? "ok" : previous.testStatus,
      lastTestedAt: nowIso,
    }));
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
  }, [evolutionManagerPhone]);

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

  const renderSofiaModal = () => (
    <div className="grid gap-4">
      <div className="space-y-1">
        <label htmlFor="sofia-base-url" className="text-sm font-medium text-text">
          URL base
        </label>
        <input
          id="sofia-base-url"
          value={sofiaForm.baseUrl}
          onChange={handleSofiaChange("baseUrl")}
          placeholder="https://crm.seudominio.com"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
        />
        {errors.sofia.baseUrl ? <p className="text-xs text-danger">{errors.sofia.baseUrl}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="sofia-api-token" className="text-sm font-medium text-text">
          API token
        </label>
        <input
          id="sofia-api-token"
          value={sofiaForm.apiToken}
          onChange={handleSofiaChange("apiToken")}
          placeholder="Cole o token da API"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
        />
        {errors.sofia.apiToken ? <p className="text-xs text-danger">{errors.sofia.apiToken}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="sofia-inbox-id" className="text-sm font-medium text-text">
          Inbox ID
        </label>
        <input
          id="sofia-inbox-id"
          value={sofiaForm.inboxId}
          onChange={handleSofiaChange("inboxId")}
          placeholder="Ex.: 5"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
        />
        {errors.sofia.inboxId ? <p className="text-xs text-danger">{errors.sofia.inboxId}</p> : null}
      </div>

      {errors.sofia.form ? <p className="text-sm text-danger">{errors.sofia.form}</p> : null}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="secondary" onClick={closeActiveModal}>
          Cancelar
        </Button>
        <Button type="button" onClick={connectSofia} disabled={isConnectingSofia}>
          {isConnectingSofia ? "Conectando..." : "Conectar e testar"}
        </Button>
      </div>
    </div>
  );

  const connectedVendorsCount = evolutionVendors.filter((vendor) => vendor.status === "connected").length;

  const renderEvolutionModal = () => (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Credenciais da Evolution estao no servidor. Basta cadastrar o vendedor e escanear o QR Code.
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
          Nome do vendedor
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
          placeholder="Ex.: Camila Comercial"
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
          Atualizar status dos vendedores
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
              Abra o WhatsApp do vendedor no celular e escaneie este QR Code.
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-text">Vendedores conectados</p>
          <p className="text-xs text-muted">
            {connectedVendorsCount}/{evolutionVendors.length} conectados
          </p>
        </div>
        {evolutionVendors.length === 0 ? (
          <p className="text-xs text-muted-light">Nenhum vendedor cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {evolutionVendors.map((vendor) => (
              <div key={vendor.id} className="rounded-xl border border-border bg-card p-2">
                <p className="text-sm font-medium text-text">{vendor.vendorName}</p>
                <p className="text-xs text-muted">Instancia: {vendor.instanceName}</p>
                <p className={`text-xs font-medium ${vendorStatusClass(vendor.status)}`}>
                  Status: {vendor.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {errors.evolution.form ? <p className="text-sm text-danger">{errors.evolution.form}</p> : null}
      {evolutionFeedback ? <p className="text-sm text-success">{evolutionFeedback}</p> : null}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="secondary" onClick={closeActiveModal}>
          Fechar
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return <p className="text-sm text-muted">Carregando integracoes...</p>;
  }

  if (globalError) {
    return <p className="text-sm text-danger">{globalError}</p>;
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrationOverviewCard
          title="Sofia CRM"
          description="Sincroniza conversas e oportunidades comerciais."
          status={sofiaStatus}
          icon={<Link2 className="h-5 w-5" />}
          onConnect={() => openModal("sofia")}
          extra={
            sofiaFeedback ? (
              <p className="text-xs text-success">{sofiaFeedback}</p>
            ) : null
          }
        />

        <IntegrationOverviewCard
          title="Evolution API"
          description="Conecta multiplos vendedores via QR Code sem expor API key ao usuario."
          status={evolutionStatus}
          icon={<Smartphone className="h-5 w-5" />}
          onConnect={() => openModal("evolution")}
          extra={
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted">Vendedores cadastrados: {evolutionVendors.length}</p>
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
                Cada empresa possui seu proprio perfil de redes sociais.
              </p>
            </div>
            <Link href="/settings">
              <Button type="button" variant="secondary">
                Ir para Settings de redes sociais
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {activeModal ? (
        <ConnectionModal
          title={activeModal.title}
          subtitle={activeModal.subtitle}
          onClose={closeActiveModal}
        >
          {activeModal.key === "sofia" ? renderSofiaModal() : renderEvolutionModal()}
        </ConnectionModal>
      ) : null}
    </>
  );
}
