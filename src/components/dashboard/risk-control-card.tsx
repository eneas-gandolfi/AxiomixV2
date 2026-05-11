/**
 * Arquivo: src/components/dashboard/risk-control-card.tsx
 * Propósito: 3º card do tríptico de KPIs — Controle de Risco. Mostra contagem
 *            de alertas críticos (conversas negativas sem resolver + integrações
 *            com erro) em formato KPI: número-herói + narrativa + CTA.
 *            Espelha a lógica da DashboardSidebarSection mas em formato compacto.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAY_MS = 86_400_000;

export async function RiskControlCard({ companyId }: { companyId: string }) {
  noStore();

  const supabase = await createSupabaseServerClient();
  const fortyEightHoursAgoIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const [negativeInsightsResult, integrationsResult, failedPostsResult] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("conversation_id")
      .eq("company_id", companyId)
      .eq("sentiment", "negativo")
      .gte("generated_at", fortyEightHoursAgoIso),
    supabase
      .from("integrations")
      .select("test_status")
      .eq("company_id", companyId),
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "failed")
      .gte("created_at", sevenDaysAgoIso),
  ]);

  const negativeConversationIds = new Set(
    (negativeInsightsResult.data ?? [])
      .map((row) => row.conversation_id)
      .filter((id): id is string => typeof id === "string"),
  );

  // Resolver: descobrir quantas conversas negativas estão NÃO-resolvidas
  let unresolvedNegativeCount = 0;
  if (negativeConversationIds.size > 0) {
    const { data: conversationsData } = await supabase
      .from("conversations")
      .select("id, status")
      .eq("company_id", companyId)
      .in("id", Array.from(negativeConversationIds));

    unresolvedNegativeCount = (conversationsData ?? []).filter(
      (conv) => conv.status?.toLowerCase().trim() !== "resolved",
    ).length;
  }

  const integrationsWithError = (integrationsResult.data ?? []).filter(
    (i) => i.test_status === "error",
  ).length;
  const failedPostsCount = failedPostsResult.count ?? 0;

  const totalAlerts =
    unresolvedNegativeCount + integrationsWithError + failedPostsCount;

  const isOk = totalAlerts === 0;
  const narrative = isOk
    ? "Tudo em dia. Nenhum alerta crítico ativo."
    : buildNarrative(unresolvedNegativeCount, integrationsWithError, failedPostsCount);

  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-4 transition-all duration-200 sm:p-5",
        "opacity-0 animate-ax-cascade",
        "border-border shadow-card-modern hover:-translate-y-0.5 hover:shadow-card-hover-modern",
        "delay-300",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="section-label">Controle de risco</p>
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg",
            isOk ? "bg-success-light" : "bg-danger-light",
          )}
        >
          <ShieldCheck
            className={cn("h-4 w-4", isOk ? "text-success" : "text-danger")}
            aria-hidden="true"
          />
        </span>
      </div>

      <p
        className={cn(
          "ax-metric-lg",
          isOk ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
        )}
      >
        {totalAlerts}
      </p>

      <div className="mt-2">
        <span className="text-xs text-muted">
          {isOk ? "0 alertas críticos" : `${totalAlerts} ${totalAlerts === 1 ? "alerta" : "alertas"} ativos`}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">{narrative}</p>

      {!isOk ? (
        <div className="mt-auto border-t border-border pt-3">
          <Link
            href="/whatsapp-intelligence"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Ver alertas
            <ArrowRight className="h-[11px] w-[11px]" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function buildNarrative(
  unresolvedNegative: number,
  integrationsError: number,
  failedPosts: number,
): string {
  const parts: string[] = [];
  if (unresolvedNegative > 0) {
    parts.push(
      `${unresolvedNegative} ${unresolvedNegative === 1 ? "conversa negativa" : "conversas negativas"} sem resolução`,
    );
  }
  if (integrationsError > 0) {
    parts.push(
      `${integrationsError} ${integrationsError === 1 ? "integração com erro" : "integrações com erro"}`,
    );
  }
  if (failedPosts > 0) {
    parts.push(
      `${failedPosts} ${failedPosts === 1 ? "post falhou" : "posts falharam"} esta semana`,
    );
  }
  return parts.join(" · ") + ".";
}
