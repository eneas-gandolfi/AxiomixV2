"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationDrawerShellProps {
  conversationId: string;
  children: ReactNode;
}

const ANIM_MS = 240;

export function ConversationDrawerShell({
  conversationId,
  children,
}: ConversationDrawerShellProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Mount → next frame → open (triggers transition).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    window.setTimeout(() => router.back(), ANIM_MS);
  }, [closing, router]);

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

  // Body scroll lock while drawer is mounted.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Focus panel on mount for keyboard nav.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const fullPath = `/whatsapp-intelligence/conversas/${conversationId}`;

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className={cn(
          "absolute inset-0 bg-[rgba(15,17,22,0.32)] backdrop-blur-[2px] transition-opacity",
        )}
        style={{
          transitionDuration: `${ANIM_MS}ms`,
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          opacity: open ? 1 : 0,
        }}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 bottom-0 flex w-full max-w-[1140px] flex-col overflow-hidden outline-none",
          "border-l border-[var(--color-border)] bg-[var(--color-canvas,white)]",
          "shadow-[-32px_0_60px_-24px_rgba(15,17,22,0.22),-8px_0_16px_-8px_rgba(15,17,22,0.08)]",
          "md:rounded-l-2xl",
        )}
        style={{
          transform: open ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          willChange: "transform",
        }}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <div
            id="drawer-title"
            className="font-mono text-[11px] tracking-[0.04em] text-[var(--color-text-secondary)]"
          >
            conversa{" · "}
            <span className="font-semibold text-[var(--color-text)]">
              {conversationId.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={fullPath}
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-border-strong,var(--color-border))] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
              title="Abrir página cheia"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expandir
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-danger,#b91c1c)]/30 hover:bg-[var(--color-danger-bg,#fef2f2)] hover:text-[var(--color-danger,#b91c1c)]"
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
