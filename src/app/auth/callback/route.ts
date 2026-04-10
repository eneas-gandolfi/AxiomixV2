/**
 * Arquivo: src/app/auth/callback/route.ts
 * Propósito: Processar callback de magic link, OAuth e recovery (reset de senha).
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { REMEMBER_ME_COOKIE, REMEMBER_ME_MAX_AGE } from "@/lib/auth/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/dashboard";

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const isRecovery = type === "recovery";
  const redirectPath = isRecovery ? "/reset-password" : safeNextPath;

  const response = NextResponse.redirect(new URL(redirectPath, origin));
  const supabase = createSupabaseRouteHandlerClient(request, response);

  let error: Error | null = null;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "email",
    });
    error = result.error;
  }

  if (error) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const isSecure = origin.startsWith("https");
  response.cookies.set(REMEMBER_ME_COOKIE, "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax" as const,
    secure: isSecure,
    maxAge: REMEMBER_ME_MAX_AGE,
  });

  return response;
}
