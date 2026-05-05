/**
 * Arquivo: src/lib/niches.ts
 * Propósito: Lista curada de nichos com defaults inteligentes (threshold TFR,
 *            vocabulário, horário de atendimento). Base do onboarding e da
 *            adaptação multi-tenant do Axiomix.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

export const NICHE_SLUGS = [
  "varejo",
  "ecommerce",
  "restaurante",
  "imobiliario",
  "saude",
  "beleza",
  "educacao",
  "juridico",
  "servicos",
  "b2b_saas",
  "outro",
] as const;

export type NicheSlug = (typeof NICHE_SLUGS)[number];

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** `null` significa loja fechada naquele dia (cronômetro pausa). */
export type DaySchedule = { open: string; close: string } | null;

export type BusinessHours = Record<DayOfWeek, DaySchedule>;

export type NicheVocabulary = {
  /** Como o "atendente" é chamado (ex: Vendedor, Corretor, Atendente). */
  operatorSingular: string;
  operatorPlural: string;
  /** Como o "cliente" é chamado (ex: Cliente, Paciente, Lead). */
  customerSingular: string;
  customerPlural: string;
  /** Label do 3º KPI no rodapé do dashboard (varia por nicho). */
  primaryKpiLabel: string;
  /** Label do número-herói do dashboard global ("conversas paradas" e variações). */
  heroMetricLabel: string;
  /** Label do count de itens analisados no rodapé do dashboard. */
  analyzedLabel: string;
};

export type NicheDefinition = {
  slug: NicheSlug;
  label: string;
  description: string;
  /** Ícone Lucide a ser usado no card de seleção. */
  iconName:
    | "ShoppingBag"
    | "ShoppingCart"
    | "UtensilsCrossed"
    | "Home"
    | "HeartPulse"
    | "Sparkles"
    | "GraduationCap"
    | "Scale"
    | "Wrench"
    | "Briefcase"
    | "MoreHorizontal";
  /** Tempo (em segundos) até o cronômetro virar âmbar. */
  thresholdAmberSeconds: number;
  /** Tempo (em segundos) até o cronômetro virar vermelho. */
  thresholdRedSeconds: number;
  vocabulary: NicheVocabulary;
  defaultBusinessHours: BusinessHours;
};

const HOURS_RETAIL_LONG: BusinessHours = {
  mon: { open: "10:00", close: "22:00" },
  tue: { open: "10:00", close: "22:00" },
  wed: { open: "10:00", close: "22:00" },
  thu: { open: "10:00", close: "22:00" },
  fri: { open: "10:00", close: "22:00" },
  sat: { open: "10:00", close: "22:00" },
  sun: null,
};

const HOURS_24_7: BusinessHours = {
  mon: { open: "00:00", close: "23:59" },
  tue: { open: "00:00", close: "23:59" },
  wed: { open: "00:00", close: "23:59" },
  thu: { open: "00:00", close: "23:59" },
  fri: { open: "00:00", close: "23:59" },
  sat: { open: "00:00", close: "23:59" },
  sun: { open: "00:00", close: "23:59" },
};

const HOURS_FOOD: BusinessHours = {
  mon: { open: "11:00", close: "23:00" },
  tue: { open: "11:00", close: "23:00" },
  wed: { open: "11:00", close: "23:00" },
  thu: { open: "11:00", close: "23:00" },
  fri: { open: "11:00", close: "00:00" },
  sat: { open: "11:00", close: "00:00" },
  sun: { open: "11:00", close: "23:00" },
};

const HOURS_BUSINESS: BusinessHours = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: null,
  sun: null,
};

const HOURS_HEALTH: BusinessHours = {
  mon: { open: "08:00", close: "19:00" },
  tue: { open: "08:00", close: "19:00" },
  wed: { open: "08:00", close: "19:00" },
  thu: { open: "08:00", close: "19:00" },
  fri: { open: "08:00", close: "19:00" },
  sat: { open: "08:00", close: "13:00" },
  sun: null,
};

const HOURS_BEAUTY: BusinessHours = {
  mon: null,
  tue: { open: "09:00", close: "20:00" },
  wed: { open: "09:00", close: "20:00" },
  thu: { open: "09:00", close: "20:00" },
  fri: { open: "09:00", close: "20:00" },
  sat: { open: "09:00", close: "18:00" },
  sun: null,
};

export const NICHES: NicheDefinition[] = [
  {
    slug: "varejo",
    label: "Varejo",
    description: "Lojas físicas, shopping, atacado, moda, calçados, ótica.",
    iconName: "ShoppingBag",
    thresholdAmberSeconds: 600, // 10min
    thresholdRedSeconds: 1200, // 20min
    vocabulary: {
      operatorSingular: "Vendedor",
      operatorPlural: "Vendedores",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      primaryKpiLabel: "Conversão",
      heroMetricLabel: "Conversas paradas",
      analyzedLabel: "Conversas analisadas",
    },
    defaultBusinessHours: HOURS_RETAIL_LONG,
  },
  {
    slug: "ecommerce",
    label: "E-commerce",
    description: "Lojas online, marketplaces, dropshipping, vendas via redes sociais.",
    iconName: "ShoppingCart",
    thresholdAmberSeconds: 300, // 5min
    thresholdRedSeconds: 900, // 15min
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      primaryKpiLabel: "Conversão",
      heroMetricLabel: "Conversas paradas",
      analyzedLabel: "Conversas analisadas",
    },
    defaultBusinessHours: HOURS_24_7,
  },
  {
    slug: "restaurante",
    label: "Restaurante / Delivery",
    description: "Restaurantes, lanchonetes, delivery, dark kitchens.",
    iconName: "UtensilsCrossed",
    thresholdAmberSeconds: 300, // 5min
    thresholdRedSeconds: 900, // 15min
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      primaryKpiLabel: "Pedidos",
      heroMetricLabel: "Pedidos parados",
      analyzedLabel: "Pedidos analisados",
    },
    defaultBusinessHours: HOURS_FOOD,
  },
  {
    slug: "imobiliario",
    label: "Imobiliário",
    description: "Imobiliárias, corretores autônomos, incorporadoras.",
    iconName: "Home",
    thresholdAmberSeconds: 1800, // 30min
    thresholdRedSeconds: 7200, // 2h
    vocabulary: {
      operatorSingular: "Corretor",
      operatorPlural: "Corretores",
      customerSingular: "Lead",
      customerPlural: "Leads",
      primaryKpiLabel: "Visitas marcadas",
      heroMetricLabel: "Leads esperando",
      analyzedLabel: "Leads analisados",
    },
    defaultBusinessHours: HOURS_BUSINESS,
  },
  {
    slug: "saude",
    label: "Saúde / Clínica",
    description: "Clínicas, consultórios, dentistas, fisioterapeutas (não emergência).",
    iconName: "HeartPulse",
    thresholdAmberSeconds: 1800, // 30min
    thresholdRedSeconds: 7200, // 2h
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Paciente",
      customerPlural: "Pacientes",
      primaryKpiLabel: "Agendados",
      heroMetricLabel: "Pacientes esperando",
      analyzedLabel: "Atendimentos analisados",
    },
    defaultBusinessHours: HOURS_HEALTH,
  },
  {
    slug: "beleza",
    label: "Beleza / Estética",
    description: "Salões, barbearias, esmalterias, estúdios de estética.",
    iconName: "Sparkles",
    thresholdAmberSeconds: 3600, // 1h
    thresholdRedSeconds: 14400, // 4h
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      primaryKpiLabel: "Agendados",
      heroMetricLabel: "Clientes esperando",
      analyzedLabel: "Atendimentos analisados",
    },
    defaultBusinessHours: HOURS_BEAUTY,
  },
  {
    slug: "educacao",
    label: "Educação / Cursos",
    description: "Escolas, cursinhos, cursos online, autoescolas.",
    iconName: "GraduationCap",
    thresholdAmberSeconds: 3600, // 1h
    thresholdRedSeconds: 14400, // 4h
    vocabulary: {
      operatorSingular: "Consultor",
      operatorPlural: "Consultores",
      customerSingular: "Aluno",
      customerPlural: "Alunos",
      primaryKpiLabel: "Matrículas",
      heroMetricLabel: "Alunos esperando",
      analyzedLabel: "Conversas analisadas",
    },
    defaultBusinessHours: HOURS_BUSINESS,
  },
  {
    slug: "juridico",
    label: "Jurídico",
    description: "Escritórios de advocacia, consultoria jurídica.",
    iconName: "Scale",
    thresholdAmberSeconds: 7200, // 2h
    thresholdRedSeconds: 86400, // 1d
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      primaryKpiLabel: "Casos abertos",
      heroMetricLabel: "Clientes esperando",
      analyzedLabel: "Casos analisados",
    },
    defaultBusinessHours: HOURS_BUSINESS,
  },
  {
    slug: "servicos",
    label: "Serviços / Manutenção",
    description: "Assistências técnicas, dedetizadoras, encanadores, eletricistas.",
    iconName: "Wrench",
    thresholdAmberSeconds: 1800, // 30min
    thresholdRedSeconds: 7200, // 2h
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      primaryKpiLabel: "Orçamentos",
      heroMetricLabel: "Clientes esperando",
      analyzedLabel: "Atendimentos analisados",
    },
    defaultBusinessHours: HOURS_BUSINESS,
  },
  {
    slug: "b2b_saas",
    label: "B2B / SaaS",
    description: "Software, agências, consultorias, infoprodutos, B2B em geral.",
    iconName: "Briefcase",
    thresholdAmberSeconds: 1800, // 30min
    thresholdRedSeconds: 7200, // 2h
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Lead",
      customerPlural: "Leads",
      primaryKpiLabel: "Demos agendadas",
      heroMetricLabel: "Leads esperando",
      analyzedLabel: "Conversas analisadas",
    },
    defaultBusinessHours: HOURS_BUSINESS,
  },
  {
    slug: "outro",
    label: "Outro",
    description: "Não encontrou seu nicho? Configuramos junto depois.",
    iconName: "MoreHorizontal",
    thresholdAmberSeconds: 1800, // 30min — chute conservador
    thresholdRedSeconds: 7200, // 2h
    vocabulary: {
      operatorSingular: "Atendente",
      operatorPlural: "Atendentes",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      primaryKpiLabel: "Conversão",
      heroMetricLabel: "Conversas paradas",
      analyzedLabel: "Conversas analisadas",
    },
    defaultBusinessHours: HOURS_BUSINESS,
  },
];

const NICHE_BY_SLUG = new Map(NICHES.map((n) => [n.slug, n]));

export function getNicheBySlug(slug: string): NicheDefinition {
  const found = NICHE_BY_SLUG.get(slug as NicheSlug);
  return found ?? NICHE_BY_SLUG.get("outro")!;
}

export function isValidNicheSlug(value: unknown): value is NicheSlug {
  return typeof value === "string" && NICHE_BY_SLUG.has(value as NicheSlug);
}

/**
 * Tenta inferir um NicheSlug a partir de texto livre antigo (`companies.niche`).
 * Útil pra tenants criados antes da migration `niche_slug` que ainda têm
 * "Marketing digital" / "Loja de roupa" / "Clínica" em texto puro.
 *
 * Retorna `null` quando não consegue inferir com confiança razoável.
 */
export function inferNicheSlug(freeText: string | null | undefined): NicheSlug | null {
  if (!freeText) return null;
  const t = freeText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  if (!t) return null;

  // Match por palavras-chave em ordem de especificidade
  const matchers: Array<{ slug: NicheSlug; keywords: string[] }> = [
    { slug: "ecommerce", keywords: ["ecommerce", "e-commerce", "online", "marketplace", "dropshipping", "loja virtual"] },
    { slug: "restaurante", keywords: ["restaurante", "lanchonete", "delivery", "pizzaria", "hamburgueria", "cafeteria", "padaria"] },
    { slug: "imobiliario", keywords: ["imobiliaria", "imovel", "imobiliario", "corretor", "incorporadora"] },
    { slug: "saude", keywords: ["saude", "clinica", "consultorio", "dentista", "medico", "fisio", "psicologo", "veterinario"] },
    { slug: "beleza", keywords: ["beleza", "salao", "barbearia", "estetica", "esmalteria", "manicure", "depilacao"] },
    { slug: "educacao", keywords: ["educacao", "escola", "curso", "ensino", "treinamento", "autoescola", "colegio", "faculdade"] },
    { slug: "juridico", keywords: ["juridico", "advocacia", "advogado", "escritorio", "juridica"] },
    { slug: "servicos", keywords: ["assistencia", "manutencao", "encanador", "eletricista", "dedetizadora", "reparo"] },
    { slug: "b2b_saas", keywords: ["saas", "b2b", "agencia", "consultoria", "software", "infoproduto", "marketing"] },
    { slug: "varejo", keywords: ["varejo", "loja", "atacado", "moda", "calcado", "otica", "joalheria", "vestuario"] },
  ];

  for (const matcher of matchers) {
    for (const kw of matcher.keywords) {
      if (t.includes(kw)) return matcher.slug;
    }
  }

  return null;
}

/** Formata segundos como "10 min" / "2 h" / "1 d" — usado nos cards de seleção. */
export function formatThresholdLabel(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.round(seconds / 86400);
    return `${days} d`;
  }
  if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    return `${hours} h`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}
