"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import { WhatsAppModuleNav } from "@/components/whatsapp/whatsapp-module-nav";

const DETAIL_RE = /^\/whatsapp-intelligence\/conversas\/[^/]+(\/.*)?$/;

export function WhatsAppModuleHeader() {
  const pathname = usePathname();
  if (DETAIL_RE.test(pathname)) return null;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ax-t1 text-xl md:text-2xl">Inteligência</h1>
          <p className="mt-1 ax-body text-[var(--color-text-secondary)]">
            Painel ao vivo, histórico de IA e conversas do WhatsApp.
          </p>
        </div>
        <Link
          href="/settings?tab=connections"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          Conexões
        </Link>
      </header>

      <WhatsAppModuleNav />
    </>
  );
}
