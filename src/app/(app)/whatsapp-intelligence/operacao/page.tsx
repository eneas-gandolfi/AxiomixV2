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
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <BreathingDot />

      <h2 className="ax-t1 text-xl md:text-2xl mt-6">
        Aguardando primeira conversa
      </h2>
      <p className="ax-body mt-2 max-w-md text-[var(--color-text-secondary)]">
        Conecte sua conta WhatsApp pra começar. Quando a primeira mensagem
        chegar, ela aparece aqui em tempo quase-real.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
        <Link
          href="/settings?tab=integrations"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-sm transition-colors"
        >
          <Plug className="h-4 w-4" />
          Conectar WhatsApp
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/whatsapp-intelligence"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)] text-[var(--color-text)] font-medium text-sm transition-colors"
        >
          Ver demonstração
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-12 max-w-3xl w-full">
        <FeaturePreview
          icon={Activity}
          title="Cliente esquecido"
          description="Cronômetro destacado no topo mostra qual cliente espera há mais tempo, com nome do atendente responsável."
        />
        <FeaturePreview
          icon={Sparkles}
          title="Decisão em 2 segundos"
          description="One-thumb reach. Botão de ação primário pronto pro polegar — avisar o atendente, assumir conversa, atribuir."
        />
        <FeaturePreview
          icon={Plug}
          title="Polling 30s · sem alarme falso"
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
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left">
      <div className="h-8 w-8 rounded-lg bg-[var(--module-accent-light,_#E0FAF7)]/40 text-[var(--module-accent,_#2EC4B6)] flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
        {description}
      </p>
    </div>
  );
}
