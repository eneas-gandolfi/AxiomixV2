/**
 * Arquivo: src/app/api/whatsapp/sessions/route.ts
 * Propósito: Buscar status de sessao de multiplas conversas para o painel de sessoes.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

const sessionsSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  limit: z.number().optional(),
});

type ConversationSession = {
  conversationId: string;
  externalId: string;
  contactName: string | null;
  contactPhone: string | null;
  lastMessageAt: string | null;
  sessionActive: boolean;
  expiresAt: string | null;
  secondsRemaining: number | null;
};

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = sessionsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const adminSupabase = createSupabaseAdminClient();
    const limit = Math.min(parsed.data.limit ?? 50, 100);

    // Buscar conversas recentes com external_id
    const { data: conversations } = await adminSupabase
      .from("conversations")
      .select("id, external_id, contact_name, contact_phone, last_message_at, status")
      .eq("company_id", access.companyId)
      .not("external_id", "is", null)
      .eq("status", "open")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ sessions: [], summary: { total: 0, active: 0, expiring: 0, expired: 0 } });
    }

    const sofiaClient = await getSofiaCrmClient(access.companyId);
    const sessions: ConversationSession[] = [];

    // Buscar status de sessão em paralelo (batches de 5)
    const BATCH = 5;
    for (let i = 0; i < conversations.length; i += BATCH) {
      const batch = conversations.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (conv) => {
          try {
            const status = await sofiaClient.getSessionStatus(conv.external_id!);
            return {
              conversationId: conv.id,
              externalId: conv.external_id!,
              contactName: conv.contact_name,
              contactPhone: conv.contact_phone,
              lastMessageAt: conv.last_message_at,
              sessionActive: status.active,
              expiresAt: status.expires_at ?? null,
              secondsRemaining: status.seconds_remaining ?? null,
            };
          } catch {
            return {
              conversationId: conv.id,
              externalId: conv.external_id!,
              contactName: conv.contact_name,
              contactPhone: conv.contact_phone,
              lastMessageAt: conv.last_message_at,
              sessionActive: false,
              expiresAt: null,
              secondsRemaining: null,
            };
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          sessions.push(result.value);
        }
      }

      // Rate limit entre batches
      if (i + BATCH < conversations.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Calcular summary
    const TWO_HOURS = 2 * 60 * 60;
    const summary = {
      total: sessions.length,
      active: sessions.filter((s) => s.sessionActive).length,
      expiring: sessions.filter(
        (s) => s.sessionActive && s.secondsRemaining !== null && s.secondsRemaining <= TWO_HOURS
      ).length,
      expired: sessions.filter((s) => !s.sessionActive).length,
    };

    // Ordenar: expirando primeiro, depois ativas por tempo restante, depois expiradas
    sessions.sort((a, b) => {
      if (a.sessionActive && !b.sessionActive) return -1;
      if (!a.sessionActive && b.sessionActive) return 1;
      if (a.sessionActive && b.sessionActive) {
        return (a.secondsRemaining ?? Infinity) - (b.secondsRemaining ?? Infinity);
      }
      return 0;
    });

    return NextResponse.json({ sessions, summary });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao buscar sessões.";
    return NextResponse.json({ error: message, code: "SESSIONS_ERROR" }, { status: 500 });
  }
}
