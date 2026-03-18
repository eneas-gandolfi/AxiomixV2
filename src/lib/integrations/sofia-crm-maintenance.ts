import type { Json } from "@/database/types/database.types";
import type { SofiaCrmConfig } from "@/lib/integrations/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeIntegrationConfig } from "@/lib/integrations/service";

function normalizeSofiaBaseUrl(value?: string | null) {
  const normalized = value?.trim().replace(/\/+$/, "") ?? "";
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

function normalizeSofiaConfig(config: SofiaCrmConfig) {
  return {
    baseUrl: normalizeSofiaBaseUrl(config.baseUrl),
    apiToken: config.apiToken.trim(),
  };
}

export function hasSofiaCrmConfigChanged(currentConfig: Json | null, nextConfig: SofiaCrmConfig) {
  try {
    const current = normalizeSofiaConfig(decodeIntegrationConfig("sofia_crm", currentConfig));
    const next = normalizeSofiaConfig(nextConfig);

    return (
      current.baseUrl !== next.baseUrl ||
      current.apiToken !== next.apiToken
    );
  } catch {
    return true;
  }
}

export async function clearSofiaCrmCompanyData(companyId: string) {
  const supabase = createSupabaseAdminClient();

  const { error: jobsError } = await supabase
    .from("async_jobs")
    .delete()
    .eq("company_id", companyId)
    .in("job_type", ["sofia_crm_sync", "whatsapp_analyze"]);

  if (jobsError) {
    throw new Error(`Falha ao limpar jobs antigos do Sofia CRM: ${jobsError.message}`);
  }

  const { error: conversationsError } = await supabase
    .from("conversations")
    .delete()
    .eq("company_id", companyId);

  if (conversationsError) {
    throw new Error(`Falha ao limpar conversas antigas do Sofia CRM: ${conversationsError.message}`);
  }
}
