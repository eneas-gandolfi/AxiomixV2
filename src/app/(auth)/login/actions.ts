/**
 * Arquivo: src/app/(auth)/login/actions.ts
 * Propósito: Server Actions de autenticação (login com senha e magic link).
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = {
  error: string | null;
};

export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error("[login] signInWithPassword failed:", err);
    return { error: "Erro ao conectar com o serviço de autenticação. Tente novamente." };
  }
}

export async function signInWithMagicLinkAction(
  email: string,
  redirectTo: string
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error("[login] signInWithOtp failed:", err);
    return { error: "Erro ao conectar com o serviço de autenticação. Tente novamente." };
  }
}
