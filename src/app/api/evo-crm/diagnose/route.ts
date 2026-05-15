/**
 * Arquivo: src/app/api/evo-crm/diagnose/route.ts
 * Propósito: Endpoint de diagnóstico para o sync do Evo CRM — sem SSH ao VPS.
 *            Mostra exatamente o que o Evo CRM devolve VS o que o Axiomix tem
 *            no banco, isolando onde a divergência está nascendo.
 *
 *            Diferente de /sync (que enfileira um job), este endpoint roda
 *            o pipeline em modo dry-run: consulta o Evo, consulta o banco,
 *            calcula o delta — mas NÃO persiste nada.
 *
 * Acesso: GET /api/evo-crm/diagnose
 * Autor: AXIOMIX
 * Data: 2026-05-15
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getEvoCrmClient } from "@/services/evo-crm/client";
import { getExcludedConversationExternalIds } from "@/services/whatsapp/conversation-exclusions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);
    const companyId = access.companyId;

    const evoClient = await getEvoCrmClient(companyId);
    const inboxIds = evoClient.syncInboxIds?.length ? evoClient.syncInboxIds : [undefined];

    const fanOutPromises = inboxIds.map(async (inboxId) => {
      try {
        const rows = await evoClient.listConversations(300, {
          ...(inboxId ? { inbox_id: inboxId } : {}),
        });
        return {
          inboxId: inboxId ?? null,
          count: rows.length,
          ids: rows.map((r) => r.id),
          sampleContacts: rows.slice(0, 3).map((r) => ({
            id: r.id,
            contact_name: r.contact?.name ?? null,
            phone: r.contact?.phone ?? r.phone_e164 ?? null,
            inbox_id: r.inbox_id,
            status: r.status,
          })),
          error: null as string | null,
        };
      } catch (err) {
        return {
          inboxId: inboxId ?? null,
          count: 0,
          ids: [] as string[],
          sampleContacts: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    const fanOutResults = await Promise.all(fanOutPromises);
    const allRemoteIds = fanOutResults.flatMap((r) => r.ids);
    const uniqueRemoteIds = new Set(allRemoteIds);

    // Identidade do token: lista de inboxes e usuários que ele consegue ver.
    // Se a UI do Evo CRM mostra mais inboxes/usuários do que aqui, o token
    // está autenticando em outra conta/workspace.
    const tokenScope: {
      inboxes: Array<{ id: string; name: string | null; channel_type: string | null }>;
      users: Array<{ id: string; name: string | null; email?: string | null }>;
      inboxesError: string | null;
      usersError: string | null;
    } = { inboxes: [], users: [], inboxesError: null, usersError: null };

    try {
      const inboxes = await evoClient.listInboxes();
      tokenScope.inboxes = inboxes.map((i) => ({
        id: i.id,
        name: i.name ?? null,
        channel_type: i.channel_type ?? null,
      }));
    } catch (err) {
      tokenScope.inboxesError = err instanceof Error ? err.message : String(err);
    }
    try {
      const users = await evoClient.listUsers();
      tokenScope.users = users.map((u) => ({
        id: u.id,
        name: u.name ?? null,
        email: (u as { email?: string | null }).email ?? null,
      }));
    } catch (err) {
      tokenScope.usersError = err instanceof Error ? err.message : String(err);
    }

    // Sonda: o endpoint /api/v1/conversations no Chatwoot/Evo CRM tipicamente
    // filtra por assignee_type=me por padrão. As 7 conversas que o usuário vê
    // no painel só aparecem quando assignee_type é "assigned" ou "unassigned".
    // Esta sonda testa cada variação direto via fetch (bypass do client) para
    // descobrir qual combinação devolve o conjunto completo.
    type ProbeResult = { params: string; status: number; count: number; error: string | null };
    async function probeConversationsRaw(searchParams: Record<string, string>): Promise<ProbeResult> {
      const url = new URL(`${evoClient.baseUrl}/api/v1/conversations`);
      for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
      try {
        const res = await fetch(url.toString(), {
          headers: {
            api_access_token: evoClient.apiToken,
            accept: "application/json",
          },
        });
        const text = await res.text();
        let count = 0;
        try {
          const json = JSON.parse(text);
          // Tenta os principais formatos: meta.all_count, meta.total_count, data.length, data.payload.length
          const meta = (json?.meta ?? json?.data?.meta) as Record<string, unknown> | undefined;
          const dataArr = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.data?.payload)
              ? json.data.payload
              : Array.isArray(json?.payload)
                ? json.payload
                : Array.isArray(json?.conversations)
                  ? json.conversations
                  : [];
          count =
            (typeof meta?.all_count === "number" ? meta.all_count : 0) ||
            (typeof meta?.total_count === "number" ? meta.total_count : 0) ||
            dataArr.length;
        } catch {
          // ignore
        }
        return {
          params: url.search,
          status: res.status,
          count,
          error: res.status >= 400 ? text.slice(0, 160) : null,
        };
      } catch (err) {
        return {
          params: url.search,
          status: 0,
          count: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const probes = await Promise.all([
      probeConversationsRaw({ limit: "50" }),
      probeConversationsRaw({ limit: "50", assignee_type: "me" }),
      probeConversationsRaw({ limit: "50", assignee_type: "assigned" }),
      probeConversationsRaw({ limit: "50", assignee_type: "unassigned" }),
      probeConversationsRaw({ limit: "50", status: "open" }),
      probeConversationsRaw({ limit: "50", status: "open", assignee_type: "assigned" }),
      probeConversationsRaw({ limit: "50", q: "" }),
    ]);

    const admin = createSupabaseAdminClient();
    const { data: dbRows, error: dbError } = await admin
      .from("conversations")
      .select("id, external_id, contact_name, inbox_id, status, last_message_at, last_synced_at")
      .eq("company_id", companyId)
      .order("last_synced_at", { ascending: false, nullsFirst: false })
      .limit(200);

    const dbExternalIds = new Set((dbRows ?? []).map((r) => r.external_id).filter(Boolean) as string[]);
    const excluded = await getExcludedConversationExternalIds(companyId);

    const missingFromDb = [...uniqueRemoteIds].filter((id) => !dbExternalIds.has(id));
    const extraInDb = [...dbExternalIds].filter((id) => !uniqueRemoteIds.has(id));
    const excludedRemote = [...uniqueRemoteIds].filter((id) => excluded.has(id));

    const { data: integration } = await admin
      .from("integrations")
      .select("config, is_active, test_status")
      .eq("company_id", companyId)
      .eq("type", "evo_crm")
      .maybeSingle();

    const config = (integration?.config as Record<string, unknown> | null) ?? {};
    const integrationSnapshot = {
      is_active: integration?.is_active ?? null,
      test_status: integration?.test_status ?? null,
      base_url: typeof config.base_url === "string" ? config.base_url : null,
      inbox_id: typeof config.inbox_id === "string" ? config.inbox_id : null,
      sync_inbox_ids: Array.isArray(config.sync_inbox_ids) ? config.sync_inbox_ids : null,
      has_webhook_secret: Boolean(config.webhook_secret_encrypted ?? config.webhook_secret),
    };

    return NextResponse.json({
      companyId,
      now: new Date().toISOString(),
      integration: integrationSnapshot,
      client: {
        baseUrl: evoClient.baseUrl,
        inboxId: evoClient.inboxId ?? null,
        syncInboxIds: evoClient.syncInboxIds ?? null,
      },
      tokenScope: {
        inboxes_count: tokenScope.inboxes.length,
        inboxes: tokenScope.inboxes,
        inboxesError: tokenScope.inboxesError,
        users_count: tokenScope.users.length,
        users: tokenScope.users.slice(0, 20),
        usersError: tokenScope.usersError,
      },
      probes,
      remote: {
        inboxesQueried: inboxIds.length,
        perInbox: fanOutResults,
        totalRows: allRemoteIds.length,
        uniqueIds: uniqueRemoteIds.size,
      },
      local: {
        totalRows: dbRows?.length ?? 0,
        dbError: dbError?.message ?? null,
        sample: (dbRows ?? []).slice(0, 5).map((r) => ({
          external_id: r.external_id,
          contact_name: r.contact_name,
          inbox_id: r.inbox_id,
          status: r.status,
          last_message_at: r.last_message_at,
          last_synced_at: r.last_synced_at,
        })),
      },
      exclusions: {
        total: excluded.size,
        affectingRemote: excludedRemote.length,
        affectingRemoteIds: excludedRemote.slice(0, 20),
      },
      delta: {
        missingFromDb_count: missingFromDb.length,
        missingFromDb_ids: missingFromDb.slice(0, 20),
        extraInDb_count: extraInDb.length,
        extraInDb_ids: extraInDb.slice(0, 20),
      },
      verdict: {
        remoteTotal: uniqueRemoteIds.size,
        localTotal: dbRows?.length ?? 0,
        excludedFromSync: excludedRemote.length,
        explainedGap:
          uniqueRemoteIds.size - (dbRows?.length ?? 0) - excludedRemote.length === 0
            ? "Tudo conta certo: remote = local + excluded"
            : `Lacuna não explicada: remote=${uniqueRemoteIds.size}, local=${dbRows?.length ?? 0}, excluded=${excludedRemote.length}`,
      },
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "DIAGNOSE_ERROR" }, { status: 500 });
  }
}
