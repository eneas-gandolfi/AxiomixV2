import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ConversationsReturnLink() {
  return (
    <Link
      href="/whatsapp-intelligence?modo=agora"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text)] shadow-sm transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Voltar à tela anterior
    </Link>
  );
}
