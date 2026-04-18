/**
 * Arquivo: src/app/api/settings/team/[userId]/route.ts
 * Propósito: Alterar papel ou remover um membro da empresa.
 * Autor: AXIOMIX
 * Data: 2026-04-18
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const updateSchema = z.object({
  role: z.enum(["admin", "member"], { message: "Papel inválido." }),
});

type Role = "owner" | "admin" | "member";

async function getContext(request: NextRequest, response: NextResponse, targetUserId: string) {
  const supabase = createSupabaseRouteHandlerClient(request, response);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 401 as const, error: { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" } };
  }

  const { data: currentMembership } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!currentMembership?.company_id) {
    return {
      status: 404 as const,
      error: { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
    };
  }

  if (currentMembership.role !== "owner" && currentMembership.role !== "admin") {
    return {
      status: 403 as const,
      error: { error: "Apenas owner e administradores podem alterar membros.", code: "FORBIDDEN" },
    };
  }

  if (targetUserId === user.id) {
    return {
      status: 400 as const,
      error: { error: "Você não pode modificar sua própria associação.", code: "SELF_MODIFICATION" },
    };
  }

  const { data: targetMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", targetUserId)
    .eq("company_id", currentMembership.company_id)
    .maybeSingle();

  if (!targetMembership) {
    return {
      status: 404 as const,
      error: { error: "Membro não encontrado.", code: "MEMBER_NOT_FOUND" },
    };
  }

  return {
    status: 200 as const,
    supabase,
    user,
    companyId: currentMembership.company_id,
    currentRole: currentMembership.role as Role,
    targetRole: targetMembership.role as Role,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const response = NextResponse.json({ ok: true });
    const { userId } = await context.params;
    const ctx = await getContext(request, response, userId);

    if (ctx.status !== 200) {
      return NextResponse.json(ctx.error, { status: ctx.status });
    }

    if (ctx.targetRole === "owner") {
      return NextResponse.json(
        { error: "O papel do owner não pode ser alterado.", code: "OWNER_IMMUTABLE" },
        { status: 403 }
      );
    }

    if (ctx.currentRole === "admin" && ctx.targetRole === "admin") {
      return NextResponse.json(
        { error: "Admins não podem modificar outros admins.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (ctx.currentRole === "admin" && parsed.data.role === "admin") {
      return NextResponse.json(
        { error: "Somente o owner pode promover a administrador.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { error: updateError } = await ctx.supabase
      .from("memberships")
      .update({ role: parsed.data.role })
      .eq("user_id", userId)
      .eq("company_id", ctx.companyId);

    if (updateError) {
      return NextResponse.json(
        { error: "Não foi possível atualizar o membro.", code: "MEMBER_UPDATE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ userId, role: parsed.data.role });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "MEMBER_PATCH_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const response = NextResponse.json({ ok: true });
    const { userId } = await context.params;
    const ctx = await getContext(request, response, userId);

    if (ctx.status !== 200) {
      return NextResponse.json(ctx.error, { status: ctx.status });
    }

    if (ctx.targetRole === "owner") {
      return NextResponse.json(
        { error: "O owner não pode ser removido.", code: "OWNER_IMMUTABLE" },
        { status: 403 }
      );
    }

    if (ctx.currentRole === "admin" && ctx.targetRole === "admin") {
      return NextResponse.json(
        { error: "Admins não podem remover outros admins.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await ctx.supabase
      .from("memberships")
      .delete()
      .eq("user_id", userId)
      .eq("company_id", ctx.companyId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Não foi possível remover o membro.", code: "MEMBER_DELETE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ userId, removed: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "MEMBER_DELETE_ERROR" }, { status: 500 });
  }
}
