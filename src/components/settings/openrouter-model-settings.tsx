/**
 * Arquivo: src/components/settings/openrouter-model-settings.tsx
 * Propósito: Seletor de modelo OpenRouter para módulos de IA da empresa.
 * Autor: AXIOMIX
 * Data: 2026-04-18
 */

"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ModelOption = {
  value: string;
  label: string;
  hint: string;
};

// IDs verificados vivos na API do OpenRouter em 2026-07-29. Modelo removido
// do OpenRouter responde 404 e derruba as features de IA pro fallback.
const MODEL_OPTIONS: ModelOption[] = [
  {
    value: "google/gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    hint: "Mais barato. Bom para tarefas simples e alto volume.",
  },
  {
    value: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    hint: "Equilíbrio entre custo e qualidade. Bom para produção.",
  },
  {
    value: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    hint: "Rápido e barato da OpenAI. Boa escrita em português.",
  },
  {
    value: "openai/gpt-5-nano",
    label: "GPT-5 Nano",
    hint: "Modelo leve padrão para tarefas sem alta complexidade.",
  },
  {
    value: "anthropic/claude-sonnet-5",
    label: "Claude Sonnet 5",
    hint: "Alta qualidade. Use quando precisar do melhor.",
  },
];

type OpenRouterModelResponse = {
  model?: string;
  isCustom?: boolean;
  envDefault?: string;
  error?: string;
};

export function OpenRouterModelSettings() {
  const [selected, setSelected] = useState<string>("");
  const [envDefault, setEnvDefault] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const request = await fetch("/api/settings/openrouter/model", { method: "GET" });
      const data = (await request.json()) as OpenRouterModelResponse;
      if (!mounted) return;

      if (!request.ok) {
        setErrorMessage(data.error ?? "Falha ao carregar modelo.");
        setIsLoading(false);
        return;
      }

      setSelected(data.model ?? "");
      setEnvDefault(data.envDefault ?? "");
      setIsCustom(Boolean(data.isCustom));
      setIsLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelected(event.target.value);
    setFeedback(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected.trim()) {
      setErrorMessage("Selecione um modelo.");
      return;
    }
    setIsSaving(true);
    const request = await fetch("/api/settings/openrouter/model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selected }),
    });
    const data = (await request.json()) as OpenRouterModelResponse;
    setIsSaving(false);

    if (!request.ok) {
      setErrorMessage(data.error ?? "Falha ao salvar modelo.");
      return;
    }

    setIsCustom(true);
    setFeedback("Modelo atualizado. Próximas chamadas de IA já usarão essa seleção.");
  };

  const optionInList = MODEL_OPTIONS.some((option) => option.value === selected);
  const currentHint = MODEL_OPTIONS.find((option) => option.value === selected)?.hint;

  return (
    <Card className="mt-4 border border-border rounded-xl">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Brain className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base font-semibold text-text">Modelo de IA (OpenRouter)</CardTitle>
            <CardDescription className="text-muted">
              Modelo usado em WhatsApp Intelligence, Agente de Grupo, relatórios e RAG.
              A chave de API continua configurada no servidor.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted">Carregando modelo atual...</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label htmlFor="openrouter-model" className="text-sm font-medium text-text">
                Modelo
              </label>
              <select
                id="openrouter-model"
                value={selected}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text hover:border-border-strong focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
              >
                {!optionInList && selected ? (
                  <option value={selected}>{selected} (customizado)</option>
                ) : null}
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {currentHint ? <p className="text-xs text-muted">{currentHint}</p> : null}
            </div>

            <div className="rounded-lg border border-border bg-sidebar p-3 text-xs text-muted-light">
              <p>
                <span className="font-medium text-text">Padrão do servidor:</span>{" "}
                {envDefault || "google/gemini-3.5-flash-lite"}
              </p>
              <p className="mt-1">
                {isCustom
                  ? "Você está usando um modelo customizado para esta empresa."
                  : "Você está usando o padrão do servidor."}
              </p>
            </div>

            {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
            {feedback ? <p className="text-sm text-success">{feedback}</p> : null}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar modelo"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
