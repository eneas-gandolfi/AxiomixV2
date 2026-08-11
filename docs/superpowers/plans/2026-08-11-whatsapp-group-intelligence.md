# WhatsApp Group Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WhatsApp group analysis the first product surface by adding a lightweight Groups Radar, preserving the existing active group agent, and disabling satellite runtime work when feature flags are off.

**Architecture:** This first increment uses existing group tables (`group_agent_configs`, `group_messages`, `group_agent_responses`, `group_agent_notes`) and derives a read-only radar payload in server-side code. The webhook remains responsible for quick persistence; expensive media processing is guarded so it does not run for non-trigger group messages. Satellite crons are registered only when their feature flag is enabled.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript 5, Supabase, Vitest, Tailwind CSS, existing group-agent services.

## Global Constraints

- Grupos primeiro: usuarios autenticados devem cair no WhatsApp Intelligence, nao no dashboard generico.
- Radar sempre disponivel: todo grupo registrado deve aparecer no painel, mesmo quando o agente estiver inativo.
- Agente opcional: cada grupo pode ficar em modo silencioso, trigger-only ou proativo.
- IA em batch, nao em tudo: o webhook salva mensagens rapidamente; processamento caro acontece fora do request.
- Memoria curta no runtime, memoria longa no banco: telas consomem agregados e ultimos eventos, nao historico bruto completo.
- Modulos satelite sob flag: Social Publisher, Intelligence externa e KB independente nao devem rodar crons nem carregar UI quando desativados.
- Do not rewrite Social Publisher, Dashboard, 1:1 conversations, RAG, or the existing group agent.
- Avoid adding new dependencies.

---

## File Structure

- Modify `src/lib/cron/scheduler.ts`: export a pure `resolveCronRegistrations(env)` helper and register satellite jobs conditionally.
- Test `src/lib/cron/__tests__/scheduler.test.ts`: verify feature-flag behavior without starting real cron loops.
- Create `src/lib/navigation/default-route.ts`: centralize the authenticated landing route.
- Modify `src/app/page.tsx`: redirect authenticated users via `getAuthenticatedDefaultRoute()`.
- Modify `src/app/(app)/onboarding/page.tsx`: redirect onboarded users via `getAuthenticatedDefaultRoute()`.
- Test `src/lib/navigation/__tests__/default-route.test.ts`: lock the default route.
- Create `src/services/group-intelligence/queries.ts`: query existing group tables and build a typed radar payload.
- Test `src/services/group-intelligence/__tests__/queries.test.ts`: mock Supabase chain and validate group classification.
- Create `src/components/whatsapp/groups/groups-radar-page.tsx`: server component wrapper for the radar.
- Create `src/components/whatsapp/groups/group-status-grid.tsx`: visual grid of monitored groups.
- Create `src/components/whatsapp/groups/group-insights-feed.tsx`: lightweight feed for recent group notes/responses.
- Modify `src/app/(app)/whatsapp-intelligence/page.tsx`: make group radar the default `modo=grupos`; keep current views under `modo=agora` and `modo=historico`.
- Modify `src/lib/whatsapp/painel-modo.ts`: add and parse `grupos`.
- Test `src/lib/whatsapp/__tests__/painel-modo.test.ts`: assert default mode is `grupos`.
- Modify `src/services/group-agent/webhook-handler.ts`: skip heavy media extraction unless the message is a trigger or active session/proactive continuation needs it.
- Test `src/services/group-agent/__tests__/webhook-handler.test.ts`: assert media processing gate behavior.

---

### Task 1: Conditional Cron Registration

**Files:**
- Modify: `src/lib/cron/scheduler.ts`
- Create: `src/lib/cron/__tests__/scheduler.test.ts`

**Interfaces:**
- Produces: `type CronRegistration = { label: string; schedule: string; enabled: boolean; run: () => Promise<unknown> }`
- Produces: `resolveCronRegistrations(env: NodeJS.ProcessEnv): CronRegistration[]`
- Consumes: existing `startCronScheduler()`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/cron/__tests__/scheduler.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveCronRegistrations } from "../scheduler";

describe("resolveCronRegistrations", () => {
  it("keeps core whatsapp/group jobs enabled by default", () => {
    const labels = resolveCronRegistrations({}).filter((job) => job.enabled).map((job) => job.label);

    expect(labels).toContain("heartbeat");
    expect(labels).toContain("process-jobs");
    expect(labels).toContain("group-proactive");
    expect(labels).toContain("group-rag-batch");
    expect(labels).toContain("whatsapp-sync");
  });

  it("disables social publisher when NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER is not true", () => {
    const social = resolveCronRegistrations({}).find((job) => job.label === "social-publisher");

    expect(social?.enabled).toBe(false);
  });

  it("enables social publisher when NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER is true", () => {
    const social = resolveCronRegistrations({ NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER: "true" }).find(
      (job) => job.label === "social-publisher",
    );

    expect(social?.enabled).toBe(true);
  });

  it("disables anomaly scan when NEXT_PUBLIC_FEATURE_INTELLIGENCE is not true", () => {
    const anomaly = resolveCronRegistrations({}).find((job) => job.label === "anomaly-scan");

    expect(anomaly?.enabled).toBe(false);
  });

  it("enables anomaly scan when NEXT_PUBLIC_FEATURE_INTELLIGENCE is true", () => {
    const anomaly = resolveCronRegistrations({ NEXT_PUBLIC_FEATURE_INTELLIGENCE: "true" }).find(
      (job) => job.label === "anomaly-scan",
    );

    expect(anomaly?.enabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- src/lib/cron/__tests__/scheduler.test.ts`

Expected: FAIL with an export error for `resolveCronRegistrations`.

- [ ] **Step 3: Implement conditional registrations**

Modify `src/lib/cron/scheduler.ts` so it contains this public helper and uses it inside `startCronScheduler()`:

```ts
import cron from "node-cron";

export type CronRegistration = {
  label: string;
  schedule: string;
  enabled: boolean;
  run: () => Promise<unknown>;
};

async function safeRun(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    console.log(`[cron] ${label} -> ok`, typeof result === "object" ? JSON.stringify(result) : "");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[cron] ${label} falhou:`, detail);
  }
}

export function resolveCronRegistrations(env: NodeJS.ProcessEnv): CronRegistration[] {
  const socialEnabled = env.NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER === "true";
  const intelligenceEnabled = env.NEXT_PUBLIC_FEATURE_INTELLIGENCE === "true";

  return [
    {
      label: "heartbeat",
      schedule: "*/5 * * * *",
      enabled: true,
      run: async () => {
        const { runHeartbeat } = await import("@/lib/cron/heartbeat");
        return runHeartbeat();
      },
    },
    {
      label: "process-jobs",
      schedule: "*/2 * * * *",
      enabled: true,
      run: async () => {
        const { processJobs } = await import("@/lib/jobs/processor");
        return processJobs({ maxJobs: 5 });
      },
    },
    {
      label: "group-proactive",
      schedule: "0 * * * *",
      enabled: true,
      run: async () => {
        const { runGroupProactiveCron } = await import("@/lib/cron/group-proactive");
        return runGroupProactiveCron();
      },
    },
    {
      label: "group-rag-batch",
      schedule: "0 3 * * *",
      enabled: true,
      run: async () => {
        const { runGroupRagBatchCron } = await import("@/lib/cron/group-rag-batch");
        return runGroupRagBatchCron();
      },
    },
    {
      label: "whatsapp-sync",
      schedule: "30 * * * *",
      enabled: true,
      run: async () => {
        const { runWhatsappSyncCron } = await import("@/lib/cron/whatsapp-sync");
        return runWhatsappSyncCron();
      },
    },
    {
      label: "social-publisher",
      schedule: "* * * * *",
      enabled: socialEnabled,
      run: async () => {
        const { processDueScheduledPosts } = await import("@/services/social/poller");
        return processDueScheduledPosts();
      },
    },
    {
      label: "anomaly-scan",
      schedule: "0 12 * * *",
      enabled: intelligenceEnabled,
      run: async () => {
        const { runAnomalyScanCron } = await import("@/lib/cron/anomaly-scan");
        return runAnomalyScanCron();
      },
    },
  ];
}

export function startCronScheduler(): void {
  if (process.env.DISABLE_CRONS === "true") {
    console.log("[cron] Crons desabilitados via DISABLE_CRONS=true");
    return;
  }

  console.log("[cron] Iniciando scheduler de crons...");

  for (const registration of resolveCronRegistrations(process.env)) {
    if (!registration.enabled) {
      console.log(`[cron] ${registration.label} desabilitado por feature flag`);
      continue;
    }

    cron.schedule(registration.schedule, async () => {
      await safeRun(registration.label, registration.run);
    });
  }

  console.log("[cron] Scheduler de crons iniciado.");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/cron/__tests__/scheduler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cron/scheduler.ts src/lib/cron/__tests__/scheduler.test.ts
git commit -m "perf(cron): gate satellite jobs by feature flag"
```

---

### Task 2: Authenticated Landing Route Goes To WhatsApp

**Files:**
- Create: `src/lib/navigation/default-route.ts`
- Create: `src/lib/navigation/__tests__/default-route.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/(app)/onboarding/page.tsx`

**Interfaces:**
- Produces: `getAuthenticatedDefaultRoute(): "/whatsapp-intelligence"`
- Consumes: Next.js `redirect()`

- [ ] **Step 1: Write the failing test**

Create `src/lib/navigation/__tests__/default-route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getAuthenticatedDefaultRoute } from "../default-route";

describe("getAuthenticatedDefaultRoute", () => {
  it("returns WhatsApp Intelligence as the authenticated product entry point", () => {
    expect(getAuthenticatedDefaultRoute()).toBe("/whatsapp-intelligence");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- src/lib/navigation/__tests__/default-route.test.ts`

Expected: FAIL with module not found for `../default-route`.

- [ ] **Step 3: Implement the route helper**

Create `src/lib/navigation/default-route.ts`:

```ts
export function getAuthenticatedDefaultRoute(): "/whatsapp-intelligence" {
  return "/whatsapp-intelligence";
}
```

- [ ] **Step 4: Use helper in app home**

Modify `src/app/page.tsx`:

```ts
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedDefaultRoute } from "@/lib/navigation/default-route";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(getAuthenticatedDefaultRoute());
  }

  redirect("/login");
}
```

- [ ] **Step 5: Use helper in onboarding redirect**

In `src/app/(app)/onboarding/page.tsx`, replace any hard-coded `redirect("/dashboard")` for already-onboarded users with:

```ts
import { getAuthenticatedDefaultRoute } from "@/lib/navigation/default-route";

redirect(getAuthenticatedDefaultRoute());
```

Keep the rest of the onboarding page unchanged.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/lib/navigation/__tests__/default-route.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/navigation/default-route.ts src/lib/navigation/__tests__/default-route.test.ts src/app/page.tsx 'src/app/(app)/onboarding/page.tsx'
git commit -m "feat(nav): make whatsapp the authenticated entry point"
```

---

### Task 3: Groups Radar Query Service

**Files:**
- Create: `src/services/group-intelligence/queries.ts`
- Create: `src/services/group-intelligence/__tests__/queries.test.ts`

**Interfaces:**
- Produces: `type GroupRadarStatus = "inactive" | "quiet" | "active" | "hot" | "risk"`
- Produces: `type GroupRadarItem`
- Produces: `type GroupRadarInsight`
- Produces: `type GroupRadarData`
- Produces: `getGroupRadarData(companyId: string): Promise<GroupRadarData>`
- Produces: `buildGroupRadarData(input: BuildGroupRadarInput): GroupRadarData`
- Consumes: existing Supabase tables `group_agent_configs`, `group_messages`, `group_agent_responses`, `group_agent_notes`

- [ ] **Step 1: Write the pure failing tests**

Create `src/services/group-intelligence/__tests__/queries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildGroupRadarData } from "../queries";

describe("buildGroupRadarData", () => {
  it("shows inactive groups in the radar", () => {
    const data = buildGroupRadarData({
      now: new Date("2026-08-11T15:00:00Z"),
      configs: [
        {
          id: "config-1",
          company_id: "company-1",
          group_jid: "120@g.us",
          group_name: "Equipe Comercial",
          is_active: false,
          agent_name: "Axiomix IA",
          feed_to_rag: true,
          max_responses_per_hour: 20,
          cooldown_seconds: 10,
        },
      ],
      messages: [],
      responses: [],
      notes: [],
    });

    expect(data.groups).toHaveLength(1);
    expect(data.groups[0]).toMatchObject({
      configId: "config-1",
      name: "Equipe Comercial",
      status: "inactive",
      messageCount24h: 0,
      agentMode: "radar_only",
    });
  });

  it("classifies high-volume active groups as hot", () => {
    const messages = Array.from({ length: 45 }, (_, index) => ({
      id: `msg-${index}`,
      config_id: "config-1",
      sender_jid: index % 2 === 0 ? "a@s.whatsapp.net" : "b@s.whatsapp.net",
      sender_name: index % 2 === 0 ? "Ana" : "Bruno",
      content: "Mensagem com contexto comercial",
      message_type: "text",
      is_trigger: false,
      agent_responded: false,
      sent_at: "2026-08-11T14:00:00Z",
    }));

    const data = buildGroupRadarData({
      now: new Date("2026-08-11T15:00:00Z"),
      configs: [
        {
          id: "config-1",
          company_id: "company-1",
          group_jid: "120@g.us",
          group_name: "Grupo Quente",
          is_active: true,
          agent_name: "Axiomix IA",
          feed_to_rag: true,
          max_responses_per_hour: 20,
          cooldown_seconds: 10,
        },
      ],
      messages,
      responses: [],
      notes: [],
    });

    expect(data.groups[0].status).toBe("hot");
    expect(data.groups[0].messageCount24h).toBe(45);
    expect(data.summary.hotGroups).toBe(1);
  });

  it("classifies groups with recent risk notes as risk", () => {
    const data = buildGroupRadarData({
      now: new Date("2026-08-11T15:00:00Z"),
      configs: [
        {
          id: "config-1",
          company_id: "company-1",
          group_jid: "120@g.us",
          group_name: "Grupo em Risco",
          is_active: true,
          agent_name: "Axiomix IA",
          feed_to_rag: true,
          max_responses_per_hour: 20,
          cooldown_seconds: 10,
        },
      ],
      messages: [
        {
          id: "msg-1",
          config_id: "config-1",
          sender_jid: "a@s.whatsapp.net",
          sender_name: "Ana",
          content: "Cliente reclamou do prazo",
          message_type: "text",
          is_trigger: false,
          agent_responded: false,
          sent_at: "2026-08-11T14:00:00Z",
        },
      ],
      responses: [],
      notes: [
        {
          id: "note-1",
          config_id: "config-1",
          category: "action_item",
          content: "Resolver reclamacao do cliente ainda hoje",
          source_sender: "Ana",
          relevance_score: 0.95,
          created_at: "2026-08-11T14:30:00Z",
        },
      ],
    });

    expect(data.groups[0].status).toBe("risk");
    expect(data.insights[0]).toMatchObject({
      groupName: "Grupo em Risco",
      kind: "action_item",
      text: "Resolver reclamacao do cliente ainda hoje",
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- src/services/group-intelligence/__tests__/queries.test.ts`

Expected: FAIL with module not found for `../queries`.

- [ ] **Step 3: Implement the query service**

Create `src/services/group-intelligence/queries.ts`:

```ts
import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GroupRadarStatus = "inactive" | "quiet" | "active" | "hot" | "risk";
export type GroupAgentMode = "radar_only" | "trigger_only" | "proactive";
export type GroupRadarInsightKind = "fact" | "preference" | "decision" | "action_item" | "contact_info" | "response";

export type GroupConfigRow = {
  id: string;
  company_id: string;
  group_jid: string;
  group_name: string | null;
  is_active: boolean;
  agent_name: string;
  feed_to_rag: boolean;
  max_responses_per_hour: number;
  cooldown_seconds: number;
};

export type GroupMessageRow = {
  id: string;
  config_id: string;
  sender_jid: string;
  sender_name: string | null;
  content: string | null;
  message_type: string | null;
  is_trigger: boolean;
  agent_responded: boolean;
  sent_at: string;
};

export type GroupResponseRow = {
  id: string;
  config_id: string;
  response_text: string;
  response_type: string;
  rag_sources_used: number | null;
  created_at: string;
};

export type GroupNoteRow = {
  id: string;
  config_id: string;
  category: GroupRadarInsightKind;
  content: string;
  source_sender: string | null;
  relevance_score: number;
  created_at: string;
};

export type GroupRadarItem = {
  configId: string;
  groupJid: string;
  name: string;
  status: GroupRadarStatus;
  agentMode: GroupAgentMode;
  agentName: string;
  feedToRag: boolean;
  messageCount24h: number;
  triggerCount24h: number;
  agentResponses24h: number;
  uniqueSenders24h: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type GroupRadarInsight = {
  id: string;
  configId: string;
  groupName: string;
  kind: GroupRadarInsightKind;
  text: string;
  source: string | null;
  createdAt: string;
  score: number;
};

export type GroupRadarData = {
  summary: {
    totalGroups: number;
    activeGroups: number;
    hotGroups: number;
    riskGroups: number;
    messages24h: number;
    agentResponses24h: number;
  };
  groups: GroupRadarItem[];
  insights: GroupRadarInsight[];
};

export type BuildGroupRadarInput = {
  now: Date;
  configs: GroupConfigRow[];
  messages: GroupMessageRow[];
  responses: GroupResponseRow[];
  notes: GroupNoteRow[];
};

const DAY_MS = 24 * 60 * 60_000;
const HOT_MESSAGE_THRESHOLD = 40;

function fallbackGroupName(config: GroupConfigRow): string {
  return config.group_name ?? `Grupo ${config.group_jid.split("@")[0].slice(-6)}`;
}

function resolveAgentMode(config: GroupConfigRow): GroupAgentMode {
  if (!config.is_active) return "radar_only";
  return config.max_responses_per_hour > 0 ? "trigger_only" : "radar_only";
}

function isRiskNote(note: GroupNoteRow): boolean {
  const text = note.content.toLowerCase();
  return (
    note.category === "action_item" ||
    text.includes("risco") ||
    text.includes("reclam") ||
    text.includes("urgente") ||
    text.includes("problema")
  );
}

export function buildGroupRadarData(input: BuildGroupRadarInput): GroupRadarData {
  const since24h = input.now.getTime() - DAY_MS;
  const messagesByConfig = new Map<string, GroupMessageRow[]>();
  const responsesByConfig = new Map<string, GroupResponseRow[]>();
  const notesByConfig = new Map<string, GroupNoteRow[]>();

  for (const message of input.messages) {
    if (new Date(message.sent_at).getTime() < since24h) continue;
    const items = messagesByConfig.get(message.config_id) ?? [];
    items.push(message);
    messagesByConfig.set(message.config_id, items);
  }

  for (const response of input.responses) {
    if (new Date(response.created_at).getTime() < since24h) continue;
    const items = responsesByConfig.get(response.config_id) ?? [];
    items.push(response);
    responsesByConfig.set(response.config_id, items);
  }

  for (const note of input.notes) {
    const items = notesByConfig.get(note.config_id) ?? [];
    items.push(note);
    notesByConfig.set(note.config_id, items);
  }

  const groups = input.configs.map((config): GroupRadarItem => {
    const messages = messagesByConfig.get(config.id) ?? [];
    const responses = responsesByConfig.get(config.id) ?? [];
    const notes = notesByConfig.get(config.id) ?? [];
    const risky = notes.some(isRiskNote);
    const uniqueSenders = new Set(messages.map((message) => message.sender_jid));
    const lastMessage = [...messages].sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
    )[0];

    let status: GroupRadarStatus = "quiet";
    if (!config.is_active) status = "inactive";
    else if (risky) status = "risk";
    else if (messages.length >= HOT_MESSAGE_THRESHOLD) status = "hot";
    else if (messages.length > 0) status = "active";

    return {
      configId: config.id,
      groupJid: config.group_jid,
      name: fallbackGroupName(config),
      status,
      agentMode: resolveAgentMode(config),
      agentName: config.agent_name,
      feedToRag: config.feed_to_rag,
      messageCount24h: messages.length,
      triggerCount24h: messages.filter((message) => message.is_trigger).length,
      agentResponses24h: responses.length,
      uniqueSenders24h: uniqueSenders.size,
      lastMessageAt: lastMessage?.sent_at ?? null,
      lastMessagePreview: lastMessage?.content ? lastMessage.content.slice(0, 140) : null,
    };
  });

  const groupNameByConfig = new Map(groups.map((group) => [group.configId, group.name]));
  const noteInsights: GroupRadarInsight[] = input.notes.map((note) => ({
    id: note.id,
    configId: note.config_id,
    groupName: groupNameByConfig.get(note.config_id) ?? "Grupo WhatsApp",
    kind: note.category,
    text: note.content,
    source: note.source_sender,
    createdAt: note.created_at,
    score: note.relevance_score,
  }));

  const responseInsights: GroupRadarInsight[] = input.responses.slice(0, 10).map((response) => ({
    id: response.id,
    configId: response.config_id,
    groupName: groupNameByConfig.get(response.config_id) ?? "Grupo WhatsApp",
    kind: "response",
    text: response.response_text,
    source: response.response_type,
    createdAt: response.created_at,
    score: response.rag_sources_used ?? 0,
  }));

  const insights = [...noteInsights, ...responseInsights]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return {
    summary: {
      totalGroups: groups.length,
      activeGroups: groups.filter((group) => group.status !== "inactive").length,
      hotGroups: groups.filter((group) => group.status === "hot").length,
      riskGroups: groups.filter((group) => group.status === "risk").length,
      messages24h: groups.reduce((sum, group) => sum + group.messageCount24h, 0),
      agentResponses24h: groups.reduce((sum, group) => sum + group.agentResponses24h, 0),
    },
    groups: groups.sort((a, b) => b.messageCount24h - a.messageCount24h),
    insights,
  };
}

export async function getGroupRadarData(companyId: string): Promise<GroupRadarData> {
  const supabase = createSupabaseAdminClient();
  const since24h = new Date(Date.now() - DAY_MS).toISOString();

  const [{ data: configs }, { data: messages }, { data: responses }, { data: notes }] = await Promise.all([
    supabase
      .from("group_agent_configs")
      .select("id, company_id, group_jid, group_name, is_active, agent_name, feed_to_rag, max_responses_per_hour, cooldown_seconds")
      .eq("company_id", companyId)
      .order("group_name", { ascending: true }),
    supabase
      .from("group_messages")
      .select("id, config_id, sender_jid, sender_name, content, message_type, is_trigger, agent_responded, sent_at")
      .eq("company_id", companyId)
      .gte("sent_at", since24h)
      .order("sent_at", { ascending: false })
      .limit(500),
    supabase
      .from("group_agent_responses")
      .select("id, config_id, response_text, response_type, rag_sources_used, created_at")
      .eq("company_id", companyId)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("group_agent_notes")
      .select("id, config_id, category, content, source_sender, relevance_score, created_at")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return buildGroupRadarData({
    now: new Date(),
    configs: (configs ?? []) as GroupConfigRow[],
    messages: (messages ?? []) as GroupMessageRow[],
    responses: (responses ?? []) as GroupResponseRow[],
    notes: (notes ?? []) as GroupNoteRow[],
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/group-intelligence/__tests__/queries.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/group-intelligence/queries.ts src/services/group-intelligence/__tests__/queries.test.ts
git commit -m "feat(groups): add radar query service"
```

---

### Task 4: Groups Radar UI As Default WhatsApp Surface

**Files:**
- Modify: `src/lib/whatsapp/painel-modo.ts`
- Create or modify: `src/lib/whatsapp/__tests__/painel-modo.test.ts`
- Create: `src/components/whatsapp/groups/groups-radar-page.tsx`
- Create: `src/components/whatsapp/groups/group-status-grid.tsx`
- Create: `src/components/whatsapp/groups/group-insights-feed.tsx`
- Modify: `src/app/(app)/whatsapp-intelligence/page.tsx`

**Interfaces:**
- Consumes: `getGroupRadarData(companyId: string): Promise<GroupRadarData>`
- Produces: default `parsePainelModo(undefined) === "grupos"`
- Produces: `/whatsapp-intelligence?modo=agora` keeps existing live operation
- Produces: `/whatsapp-intelligence?modo=historico` keeps existing historical analysis

- [ ] **Step 1: Write the failing mode test**

Create or update `src/lib/whatsapp/__tests__/painel-modo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePainelModo } from "../painel-modo";

describe("parsePainelModo", () => {
  it("defaults to grupos", () => {
    expect(parsePainelModo(undefined)).toBe("grupos");
  });

  it("accepts agora and historico", () => {
    expect(parsePainelModo("agora")).toBe("agora");
    expect(parsePainelModo("historico")).toBe("historico");
  });

  it("falls back to grupos for unknown modes", () => {
    expect(parsePainelModo("x")).toBe("grupos");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- src/lib/whatsapp/__tests__/painel-modo.test.ts`

Expected: FAIL because the default is still `agora`.

- [ ] **Step 3: Update mode parser**

Modify `src/lib/whatsapp/painel-modo.ts` to expose:

```ts
export type PainelModo = "grupos" | "agora" | "historico";

export function parsePainelModo(value: string | string[] | undefined): PainelModo {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "agora" || raw === "historico" || raw === "grupos") return raw;
  return "grupos";
}
```

- [ ] **Step 4: Add group status grid component**

Create `src/components/whatsapp/groups/group-status-grid.tsx`:

```tsx
import type { GroupRadarItem } from "@/services/group-intelligence/queries";

const STATUS_LABEL: Record<GroupRadarItem["status"], string> = {
  inactive: "Radar silencioso",
  quiet: "Pouco movimento",
  active: "Ativo",
  hot: "Quente",
  risk: "Risco",
};

export function GroupStatusGrid({ groups }: { groups: GroupRadarItem[] }) {
  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Nenhum grupo monitorado</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Assim que o webhook receber mensagens de grupos, eles aparecem neste radar.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <article key={group.configId} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--color-text)]">{group.name}</h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{STATUS_LABEL[group.status]}</p>
            </div>
            <span className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)]">
              {group.agentMode === "radar_only" ? "Radar" : "Agente"}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-[var(--color-text-tertiary)]">24h</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-text)]">{group.messageCount24h}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-tertiary)]">Pessoas</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-text)]">{group.uniqueSenders24h}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-tertiary)]">IA</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-text)]">{group.agentResponses24h}</dd>
            </div>
          </dl>
          {group.lastMessagePreview ? (
            <p className="mt-3 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{group.lastMessagePreview}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: Add group insights feed component**

Create `src/components/whatsapp/groups/group-insights-feed.tsx`:

```tsx
import type { GroupRadarInsight } from "@/services/group-intelligence/queries";

export function GroupInsightsFeed({ insights }: { insights: GroupRadarInsight[] }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Insights recentes</h2>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {insights.length === 0 ? (
          <p className="px-4 py-5 text-sm text-[var(--color-text-secondary)]">
            Ainda nao ha decisoes, pendencias ou respostas recentes registradas.
          </p>
        ) : (
          insights.map((insight) => (
            <article key={insight.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
                <span>{insight.groupName}</span>
                <span>{insight.kind}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text)]">{insight.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Add radar page component**

Create `src/components/whatsapp/groups/groups-radar-page.tsx`:

```tsx
import { getGroupRadarData } from "@/services/group-intelligence/queries";
import { GroupStatusGrid } from "./group-status-grid";
import { GroupInsightsFeed } from "./group-insights-feed";

export async function GroupsRadarPage({ companyId }: { companyId: string }) {
  const data = await getGroupRadarData(companyId);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Grupos" value={data.summary.totalGroups} />
        <Metric label="Mensagens 24h" value={data.summary.messages24h} />
        <Metric label="Grupos quentes" value={data.summary.hotGroups} />
        <Metric label="Em risco" value={data.summary.riskGroups} />
      </section>
      <GroupStatusGrid groups={data.groups} />
      <GroupInsightsFeed insights={data.insights} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
```

- [ ] **Step 7: Wire radar into WhatsApp page**

In `src/app/(app)/whatsapp-intelligence/page.tsx`:

- Import `GroupsRadarPage`.
- After resolving `companyId`, add:

```tsx
if (modo === "grupos") {
  return (
    <div className="space-y-3.5">
      <PainelHeader active="grupos" />
      <GroupsRadarPage companyId={companyId} />
    </div>
  );
}
```

- Extend `PainelHeader` props and toggle links so it supports `grupos`, `agora`, and `historico`.
- Keep the existing `agora` branch unchanged.
- Keep the existing historical branch unchanged.

- [ ] **Step 8: Run tests**

Run: `npm test -- src/lib/whatsapp/__tests__/painel-modo.test.ts src/services/group-intelligence/__tests__/queries.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/whatsapp/painel-modo.ts src/lib/whatsapp/__tests__/painel-modo.test.ts src/components/whatsapp/groups 'src/app/(app)/whatsapp-intelligence/page.tsx'
git commit -m "feat(groups): make radar the whatsapp default surface"
```

---

### Task 5: Guard Heavy Group Media Processing

**Files:**
- Modify: `src/services/group-agent/webhook-handler.ts`
- Modify: `src/services/group-agent/__tests__/webhook-handler.test.ts`

**Interfaces:**
- Produces: `shouldProcessGroupMedia(input: { hasMedia: boolean; isActive: boolean; isTrigger: boolean; isAudio: boolean; hasActiveSession: boolean; hasRecentProactive: boolean }): boolean`
- Consumes: existing `processMedia(params)`

- [ ] **Step 1: Add failing tests for the media gate**

Append to `src/services/group-agent/__tests__/webhook-handler.test.ts`:

```ts
import { shouldProcessGroupMedia } from "../webhook-handler";

describe("shouldProcessGroupMedia", () => {
  it("does not process media for inactive groups", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: false,
        isTrigger: true,
        isAudio: true,
        hasActiveSession: false,
        hasRecentProactive: false,
      }),
    ).toBe(false);
  });

  it("does not process non-trigger media in passive radar flow", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: true,
        isTrigger: false,
        isAudio: false,
        hasActiveSession: false,
        hasRecentProactive: false,
      }),
    ).toBe(false);
  });

  it("processes media when the message explicitly triggers the agent", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: true,
        isTrigger: true,
        isAudio: false,
        hasActiveSession: false,
        hasRecentProactive: false,
      }),
    ).toBe(true);
  });

  it("processes audio only when it belongs to an active agent conversation", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: true,
        isTrigger: false,
        isAudio: true,
        hasActiveSession: true,
        hasRecentProactive: false,
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- src/services/group-agent/__tests__/webhook-handler.test.ts`

Expected: FAIL with missing export `shouldProcessGroupMedia`.

- [ ] **Step 3: Implement the pure gate**

Add to `src/services/group-agent/webhook-handler.ts`:

```ts
export function shouldProcessGroupMedia(input: {
  hasMedia: boolean;
  isActive: boolean;
  isTrigger: boolean;
  isAudio: boolean;
  hasActiveSession: boolean;
  hasRecentProactive: boolean;
}): boolean {
  if (!input.hasMedia || !input.isActive) return false;
  if (input.isTrigger) return true;
  if (input.isAudio && (input.hasActiveSession || input.hasRecentProactive)) return true;
  return false;
}
```

Then update `processMedia()` so it computes `hasMedia`, `isTrigger`, `isAudio`, and uses the helper instead of processing all trigger-or-audio media. For this first increment, pass `hasActiveSession: false` and `hasRecentProactive: false` from inside `processMedia()`; a later task can share the active-session lookup between `processMedia()` and `triggerAgentResponse()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/group-agent/__tests__/webhook-handler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/group-agent/webhook-handler.ts src/services/group-agent/__tests__/webhook-handler.test.ts
git commit -m "perf(groups): gate heavy media processing"
```

---

## Final Verification

- [ ] Run targeted tests:

```bash
npm test -- src/lib/cron/__tests__/scheduler.test.ts src/lib/navigation/__tests__/default-route.test.ts src/services/group-intelligence/__tests__/queries.test.ts src/lib/whatsapp/__tests__/painel-modo.test.ts src/services/group-agent/__tests__/webhook-handler.test.ts
```

Expected: PASS.

- [ ] Run typecheck:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] Run lint:

```bash
npm run lint
```

Expected: PASS.

- [ ] Commit any verification-only fixes with focused messages.

---

## Spec Coverage Self-Review

- Grupos primeiro: Task 2 and Task 4.
- Radar sempre disponivel: Task 3 and Task 4 use `group_agent_configs` regardless of `is_active`.
- Agente opcional: Task 3 exposes `agentMode`; Task 4 displays Radar vs Agente.
- IA em batch, nao em tudo: Task 5 guards heavy media processing.
- Memoria curta no runtime: Task 3 caps messages/responses/notes and uses derived UI payload.
- Modulos satelite sob flag: Task 1.
- No destructive rewrite: all tasks modify existing surfaces narrowly.
