/**
 * Arquivo: src/lib/social/get-company-timezone.ts
 * Proposito: Buscar o fuso horario de uma empresa, com fallback para o default.
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_COMPANY_TIMEZONE } from "@/lib/social/timezone";

export async function getCompanyTimezone(companyId: string): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("companies")
    .select("timezone")
    .eq("id", companyId)
    .maybeSingle();
  return data?.timezone ?? DEFAULT_COMPANY_TIMEZONE;
}
