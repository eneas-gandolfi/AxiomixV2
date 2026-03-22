/**
 * Arquivo: src/app/api/auth/login/route.ts
 * Propósito: Route handler para login com senha (evita CORS do browser → Supabase).
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/database/types/database.types";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { REMEMBER_ME_COOKIE, REMEMBER_ME_MAX_AGE } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const response = NextResponse.json({ error: null });

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

    console.log("[api/auth/login] Attempting login for:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("[api/auth/login] Auth error:", error);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.log("[api/auth/login] Login successful for:", data.user?.email);

    const isSecure = request.nextUrl.protocol === "https:";
    const cookieOptions: Record<string, unknown> = {
      path: "/",
      httpOnly: false,
      sameSite: "lax" as const,
      secure: isSecure,
    };
    if (rememberMe) {
      cookieOptions.maxAge = REMEMBER_ME_MAX_AGE;
    }
    response.cookies.set(REMEMBER_ME_COOKIE, "1", cookieOptions);

    return response;
  } catch (err: any) {
    console.error("[api/auth/login] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao autenticar." },
      { status: 500 }
    );
  }
}
