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

  it("does not keep stale risk notes in the current status", () => {
    const data = buildGroupRadarData({
      now: new Date("2026-08-11T15:00:00Z"),
      configs: [
        {
          id: "config-1",
          company_id: "company-1",
          group_jid: "120@g.us",
          group_name: "Grupo Normalizado",
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
          content: "Tudo certo por aqui",
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
          content: "Resolver reclamacao antiga",
          source_sender: "Ana",
          relevance_score: 0.95,
          created_at: "2026-08-09T14:30:00Z",
        },
      ],
    });

    expect(data.groups[0].status).toBe("active");
  });

  it("classifies active proactive groups as proactive", () => {
    const data = buildGroupRadarData({
      now: new Date("2026-08-11T15:00:00Z"),
      configs: [
        {
          id: "config-1",
          company_id: "company-1",
          group_jid: "120@g.us",
          group_name: "Grupo Proativo",
          is_active: true,
          agent_name: "Axiomix IA",
          feed_to_rag: true,
          max_responses_per_hour: 20,
          cooldown_seconds: 10,
          proactive_summary: true,
          proactive_sales_alert: false,
        },
      ],
      messages: [],
      responses: [],
      notes: [],
    });

    expect(data.groups[0].agentMode).toBe("proactive");
  });
});
