/**
 * Arquivo: src/components/forms/company-settings-form.tsx
 * Propósito: Formulário pra editar dados da empresa em /settings — agora com
 *            grid curado de nichos e editor de horário de atendimento (espelho
 *            do onboarding multi-nicho).
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

"use client";

import { z } from "zod";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  HeartPulse,
  Sparkles,
  GraduationCap,
  Scale,
  Wrench,
  Briefcase,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NICHES,
  NICHE_SLUGS,
  type BusinessHours,
  type DayOfWeek,
  type NicheSlug,
  formatThresholdLabel,
  getNicheBySlug,
} from "@/lib/niches";

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

const NICHE_ICON_MAP: Record<string, LucideIcon> = {
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  HeartPulse,
  Sparkles,
  GraduationCap,
  Scale,
  Wrench,
  Briefcase,
  MoreHorizontal,
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

const DAY_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const EMPTY_BUSINESS_HOURS: BusinessHours = {
  mon: null,
  tue: null,
  wed: null,
  thu: null,
  fri: null,
  sat: null,
  sun: null,
};

const dayScheduleSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .nullable();

const businessHoursSchema = z.object({
  mon: dayScheduleSchema,
  tue: dayScheduleSchema,
  wed: dayScheduleSchema,
  thu: dayScheduleSchema,
  fri: dayScheduleSchema,
  sat: dayScheduleSchema,
  sun: dayScheduleSchema,
});

const companySchema = z.object({
  name: z.string().trim().min(2, "Nome inválido."),
  nicheSlug: z.enum(NICHE_SLUGS, { message: "Selecione um nicho." }),
  businessHours: businessHoursSchema,
  websiteUrl: z.string().trim().url("Website inválido.").optional().or(z.literal("")),
  timezone: z.string().trim().min(3, "Timezone inválido."),
  logoUrl: z.string().trim().url("URL do logo inválida.").optional().or(z.literal("")),
});

type CompanyFormFields = {
  name: string;
  nicheSlug: NicheSlug | "";
  businessHours: BusinessHours;
  websiteUrl: string;
  timezone: string;
  logoUrl: string;
};

type CompanyFormErrors = {
  name?: string;
  nicheSlug?: string;
  businessHours?: string;
  websiteUrl?: string;
  timezone?: string;
  logoUrl?: string;
  form?: string;
};

type CompanyApiResponse = {
  company?: {
    name: string | null;
    niche: string | null;
    nicheSlug: string | null;
    businessHours: unknown;
    websiteUrl: string | null;
    timezone: string | null;
    logoUrl: string | null;
  };
  error?: string;
};

function isBusinessHours(value: unknown): value is BusinessHours {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return DAY_ORDER.every((day) => day in obj);
}

export function CompanySettingsForm() {
  const [fields, setFields] = useState<CompanyFormFields>({
    name: "",
    nicheSlug: "",
    businessHours: EMPTY_BUSINESS_HOURS,
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
      const request = await fetch("/api/company", { method: "GET" });
      const data = (await request.json()) as CompanyApiResponse;

      if (!mounted) return;

      if (!request.ok) {
        setErrors({ form: data.error ?? "Não foi possível carregar dados da empresa." });
        setIsLoading(false);
        return;
      }

      const slug = data.company?.nicheSlug;
      const validSlug = slug && (NICHE_SLUGS as readonly string[]).includes(slug)
        ? (slug as NicheSlug)
        : "";

      const incomingHours = data.company?.businessHours;
      const initialHours = isBusinessHours(incomingHours) ? incomingHours : EMPTY_BUSINESS_HOURS;

      setFields({
        name: data.company?.name ?? "",
        nicheSlug: validSlug,
        businessHours: initialHours,
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

  const handleStringChange = (field: keyof Pick<CompanyFormFields, "name" | "websiteUrl" | "timezone" | "logoUrl">) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setFields((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
      setFeedback(null);
    };

  const selectNiche = (slug: NicheSlug, replaceHoursIfEmpty = true) => {
    const definition = getNicheBySlug(slug);
    setFields((previous) => {
      const allEmpty = DAY_ORDER.every((d) => previous.businessHours[d] === null);
      const nextHours = replaceHoursIfEmpty && allEmpty ? definition.defaultBusinessHours : previous.businessHours;
      return {
        ...previous,
        nicheSlug: slug,
        businessHours: nextHours,
      };
    });
    setErrors((previous) => ({ ...previous, nicheSlug: undefined, form: undefined }));
    setFeedback(null);
  };

  const applyNicheDefaultHours = () => {
    if (!fields.nicheSlug) return;
    const definition = getNicheBySlug(fields.nicheSlug);
    setFields((previous) => ({ ...previous, businessHours: definition.defaultBusinessHours }));
    setFeedback(null);
  };

  const toggleDay = (day: DayOfWeek) => {
    setFields((previous) => {
      const current = previous.businessHours[day];
      const next: BusinessHours = {
        ...previous.businessHours,
        [day]: current ? null : { open: "09:00", close: "18:00" },
      };
      return { ...previous, businessHours: next };
    });
    setFeedback(null);
  };

  const updateDayTime = (day: DayOfWeek, field: "open" | "close", value: string) => {
    setFields((previous) => {
      const current = previous.businessHours[day];
      if (!current) return previous;
      const next: BusinessHours = {
        ...previous.businessHours,
        [day]: { ...current, [field]: value },
      };
      return { ...previous, businessHours: next };
    });
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
        if (field === "nicheSlug") nextErrors.nicheSlug = issue.message;
        if (field === "businessHours") nextErrors.businessHours = issue.message;
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
      headers: { "Content-Type": "application/json" },
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

  const selectedNiche = useMemo(
    () => (fields.nicheSlug ? getNicheBySlug(fields.nicheSlug) : null),
    [fields.nicheSlug],
  );

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-text">Empresa</CardTitle>
          <CardDescription className="text-muted">
            Atualize dados principais visíveis para o time. Nicho e horário definem
            <em> thresholds</em> e a janela de exclusão do TFR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted">Carregando dados da empresa...</p>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Nome */}
              <div className="space-y-1">
                <label htmlFor="company-name" className="text-sm font-medium text-text">
                  Nome da empresa
                </label>
                <input
                  id="company-name"
                  value={fields.name}
                  onChange={handleStringChange("name")}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                />
                {errors.name ? <p className="text-xs text-danger">{errors.name}</p> : null}
              </div>

              {/* Nicho — grid curado */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="text-sm font-medium text-text">Nicho</label>
                  {selectedNiche ? (
                    <span className="font-mono text-[11px] text-muted-light">
                      Threshold: {formatThresholdLabel(selectedNiche.thresholdAmberSeconds)} /
                      {" "}{formatThresholdLabel(selectedNiche.thresholdRedSeconds)}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {NICHES.map((niche) => {
                    const Icon = NICHE_ICON_MAP[niche.iconName];
                    const isSelected = fields.nicheSlug === niche.slug;
                    return (
                      <button
                        key={niche.slug}
                        type="button"
                        onClick={() => selectNiche(niche.slug)}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-border-strong hover:bg-surface-2"
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                            isSelected ? "bg-primary text-white" : "bg-surface-2 text-muted"
                          }`}
                        >
                          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                        </div>
                        <span className="text-sm font-semibold text-text">{niche.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedNiche ? (
                  <p className="text-xs text-muted-light">{selectedNiche.description}</p>
                ) : null}
                {errors.nicheSlug ? (
                  <p className="text-xs text-danger">{errors.nicheSlug}</p>
                ) : null}
              </div>

              {/* Horário */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="text-sm font-medium text-text">Horário de atendimento</label>
                  {selectedNiche ? (
                    <button
                      type="button"
                      onClick={applyNicheDefaultHours}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Aplicar padrão de {selectedNiche.label}
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-muted">
                  Fora dessa janela o cronômetro do TFR pausa.
                </p>
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {DAY_ORDER.map((day) => {
                    const schedule = fields.businessHours[day];
                    const isOpen = schedule !== null;
                    return (
                      <div key={day} className="flex items-center gap-3 py-3 px-4">
                        <span className="w-20 text-sm font-medium text-text">
                          {DAY_LABELS[day]}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${
                            isOpen ? "bg-primary" : "bg-border"
                          }`}
                          aria-pressed={isOpen}
                          aria-label={isOpen ? `Desativar ${DAY_LABELS[day]}` : `Ativar ${DAY_LABELS[day]}`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                              isOpen ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        {isOpen ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              type="time"
                              value={schedule.open}
                              onChange={(e) => updateDayTime(day, "open", e.target.value)}
                              className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-sm text-text focus:outline-none focus:border-primary"
                            />
                            <span className="text-muted-light">—</span>
                            <input
                              type="time"
                              value={schedule.close}
                              onChange={(e) => updateDayTime(day, "close", e.target.value)}
                              className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-sm text-text focus:outline-none focus:border-primary"
                            />
                          </div>
                        ) : (
                          <span className="flex-1 text-sm italic text-muted-light">Fechado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Website + Logo + Timezone — grid 2 colunas */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="company-website" className="text-sm font-medium text-text">
                    Website <span className="text-muted-light">(opcional)</span>
                  </label>
                  <input
                    id="company-website"
                    type="url"
                    value={fields.websiteUrl}
                    onChange={handleStringChange("websiteUrl")}
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
                    onChange={handleStringChange("logoUrl")}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="https://cdn.empresa.com/logo.png"
                  />
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
                      onChange={handleStringChange("timezone")}
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
                  {errors.timezone ? <p className="text-xs text-danger">{errors.timezone}</p> : null}
                </div>
              </div>

              {errors.form ? <p className="text-sm text-danger">{errors.form}</p> : null}
              {feedback ? <p className="text-sm text-success">{feedback}</p> : null}

              <div className="flex">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar dados da empresa"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
