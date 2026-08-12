# Group Agent Engagement Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort WhatsApp group agent settings by real latest group activity and fill the lateral empty area with a compact topics and engagement card.

**Architecture:** Reuse existing `group_messages` data instead of adding a new AI job. The settings API will return lightweight recent activity fields per config, and the client will sort/render a compact summary from those fields.

**Tech Stack:** Next.js route handlers, Supabase admin client, React client component, Vitest + Testing Library.

## Global Constraints

- Keep the dashboard/settings visual compact and direct.
- Do not add a heavy IA analysis job in this iteration.
- Preserve current group actions: select, hide, activate, expand, save.
- Use TDD: write failing tests before implementation.
- Verify with targeted tests, typecheck, and build before reporting completion.

---

### Task 1: Group Activity Fields

**Files:**
- Modify: `src/app/api/settings/group-agent/route.ts`
- Modify: `src/components/settings/group-agent-settings.tsx`
- Test: `src/components/settings/__tests__/group-agent-settings.test.tsx`

**Interfaces:**
- Produces `GroupAgentConfig.activity`:
  - `lastMessageAt: string | null`
  - `lastMessagePreview: string | null`
  - `messages24h: number`
  - `uniqueSenders24h: number`

- [ ] Write failing UI tests for recency sorting based on `activity.lastMessageAt` and for the new `Assuntos e engajamento` card.
- [ ] Run the targeted test and verify it fails for the expected missing behavior.
- [ ] Add activity fields to the `GroupAgentConfig` type and sorting helper.
- [ ] Enrich `/api/settings/group-agent` with recent messages from `group_messages`.
- [ ] Render the compact lateral engagement card beside the sync/list header.
- [ ] Run targeted tests and verify they pass.

### Task 2: Verification

**Files:**
- Verify all changed files.

- [ ] Run targeted settings tests.
- [ ] Run typecheck.
- [ ] Run build.
- [ ] Keep localhost running for user review.
