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

export function getBreadcrumb(pathname: string): string[] {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => SEGMENT_LABELS[segment] ?? segment);
}
