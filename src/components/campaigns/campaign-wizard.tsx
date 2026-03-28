/**
 * Arquivo: src/components/campaigns/campaign-wizard.tsx
 * Propósito: Wizard multi-step para criacao e configuracao de campanha em massa.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Steps, Select, AutoComplete } from "antd";
import {
  FileText,
  Upload,
  Users,
  Settings2,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { CsvImportModal } from "./csv-import-modal";

type InboxOption = { id: string; name: string };
type LabelOption = { id: string; name: string; color?: string };
type TemplateOption = { name: string; language: string };

type WizardData = {
  name: string;
  inbox_id: string;
  template_name: string;
  language: string;
  labelIds: string[];
  gender: string;
  createdAfter: string;
  createdBefore: string;
  body_params_template: string[];
  header_params_template: string[];
  scheduled_at: string | null;
  sendNow: boolean;
};

const INITIAL_DATA: WizardData = {
  name: "",
  inbox_id: "",
  template_name: "",
  language: "pt_BR",
  labelIds: [],
  gender: "",
  createdAfter: "",
  createdBefore: "",
  body_params_template: [],
  header_params_template: [],
  scheduled_at: null,
  sendNow: true,
};

const LANGUAGE_OPTIONS = [
  { value: "pt_BR", label: "Português (BR)" },
  { value: "en_US", label: "English (US)" },
  { value: "es", label: "Español" },
];

type CampaignWizardProps = {
  companyId: string;
};

export function CampaignWizard({ companyId }: CampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [inboxes, setInboxes] = useState<InboxOption[]>([]);
  const [labels, setLabels] = useState<LabelOption[]>([]);
  const [templateSuggestions, setTemplateSuggestions] = useState<TemplateOption[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [importedPhones, setImportedPhones] = useState<string[]>([]);

  // Buscar inboxes e labels ao montar
  useEffect(() => {
    async function loadOptions() {
      try {
        const [inboxRes, labelRes, campaignsRes] = await Promise.all([
          fetch("/api/whatsapp/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "inboxes" }),
          }),
          fetch("/api/whatsapp/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId }),
          }),
          fetch("/api/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, page: 1, pageSize: 50 }),
          }),
        ]);

        const inboxData = await inboxRes.json();
        const labelData = await labelRes.json();
        const campaignsData = await campaignsRes.json();

        if (inboxData.inboxes) {
          setInboxes(
            inboxData.inboxes.map((i: { id: string; name?: string }) => ({
              id: String(i.id),
              name: i.name ?? `Inbox ${i.id}`,
            }))
          );
        }

        if (labelData.labels) {
          setLabels(
            labelData.labels.map((l: { id: string; name?: string; color?: string }) => ({
              id: String(l.id),
              name: l.name ?? `Label ${l.id}`,
              color: l.color,
            }))
          );
        }

        // Extrair templates únicos de campanhas anteriores
        if (campaignsData.campaigns) {
          const seen = new Set<string>();
          const templates: TemplateOption[] = [];
          for (const c of campaignsData.campaigns as Array<{ template_name: string; language: string }>) {
            if (c.template_name && !seen.has(c.template_name)) {
              seen.add(c.template_name);
              templates.push({ name: c.template_name, language: c.language ?? "pt_BR" });
            }
          }
          setTemplateSuggestions(templates);
        }
      } catch {
        // silently fail
      }
    }
    loadOptions();
  }, [companyId]);

  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
    setError(null);
  }, []);

  // Criar campanha (se ainda não criada) e gerar recipients
  const handleGenerateRecipients = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      let id = campaignId;

      if (!id) {
        // Criar a campanha primeiro
        const createRes = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            action: "create",
            name: data.name,
            template_name: data.template_name,
            language: data.language,
            body_params_template: data.body_params_template,
            header_params_template: data.header_params_template,
            inbox_id: data.inbox_id,
            filters: {
              labelIds: data.labelIds.length > 0 ? data.labelIds : undefined,
              gender: data.gender || undefined,
              createdAfter: data.createdAfter || undefined,
              createdBefore: data.createdBefore || undefined,
              importedPhones: importedPhones.length > 0 ? importedPhones : undefined,
            },
          }),
        });

        const createData = await createRes.json();
        if (createData.error) {
          setError(createData.error);
          return;
        }
        id = createData.campaign.id;
        setCampaignId(id);
      } else {
        // Atualizar filtros
        await fetch(`/api/campaigns/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            action: "update",
            filters: {
              labelIds: data.labelIds.length > 0 ? data.labelIds : undefined,
              gender: data.gender || undefined,
              createdAfter: data.createdAfter || undefined,
              createdBefore: data.createdBefore || undefined,
              importedPhones: importedPhones.length > 0 ? importedPhones : undefined,
            },
          }),
        });
      }

      // Gerar recipients
      const genRes = await fetch(`/api/campaigns/${id}/recipients/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      const genData = await genRes.json();
      if (genData.error) {
        setError(genData.error);
        return;
      }

      setRecipientCount(genData.generated);
    } catch {
      setError("Erro ao gerar lista de destinatários.");
    } finally {
      setGenerating(false);
    }
  }, [campaignId, companyId, data]);

  const handleSaveDraft = useCallback(async () => {
    if (campaignId) {
      router.push(`/campanhas/${campaignId}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          action: "create",
          name: data.name,
          template_name: data.template_name,
          language: data.language,
          body_params_template: data.body_params_template,
          header_params_template: data.header_params_template,
          inbox_id: data.inbox_id,
          filters: {
            labelIds: data.labelIds.length > 0 ? data.labelIds : undefined,
            gender: data.gender || undefined,
            importedPhones: importedPhones.length > 0 ? importedPhones : undefined,
          },
        }),
      });
      const result = await res.json();
      if (result.campaign) {
        router.push(`/campanhas/${result.campaign.id}`);
      }
    } catch {
      setError("Erro ao salvar rascunho.");
    } finally {
      setSaving(false);
    }
  }, [campaignId, companyId, data, router]);

  const handleStart = useCallback(async () => {
    if (!campaignId) return;

    setSaving(true);
    setError(null);

    try {
      // Atualizar agendamento se necessário
      if (!data.sendNow && data.scheduled_at) {
        await fetch(`/api/campaigns/${campaignId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            action: "update",
            scheduled_at: data.scheduled_at,
          }),
        });
      }

      const res = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      const result = await res.json();
      if (result.error) {
        setError(result.error);
        return;
      }

      router.push(`/campanhas/${campaignId}`);
    } catch {
      setError("Erro ao iniciar campanha.");
    } finally {
      setSaving(false);
    }
  }, [campaignId, companyId, data, router]);

  const canProceedStep = (s: number) => {
    switch (s) {
      case 0:
        return !!data.name && !!data.inbox_id && !!data.template_name;
      case 1:
        return recipientCount !== null && recipientCount > 0;
      case 2:
        return true;
      case 3:
        return data.sendNow || !!data.scheduled_at;
      default:
        return true;
    }
  };

  const stepItems = [
    { title: "Info Básica", icon: <FileText className="h-4 w-4" /> },
    { title: "Audiência", icon: <Users className="h-4 w-4" /> },
    { title: "Variáveis", icon: <Settings2 className="h-4 w-4" /> },
    { title: "Agendamento", icon: <Clock className="h-4 w-4" /> },
    { title: "Revisão", icon: <CheckCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8">
      <div className="antd-scope">
        <Steps current={step} items={stepItems} size="small" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        {/* Step 0: Info Básica */}
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Informações Básicas</h3>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Nome da Campanha
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => updateData({ name: e.target.value })}
                placeholder="Ex: Promoção de Março"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
              />
            </div>

            <div className="antd-scope">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Inbox (Conexão WhatsApp)
              </label>
              <Select
                value={data.inbox_id || undefined}
                onChange={(value) => updateData({ inbox_id: value })}
                placeholder="Selecione a inbox"
                options={inboxes.map((i) => ({ value: i.id, label: i.name }))}
                className="w-full"
              />
            </div>

            <div className="antd-scope">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Nome do Template (Meta)
              </label>
              <AutoComplete
                value={data.template_name}
                onChange={(value) => updateData({ template_name: value })}
                placeholder="Ex: promo_marco_2026"
                options={templateSuggestions.map((t) => ({
                  value: t.name,
                  label: (
                    <div className="flex items-center justify-between">
                      <span>{t.name}</span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">{t.language}</span>
                    </div>
                  ),
                }))}
                onSelect={(value) => {
                  const tpl = templateSuggestions.find((t) => t.name === value);
                  if (tpl) updateData({ template_name: value, language: tpl.language });
                }}
                className="w-full"
                filterOption={(input, option) =>
                  (option?.value as string)?.toLowerCase().includes(input.toLowerCase()) ?? false
                }
              />
              {templateSuggestions.length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  Sugestões baseadas em campanhas anteriores
                </p>
              )}
            </div>

            <div className="antd-scope">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Idioma
              </label>
              <Select
                value={data.language}
                onChange={(value) => updateData({ language: value })}
                options={LANGUAGE_OPTIONS}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Step 1: Audiência */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Selecionar Audiência</h3>

            <div className="antd-scope">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Filtrar por Labels
              </label>
              <Select
                mode="multiple"
                value={data.labelIds}
                onChange={(value) => updateData({ labelIds: value })}
                placeholder="Todas as labels (sem filtro)"
                options={labels.map((l) => ({ value: l.id, label: l.name }))}
                className="w-full"
                allowClear
              />
            </div>

            <div className="antd-scope">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Filtrar por Gênero
              </label>
              <Select
                value={data.gender || undefined}
                onChange={(value) => updateData({ gender: value ?? "" })}
                placeholder="Todos"
                options={[
                  { value: "", label: "Todos" },
                  { value: "M", label: "Masculino" },
                  { value: "F", label: "Feminino" },
                ]}
                className="w-full"
                allowClear
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Criado após
                </label>
                <input
                  type="date"
                  value={data.createdAfter}
                  onChange={(e) => updateData({ createdAfter: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Criado antes
                </label>
                <input
                  type="date"
                  value={data.createdBefore}
                  onChange={(e) => updateData({ createdBefore: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleGenerateRecipients}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1fba59] transition-colors disabled:opacity-60"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                {generating ? "Gerando lista..." : "Gerar Lista de Destinatários"}
              </button>

              <span className="text-xs text-[var(--color-text-tertiary)]">ou</span>

              <button
                type="button"
                onClick={() => setCsvModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sidebar)] transition-colors"
              >
                <Upload className="h-4 w-4" />
                Importar CSV
              </button>

              {recipientCount !== null && (
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {recipientCount} contato{recipientCount !== 1 ? "s" : ""} encontrado{recipientCount !== 1 ? "s" : ""}
                  {importedPhones.length > 0 && " (via CSV)"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Variáveis */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Personalização de Variáveis</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Defina os parâmetros do template. Use <code className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs">{"{{name}}"}</code> para o nome do contato,{" "}
              <code className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs">{"{{phone}}"}</code> para o telefone, ou texto fixo.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Parâmetros do Body (um por linha)
              </label>
              <textarea
                value={data.body_params_template.join("\n")}
                onChange={(e) =>
                  updateData({
                    body_params_template: e.target.value.split("\n").filter((l) => l.trim()),
                  })
                }
                rows={4}
                placeholder={"{{name}}\nTexto fixo aqui\n{{phone}}"}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366] font-mono"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Parâmetros do Header (opcional, um por linha)
              </label>
              <textarea
                value={data.header_params_template.join("\n")}
                onChange={(e) =>
                  updateData({
                    header_params_template: e.target.value.split("\n").filter((l) => l.trim()),
                  })
                }
                rows={2}
                placeholder={"{{name}}"}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366] font-mono"
              />
            </div>

            {data.body_params_template.length > 0 && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">
                  Preview com dados exemplo
                </h4>
                <div className="space-y-1 text-sm text-[var(--color-text)]">
                  {data.body_params_template.map((tpl, i) => (
                    <div key={i}>
                      <span className="text-[var(--color-text-tertiary)]">{i + 1}.</span>{" "}
                      {tpl
                        .replace(/\{\{name\}\}/g, "João Silva")
                        .replace(/\{\{phone\}\}/g, "+5511999999999")
                        .replace(/\{\{email\}\}/g, "joao@exemplo.com")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Agendamento */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Agendamento</h3>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => updateData({ sendNow: true, scheduled_at: null })}
                className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${
                  data.sendNow
                    ? "border-[#25D366] bg-[#E8F8EE]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                }`}
              >
                <div className="text-sm font-medium text-[var(--color-text)]">Enviar Agora</div>
                <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  A campanha inicia imediatamente após a confirmação.
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateData({ sendNow: false })}
                className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${
                  !data.sendNow
                    ? "border-[#25D366] bg-[#E8F8EE]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                }`}
              >
                <div className="text-sm font-medium text-[var(--color-text)]">Agendar</div>
                <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Escolha data e hora para o envio automático.
                </div>
              </button>
            </div>

            {!data.sendNow && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Data e Hora do Envio
                </label>
                <input
                  type="datetime-local"
                  value={data.scheduled_at ?? ""}
                  onChange={(e) => updateData({ scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] focus:border-[#25D366] focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                />
              </div>
            )}

            {recipientCount !== null && recipientCount > 0 && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                <h4 className="mb-1 text-xs font-medium uppercase text-[var(--color-text-secondary)]">
                  Estimativa de conclusão
                </h4>
                <p className="text-sm text-[var(--color-text)]">
                  {recipientCount} envios a ~3s cada ={" "}
                  <span className="font-medium">
                    ~{Math.ceil((recipientCount * 3) / 60)} minuto{Math.ceil((recipientCount * 3) / 60) !== 1 ? "s" : ""}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Revisão */}
        {step === 4 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Revisão Final</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">Campanha</h4>
                <p className="text-sm font-medium text-[var(--color-text)]">{data.name}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Template: {data.template_name} ({data.language})
                </p>
              </div>

              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">Audiência</h4>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {recipientCount ?? 0} destinatários
                </p>
                {data.labelIds.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    Filtrado por {data.labelIds.length} label{data.labelIds.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">Variáveis</h4>
                <p className="text-sm text-[var(--color-text)]">
                  {data.body_params_template.length} parâmetro{data.body_params_template.length !== 1 ? "s" : ""} no body
                </p>
                {data.header_params_template.length > 0 && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {data.header_params_template.length} no header
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">Envio</h4>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {data.sendNow ? "Imediato" : `Agendado`}
                </p>
                {!data.sendNow && data.scheduled_at && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {new Date(data.scheduled_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-40"
        >
          Voltar
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || !data.name}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-40"
          >
            Salvar Rascunho
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={!canProceedStep(step)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1fba59] transition-colors disabled:opacity-40"
            >
              Próximo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={saving || !campaignId || !recipientCount}
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1fba59] transition-colors disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {data.sendNow ? "Confirmar e Enviar" : "Confirmar e Agendar"}
            </button>
          )}
        </div>
      </div>
      <CsvImportModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImportComplete={(phones) => {
          setImportedPhones(phones);
          setRecipientCount(phones.length);
          updateData({ labelIds: [] });
          setCsvModalOpen(false);
        }}
      />
    </div>
  );
}
