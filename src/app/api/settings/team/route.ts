/**
 * Arquivo: src/app/api/settings/team/route.ts
 * Propósito: Listar membros da empresa (memberships + dados do usuário).
 * Autor: AXIOMIX
 * Data: 2026-04-18
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MembershipRow = {
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const { data: currentMembership } = await supabase
      .from("memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!currentMembership?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (currentMembership.role !== "owner" && currentMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner e administradores podem ver a equipe.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("memberships")
      .select("user_id, role, created_at")
      .eq("company_id", currentMembership.company_id)
      .order("created_at", { ascending: true })
      .returns<MembershipRow[]>();

    if (membershipsError) {
      return NextResponse.json(
        { error: "Não foi possível carregar membros.", code: "TEAM_FETCH_ERROR" },
        { status: 500 }
      );
    }

    const rows = memberships ?? [];
    const userIds = rows.map((row) => row.user_id);
    let usersById = new Map<string, UserRow>();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email, full_name, avatar_url")
        .in("id", userIds)
        .returns<UserRow[]>();
      usersById = new Map((users ?? []).map((u) => [u.id, u]));
    }

    const members = rows.map((row) => {
      const userInfo = usersById.get(row.user_id);
      return {
        userId: row.user_id,
        email: userInfo?.email ?? "—",
        fullName: userInfo?.full_name ?? null,
        avatarUrl: userInfo?.avatar_url ?? null,
        role: row.role,
        joinedAt: row.created_at,
        isCurrentUser: row.user_id === user.id,
      };
    });

    return NextResponse.json({
      currentUserId: user.id,
      currentUserRole: currentMembership.role,
      members,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "TEAM_GET_ERROR" }, { status: 500 });
  }
}
