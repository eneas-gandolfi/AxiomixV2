/**
 * Arquivo: src/app/api/auth/forgot-password/route.ts
 * Propósito: Enviar e-mail de recuperação de senha via Supabase Auth.
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/database/types/database.types";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { applyIpRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await applyIpRateLimit(request, "forgot-pwd:ip", 5, 900);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 }
      );
    }

    const emailLimit = await checkRateLimit(`forgot-pwd:email:${email.toLowerCase()}`, 3, 900);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas para este e-mail. Tente novamente em ${emailLimit.retryAfterSeconds}s.` },
        { status: 429 }
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

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).replace(/\/$/, "");

    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    return response;
  } catch (err: any) {
    console.error("[api/auth/forgot-password] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
