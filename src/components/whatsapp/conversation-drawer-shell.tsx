"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Maximize2, X } from "lucide-react";

interface ConversationDrawerShellProps {
  conversationId: string;
  children: ReactNode;
}

export function ConversationDrawerShell({
  conversationId,
  children,
}: ConversationDrawerShellProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const fullPath = `/whatsapp-intelligence/conversas/${conversationId}`;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="absolute right-0 top-0 bottom-0 flex w-full max-w-[1180px] flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-canvas,white)] shadow-[-32px_0_60px_-24px_rgba(20,22,28,0.20),-8px_0_16px_-8px_rgba(20,22,28,0.08)] md:rounded-l-2xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-canvas,white)] to-[var(--color-canvas-2,#fafaf7)] px-5 py-3">
          <div className="font-mono text-[11px] tracking-[0.04em] text-[var(--color-text-secondary)]">
            conversa · <span className="text-[var(--color-text)]">{conversationId.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={fullPath}
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              title="Abrir página cheia"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expandir
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-danger,#b91c1c)]/30 hover:bg-[var(--color-danger-bg,#fef2f2)] hover:text-[var(--color-danger,#b91c1c)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
