/**
 * Arquivo: src/lib/dashboard/bootstrap.ts
 * Proposito: Resolver em um unico round-trip o contexto inicial do dashboard
 *            (user_id, company_id, role, company_name, niche_slug). Substitui
 *            a cadeia auth.getUser -> memberships -> companies que serializava
 *            3 chamadas Supabase antes de qualquer dado de metrica.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardBootstrapOk = {
  kind: "ok";
  userId: string;
  companyId: string;
  role: string;
  companyName: string | null;
  nicheSlug: string | null;
};

export type DashboardBootstrapResult =
  | DashboardBootstrapOk
  | { kind: "unauthenticated" }
  | { kind: "no-company" };

/**
 * Resolve o contexto do dashboard via RPC `dashboard_bootstrap` (1 round-trip).
 *
 * - Acerto: retorna kind="ok" com tudo populado.
 * - RPC vazia mas sessao valida: cai pra `auth.getUser` (1 RT extra) para
 *   distinguir "nao autenticado" de "autenticado sem membership". Caminho raro;
 *   ambos terminam em redirect na pagina.
 */
export const getDashboardBootstrap = cache(
  async (): Promise<DashboardBootstrapResult> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("dashboard_bootstrap");

    if (error) {
      throw new Error("Erro ao carregar dados. Tente novamente.");
    }

    const row = data?.[0];
    if (row?.user_id && row.company_id) {
      return {
        kind: "ok",
        userId: row.user_id,
        companyId: row.company_id,
        role: row.role,
        companyName: row.company_name ?? null,
        nicheSlug: row.niche_slug ?? null,
      };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { kind: "unauthenticated" };
    }
    return { kind: "no-company" };
  },
);
