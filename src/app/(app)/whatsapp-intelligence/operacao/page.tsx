/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/operacao/page.tsx
 * Propósito: Aba "Operação" — torre de controle ao vivo do atendimento WhatsApp.
 *            Estado vazio (pós-onboarding sem conversas) ou painel ao vivo
 *            polling 30s.
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  Activity,
  ArrowRight,
  Plug,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OperacaoLivePanel } from "@/components/whatsapp/operacao-live-panel";

export const dynamic = "force-dynamic";

export default async function OperacaoPage() {
  noStore();

  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const conversationCount = count ?? 0;

  if (conversationCount === 0) {
    return <OperacaoEmptyState />;
  }

  // Renderiza o painel ao vivo (Client Component que polling 30s)
  return <OperacaoLivePanel />;
}

// =============================================================================
// Estado vazio · pós-onboarding, sem conversas ainda
// =============================================================================

function OperacaoEmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="section-label mb-4 rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
        Operação · Aguardando primeira conversa
      </span>

      <BreathingDot />

      <h2 className="mt-6 font-display text-xl font-semibold tracking-tight text-[var(--color-text)] sm:text-2xl">
        Aguardando primeira conversa
      </h2>
      <p className="ax-body mt-2 max-w-md text-[var(--color-text-secondary)]">
        Conecte sua conta WhatsApp pra começar. Quando a primeira mensagem chegar,
        ela aparece aqui em tempo quase-real.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/settings?tab=integrations"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          <Plug className="h-4 w-4" />
          Conectar WhatsApp
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/whatsapp-intelligence"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--color-border-strong)] px-5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-2)]"
        >
          Ver demonstração
        </Link>
      </div>

      <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
        <FeaturePreview
          icon={Activity}
          label="Cliente esquecido"
          description="Cronômetro destacado mostra qual cliente espera há mais tempo, com nome do atendente responsável."
        />
        <FeaturePreview
          icon={Sparkles}
          label="Decisão em 2 segundos"
          description="Botão de ação primário pronto pro polegar — avisar atendente, assumir conversa, atribuir."
        />
        <FeaturePreview
          icon={Plug}
          label="Polling 30s · sem alarme falso"
          description={`Cronômetro pausa fora do horário cadastrado. Vermelho é raro — só pra "larga tudo agora".`}
        />
      </div>
    </div>
  );
}

function BreathingDot() {
  return (
    <div
      className="relative h-20 w-20 rounded-full flex items-center justify-center"
      style={{ border: "2px dashed var(--color-border-strong)" }}
    >
      <div className="h-3.5 w-3.5 rounded-full bg-[var(--module-accent,_#2EC4B6)] animate-ax-breathe" />
    </div>
  );
}

function FeaturePreview({
  icon: Icon,
  label,
  description,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-card-modern">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--module-accent-light,_#E0FAF7)]/40 text-[var(--module-accent,_#2EC4B6)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="section-label">{label}</p>
      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
        {description}
      </p>
    </div>
  );
}
