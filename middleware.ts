/**
 * Arquivo: middleware.ts
 * Propósito: Aplicar uma guarda leve de autenticação baseada em cookies.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/auth/callback"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/whatsapp-intelligence",
  "/intelligence",
  "/social-publisher",
  "/settings",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = startsWithAny(pathname, PUBLIC_ROUTES);
  const isProtectedRoute = startsWithAny(pathname, PROTECTED_PREFIXES);
  const hasSession = hasSupabaseSessionCookie(request);

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
