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
import { supabaseFetch } from "@/lib/supabase/fetch-with-timeout";

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
    global: { fetch: supabaseFetch },
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

  // getUser valida uma sessão real do usuário. getClaims pode refletir claims do
  // token anônimo do projeto quando não há cookies de sessão, o que não deve
  // liberar páginas autenticadas.
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return { response, user: null, supabase };
  }

  return {
    response,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    supabase,
  };
}
