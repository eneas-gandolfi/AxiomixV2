/**
 * Arquivo: src/lib/whatsapp/__tests__/objecoes.test.ts
 * Proposito: Validar classificacao por keyword e agregacao com exemplos.
 */

import { describe, it, expect } from "vitest";
import {
  aggregateObjections,
  classifyObjection,
  parseObjectionsField,
} from "@/lib/whatsapp/objecoes";

describe("classifyObjection", () => {
  it("classifica preco quando texto menciona 'caro' ou 'valor'", () => {
    expect(classifyObjection("achou o preco muito alto")).toBe("preco");
    expect(classifyObjection("Caro demais")).toBe("preco");
    expect(classifyObjection("Valor acima do esperado")).toBe("preco");
  });

  it("classifica prazo quando menciona entrega ou tempo", () => {
    expect(classifyObjection("Prazo de entrega muito demorado")).toBe("prazo");
    expect(classifyObjection("atrasou de novo")).toBe("prazo");
  });

  it("classifica frete e pagamento separadamente", () => {
    expect(classifyObjection("frete sai mais que o produto")).toBe("frete");
    expect(classifyObjection("nao tem parcelamento em 12x")).toBe("pagamento");
  });

  it("cai em 'outros' quando nenhuma keyword bate", () => {
    expect(classifyObjection("cor nao agradou")).toBe("outros");
  });
});

describe("aggregateObjections", () => {
  it("conta e ordena por frequencia decrescente", () => {
    const input = [
      ["preco alto", "prazo grande"],
      ["caro", "atendimento ruim"],
      ["valor acima do mercado"],
    ];
    const result = aggregateObjections({ objectionsPerInsight: input });
    expect(result[0].categoria).toBe("preco");
    expect(result[0].count).toBe(3);
    expect(result[0].examples.length).toBeGreaterThan(0);
  });

  it("guarda no maximo 3 exemplos por bucket sem duplicar", () => {
    const input = [
      ["caro"],
      ["caro"],
      ["preco alto"],
      ["preco alto"],
      ["valor inflacionado"],
      ["valor inflacionado"],
    ];
    const result = aggregateObjections({ objectionsPerInsight: input });
    expect(result[0].count).toBe(6);
    expect(result[0].examples).toHaveLength(3);
    expect(new Set(result[0].examples).size).toBe(result[0].examples.length);
  });

  it("ignora strings com menos de 2 caracteres e nao-string", () => {
    const input = [["a", "", "x"], ["valor caro"], [null as unknown as string]];
    const result = aggregateObjections({ objectionsPerInsight: input });
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(1);
    expect(result[0].categoria).toBe("preco");
  });

  it("retorna lista vazia quando todos arrays sao vazios", () => {
    const result = aggregateObjections({ objectionsPerInsight: [[]] });
    expect(result).toEqual([]);
  });
});

describe("parseObjectionsField", () => {
  it("retorna array vazio quando input nao eh array", () => {
    expect(parseObjectionsField(null)).toEqual([]);
    expect(parseObjectionsField("preco")).toEqual([]);
    expect(parseObjectionsField({ items: [] })).toEqual([]);
  });

  it("filtra apenas strings de arrays mistos", () => {
    expect(parseObjectionsField(["preco", 123, null, "prazo"])).toEqual([
      "preco",
      "prazo",
    ]);
  });
});
