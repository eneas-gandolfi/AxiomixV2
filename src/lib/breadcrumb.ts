export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "whatsapp-intelligence": "Inteligência",
  intelligence: "Intelligence",
  "social-publisher": "Social Publisher",
  settings: "Configurações",
  integrations: "Integrações",
  company: "Empresa",
  members: "Membros",
  plan: "Plano",
  // Sub-rotas do módulo Inteligência
  operacao: "Operação",
  conversas: "Conversas",
  contatos: "Contatos",
  pipeline: "Pipeline",
  agentes: "Agentes IA",
  sessoes: "Sessões",
  equipe: "Equipe",
  "base-conhecimento": "Base de Conhecimento",
  // Onboarding
  onboarding: "Onboarding",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getBreadcrumb(pathname: string): string[] {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
      if (UUID_RE.test(segment)) return segment.slice(0, 8);
      return segment;
    });
}
