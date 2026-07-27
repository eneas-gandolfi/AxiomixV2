/**
 * Arquivo: src/lib/whatsapp/ai-mode.ts
 * Propósito: Resolver o modo da IA analítica do tenant (F3). Lê o campo
 *            opcional `aiMode` da config da integração evo_crm; default
 *            "local" (analyzer OpenRouter sob demanda).
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

import type { Json } from "@/database/types/database.types";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type WhatsappAiMode = "local" | "evo_delegated";

export async function getWhatsappAiMode(companyId: string): Promise<WhatsappAiMode> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", companyId)
      .eq("type", "evo_crm")
      .maybeSingle();

    if (!integration?.config) return "local";
    const config = decodeIntegrationConfig("evo_crm", integration.config as Json);
    return config.aiMode ?? "local";
  } catch {
    return "local";
  }
}
