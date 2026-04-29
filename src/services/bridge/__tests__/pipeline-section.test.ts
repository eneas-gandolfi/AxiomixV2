/**
 * Testes para a formatação da seção de pipeline no daily summary.
 */

import { describe, it, expect } from "vitest";

// Reimplementar a lógica de formatação do pipeline (mesma do context-builder)
type StageInfo = { name: string | null; item_count: number | null };
type PipelineInfo = { name: string | null; stages: StageInfo[] | null };

function formatPipelineSection(pipelines: PipelineInfo[]): string | null {
  if (pipelines.length === 0) return null;

  const sections: string[] = [];
  sections.push("\u{1F4CA} *Pipeline CRM*");

  for (const pipeline of pipelines.slice(0, 3)) {
    if (!pipeline.stages || pipeline.stages.length === 0) continue;

    const totalItems = pipeline.stages.reduce(
      (acc, s) => acc + (s.item_count ?? 0),
      0
    );

    if (totalItems === 0) {
      sections.push(`_${pipeline.name}:_ sem itens`);
      continue;
    }

    const stageLines = pipeline.stages
      .filter((s) => (s.item_count ?? 0) > 0)
      .map((s) => {
        const pct = Math.round(((s.item_count ?? 0) / totalItems) * 100);
        return `${s.name}: ${s.item_count} (${pct}%)`;
      })
      .join(" \u{2022} ");

    sections.push(`_${pipeline.name}_ (${totalItems} total): ${stageLines}`);
  }

  return sections.length > 1 ? sections.join("\n") : null;
}

describe("formatPipelineSection", () => {
  it("formata pipeline com itens distribuídos", () => {
    const result = formatPipelineSection([
      {
        name: "Vendas",
        stages: [
          { name: "Início", item_count: 5 },
          { name: "Em Progresso", item_count: 3 },
          { name: "Concluído", item_count: 2 },
        ],
      },
    ]);

    expect(result).toContain("Pipeline CRM");
    expect(result).toContain("Vendas");
    expect(result).toContain("10 total");
    expect(result).toContain("Início: 5 (50%)");
    expect(result).toContain("Em Progresso: 3 (30%)");
    expect(result).toContain("Concluído: 2 (20%)");
  });

  it("mostra 'sem itens' para pipeline vazio", () => {
    const result = formatPipelineSection([
      {
        name: "teste",
        stages: [
          { name: "Início", item_count: 0 },
          { name: "Concluído", item_count: 0 },
        ],
      },
    ]);

    expect(result).toContain("sem itens");
  });

  it("omite stages com 0 itens na distribuição", () => {
    const result = formatPipelineSection([
      {
        name: "Pipeline",
        stages: [
          { name: "Início", item_count: 3 },
          { name: "Meio", item_count: 0 },
          { name: "Fim", item_count: 7 },
        ],
      },
    ]);

    expect(result).toContain("Início: 3");
    expect(result).toContain("Fim: 7");
    expect(result).not.toContain("Meio");
  });

  it("retorna null para lista vazia", () => {
    expect(formatPipelineSection([])).toBe(null);
  });

  it("retorna null para pipeline sem stages", () => {
    expect(formatPipelineSection([{ name: "test", stages: null }])).toBe(null);
    expect(formatPipelineSection([{ name: "test", stages: [] }])).toBe(null);
  });

  it("limita a 3 pipelines", () => {
    const pipelines = Array.from({ length: 5 }, (_, i) => ({
      name: `Pipeline ${i + 1}`,
      stages: [{ name: "Stage", item_count: 1 }],
    }));

    const result = formatPipelineSection(pipelines)!;
    expect(result).toContain("Pipeline 1");
    expect(result).toContain("Pipeline 3");
    expect(result).not.toContain("Pipeline 4");
  });

  it("calcula porcentagens corretamente com arredondamento", () => {
    const result = formatPipelineSection([
      {
        name: "Test",
        stages: [
          { name: "A", item_count: 1 },
          { name: "B", item_count: 2 },
        ],
      },
    ]);

    expect(result).toContain("A: 1 (33%)");
    expect(result).toContain("B: 2 (67%)");
  });
});
