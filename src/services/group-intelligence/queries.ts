import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type GroupRadarStatus = "inactive" | "quiet" | "active" | "hot" | "risk";
export type GroupAgentMode = "radar_only" | "trigger_only" | "proactive";
export type GroupRadarInsightKind =
  | "fact"
  | "preference"
  | "decision"
  | "action_item"
  | "contact_info"
  | "response";

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
  proactive_summary?: boolean | null;
  proactive_sales_alert?: boolean | null;
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
  category: Exclude<GroupRadarInsightKind, "response">;
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

export type GroupActivityBucket = {
  label: string;
  count: number;
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
  activityBuckets24h: GroupActivityBucket[];
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
const ACTIVITY_BUCKET_COUNT = 8;
const ACTIVITY_BUCKET_MS = DAY_MS / ACTIVITY_BUCKET_COUNT;
const HOT_MESSAGE_THRESHOLD = 40;
const STATUS_PRIORITY: Record<GroupRadarStatus, number> = {
  risk: 5,
  hot: 4,
  active: 3,
  quiet: 2,
  inactive: 1,
};

function fallbackGroupName(config: GroupConfigRow): string {
  return config.group_name ?? `Grupo ${config.group_jid.split("@")[0].slice(-6)}`;
}

function resolveAgentMode(config: GroupConfigRow): GroupAgentMode {
  if (!config.is_active) return "radar_only";
  if (config.proactive_summary || config.proactive_sales_alert) return "proactive";
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

function buildActivityBuckets(messages: GroupMessageRow[], now: Date): GroupActivityBucket[] {
  const windowStart = now.getTime() - DAY_MS;
  const buckets = Array.from({ length: ACTIVITY_BUCKET_COUNT }, (_, index) => {
    const bucketEnd = windowStart + (index + 1) * ACTIVITY_BUCKET_MS;
    const hour = new Date(bucketEnd).getUTCHours().toString().padStart(2, "0");

    return {
      label: `${hour}h`,
      count: 0,
    };
  });

  for (const message of messages) {
    const sentAt = new Date(message.sent_at).getTime();
    if (sentAt < windowStart || sentAt > now.getTime()) continue;

    const bucketIndex = Math.min(
      ACTIVITY_BUCKET_COUNT - 1,
      Math.max(0, Math.floor((sentAt - windowStart) / ACTIVITY_BUCKET_MS))
    );
    buckets[bucketIndex].count += 1;
  }

  return buckets;
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
    if (new Date(note.created_at).getTime() < since24h) continue;
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
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
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
  const noteInsights: GroupRadarInsight[] = Array.from(notesByConfig.values())
    .flat()
    .map((note) => ({
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
    activityBuckets24h: buildActivityBuckets(input.messages, input.now),
    groups: groups.sort((a, b) => {
      const priorityDelta = STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status];
      if (priorityDelta !== 0) return priorityDelta;

      const recencyDelta =
        (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) -
        (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0);
      if (recencyDelta !== 0) return recencyDelta;

      return b.messageCount24h - a.messageCount24h;
    }),
    insights,
  };
}

export async function getGroupRadarData(companyId: string): Promise<GroupRadarData> {
  const supabase = createSupabaseAdminClient();
  const since24h = new Date(Date.now() - DAY_MS).toISOString();

  const [{ data: configs }, { data: messages }, { data: responses }, { data: notes }] =
    await Promise.all([
      supabase
        .from("group_agent_configs")
        .select(
          "id, company_id, group_jid, group_name, is_active, agent_name, feed_to_rag, max_responses_per_hour, cooldown_seconds, proactive_summary, proactive_sales_alert"
        )
        .eq("company_id", companyId)
        .order("group_name", { ascending: true }),
      supabase
        .from("group_messages")
        .select(
          "id, config_id, sender_jid, sender_name, content, message_type, is_trigger, agent_responded, sent_at"
        )
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
        .gte("created_at", since24h)
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
