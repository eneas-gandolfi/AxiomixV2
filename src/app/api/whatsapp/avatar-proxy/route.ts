/**
 * Arquivo: src/app/api/whatsapp/avatar-proxy/route.ts
 * Propósito: Proxy autenticado de imagens de perfil do Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess, CompanyAccessError } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeIntegrationConfig } from "@/lib/integrations/service";

export const dynamic = "force-dynamic";

const PROXY_TIMEOUT_MS = 10_000;

function normalizeEvoBaseUrl(rawBaseUrl: string) {
  const normalized = rawBaseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const rawUrl = request.nextUrl.searchParams.get("url");
    if (!rawUrl) {
      return new NextResponse("Parâmetro url é obrigatório.", { status: 400 });
    }

    // Buscar credenciais do Evo CRM
    const adminSupabase = createSupabaseAdminClient();
    const { data: integration } = await adminSupabase
      .from("integrations")
      .select("config")
      .eq("company_id", access.companyId)
      .eq("type", "evo_crm")
      .maybeSingle();

    if (!integration?.config) {
      return new NextResponse("Integração Evo CRM não configurada.", { status: 404 });
    }

    const config = decodeIntegrationConfig("evo_crm", integration.config);
    if (!config.baseUrl || !config.apiToken) {
      return new NextResponse("Credenciais do Evo CRM incompletas.", { status: 500 });
    }

    const baseUrl = normalizeEvoBaseUrl(config.baseUrl);

    // Validar que a URL pertence ao domínio do Evo CRM (anti-SSRF)
    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      // Se não é URL absoluta, tratar como path relativo ao baseUrl
      try {
        targetUrl = new URL(`${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`);
      } catch {
        return new NextResponse("URL inválida.", { status: 400 });
      }
    }

    const allowedHost = new URL(baseUrl).hostname;
    if (targetUrl.hostname !== allowedHost) {
      return new NextResponse("URL não pertence ao domínio do Evo CRM.", { status: 403 });
    }

    // Buscar imagem via fetch autenticado (roteamento Docker interno quando disponível)
    const imageBuffer = await fetchImageViaHttp(targetUrl, config.apiToken);

    if (!imageBuffer) {
      return new NextResponse(null, { status: 404 });
    }

    // Detectar content-type pelo magic number
    const contentType = detectImageContentType(imageBuffer);

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(imageBuffer.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return new NextResponse(error.message, { status: error.status });
    }
    return new NextResponse("Erro ao buscar imagem.", { status: 500 });
  }
}

function detectImageContentType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";
  return "image/jpeg"; // fallback
}

async function fetchImageViaHttp(url: URL, apiToken: string): Promise<Buffer | null> {
  const internalBase = process.env.EVO_CRM_INTERNAL_URL;
  const fetchUrl = internalBase && url.hostname === "crm.getlead.capital"
    ? url.toString().replace(url.origin, internalBase.replace(/\/+$/, ""))
    : url.toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const res = await fetch(fetchUrl, {
      headers: {
        "authorization": `Bearer ${apiToken}`,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    if (res.status >= 400) return null;

    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
