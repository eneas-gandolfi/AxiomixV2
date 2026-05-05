/**
 * Arquivo: src/components/whatsapp/analise-vendor-performance.tsx
 * Propósito: §1 da aba Análise — "Quem da minha equipe está em queda?".
 *            Server Component que cruza conversation_insights com
 *            conversations.assigned_to e mostra performance por vendedor com
 *            tendência 7d (sentimento positivo % vs 7d anteriores).
 *
 *            Linha vermelha à esquerda destaca o vendedor com a maior queda.
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAY_MS = 86_400_000;

type VendorRow = {
  vendorId: string | null;
  vendorName: string;
  conversations: number;
  sentimentPositivePct: number;
  trend7d: number; // pp delta vs 7d anteriores
  /** Tempo até primeira resposta médio em segundos · null quando sem dado */
  tfrAvgSeconds: number | null;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = Math.round(seconds % 60);
  if (minutes < 60) return remSec > 0 ? `${minutes}m${String(remSec).padStart(2, "0")}` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${String(minutes % 60).padStart(2, "0")}`;
}

function tfrColor(seconds: number | null): string {
  if (seconds === null) return "text-[var(--color-text-tertiary)]";
  if (seconds <= 120) return "text-[var(--color-success)]"; // até 2min
  if (seconds <= 600) return "text-[var(--color-text)]"; // até 10min
  if (seconds <= 1800) return "text-[var(--color-warning)]"; // até 30min
  return "text-[var(--color-danger)]";
}

function formatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "??";
  return (
    (parts[0][0]?.toUpperCase() ?? "") +
    (parts[parts.length - 1][0]?.toUpperCase() ?? "")
  );
}

export async function AnaliseVendorPerformance({ companyId }: { companyId: string }) {
  const supabase = await createSupabaseServerClient();

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * DAY_MS).toISOString();

  // 1) Insights últimos 14d (current 7d + previous 7d)
  const { data: insights } = await supabase
    .from("conversation_insights")
    .select("conversation_id, sentiment, generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", fourteenDaysAgo);

  if (!insights || insights.length === 0) {
    return (
      <SectionWrapper number={1} question="Quem da minha equipe está em queda?">
        <p className="py-8 text-center text-sm italic text-[var(--color-text-tertiary)]">
          Análise por vendedor aparece quando houver insights suficientes nos
          últimos 14 dias.
        </p>
      </SectionWrapper>
    );
  }

  // 2) Conversas com assigned_to
  const conversationIds = Array.from(
    new Set(
      insights
        .map((i) => i.conversation_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, assigned_to")
    .eq("company_id", companyId)
    .in("id", conversationIds);

  const assigneeByConv = new Map<string, string | null>();
  for (const c of conversations ?? []) {
    assigneeByConv.set(c.id, c.assigned_to);
  }

  // 3) Nomes dos operadores
  const assigneeIds = Array.from(
    new Set(
      (conversations ?? [])
        .map((c) => c.assigned_to)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const operatorNameById = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", assigneeIds);
    for (const u of users ?? []) {
      operatorNameById.set(u.id, u.full_name ?? u.email ?? "Sem nome");
    }
  }

  // 3.5) TFR — tempo até primeira resposta humana, computado a partir de
  // messages. Pra cada conversa, pega 1ª inbound (direction='in') e a 1ª
  // outbound que veio depois dela. Cap em 1000 mensagens pra evitar
  // varredura massiva (ok pra v1 do TFR — fase 2 vira função SQL dedicada).
  const tfrByConversation = new Map<string, number>();
  if (conversationIds.length > 0) {
    const { data: messages } = await supabase
      .from("messages")
      .select("conversation_id, direction, sent_at")
      .eq("company_id", companyId)
      .in("conversation_id", conversationIds)
      .order("sent_at", { ascending: true })
      .limit(1000);

    type EarliestPair = {
      firstInboundAt: number | null;
      firstOutboundAfterInbound: number | null;
    };

    const pairs = new Map<string, EarliestPair>();

    for (const m of messages ?? []) {
      if (!m.conversation_id || !m.sent_at || !m.direction) continue;
      const ts = new Date(m.sent_at).getTime();
      if (Number.isNaN(ts)) continue;

      // Direção: webhook persiste "inbound"/"outbound", legacy persiste "in"/"out".
      const isInbound = m.direction === "inbound" || m.direction === "in";
      const isOutbound = m.direction === "outbound" || m.direction === "out";

      let pair = pairs.get(m.conversation_id);
      if (!pair) {
        pair = { firstInboundAt: null, firstOutboundAfterInbound: null };
        pairs.set(m.conversation_id, pair);
      }

      if (isInbound) {
        if (pair.firstInboundAt === null) pair.firstInboundAt = ts;
      } else if (isOutbound) {
        if (
          pair.firstInboundAt !== null &&
          pair.firstOutboundAfterInbound === null &&
          ts >= pair.firstInboundAt
        ) {
          pair.firstOutboundAfterInbound = ts;
        }
      }
    }

    for (const [convId, pair] of pairs.entries()) {
      if (pair.firstInboundAt !== null && pair.firstOutboundAfterInbound !== null) {
        const deltaSec = (pair.firstOutboundAfterInbound - pair.firstInboundAt) / 1000;
        if (deltaSec >= 0) tfrByConversation.set(convId, deltaSec);
      }
    }
  }

  // 4) Aggregate por vendedor (current 7d + previous 7d)
  type Bucket = { count: number; positive: number };
  type AccByVendor = { current: Bucket; previous: Bucket };

  const acc = new Map<string, AccByVendor>();

  for (const insight of insights) {
    const convId = insight.conversation_id;
    if (!convId || !insight.generated_at) continue;
    const assignee = assigneeByConv.get(convId) ?? null;
    const key = assignee ?? "__unassigned__";

    if (!acc.has(key)) {
      acc.set(key, {
        current: { count: 0, positive: 0 },
        previous: { count: 0, positive: 0 },
      });
    }

    const bucket = acc.get(key)!;
    const generatedAt = new Date(insight.generated_at).getTime();
    const isCurrent = generatedAt >= now - 7 * DAY_MS;
    const target = isCurrent ? bucket.current : bucket.previous;

    target.count++;
    if (insight.sentiment === "positivo") target.positive++;
  }

  // 4.5) Calcula TFR médio por vendedor (a partir do mapa tfrByConversation)
  const tfrSumsByVendor = new Map<string, { sum: number; count: number }>();
  for (const conv of conversations ?? []) {
    const tfr = tfrByConversation.get(conv.id);
    if (tfr === undefined) continue;
    const key = conv.assigned_to ?? "__unassigned__";
    const acc = tfrSumsByVendor.get(key) ?? { sum: 0, count: 0 };
    acc.sum += tfr;
    acc.count += 1;
    tfrSumsByVendor.set(key, acc);
  }

  // 5) Build rows. Filtra vendedor com poucas conversas (< 3 no atual) — sinal fraco.
  const rows: VendorRow[] = [];
  for (const [key, val] of acc.entries()) {
    if (val.current.count < 3) continue;
    const currentPct =
      val.current.count > 0 ? (val.current.positive / val.current.count) * 100 : 0;
    const previousPct =
      val.previous.count > 0 ? (val.previous.positive / val.previous.count) * 100 : currentPct;
    const tfrAcc = tfrSumsByVendor.get(key);
    const tfrAvg = tfrAcc && tfrAcc.count > 0 ? tfrAcc.sum / tfrAcc.count : null;
    rows.push({
      vendorId: key === "__unassigned__" ? null : key,
      vendorName:
        key === "__unassigned__"
          ? "Não atribuído"
          : operatorNameById.get(key) ?? "Sem nome",
      conversations: val.current.count,
      sentimentPositivePct: Math.round(currentPct),
      trend7d: Math.round(currentPct - previousPct),
      tfrAvgSeconds: tfrAvg,
    });
  }

  // Ordena por queda mais forte primeiro, depois por volume desc
  rows.sort((a, b) => {
    if (a.trend7d !== b.trend7d) return a.trend7d - b.trend7d;
    return b.conversations - a.conversations;
  });

  if (rows.length === 0) {
    return (
      <SectionWrapper number={1} question="Quem da minha equipe está em queda?">
        <p className="py-8 text-center text-sm italic text-[var(--color-text-tertiary)]">
          Vendedor com pelo menos 3 conversas analisadas nos últimos 7 dias
          aparece aqui — ainda não há dado suficiente.
        </p>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper
      number={1}
      question="Quem da minha equipe está em queda?"
      subtitle="Histórico do que Operação mostra ao vivo. Linha vermelha à esquerda destaca o vendedor com a maior variação negativa."
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Vendedor
            </th>
            <th className="py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Conversas 7d
            </th>
            <th className="py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              TFR médio
            </th>
            <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Sentimento positivo
            </th>
            <th className="py-2 pr-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Tendência 7d
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isAlarm = index === 0 && row.trend7d < -3;
            const TrendIcon =
              row.trend7d > 2
                ? TrendingUp
                : row.trend7d < -2
                  ? TrendingDown
                  : Minus;
            const trendColor =
              row.trend7d > 2
                ? "text-[var(--color-success)] bg-[var(--color-success-bg)]"
                : row.trend7d < -2
                  ? "text-[var(--color-danger)] bg-[var(--color-danger-bg)]"
                  : "text-[var(--color-text-tertiary)] bg-[var(--color-surface-2)]";

            return (
              <tr
                key={row.vendorId ?? "unassigned"}
                className="border-b border-[var(--color-border)]/60"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {isAlarm ? (
                      <span
                        className="h-7 w-1 rounded-full bg-[var(--color-danger)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="h-7 w-1" aria-hidden="true" />
                    )}
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[10px] font-semibold text-[var(--color-text)]">
                      {formatInitials(row.vendorName)}
                    </div>
                    <span
                      className={`text-sm ${
                        isAlarm
                          ? "font-bold text-[var(--color-text)]"
                          : "font-medium text-[var(--color-text)]"
                      }`}
                    >
                      {row.vendorName}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right font-mono text-sm text-[var(--color-text)]">
                  {row.conversations}
                </td>
                <td
                  className={`py-3 pr-4 text-right font-mono text-sm font-medium ${tfrColor(row.tfrAvgSeconds)}`}
                >
                  {formatDuration(row.tfrAvgSeconds)}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.sentimentPositivePct}%`,
                          backgroundColor:
                            row.sentimentPositivePct >= 70
                              ? "var(--color-success)"
                              : row.sentimentPositivePct >= 50
                                ? "var(--color-warning)"
                                : "var(--color-danger)",
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-[var(--color-text)]">
                      {row.sentimentPositivePct}%
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-2 text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${trendColor}`}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {row.trend7d > 0 ? "+" : ""}
                    {row.trend7d}pp
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionWrapper>
  );
}

// =============================================================================
// Wrapper consistente pras 4 seções da aba Análise
// =============================================================================

function SectionWrapper({
  number,
  question,
  subtitle,
  children,
}: {
  number: number;
  question: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <header className="mb-4 flex items-start gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(212,168,83,0.15)] font-bricolage text-sm font-bold text-[#D4A853]">
          {number}
        </div>
        <div>
          <h2 className="font-bricolage text-lg font-bold tracking-tight text-[var(--color-text)]">
            {question}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export { SectionWrapper };
