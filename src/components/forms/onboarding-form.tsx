/**
 * Arquivo: src/components/forms/onboarding-form.tsx
 * Propósito: Formulário de onboarding em 3 passos — nome, nicho (curado),
 *            horário de atendimento. O horário define a janela de exclusão
 *            do TFR (cronômetro pausa fora dela).
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  type ChangeEvent,
  type FormEvent,
  useState,
  useEffect,
  useMemo,
} from "react";
import {
  Building2,
  Layers,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
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
import {
  NICHES,
  NICHE_SLUGS,
  type BusinessHours,
  type DayOfWeek,
  type NicheSlug,
  formatThresholdLabel,
  getNicheBySlug,
} from "@/lib/niches";

// =============================================================================
// Schema (zod) e tipos do formulário
// =============================================================================

const businessHoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z
    .object({
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .nullable(),
);

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Nome da empresa é obrigatório."),
  nicheSlug: z.enum(NICHE_SLUGS, { message: "Selecione um nicho." }),
  businessHours: businessHoursSchema,
});

type OnboardingFields = {
  name: string;
  nicheSlug: NicheSlug | "";
  businessHours: BusinessHours;
};

type OnboardingErrors = {
  name?: string;
  nicheSlug?: string;
  form?: string;
};

type StepKey = 1 | 2 | 3;

const STEPS = [
  { step: 1, label: "Empresa", icon: Building2 },
  { step: 2, label: "Nicho", icon: Layers },
  { step: 3, label: "Horário", icon: Clock },
] as const;

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

const DAY_ORDER: DayOfWeek[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
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

const EMPTY_BUSINESS_HOURS: BusinessHours = {
  mon: null,
  tue: null,
  wed: null,
  thu: null,
  fri: null,
  sat: null,
  sun: null,
};

// =============================================================================
// Componente
// =============================================================================

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>(1);
  const [fields, setFields] = useState<OnboardingFields>({
    name: "",
    nicheSlug: "",
    businessHours: EMPTY_BUSINESS_HOURS,
  });
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFields((previous) => ({ ...previous, name: event.target.value }));
    setErrors((previous) => ({ ...previous, name: undefined, form: undefined }));
  };

  const selectNiche = (slug: NicheSlug) => {
    const definition = getNicheBySlug(slug);
    setFields((previous) => ({
      ...previous,
      nicheSlug: slug,
      // Pré-popula horário com o default do nicho na primeira seleção,
      // mas preserva edições manuais se o usuário voltou e mudou de nicho.
      businessHours: definition.defaultBusinessHours,
    }));
    setErrors((previous) => ({ ...previous, nicheSlug: undefined, form: undefined }));
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
  };

  const updateDayTime = (
    day: DayOfWeek,
    field: "open" | "close",
    value: string,
  ) => {
    setFields((previous) => {
      const current = previous.businessHours[day];
      if (!current) return previous;
      const next: BusinessHours = {
        ...previous.businessHours,
        [day]: { ...current, [field]: value },
      };
      return { ...previous, businessHours: next };
    });
  };

  const canGoNext = () => {
    if (step === 1) return fields.name.trim().length >= 2;
    if (step === 2) return fields.nicheSlug !== "";
    return true;
  };

  const goNext = () => {
    if (step === 1 && fields.name.trim().length < 2) {
      setErrors({ name: "Nome da empresa é obrigatório." });
      return;
    }
    if (step === 2 && fields.nicheSlug === "") {
      setErrors({ nicheSlug: "Selecione um nicho para continuar." });
      return;
    }
    if (step < 3) {
      setErrors({});
      setStep((s) => (s + 1) as StepKey);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setErrors({});
      setStep((s) => (s - 1) as StepKey);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = onboardingSchema.safeParse(fields);
    if (!parsed.success) {
      const nextErrors: OnboardingErrors = {};
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0];
        if (fieldName === "name") nextErrors.name = issue.message;
        if (fieldName === "nicheSlug") nextErrors.nicheSlug = issue.message;
      }
      if (!nextErrors.name && !nextErrors.nicheSlug) {
        nextErrors.form = "Verifique os campos e tente novamente.";
      }
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    const request = await fetch("/api/onboarding/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const response = (await request.json()) as {
      error?: string;
      redirectTo?: string;
    };
    setIsLoading(false);

    if (!request.ok) {
      setErrors({
        form: response.error ?? "Não foi possível concluir o onboarding.",
      });
      return;
    }

    setToast("Empresa criada! Conecte o WhatsApp para começar.");

    setTimeout(() => {
      router.push(response.redirectTo ?? "/whatsapp-intelligence/operacao");
      router.refresh();
    }, 1200);
  };

  const selectedNiche = useMemo(
    () => (fields.nicheSlug ? getNicheBySlug(fields.nicheSlug) : null),
    [fields.nicheSlug],
  );

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-semibold text-text tracking-wide">
            AXIOMIX
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((config, index) => {
            const isCompleted = step > config.step;
            const isActive = step === config.step;

            return (
              <div key={config.step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      isCompleted
                        ? "bg-primary text-white"
                        : isActive
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-border text-muted-light"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      config.step
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1.5 ${
                      isActive ? "text-primary font-medium" : "text-muted-light"
                    }`}
                  >
                    {config.label}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div className="w-16 h-0.5 mx-2 mb-5">
                    <div
                      className={`h-full rounded-full ${
                        isCompleted ? "bg-primary" : "bg-border"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{
              width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Nome da empresa */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <p className="section-label mb-2">Passo 1 de 3 · Empresa</p>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-text sm:text-2xl">
                    Vamos começar.
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Como sua empresa se chama?
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="company-name"
                    className="text-sm font-medium text-text"
                  >
                    Nome da empresa <span className="text-primary">*</span>
                  </label>
                  <input
                    id="company-name"
                    value={fields.name}
                    onChange={handleNameChange}
                    autoFocus
                    className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Boutique Belavista"
                  />
                  {errors.name ? (
                    <p className="text-xs text-danger">{errors.name}</p>
                  ) : (
                    <p className="text-xs text-muted-light">
                      Você pode editar isso depois em Configurações.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Nicho (grid curado) */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="section-label mb-2">Passo 2 de 3 · Nicho</p>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-text sm:text-2xl">
                    Qual o nicho da {fields.name || "empresa"}?
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Vamos calibrar os <em>thresholds</em> e o vocabulário pro
                    seu negócio.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {NICHES.map((niche) => {
                    const Icon = NICHE_ICON_MAP[niche.iconName];
                    const isSelected = fields.nicheSlug === niche.slug;

                    return (
                      <button
                        key={niche.slug}
                        type="button"
                        onClick={() => selectNiche(niche.slug)}
                        className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-border-strong hover:bg-surface-2"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-surface-2 text-muted"
                          }`}
                        >
                          {Icon ? <Icon className="h-4 w-4" /> : null}
                        </div>
                        <span className="text-sm font-semibold text-text">
                          {niche.label}
                        </span>
                        <span className="font-mono text-[10px] text-muted-light">
                          {formatThresholdLabel(niche.thresholdAmberSeconds)} /
                          {" "}
                          {formatThresholdLabel(niche.thresholdRedSeconds)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedNiche ? (
                  <p className="text-xs text-muted-light">
                    {selectedNiche.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-light">
                    Selecione o que mais se aproxima — ajustamos depois.
                  </p>
                )}

                {errors.nicheSlug ? (
                  <p className="text-xs text-danger">{errors.nicheSlug}</p>
                ) : null}
              </div>
            )}

            {/* Step 3: Horário de atendimento */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="section-label mb-2">Passo 3 de 3 · Horário</p>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-text sm:text-2xl">
                    Quando vocês atendem?
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Fora dessa janela o cronômetro pausa — atendentes não são
                    cobrados injustamente.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  {DAY_ORDER.map((day) => {
                    const schedule = fields.businessHours[day];
                    const isOpen = schedule !== null;

                    return (
                      <div
                        key={day}
                        className="flex items-center gap-3 py-3 px-4"
                      >
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
                          aria-label={
                            isOpen
                              ? `Desativar ${DAY_LABELS[day]}`
                              : `Ativar ${DAY_LABELS[day]}`
                          }
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
                              onChange={(e) =>
                                updateDayTime(day, "open", e.target.value)
                              }
                              className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-sm text-text focus:outline-none focus:border-primary"
                            />
                            <span className="text-muted-light">—</span>
                            <input
                              type="time"
                              value={schedule.close}
                              onChange={(e) =>
                                updateDayTime(day, "close", e.target.value)
                              }
                              className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-sm text-text focus:outline-none focus:border-primary"
                            />
                          </div>
                        ) : (
                          <span className="flex-1 text-sm italic text-muted-light">
                            Fechado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-light">
                  Sugestão default pro nicho{" "}
                  <strong className="text-text">
                    {selectedNiche?.label ?? "selecionado"}
                  </strong>
                  . Você ajusta sempre que precisar.
                </p>
              </div>
            )}

            {/* Erro de submit */}
            {errors.form ? (
              <div className="mt-4 rounded-lg bg-danger-light border border-danger/20 p-3">
                <p className="text-sm text-danger">{errors.form}</p>
              </div>
            ) : null}

            {/* Navegação */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              {step > 1 ? (
                <Button type="button" variant="ghost" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext()}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Criando empresa..." : "Concluir"}
                </Button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-light mt-6">
          Etapa {step} de {STEPS.length}
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2 bg-success-light border border-success/20 rounded-lg px-4 py-3 shadow-[0_4px_16px_rgba(28,25,23,0.08)]">
            <Check className="h-4 w-4 text-success" />
            <p className="text-sm text-success font-medium">{toast}</p>
          </div>
        </div>
      )}
    </>
  );
}
