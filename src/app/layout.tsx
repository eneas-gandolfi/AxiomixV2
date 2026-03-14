/**
 * Arquivo: src/app/layout.tsx
 * Propósito: Layout raiz — fontes Bricolage Grotesque, Instrument Sans e Geist Mono.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AXIOMIX",
  description: "Marketing e Inteligência Competitiva",
  icons: {
    icon: "/axiomix-favicon.png",
    shortcut: "/axiomix-favicon.png",
    apple: "/axiomix-favicon.png",
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/axiomix-favicon.png" type="image/png" />
      </head>
      <body
        className={`${bricolage.variable} ${instrument.variable} ${GeistMono.variable} min-h-screen font-sans`}
        suppressHydrationWarning
      >
        <Script id="axiomix-theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const stored = localStorage.getItem('axiomix-theme');
              const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              const theme = stored ?? preferred;
              document.documentElement.classList.toggle('dark', theme === 'dark');
            } catch {}
          })();`}
        </Script>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
