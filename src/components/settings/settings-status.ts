export type SettingsIntegrationRow = {
  type: string;
  is_active: boolean | null;
  config?: unknown;
};

export function resolveSettingsIntegrationFlags(integrations: SettingsIntegrationRow[] | null | undefined) {
  const rows = integrations ?? [];
  const evoCrmIntegration = rows.find((integration) => integration.type === "evo_crm");
  const evolutionApiIntegration = rows.find((integration) => integration.type === "evolution_api");

  return {
    activeIntegrations: rows.filter((integration) => Boolean(integration.is_active)).length,
    totalIntegrations: 2,
    evoCrmActive: Boolean(evoCrmIntegration?.is_active),
    evolutionApiActive: Boolean(evolutionApiIntegration?.is_active && hasConnectedEvolutionVendor(evolutionApiIntegration.config)),
  };
}

function hasConnectedEvolutionVendor(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false;
  }

  const vendors = (config as { vendors?: unknown }).vendors;
  if (!Array.isArray(vendors)) {
    return false;
  }

  return vendors.some((vendor) => {
    if (!vendor || typeof vendor !== "object" || Array.isArray(vendor)) {
      return false;
    }

    return (vendor as { status?: unknown }).status === "connected";
  });
}
