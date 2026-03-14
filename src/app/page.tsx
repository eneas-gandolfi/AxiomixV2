/**
 * Arquivo: src/app/page.tsx
 * Propósito: Redirecionar o usuário para dashboard quando autenticado, senão para login.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
