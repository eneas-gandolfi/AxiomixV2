/**
 * Arquivo: src/lib/supabase/middleware.ts
 * Propósito: Resolver usuário autenticado no middleware e sincronizar cookies de sessão.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/database/types/database.types";
import { getSupabaseEnv } from "@/lib/supabase/config";

type MiddlewareSessionResult = {
  response: NextResponse;
  user: User | null;
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

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { response, user: null, supabase };
  }

  return { response, user: data.user, supabase };
}
