/**
 * Arquivo: src/app/(auth)/layout.tsx
 * Propósito: Layout para páginas de autenticação — identidade Orange Command.
 *            Fundo deep night com glow sutil, logo centralizado acima do card.
 */

import Image from "next/image";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#080B10] px-4 py-8">
      {/* Glow de fundo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(232,96,15,0.08), transparent 70%)",
        }}
      />

      {/* Logo */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <Image
          src="/logo.png"
          alt="AXIOMIX"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <span className="font-display text-lg font-bold tracking-wide text-[#FF6B1A]">
          AXIOMIX
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-[11px] text-[#5A6472]">
        Marketing e Inteligência Competitiva
      </p>
    </div>
  );
}
