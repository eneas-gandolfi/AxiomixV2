"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Maximize2, X } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      router.replace("/whatsapp-intelligence/conversas", { scroll: false });
    }, ANIM_MS);
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

  // Body scroll lock while drawer is open. Released as soon as `closing`
  // flips to true so the underlying page is interactive during the fade-out
  // and even if the shell hangs around after the route change.
  useEffect(() => {
    if (closing) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [closing]);


  const fullPath = `/whatsapp-intelligence/conversas/${conversationId}`;

  // Portal to document.body so we escape any ancestor with overflow/transform/
  // contain that could trap the fixed positioning and make the drawer appear
  // anchored to the clicked row instead of the viewport.
  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      style={{ pointerEvents: open && !closing ? "auto" : "none" }}
    >
      <div
        className="absolute inset-0 bg-[rgba(15,17,22,0.32)] backdrop-blur-[2px] transition-opacity"
        style={{
          transitionDuration: `${ANIM_MS}ms`,
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          opacity: open ? 1 : 0,
        }}
        aria-hidden="true"
      />
      <div
        tabIndex={-1}
        id="drawer-title"
        aria-label={`Conversa ${conversationId.slice(0, 8)}`}
        className={[
          "absolute right-0 top-0 bottom-0 flex w-full max-w-[1140px] flex-col overflow-hidden outline-none",
          "border-l border-[var(--color-border)] bg-[var(--color-canvas,white)]",
          "shadow-[-32px_0_60px_-24px_rgba(15,17,22,0.22),-8px_0_16px_-8px_rgba(15,17,22,0.08)]",
          "md:rounded-l-2xl",
        ].join(" ")}
        style={{
          transform: open ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          willChange: "transform",
        }}
      >
        <div className="flex flex-shrink-0 items-center justify-end gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-canvas,white)] px-3 py-1.5">
          <Link
            href={fullPath}
            prefetch={false}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            title="Abrir página cheia"
            aria-label="Abrir página cheia"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar (Esc)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-danger-bg,#fef2f2)] hover:text-[var(--color-danger,#b91c1c)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
