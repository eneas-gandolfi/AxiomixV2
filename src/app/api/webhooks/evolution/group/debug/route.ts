/**
 * Arquivo: src/app/api/webhooks/evolution/group/debug/route.ts
 * Propósito: Endpoint de diagnóstico para o pipeline de webhook de grupo WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  resolveEvolutionCredentials,
  fetchEvolutionGroups,
  resolvePreferredEvolutionInstance,
} from "@/services/integrations/evolution";
import { decodeIntegrationConfig } from "@/lib/integrations/service";

export const dynamic = "force-dynamic";

interface CheckResult {
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

/**
 * Ação: refresh-names — busca nomes reais de todos os grupos via Evolution API
 * e atualiza na tabela group_agent_configs.
 */
async function handleRefreshNames(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  // Buscar integração ativa
  const { data: integration } = await supabase
    .from("integrations")
    .select("company_id, config")
    .eq("type", "evolution_api")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!integration?.config) {
    return NextResponse.json({ ok: false, error: "Nenhuma integração evolution_api ativa encontrada" });
  }

  const decoded = decodeIntegrationConfig("evolution_api", integration.config);
  const credentials = resolveEvolutionCredentials({
    baseUrl: decoded.baseUrl,
    apiKey: decoded.apiKey,
  });

  const instanceName =
    resolvePreferredEvolutionInstance(decoded.vendors) ??
    process.env.EVOLUTION_INSTANCE_NAME?.trim() ??
    "axiomix-default";

  const groups = await fetchEvolutionGroups({ credentials, instanceName });

  // Buscar configs existentes
  const { data: configs } = await supabase
    .from("group_agent_configs")
    .select("id, group_jid, group_name")
    .eq("company_id", integration.company_id!);

  if (!configs || configs.length === 0) {
    return NextResponse.json({ ok: true, message: "Nenhum grupo registrado para atualizar", groups_from_api: groups.length });
  }

  const results: Array<{ jid: string; oldName: string | null; newName: string; updated: boolean }> = [];

  for (const config of configs) {
    const match = groups.find((g) => g.id === config.group_jid);
    if (match && match.subject !== config.group_name) {
      const { error } = await supabase
        .from("group_agent_configs")
        .update({ group_name: match.subject })
        .eq("id", config.id);

      results.push({
        jid: config.group_jid,
        oldName: config.group_name,
        newName: match.subject,
        updated: !error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    instance: instanceName,
    groups_from_api: groups.length,
    configs_in_db: configs.length,
    updated: results.filter((r) => r.updated).length,
    details: results,
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const expectedToken = process.env.EVOLUTION_WEBHOOK_API_KEY?.trim();

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action");
  const supabase = createSupabaseAdminClient();

  // Ação: refresh-names
  if (action === "refresh-names") {
    try {
      return await handleRefreshNames(supabase);
    } catch (err) {
      return NextResponse.json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // --- Diagnóstico padrão ---
  const checks: CheckResult[] = [];

  // 1. Env vars
  const envVars = [
    { key: "EVOLUTION_WEBHOOK_API_KEY", value: process.env.EVOLUTION_WEBHOOK_API_KEY },
    { key: "EVOLUTION_API_BASE_URL", value: process.env.EVOLUTION_API_BASE_URL || process.env.EVOLUTION_API_URL },
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { key: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY },
  ];

  for (const { key, value } of envVars) {
    checks.push({
      label: `env:${key}`,
      status: value ? "ok" : "fail",
      detail: value ? `definido (${value.length} chars)` : "NÃO DEFINIDO",
    });
  }

  // 2-4. Database checks
  try {
    // 2. Integration evolution_api ativa
    const { data: integrations, error: intError } = await supabase
      .from("integrations")
      .select("id, company_id, is_active")
      .eq("type", "evolution_api")
      .eq("is_active", true);

    if (intError) {
      checks.push({
        label: "db:integrations",
        status: "fail",
        detail: `Erro ao consultar: ${intError.message}`,
      });
    } else if (!integrations || integrations.length === 0) {
      checks.push({
        label: "db:integrations",
        status: "fail",
        detail: "Nenhuma integração evolution_api ativa encontrada. Grupos NÃO serão registrados!",
      });
    } else {
      checks.push({
        label: "db:integrations",
        status: "ok",
        detail: `${integrations.length} integração(ões) ativa(s). company_ids: ${integrations.map((i) => i.company_id).join(", ")}`,
      });
    }

    // 3. group_agent_configs count
    const { count: configCount, error: configError } = await supabase
      .from("group_agent_configs")
      .select("*", { count: "exact", head: true });

    if (configError) {
      checks.push({
        label: "db:group_agent_configs",
        status: "fail",
        detail: `Erro ao consultar: ${configError.message}`,
      });
    } else {
      checks.push({
        label: "db:group_agent_configs",
        status: (configCount ?? 0) > 0 ? "ok" : "warn",
        detail: `${configCount ?? 0} grupo(s) registrado(s)`,
      });
    }

    // 3b. Active configs
    const { count: activeCount } = await supabase
      .from("group_agent_configs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    checks.push({
      label: "db:group_agent_configs (ativos)",
      status: (activeCount ?? 0) > 0 ? "ok" : "warn",
      detail: `${activeCount ?? 0} grupo(s) ativo(s)`,
    });

    // 4. group_messages count
    const { count: msgCount, error: msgError } = await supabase
      .from("group_messages")
      .select("*", { count: "exact", head: true });

    if (msgError) {
      checks.push({
        label: "db:group_messages",
        status: "fail",
        detail: `Erro ao consultar: ${msgError.message}`,
      });
    } else {
      checks.push({
        label: "db:group_messages",
        status: (msgCount ?? 0) > 0 ? "ok" : "warn",
        detail: `${msgCount ?? 0} mensagem(ns) recebida(s)`,
      });
    }

    // 5. Recent messages (last 5)
    const { data: recentMsgs } = await supabase
      .from("group_messages")
      .select("id, group_jid, sender_name, content, is_trigger, sent_at")
      .order("sent_at", { ascending: false })
      .limit(5);

    checks.push({
      label: "db:recent_messages",
      status: "ok",
      detail: recentMsgs && recentMsgs.length > 0
        ? recentMsgs.map((m) => `[${m.sent_at}] ${m.sender_name ?? "?"}: ${(m.content ?? "").slice(0, 50)}`).join(" | ")
        : "Nenhuma mensagem recente",
    });
  } catch (err) {
    checks.push({
      label: "db:connection",
      status: "fail",
      detail: `Erro de conexão: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Summary
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  return NextResponse.json({
    pipeline: "webhook/group",
    timestamp: new Date().toISOString(),
    summary: failCount > 0
      ? `${failCount} falha(s), ${warnCount} aviso(s)`
      : warnCount > 0
        ? `OK com ${warnCount} aviso(s)`
        : "Tudo OK",
    checks,
  });
}
