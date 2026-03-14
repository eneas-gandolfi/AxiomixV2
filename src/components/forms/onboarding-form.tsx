/**
 * Arquivo: src/components/forms/onboarding-form.tsx
 * Propósito: Formulário de onboarding para criação da empresa.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  type ChangeEvent,
  type FormEvent,
  useState,
  useEffect,
} from "react";
import { Building2, Globe, Layers, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Nome da empresa é obrigatório."),
  niche: z.string().trim().min(2, "Nicho é obrigatório."),
  subNiche: z.string().trim().optional(),
  websiteUrl: z.string().trim().url("URL do site inválida.").optional().or(z.literal("")),
});

type OnboardingFields = {
  name: string;
  niche: string;
  subNiche: string;
  websiteUrl: string;
};

type OnboardingErrors = {
  name?: string;
  niche?: string;
  subNiche?: string;
  websiteUrl?: string;
  form?: string;
};

type StepKey = 1 | 2 | 3;

const STEPS = [
  { step: 1, label: "Empresa", icon: Building2 },
  { step: 2, label: "Nicho", icon: Layers },
  { step: 3, label: "Site", icon: Globe },
];

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>(1);
  const [fields, setFields] = useState<OnboardingFields>({
    name: "",
    niche: "",
    subNiche: "",
    websiteUrl: "",
  });
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleChange =
    (field: keyof OnboardingFields) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFields((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
    };

  const canGoNext = () => {
    if (step === 1) return fields.name.trim().length >= 2;
    if (step === 2) return fields.niche.trim().length >= 2;
    return true;
  };

  const goNext = () => {
    if (step === 1 && fields.name.trim().length < 2) {
      setErrors({ name: "Nome da empresa é obrigatório." });
      return;
    }
    if (step === 2 && fields.niche.trim().length < 2) {
      setErrors({ niche: "Nicho é obrigatório." });
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
        const field = issue.path[0];
        if (field === "name") {
          nextErrors.name = issue.message;
        }
        if (field === "niche") {
          nextErrors.niche = issue.message;
        }
        if (field === "subNiche") {
          nextErrors.subNiche = issue.message;
        }
        if (field === "websiteUrl") {
          nextErrors.websiteUrl = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    const request = await fetch("/api/onboarding/company", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const response = (await request.json()) as { error?: string; redirectTo?: string };
    setIsLoading(false);

    if (!request.ok) {
      setErrors({ form: response.error ?? "Não foi possível concluir onboarding." });
      return;
    }

    setToast("Empresa criada! Configure as integrações para começar.");

    setTimeout(() => {
      router.push(response.redirectTo ?? "/settings?tab=integrations");
      router.refresh();
    }, 1200);
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-semibold text-text tracking-wide">AXIOMIX</span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((config, index) => {
            const isCompleted = step > config.step;
            const isActive = step === config.step;

            return (
              <div key={config.step} className="flex items-center">
                {/* Step circle */}
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
                    {isCompleted ? <Check className="h-4 w-4" /> : config.step}
                  </div>
                  <span
                    className={`text-xs mt-1.5 ${
                      isActive ? "text-primary font-medium" : "text-muted-light"
                    }`}
                  >
                    {config.label}
                  </span>
                </div>

                {/* Connector line */}
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
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Company name */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">Dados da empresa</h2>
                  <p className="text-sm text-muted mt-1">
                    Como se chama a sua empresa?
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company-name" className="text-sm font-medium text-text">
                    Nome da empresa <span className="text-primary">*</span>
                  </label>
                  <input
                    id="company-name"
                    value={fields.name}
                    onChange={handleChange("name")}
                    autoFocus
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="Axiomix Marketing"
                  />
                  {errors.name ? <p className="text-xs text-danger">{errors.name}</p> : null}
                </div>
              </div>
            )}

            {/* Step 2: Niche */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">Nicho de atuação</h2>
                  <p className="text-sm text-muted mt-1">
                    Essas informações personalizam inteligência e conteúdo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company-niche" className="text-sm font-medium text-text">
                    Nicho <span className="text-primary">*</span>
                  </label>
                  <input
                    id="company-niche"
                    value={fields.niche}
                    onChange={handleChange("niche")}
                    autoFocus
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="Marketing digital"
                  />
                  {errors.niche ? <p className="text-xs text-danger">{errors.niche}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company-subniche" className="text-sm font-medium text-text">
                    Subnicho <span className="text-xs text-muted-light font-normal">(opcional)</span>
                  </label>
                  <input
                    id="company-subniche"
                    value={fields.subNiche}
                    onChange={handleChange("subNiche")}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="E-commerce de moda"
                  />
                  {errors.subNiche ? <p className="text-xs text-danger">{errors.subNiche}</p> : null}
                </div>
              </div>
            )}

            {/* Step 3: Website */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">Site da empresa</h2>
                  <p className="text-sm text-muted mt-1">
                    Se tiver um site, informe a URL. Isso é opcional.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company-site" className="text-sm font-medium text-text">
                    URL do site <span className="text-xs text-muted-light font-normal">(opcional)</span>
                  </label>
                  <input
                    id="company-site"
                    value={fields.websiteUrl}
                    onChange={handleChange("websiteUrl")}
                    autoFocus
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="https://www.empresa.com.br"
                  />
                  {errors.websiteUrl ? <p className="text-xs text-danger">{errors.websiteUrl}</p> : null}
                </div>
              </div>
            )}

            {/* Error */}
            {errors.form ? (
              <div className="mt-4 rounded-lg bg-danger-light border border-danger/20 p-3">
                <p className="text-sm text-danger">{errors.form}</p>
              </div>
            ) : null}

            {/* Navigation */}
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
                <Button type="button" onClick={goNext} disabled={!canGoNext()}>
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

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-light mt-6">
          Etapa {step} de {STEPS.length}
        </p>
      </div>

      {/* Success toast */}
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
