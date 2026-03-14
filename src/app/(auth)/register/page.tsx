/**
 * Arquivo: src/app/(auth)/register/page.tsx
 * Propósito: Bloquear auto-cadastro pelo app e redirecionar para login.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  redirect("/login");
}
