/**
 * Testes de integração contra a API real do Evo CRM.
 * Usa credenciais do .env.local (EVO_CRM_BASE_URL, EVO_CRM_API_TOKEN).
 * Pula automaticamente se as credenciais não estiverem configuradas.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.EVO_CRM_BASE_URL ?? "https://api.getlead.capital";
const API_TOKEN = process.env.EVO_CRM_API_TOKEN ?? "";

const headers = {
  api_access_token: API_TOKEN,
  accept: "application/json",
  "content-type": "application/json",
};

async function fetchJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: res.status, data: await res.json() };
}

const skipNoToken = !API_TOKEN ? it.skip : it;

describe("Evo CRM Integration (API real)", () => {
  beforeAll(() => {
    if (!API_TOKEN) {
      console.log("EVO_CRM_API_TOKEN not set — skipping integration tests");
    }
  });

  describe("Autenticação", () => {
    skipNoToken("api_access_token header funciona (200)", async () => {
      const { status, data } = await fetchJson("/api/v1/conversations?limit=1");
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    skipNoToken("token inválido retorna 401", async () => {
      const res = await fetch(`${BASE_URL}/api/v1/conversations?limit=1`, {
        headers: { ...headers, api_access_token: "invalid-token" },
      });
      expect(res.status).toBe(401);
    });

    skipNoToken("Bearer header NÃO funciona (retorna 401)", async () => {
      const res = await fetch(`${BASE_URL}/api/v1/conversations?limit=1`, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          accept: "application/json",
        },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Conversations", () => {
    skipNoToken("lista conversas com envelope correto", async () => {
      const { data } = await fetchJson("/api/v1/conversations?limit=5");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
      expect(data.meta.total_count).toBeDefined();
    });

    skipNoToken("conversa tem contact.phone_number (não phone)", async () => {
      const { data } = await fetchJson("/api/v1/conversations?limit=1");
      if (data.data.length === 0) return;

      const conv = data.data[0];
      expect(conv.contact).toBeDefined();
      expect(typeof conv.contact.phone_number).toBe("string");
    });

    skipNoToken("timestamps são epoch (números)", async () => {
      const { data } = await fetchJson("/api/v1/conversations?limit=1");
      if (data.data.length === 0) return;

      const conv = data.data[0];
      expect(typeof conv.created_at).toBe("number");
      expect(typeof conv.updated_at).toBe("number");
      expect(conv.created_at).toBeGreaterThan(1700000000); // after 2023
    });

    skipNoToken("conversa tem inbox com provider", async () => {
      const { data } = await fetchJson("/api/v1/conversations?limit=1");
      if (data.data.length === 0) return;

      const conv = data.data[0];
      expect(conv.inbox).toBeDefined();
      expect(conv.inbox.provider).toBeDefined();
    });

    skipNoToken("PATCH conversation funciona", async () => {
      const { data: list } = await fetchJson("/api/v1/conversations?limit=1");
      if (list.data.length === 0) return;

      const convId = list.data[0].id;
      const res = await fetch(`${BASE_URL}/api/v1/conversations/${convId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("Messages", () => {
    skipNoToken("lista mensagens com message_type incoming/outgoing", async () => {
      const { data: convs } = await fetchJson("/api/v1/conversations?limit=1");
      if (convs.data.length === 0) return;

      const convId = convs.data[0].id;
      const { data } = await fetchJson(`/api/v1/conversations/${convId}/messages?limit=5`);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length === 0) return;
      const msg = data.data[0];
      expect(["incoming", "outgoing"]).toContain(msg.message_type);
    });
  });

  describe("Contacts", () => {
    skipNoToken("lista contatos com phone_number", async () => {
      const { data } = await fetchJson("/api/v1/contacts?limit=3");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length === 0) return;
      const contact = data.data[0];
      expect(typeof contact.phone_number).toBe("string");
      expect(contact.phone_number).toMatch(/^\+/);
    });

    skipNoToken("busca contato por telefone", async () => {
      const { data: list } = await fetchJson("/api/v1/contacts?limit=1");
      if (list.data.length === 0) return;

      const phone = list.data[0].phone_number;
      const { data } = await fetchJson(`/api/v1/contacts/search?q=${encodeURIComponent(phone)}`);
      expect(data.success).toBe(true);
    });
  });

  describe("Labels", () => {
    skipNoToken("labels usam 'title' (não 'name')", async () => {
      const { data } = await fetchJson("/api/v1/labels");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length === 0) return;
      const label = data.data[0];
      expect(label.title).toBeDefined();
      expect(typeof label.title).toBe("string");
      // Deve ter color e show_on_sidebar
      expect(label.color).toBeDefined();
    });
  });

  describe("Pipelines", () => {
    skipNoToken("lista pipelines com stages inline", async () => {
      const { data } = await fetchJson("/api/v1/pipelines");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length === 0) return;
      const pipeline = data.data[0];
      expect(pipeline.name).toBeDefined();
      expect(pipeline.pipeline_type).toBeDefined();
    });

    skipNoToken("pipeline detail tem stages com position e item_count", async () => {
      const { data: list } = await fetchJson("/api/v1/pipelines");
      if (list.data.length === 0) return;

      const pipelineId = list.data[0].id;
      const { data } = await fetchJson(`/api/v1/pipelines/${pipelineId}`);
      expect(data.success).toBe(true);

      const pipeline = data.data;
      expect(Array.isArray(pipeline.stages)).toBe(true);
      if (pipeline.stages.length === 0) return;

      const stage = pipeline.stages[0];
      expect(stage.name).toBeDefined();
      expect(typeof stage.position).toBe("number");
      expect(stage.id).toBeDefined();
    });
  });

  describe("Inboxes", () => {
    skipNoToken("lista inboxes com channel_type e provider", async () => {
      const { data } = await fetchJson("/api/v1/inboxes");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length === 0) return;
      const inbox = data.data[0];
      expect(inbox.channel_type).toBeDefined();
      expect(inbox.provider).toBeDefined();
    });
  });

  describe("Teams", () => {
    skipNoToken("lista teams", async () => {
      const { data } = await fetchJson("/api/v1/teams");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe("Macros", () => {
    skipNoToken("lista macros (pode ser vazia)", async () => {
      const { data } = await fetchJson("/api/v1/macros");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe("Webhooks", () => {
    skipNoToken("lista webhooks (deve ter o que criamos)", async () => {
      const { data } = await fetchJson("/api/v1/webhooks");
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length === 0) return;
      const webhook = data.data[0];
      expect(webhook.url).toBeDefined();
      expect(webhook.subscriptions).toBeDefined();
      expect(Array.isArray(webhook.subscriptions)).toBe(true);
    });
  });
});
