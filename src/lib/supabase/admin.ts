/**
 * Arquivo: src/lib/supabase/admin.ts
 * Propósito: Criar cliente Supabase com service role para rotas internas (webhooks/jobs).
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types/database.types";
import { supabaseFetch } from "@/lib/supabase/fetch-with-timeout";

let adminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    global: { fetch: supabaseFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
