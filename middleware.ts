/**
 * Arquivo: middleware.ts
 * Proposito: Proteger rotas autenticadas e liberar links publicos assinados.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { NextResponse, type NextRequest } from "next/server";
import { resolveSessionFromMiddleware } from "@/lib/supabase/middleware";
import { REMEMBER_ME_COOKIE, REMEMBER_ME_MAX_AGE } from "@/lib/auth/constants";

export async function middleware(request: NextRequest) {
  const { response, user } = await resolveSessionFromMiddleware(request);

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // "Lembrar-me" check: se o cookie não existe, a sessão não deve persistir.
  const hasRememberCookie = request.cookies.has(REMEMBER_ME_COOKIE);
  if (!hasRememberCookie) {
    // Migração temporária: usuários já logados antes do deploy não têm o cookie.
    // Setar cookie persistente e continuar normalmente. Remover após 1 semana.
    const isSecure = request.nextUrl.protocol === "https:";
    response.cookies.set(REMEMBER_ME_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isSecure,
      maxAge: REMEMBER_ME_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Proteger todas as rotas EXCETO:
     * - /login, /register (auth pages dentro do grupo (auth))
     * - /auth/* (callback OAuth / magic link)
     * - /onboarding (precisa ser acessivel para usuarios sem empresa)
     * - /alertas/* (links publicos assinados enviados por WhatsApp)
     * - /api/* (APIs ja tem sua propria auth)
     * - /_next/* (assets do Next.js)
     * - /favicon.ico, arquivos estaticos com extensao
     */
    "/((?!login|register|auth|onboarding|alertas|forgot-password|reset-password|api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
  ],
};
