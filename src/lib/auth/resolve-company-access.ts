/**
 * Arquivo: src/lib/auth/resolve-company-access.ts
 * Propósito: Validar company_id no servidor e garantir que pertence ao usuário autenticado.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types/database.types";

export class CompanyAccessError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type CompanyAccessContext = {
  userId: string;
  companyId: string;
  role: "owner" | "admin" | "member";
};

type MembershipRow = {
  company_id: string | null;
  role: "owner" | "admin" | "member";
};

export async function resolveCompanyAccess(
  supabase: SupabaseClient<Database>,
  requestedCompanyId?: string
): Promise<CompanyAccessContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CompanyAccessError("Usuário não autenticado.", "AUTH_REQUIRED", 401);
  }

  const membershipsQuery = supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (requestedCompanyId) {
    const { data: membership, error } = await membershipsQuery
      .eq("company_id", requestedCompanyId)
      .limit(1)
      .maybeSingle<MembershipRow>();

    if (error) {
      throw new CompanyAccessError(
        "Falha ao validar company_id informado.",
        "COMPANY_VALIDATION_ERROR",
        500
      );
    }

    if (!membership?.company_id) {
      throw new CompanyAccessError(
        "company_id inválido para o usuário autenticado.",
        "COMPANY_FORBIDDEN",
        403
      );
    }

    return {
      userId: user.id,
      companyId: membership.company_id,
      role: membership.role,
    };
  }

  const { data: firstMembership, error } = await membershipsQuery
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (error) {
    throw new CompanyAccessError(
      "Falha ao carregar empresa do usuário autenticado.",
      "COMPANY_FETCH_ERROR",
      500
    );
  }

  if (!firstMembership?.company_id) {
    throw new CompanyAccessError(
      "Usuário autenticado não possui empresa vinculada.",
      "COMPANY_NOT_FOUND",
      404
    );
  }

  return {
    userId: user.id,
    companyId: firstMembership.company_id,
    role: firstMembership.role,
  };
}
