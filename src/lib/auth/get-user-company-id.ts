/**
 * Arquivo: src/lib/auth/get-user-company-id.ts
 * Propósito: Resolver o company_id do usuário logado com base em memberships.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type MembershipCompanyRow = {
  company_id: string | null;
};

export async function getUserCompanyId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipCompanyRow>();

  if (error) {
    throw new Error("Falha ao resolver company_id do usuário autenticado.");
  }

  return data?.company_id ?? null;
}
