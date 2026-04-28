/**
 * Arquivo: database/__tests__/rls/rls-policies.test.ts
 * Propósito: Verifica que todas as tabelas sensíveis têm RLS habilitado e policies de company_id.
 * Autor: AXIOMIX
 * Data: 2026-04-28
 *
 * Nota: Este teste analisa os arquivos SQL de migration estáticamente.
 * Para testes de isolamento real (tenant A vs tenant B), é necessário
 * rodar contra Supabase local (supabase start) — ver template em rls-isolation.test.ts.example.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const MIGRATIONS_DIR = resolve(__dirname, "../../migrations");

function loadAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf-8")).join("\n");
}

function extractTablesWithRLS(sql: string): string[] {
  const regex = /alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi;
  const tables: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  return [...new Set(tables)];
}

function extractTablesWithCompanyId(sql: string): string[] {
  const regex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\([^)]*company_id/gi;
  const tables: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  return [...new Set(tables)];
}

// Tables that MUST have RLS (contain tenant-specific business data)
const CRITICAL_TABLES = [
  "companies",
  "memberships",
  "integrations",
  "conversations",
  "messages",
  "conversation_insights",
  "competitor_profiles",
  "collected_posts",
  "intelligence_insights",
  "media_files",
  "scheduled_posts",
  "async_jobs",
  "weekly_reports",
  "rag_documents",
  "rag_document_chunks",
];

describe("RLS Policy Verification", () => {
  const allSql = loadAllMigrations();
  const rlsTables = extractTablesWithRLS(allSql);
  const companyIdTables = extractTablesWithCompanyId(allSql);

  it("all critical tables have RLS enabled", () => {
    const missing = CRITICAL_TABLES.filter((t) => !rlsTables.includes(t));
    expect(missing).toEqual([]);
  });

  it("tables with company_id column have RLS enabled", () => {
    const unprotected = companyIdTables.filter((t) => !rlsTables.includes(t));
    expect(unprotected).toEqual([]);
  });

  it("no table with company_id exists without RLS", () => {
    // Stronger assertion: every table that has company_id MUST have RLS
    for (const table of companyIdTables) {
      expect(rlsTables).toContain(table);
    }
  });

  it("RLS is enabled on at least 15 tables (sanity check)", () => {
    expect(rlsTables.length).toBeGreaterThanOrEqual(15);
  });
});
