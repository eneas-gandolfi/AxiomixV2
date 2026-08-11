# Dashboard Fluency and Session Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the WhatsApp group dashboard, reduce accidental session drops, and improve navigation feedback.

**Architecture:** Keep radar data generation server-side and accurate, but render only the highest-signal groups in the dashboard. Treat settings as the administrative place for all groups. Tune idle-session UX in the existing constants/login components.

**Tech Stack:** Next.js App Router, React Server Components, Vitest, Testing Library, Tailwind classes.

## Global Constraints

- Do not add dependencies.
- Do not change database schema.
- Keep the dashboard focused on WhatsApp group intelligence.
- Preserve Portuguese product copy.

---

### Task 1: Compact Group Radar

**Files:**
- Modify: `src/components/whatsapp/groups/group-status-grid.tsx`
- Test: `src/components/whatsapp/groups/__tests__/group-status-grid.test.tsx`

**Interfaces:**
- Consumes: `GroupRadarItem[]`
- Produces: `getFocusedGroups(groups: GroupRadarItem[]): GroupRadarItem[]`

- [ ] Write tests proving the dashboard renders at most 6 focused groups and hides inactive overflow.
- [ ] Run the focused test and verify it fails.
- [ ] Implement `getFocusedGroups`, update copy to "Grupos em foco", and add a link to full settings.
- [ ] Run the focused test and verify it passes.

### Task 2: Session Defaults

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/lib/auth/constants.ts`

**Interfaces:**
- Consumes: existing `rememberMe` login field and idle timeout context.
- Produces: remembered login by default and less intrusive idle timer.

- [ ] Write tests or focused assertions for default remember behavior where existing test harness supports it.
- [ ] Change login default to `true`.
- [ ] Raise non-remembered idle timeout to 4 hours and warning window to 5 minutes.
- [ ] Show topbar timer only when near expiry or warning.

### Task 3: Navigation Feedback

**Files:**
- Modify: `src/app/(app)/whatsapp-intelligence/page.tsx`

**Interfaces:**
- Consumes: existing `GroupsRadarPage`.
- Produces: `GroupsRadarSkeleton` inside Suspense for `modo=grupos`.

- [ ] Add a compact skeleton that matches the new focused layout.
- [ ] Wrap the groups mode in Suspense.
- [ ] Run typecheck, lint focused files, and relevant tests.
