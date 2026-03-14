/**
 * Arquivo: src/lib/supabase/config.ts
 * Propósito: Centralizar leitura das variáveis públicas necessárias do Supabase.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não está configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada.");
  }

  return { supabaseUrl, supabaseAnonKey };
}
