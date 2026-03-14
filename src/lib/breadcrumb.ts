export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "whatsapp-intelligence": "WhatsApp Intelligence",
  intelligence: "Intelligence",
  "social-publisher": "Social Publisher",
  settings: "Settings",
  integrations: "Integrações",
  company: "Empresa",
  members: "Membros",
  plan: "Plano",
};

export function getBreadcrumb(pathname: string): string[] {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => SEGMENT_LABELS[segment] ?? segment);
}
