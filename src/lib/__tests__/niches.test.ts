/**
 * Arquivo: src/lib/__tests__/niches.test.ts
 * Propósito: Garantir que a lista curada de nichos (foundation de onboarding,
 *            settings, dashboard, benchmark e cron de agregados) não tem
 *            inconsistências silenciosas. Mudanças aqui afetam SQL constraint,
 *            UX dos cards e cálculo de defaults.
 */

import { describe, it, expect } from "vitest";
import {
  NICHES,
  NICHE_SLUGS,
  getNicheBySlug,
  isValidNicheSlug,
  formatThresholdLabel,
  inferNicheSlug,
} from "@/lib/niches";

describe("NICHE_SLUGS", () => {
  it("tem 11 nichos (10 setores + outro)", () => {
    expect(NICHE_SLUGS.length).toBe(11);
  });

  it("inclui 'outro' como fallback", () => {
    expect(NICHE_SLUGS).toContain("outro");
  });

  it("não tem slugs duplicados", () => {
    const set = new Set<string>(NICHE_SLUGS);
    expect(set.size).toBe(NICHE_SLUGS.length);
  });

  it("usa apenas snake_case ou caracteres válidos pra constraint SQL", () => {
    for (const slug of NICHE_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9_]+$/);
    }
  });
});

describe("NICHES", () => {
  it("tem 1 definição por slug", () => {
    expect(NICHES.length).toBe(NICHE_SLUGS.length);
    const definedSlugs = new Set(NICHES.map((n) => n.slug));
    for (const slug of NICHE_SLUGS) {
      expect(definedSlugs.has(slug)).toBe(true);
    }
  });

  describe.each(NICHES)("$slug", (niche) => {
    it("tem label não-vazio", () => {
      expect(niche.label.length).toBeGreaterThan(0);
    });

    it("tem description não-vazia", () => {
      expect(niche.description.length).toBeGreaterThan(0);
    });

    it("threshold âmbar é positivo e < threshold vermelho", () => {
      expect(niche.thresholdAmberSeconds).toBeGreaterThan(0);
      expect(niche.thresholdRedSeconds).toBeGreaterThan(
        niche.thresholdAmberSeconds,
      );
    });

    it("vocabulário tem todas as 5 chaves obrigatórias e nenhuma vazia", () => {
      const v = niche.vocabulary;
      expect(v.operatorSingular.length).toBeGreaterThan(0);
      expect(v.operatorPlural.length).toBeGreaterThan(0);
      expect(v.customerSingular.length).toBeGreaterThan(0);
      expect(v.customerPlural.length).toBeGreaterThan(0);
      expect(v.primaryKpiLabel.length).toBeGreaterThan(0);
    });

    it("business hours tem 7 dias, formato HH:MM válido quando aberto", () => {
      const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
      for (const day of days) {
        expect(day in niche.defaultBusinessHours).toBe(true);
        const schedule = niche.defaultBusinessHours[day];
        if (schedule !== null) {
          expect(schedule.open).toMatch(/^\d{2}:\d{2}$/);
          expect(schedule.close).toMatch(/^\d{2}:\d{2}$/);
        }
      }
    });

    it("pelo menos 1 dia da semana está aberto", () => {
      const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
      const openDays = days.filter(
        (d) => niche.defaultBusinessHours[d] !== null,
      );
      expect(openDays.length).toBeGreaterThan(0);
    });

    it("iconName está no conjunto fechado de ícones suportados", () => {
      const validIcons = [
        "ShoppingBag",
        "ShoppingCart",
        "UtensilsCrossed",
        "Home",
        "HeartPulse",
        "Sparkles",
        "GraduationCap",
        "Scale",
        "Wrench",
        "Briefcase",
        "MoreHorizontal",
      ];
      expect(validIcons).toContain(niche.iconName);
    });
  });
});

describe("isValidNicheSlug", () => {
  it("aceita todos os slugs canônicos", () => {
    for (const slug of NICHE_SLUGS) {
      expect(isValidNicheSlug(slug)).toBe(true);
    }
  });

  it("rejeita strings desconhecidas", () => {
    expect(isValidNicheSlug("manufatura")).toBe(false);
    expect(isValidNicheSlug("")).toBe(false);
    expect(isValidNicheSlug("Varejo")).toBe(false); // case-sensitive
  });

  it("rejeita tipos não-string", () => {
    expect(isValidNicheSlug(null)).toBe(false);
    expect(isValidNicheSlug(undefined)).toBe(false);
    expect(isValidNicheSlug(123)).toBe(false);
    expect(isValidNicheSlug({})).toBe(false);
    expect(isValidNicheSlug([])).toBe(false);
  });
});

describe("getNicheBySlug", () => {
  it("retorna a definição correta pra cada slug canônico", () => {
    for (const slug of NICHE_SLUGS) {
      const def = getNicheBySlug(slug);
      expect(def.slug).toBe(slug);
    }
  });

  it("cai no fallback 'outro' pra slug desconhecido", () => {
    const def = getNicheBySlug("manufatura");
    expect(def.slug).toBe("outro");
  });

  it("cai no fallback 'outro' pra string vazia", () => {
    const def = getNicheBySlug("");
    expect(def.slug).toBe("outro");
  });
});

describe("formatThresholdLabel", () => {
  it("formata segundos como minutos", () => {
    expect(formatThresholdLabel(60)).toBe("1 min");
    expect(formatThresholdLabel(300)).toBe("5 min");
    expect(formatThresholdLabel(600)).toBe("10 min");
    expect(formatThresholdLabel(1200)).toBe("20 min");
  });

  it("formata como horas a partir de 1h", () => {
    expect(formatThresholdLabel(3600)).toBe("1 h");
    expect(formatThresholdLabel(7200)).toBe("2 h");
    expect(formatThresholdLabel(14400)).toBe("4 h");
  });

  it("formata como dias a partir de 1d", () => {
    expect(formatThresholdLabel(86400)).toBe("1 d");
    expect(formatThresholdLabel(172800)).toBe("2 d");
  });

  it("escolhe a unidade mais legível na fronteira", () => {
    // 30 min ainda é minuto
    expect(formatThresholdLabel(1800)).toBe("30 min");
    // 1h exato vira hora
    expect(formatThresholdLabel(3600)).toBe("1 h");
    // 1d-1s ainda é hora (arredondado pra 24h)
    expect(formatThresholdLabel(86399)).toMatch(/h$/);
  });
});

describe("inferNicheSlug — fallback pra tenants antigos com texto livre", () => {
  it("retorna null pra entrada vazia ou nullish", () => {
    expect(inferNicheSlug(null)).toBeNull();
    expect(inferNicheSlug(undefined)).toBeNull();
    expect(inferNicheSlug("")).toBeNull();
    expect(inferNicheSlug("   ")).toBeNull();
  });

  it("infere varejo de palavras óbvias", () => {
    expect(inferNicheSlug("Loja de roupa")).toBe("varejo");
    expect(inferNicheSlug("LOJA")).toBe("varejo");
    expect(inferNicheSlug("Atacado de calçados")).toBe("varejo");
    expect(inferNicheSlug("Joalheria fina")).toBe("varejo");
  });

  it("infere ecommerce", () => {
    expect(inferNicheSlug("Loja online")).toBe("ecommerce");
    expect(inferNicheSlug("E-commerce de moda")).toBe("ecommerce");
    expect(inferNicheSlug("Marketplace B2C")).toBe("ecommerce");
  });

  it("infere restaurante/delivery", () => {
    expect(inferNicheSlug("Restaurante familiar")).toBe("restaurante");
    expect(inferNicheSlug("Pizzaria do bairro")).toBe("restaurante");
    expect(inferNicheSlug("Hamburgueria gourmet")).toBe("restaurante");
  });

  it("infere imobiliário", () => {
    expect(inferNicheSlug("Imobiliária Norte")).toBe("imobiliario");
    expect(inferNicheSlug("Corretor autônomo")).toBe("imobiliario");
  });

  it("infere saúde", () => {
    expect(inferNicheSlug("Clínica de fisioterapia")).toBe("saude");
    expect(inferNicheSlug("Consultório odontológico")).toBe("saude");
    expect(inferNicheSlug("Veterinário")).toBe("saude");
  });

  it("infere beleza/estética", () => {
    expect(inferNicheSlug("Salão de beleza")).toBe("beleza");
    expect(inferNicheSlug("Barbearia moderna")).toBe("beleza");
    expect(inferNicheSlug("Estética facial")).toBe("beleza");
  });

  it("infere educação", () => {
    expect(inferNicheSlug("Curso de inglês")).toBe("educacao");
    expect(inferNicheSlug("Escola particular")).toBe("educacao");
    expect(inferNicheSlug("Autoescola Estrada")).toBe("educacao");
  });

  it("infere jurídico", () => {
    expect(inferNicheSlug("Escritório de advocacia")).toBe("juridico");
    expect(inferNicheSlug("Consultoria jurídica")).toBe("juridico");
  });

  it("infere serviços", () => {
    expect(inferNicheSlug("Assistência técnica de notebooks")).toBe("servicos");
    expect(inferNicheSlug("Encanador 24h")).toBe("servicos");
  });

  it("infere b2b/saas", () => {
    expect(inferNicheSlug("Agência de marketing digital")).toBe("b2b_saas");
    expect(inferNicheSlug("SaaS de gestão")).toBe("b2b_saas");
    expect(inferNicheSlug("Consultoria em B2B")).toBe("b2b_saas");
  });

  it("é case-insensitive e ignora acentos", () => {
    expect(inferNicheSlug("CLÍNICA")).toBe("saude");
    expect(inferNicheSlug("imóvel")).toBe("imobiliario");
    expect(inferNicheSlug("educação")).toBe("educacao");
  });

  it("retorna null quando não encontra match (não chuta)", () => {
    expect(inferNicheSlug("Coisa aleatória")).toBeNull();
    expect(inferNicheSlug("xyz")).toBeNull();
    expect(inferNicheSlug("123")).toBeNull();
  });
});

describe("Coerência threshold por nicho (regressão de calibração)", () => {
  it("varejo é mais ágil que jurídico (ciclo de venda)", () => {
    const varejo = getNicheBySlug("varejo");
    const juridico = getNicheBySlug("juridico");
    expect(varejo.thresholdAmberSeconds).toBeLessThan(
      juridico.thresholdAmberSeconds,
    );
  });

  it("e-commerce é mais ágil que imobiliário (urgência)", () => {
    const ecommerce = getNicheBySlug("ecommerce");
    const imobiliario = getNicheBySlug("imobiliario");
    expect(ecommerce.thresholdAmberSeconds).toBeLessThan(
      imobiliario.thresholdAmberSeconds,
    );
  });

  it("restaurante delivery tem urgência igual ou maior que e-commerce", () => {
    const ecommerce = getNicheBySlug("ecommerce");
    const restaurante = getNicheBySlug("restaurante");
    expect(restaurante.thresholdAmberSeconds).toBeLessThanOrEqual(
      ecommerce.thresholdAmberSeconds,
    );
  });
});
