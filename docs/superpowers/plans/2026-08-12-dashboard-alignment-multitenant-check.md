# Dashboard Alignment And Multitenant Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align dashboard cards, clarify IA event terminology, verify backend multitenant boundaries, and deploy the approved changes to the Hostinger VPS.

**Architecture:** Keep changes scoped to the existing dashboard and WhatsApp group components. Rename vague IA signal copy to clearer user-facing language, keep card heights content-driven, and verify tenant isolation through existing `company_id` access helpers and route patterns.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Supabase admin/client helpers, Hostinger VPS deploy webhook.

## Global Constraints

- Do not stage or revert unrelated dirty files.
- Keep dashboard cards compact, aligned, and content-height based.
- “Sinais recentes” must become clearer business language.
- Backend review must focus on tenant scoping through authenticated user/company access.
- Run focused tests, typecheck, and build before deploy.

---

### Task 1: Clarify IA Event Copy And Tests

**Files:**
- Modify: `src/components/whatsapp/groups/group-insights-feed.tsx`
- Modify: `src/components/whatsapp/groups/__tests__/groups-radar-page.test.tsx`
- Modify: `src/components/dashboard/dashboard-command-center-view.tsx`
- Modify: `src/components/dashboard/__tests__/dashboard-command-center-view.test.tsx`

**Interfaces:**
- Consumes: `GroupRadarInsight[]` and `DashboardCommandCenterData["signals"]`
- Produces: user-facing sections named `Eventos da IA`

- [ ] Write failing tests expecting `Eventos da IA` instead of vague “Sinais recentes/Sinais da IA”.
- [ ] Run focused tests and confirm they fail before copy changes.
- [ ] Rename section headings and helper text.
- [ ] Re-run focused tests and confirm they pass.

### Task 2: Align Dashboard Cards

**Files:**
- Modify: `src/components/dashboard/dashboard-command-center-view.tsx`
- Modify: `src/components/dashboard/__tests__/dashboard-command-center-view.test.tsx`

**Interfaces:**
- Consumes: existing KPI, health, signals, and shortcut data.
- Produces: compact `Estado operacional` plus aligned `Ações rápidas`, `Eventos da IA`, and `Gargalos de vendas`.

- [ ] Add tests for compact dashboard sections and shortcut labels.
- [ ] Replace visually noisy quick-actions card copy with concise action grid.
- [ ] Keep operational rows compact with consistent grid alignment.
- [ ] Keep right column content stacked without forcing bottom whitespace.

### Task 3: Preserve Group Settings Activity Work

**Files:**
- Verify: `src/app/api/settings/group-agent/route.ts`
- Verify: `src/components/settings/group-agent-settings.tsx`
- Verify: `src/components/settings/__tests__/group-agent-settings.test.tsx`

**Interfaces:**
- Consumes: `group_messages` ordered by `sent_at`.
- Produces: `activity.lastMessageAt`, `lastMessagePreview`, `messages24h`, `uniqueSenders24h`.

- [ ] Ensure the previously approved ordering by latest group message remains covered by tests.
- [ ] Ensure the engagement card remains covered by tests.

### Task 4: Backend Multitenant Review

**Files:**
- Inspect: `src/lib/auth/*`
- Inspect: `src/app/api/**/route.ts`
- Inspect: `src/services/**`

**Interfaces:**
- Consumes: current auth/session helpers and `company_id` filtering patterns.
- Produces: concise risk report with pass/fail areas.

- [ ] Search for API routes and Supabase queries that should filter by `company_id`.
- [ ] Verify dashboard/group-agent routes use authenticated company access.
- [ ] Identify any endpoints that need follow-up hardening.

### Task 5: Verification And Deploy

**Files:**
- Stage only approved modified files.

**Interfaces:**
- Consumes: Git remote and Hostinger deploy webhook.
- Produces: deployed VPS build with verified health/page response.

- [ ] Run focused tests.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Commit approved files only.
- [ ] Push branch.
- [ ] Call Hostinger deploy webhook.
- [ ] Verify production responds after deploy.
