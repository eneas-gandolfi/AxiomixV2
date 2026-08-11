/**
 * Arquivo: src/lib/auth/get-user-company-id.ts
 * Propósito: Resolver o company_id do usuário logado com base em memberships.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MembershipCompanyRow = {
  company_id: string | null;
};

// Membership muda raramente: cache in-memory por usuário com TTL curto evita
// a query repetida a cada navegação (single-process no deploy self-hosted).
// Só cacheia companyId resolvido — null (sem empresa) não é cacheado para o
// onboarding refletir imediatamente.
const MEMBERSHIP_TTL_MS = 60_000;
const membershipCache = new Map<string, { companyId: string; expiresAt: number }>();

export const getUserCompanyId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  // getUser valida uma sessão real. getClaims pode retornar claims do token
  // anônimo do projeto quando não há cookies de sessão.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (userError || !userId) {
    return null;
  }

  const cached = membershipCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.companyId;
  }

  const { data, error } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipCompanyRow>();

  if (error) {
    throw new Error("Falha ao resolver company_id do usuário autenticado.");
  }

  const companyId = data?.company_id ?? null;
  if (companyId) {
    membershipCache.set(userId, { companyId, expiresAt: Date.now() + MEMBERSHIP_TTL_MS });
  }

  return companyId;
});
