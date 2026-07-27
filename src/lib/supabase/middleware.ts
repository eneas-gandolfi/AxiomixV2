/**
 * Arquivo: src/lib/supabase/middleware.ts
 * Propósito: Resolver usuário autenticado no middleware e sincronizar cookies de sessão.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/database/types/database.types";
import { getSupabaseEnv } from "@/lib/supabase/config";

type MiddlewareSessionResult = {
  response: NextResponse;
  user: { id: string; email: string | null } | null;
  supabase: SupabaseClient<Database>;
};

export async function resolveSessionFromMiddleware(
  request: NextRequest
): Promise<MiddlewareSessionResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // getClaims valida o JWT localmente via JWKS (cacheado) quando o projeto usa
  // signing keys assimétricas — evita 1 ida de rede ao Supabase Auth por request.
  // Com HS256 legado ele valida no servidor (mesmo custo do getUser anterior).
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) {
    return { response, user: null, supabase };
  }

  return {
    response,
    user: {
      id: data.claims.sub,
      email: typeof data.claims.email === "string" ? data.claims.email : null,
    },
    supabase,
  };
}
