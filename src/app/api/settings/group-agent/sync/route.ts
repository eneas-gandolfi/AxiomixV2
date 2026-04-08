/**
 * Arquivo: src/app/api/settings/group-agent/sync/route.ts
 * Propósito: Sincronizar grupos WhatsApp da Evolution API com group_agent_configs.
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import {
  resolveEvolutionCredentials,
  resolvePreferredEvolutionInstance,
  fetchEvolutionGroups,
} from "@/services/integrations/evolution";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const admin = createSupabaseAdminClient();
    const companyId = access.companyId;

    // --- Resolver credenciais Evolution API (banco > env vars) ---
    let credentials;
    let instanceName = process.env.EVOLUTION_INSTANCE_NAME?.trim() || "axiomix-default";

    const { data: integration } = await admin
      .from("integrations")
      .select("config")
      .eq("company_id", companyId)
      .eq("type", "evolution_api")
      .eq("is_active", true)
      .maybeSingle();

    if (integration?.config) {
      const decoded = decodeIntegrationConfig("evolution_api", integration.config);
      credentials = resolveEvolutionCredentials({
        baseUrl: decoded.baseUrl,
        apiKey: decoded.apiKey,
      });
      instanceName =
        resolvePreferredEvolutionInstance(decoded.vendors) ?? instanceName;
    } else {
      credentials = resolveEvolutionCredentials();
    }

    // --- Buscar grupos da Evolution API ---
    const groups = await fetchEvolutionGroups({ credentials, instanceName });

    if (groups.length === 0) {
      return NextResponse.json({ ok: true, created: 0, updated: 0, total: 0 });
    }

    // --- Buscar configs existentes ---
    const { data: existingConfigs } = await admin
      .from("group_agent_configs")
      .select("id, group_jid, evolution_instance_name")
      .eq("company_id", companyId);

    const existingJids = new Set(
      (existingConfigs ?? []).map((c) => c.group_jid)
    );

    const currentGroupJids = new Set(groups.map((g) => g.id));

    // --- Separar novos vs existentes ---
    const newGroups = groups.filter((g) => !existingJids.has(g.id));
    const existingGroups = groups.filter((g) => existingJids.has(g.id));

    let created = 0;
    let updated = 0;
    let hidden = 0;

    // Inserir novos grupos (is_active: false por padrão, vinculados à instância)
    if (newGroups.length > 0) {
      const { error } = await admin.from("group_agent_configs").insert(
        newGroups.map((g) => ({
          company_id: companyId,
          group_jid: g.id,
          group_name: g.subject,
          is_active: false,
          is_hidden: false,
          evolution_instance_name: instanceName,
        }))
      );

      if (!error) {
        created = newGroups.length;
      }
    }

    // Atualizar grupos existentes: nome + instância atual
    for (const group of existingGroups) {
      const { error } = await admin
        .from("group_agent_configs")
        .update({
          group_name: group.subject,
          evolution_instance_name: instanceName,
          is_hidden: false,
        })
        .eq("company_id", companyId)
        .eq("group_jid", group.id);

      if (!error) {
        updated++;
      }
    }

    // Ocultar grupos que não existem mais na instância atual
    const staleConfigs = (existingConfigs ?? []).filter(
      (c) => !currentGroupJids.has(c.group_jid) && !c.evolution_instance_name?.length
        || (c.evolution_instance_name === instanceName && !currentGroupJids.has(c.group_jid))
    );

    if (staleConfigs.length > 0) {
      const staleIds = staleConfigs.map((c) => c.id);
      const { error } = await admin
        .from("group_agent_configs")
        .update({ is_hidden: true, is_active: false })
        .in("id", staleIds)
        .eq("company_id", companyId);

      if (!error) {
        hidden = staleConfigs.length;
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
      hidden,
      total: groups.length,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "SYNC_ERROR" },
      { status: 500 }
    );
  }
}
