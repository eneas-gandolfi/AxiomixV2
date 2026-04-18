/**
 * Arquivo: src/components/forms/company-settings-form.tsx
 * Propósito: Formulário para editar dados da empresa em /settings.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { z } from "zod";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BR_TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3) — São Paulo" },
  { value: "America/Bahia", label: "Brasília (GMT-3) — Bahia" },
  { value: "America/Fortaleza", label: "Brasília (GMT-3) — Fortaleza" },
  { value: "America/Recife", label: "Brasília (GMT-3) — Recife" },
  { value: "America/Belem", label: "Brasília (GMT-3) — Belém" },
  { value: "America/Manaus", label: "Amazonas (GMT-4) — Manaus" },
  { value: "America/Cuiaba", label: "Amazonas (GMT-4) — Cuiabá" },
  { value: "America/Porto_Velho", label: "Amazonas (GMT-4) — Porto Velho" },
  { value: "America/Rio_Branco", label: "Acre (GMT-5) — Rio Branco" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
];

const companySchema = z.object({
  name: z.string().trim().min(2, "Nome inválido."),
  niche: z.string().trim().min(2, "Nicho inválido."),
  subNiche: z.string().trim().max(120, "Sub-nicho muito longo.").optional().or(z.literal("")),
  websiteUrl: z.string().trim().url("Website inválido.").optional().or(z.literal("")),
  timezone: z.string().trim().min(3, "Timezone inválido."),
  logoUrl: z.string().trim().url("URL do logo inválida.").optional().or(z.literal("")),
});

type CompanyFormFields = {
  name: string;
  niche: string;
  subNiche: string;
  websiteUrl: string;
  timezone: string;
  logoUrl: string;
};

type CompanyFormErrors = {
  name?: string;
  niche?: string;
  subNiche?: string;
  websiteUrl?: string;
  timezone?: string;
  logoUrl?: string;
  form?: string;
};

type CompanyApiResponse = {
  company?: {
    name: string | null;
    niche: string | null;
    subNiche: string | null;
    websiteUrl: string | null;
    timezone: string | null;
    logoUrl: string | null;
  };
  error?: string;
};

export function CompanySettingsForm() {
  const [fields, setFields] = useState<CompanyFormFields>({
    name: "",
    niche: "",
    subNiche: "",
    websiteUrl: "",
    timezone: "America/Sao_Paulo",
    logoUrl: "",
  });
  const [errors, setErrors] = useState<CompanyFormErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCompany() {
      const request = await fetch("/api/company", {
        method: "GET",
      });

      const data = (await request.json()) as CompanyApiResponse;

      if (!mounted) {
        return;
      }

      if (!request.ok) {
        setErrors({ form: data.error ?? "Não foi possível carregar dados da empresa." });
        setIsLoading(false);
        return;
      }

      setFields({
        name: data.company?.name ?? "",
        niche: data.company?.niche ?? "",
        subNiche: data.company?.subNiche ?? "",
        websiteUrl: data.company?.websiteUrl ?? "",
        timezone: data.company?.timezone ?? "America/Sao_Paulo",
        logoUrl: data.company?.logoUrl ?? "",
      });
      setIsLoading(false);
    }

    loadCompany();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (field: keyof CompanyFormFields) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setFields((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
      setFeedback(null);
    };

  const handleDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setFields((previous) => ({ ...previous, timezone: detected }));
        setErrors((previous) => ({ ...previous, timezone: undefined, form: undefined }));
        setFeedback(null);
      }
    } catch {
      // Fallback silencioso se Intl não estiver disponível.
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = companySchema.safeParse(fields);

    if (!parsed.success) {
      const nextErrors: CompanyFormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "name") nextErrors.name = issue.message;
        if (field === "niche") nextErrors.niche = issue.message;
        if (field === "subNiche") nextErrors.subNiche = issue.message;
        if (field === "websiteUrl") nextErrors.websiteUrl = issue.message;
        if (field === "timezone") nextErrors.timezone = issue.message;
        if (field === "logoUrl") nextErrors.logoUrl = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    const request = await fetch("/api/company", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const response = (await request.json()) as CompanyApiResponse;
    setIsSaving(false);

    if (!request.ok) {
      setErrors({ form: response.error ?? "Falha ao salvar empresa." });
      return;
    }

    setFeedback("Dados da empresa atualizados com sucesso.");
  };

  return (
    <Card className="max-w-3xl border border-border rounded-xl">
      <CardHeader>
        <CardTitle className="text-text">Empresa</CardTitle>
        <CardDescription className="text-muted">Atualize dados principais visíveis para o time.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted">Carregando dados da empresa...</p>
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="company-name" className="text-sm font-medium text-text">
                Nome da empresa
              </label>
              <input
                id="company-name"
                value={fields.name}
                onChange={handleChange("name")}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              />
              {errors.name ? <p className="text-xs text-danger">{errors.name}</p> : null}
            </div>

            <div className="space-y-1">
              <label htmlFor="company-niche" className="text-sm font-medium text-text">
                Nicho
              </label>
              <input
                id="company-niche"
                value={fields.niche}
                onChange={handleChange("niche")}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              />
              {errors.niche ? <p className="text-xs text-danger">{errors.niche}</p> : null}
            </div>

            <div className="space-y-1">
              <label htmlFor="company-sub-niche" className="text-sm font-medium text-text">
                Sub-nicho <span className="text-muted-light">(opcional)</span>
              </label>
              <input
                id="company-sub-niche"
                value={fields.subNiche}
                onChange={handleChange("subNiche")}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Ex.: SaaS B2B para imobiliárias"
              />
              {errors.subNiche ? <p className="text-xs text-danger">{errors.subNiche}</p> : null}
            </div>

            <div className="space-y-1">
              <label htmlFor="company-website" className="text-sm font-medium text-text">
                Website <span className="text-muted-light">(opcional)</span>
              </label>
              <input
                id="company-website"
                type="url"
                value={fields.websiteUrl}
                onChange={handleChange("websiteUrl")}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="https://empresa.com.br"
              />
              {errors.websiteUrl ? <p className="text-xs text-danger">{errors.websiteUrl}</p> : null}
            </div>

            <div className="space-y-1">
              <label htmlFor="company-logo" className="text-sm font-medium text-text">
                URL do logo <span className="text-muted-light">(opcional)</span>
              </label>
              <input
                id="company-logo"
                value={fields.logoUrl}
                onChange={handleChange("logoUrl")}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="https://cdn.empresa.com/logo.png"
              />
              <p className="text-xs text-muted">Cole a URL completa do logo da empresa</p>
              {errors.logoUrl ? <p className="text-xs text-danger">{errors.logoUrl}</p> : null}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="company-timezone" className="text-sm font-medium text-text">
                Fuso horário
              </label>
              <div className="flex gap-2">
                <select
                  id="company-timezone"
                  value={fields.timezone}
                  onChange={handleChange("timezone")}
                  className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-text hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                >
                  {BR_TIMEZONES.some((tz) => tz.value === fields.timezone) ? null : (
                    <option value={fields.timezone}>{fields.timezone}</option>
                  )}
                  {BR_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={handleDetectTimezone}>
                  Detectar do navegador
                </Button>
              </div>
              <p className="text-xs text-muted">
                Usado para agendamentos, relatórios e horários proativos.
              </p>
              {errors.timezone ? <p className="text-xs text-danger">{errors.timezone}</p> : null}
            </div>

            {errors.form ? <p className="text-sm text-danger md:col-span-2">{errors.form}</p> : null}
            {feedback ? <p className="text-sm text-success md:col-span-2">{feedback}</p> : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar dados da empresa"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
