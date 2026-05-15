/**
 * Regression tests para listConversations:
 *
 * 1. inbox_id é forwarded como query param (suporte ao fan-out de syncInboxIds)
 * 2. paginação via meta.pagination (Evo CRM v4.2.0) — sem isso, sync silencioso perdia páginas
 * 3. fan-out fetch faz N chamadas independentes (uma por inbox), garantindo
 *    que conversas de múltiplos inboxes cheguem ao Axiomix (bug das 7→2)
 */

import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createEvoCrmClient } from "../client";
import { EVO_TEST_BASE_URL } from "./msw/handlers";
import { server } from "./msw/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient(syncInboxIds?: string[]) {
  return createEvoCrmClient({
    baseUrl: EVO_TEST_BASE_URL,
    apiToken: "test-uuid-token",
    syncInboxIds,
  });
}

describe("listConversations — inbox_id filter forwarding", () => {
  it("envia inbox_id como query param quando filtro é informado", async () => {
    const seenUrls: string[] = [];
    server.use(
      http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, ({ request }) => {
        seenUrls.push(request.url);
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: "conv-inbox-A",
              status: "open",
              inbox_id: "inbox-A",
              contact: { id: "c1", name: "Cliente A" },
            },
          ],
        });
      })
    );

    const client = makeClient();
    const rows = await client.listConversations(10, { inbox_id: "inbox-A" });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("conv-inbox-A");
    expect(seenUrls).toHaveLength(1);
    expect(seenUrls[0]).toMatch(/inbox_id=inbox-A/);
  });

  it("omite inbox_id quando filtro não é informado (sync de todos os inboxes)", async () => {
    const seenUrls: string[] = [];
    server.use(
      http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, ({ request }) => {
        seenUrls.push(request.url);
        return HttpResponse.json({ success: true, data: [] });
      })
    );

    const client = makeClient();
    await client.listConversations(10);

    expect(seenUrls).toHaveLength(1);
    expect(seenUrls[0]).not.toMatch(/inbox_id=/);
  });
});

describe("listConversations — pagination via meta.pagination", () => {
  it("não tenta nova página quando meta.pagination indica fim", async () => {
    let calls = 0;
    server.use(
      http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () => {
        calls += 1;
        return HttpResponse.json({
          success: true,
          data: [
            { id: "c-1", status: "open", contact: { id: "x", name: "X" } },
            { id: "c-2", status: "open", contact: { id: "y", name: "Y" } },
          ],
          meta: {
            pagination: { current_page: 1, total_pages: 1, has_more: false },
          },
        });
      })
    );

    const client = makeClient();
    const rows = await client.listConversations(50);

    expect(rows).toHaveLength(2);
    expect(calls).toBe(1);
  });

  it("avança para próxima página quando current_page < total_pages", async () => {
    let calls = 0;
    server.use(
      http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, ({ request }) => {
        calls += 1;
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");

        if (page === 1) {
          return HttpResponse.json({
            success: true,
            data: Array.from({ length: 50 }, (_, i) => ({
              id: `c-p1-${i}`,
              status: "open",
              contact: { id: `c1-${i}`, name: `P1-${i}` },
            })),
            meta: {
              pagination: { current_page: 1, total_pages: 2, has_more: true },
            },
          });
        }
        return HttpResponse.json({
          success: true,
          data: [
            { id: "c-p2-0", status: "open", contact: { id: "c2-0", name: "P2-0" } },
            { id: "c-p2-1", status: "open", contact: { id: "c2-1", name: "P2-1" } },
          ],
          meta: {
            pagination: { current_page: 2, total_pages: 2, has_more: false },
          },
        });
      })
    );

    const client = makeClient();
    const rows = await client.listConversations(100);

    expect(calls).toBeGreaterThanOrEqual(2);
    expect(rows.length).toBe(52);
  });
});

describe("syncInboxIds fan-out behavior (cliente expõe a whitelist)", () => {
  it("expõe syncInboxIds com múltiplos valores para uso no fan-out do sync", () => {
    const client = makeClient(["inbox-A", "inbox-B", "inbox-C"]);
    expect(client.syncInboxIds).toEqual(["inbox-A", "inbox-B", "inbox-C"]);
  });

  it("retorna undefined quando whitelist vazia (fan-out faz call única sem filtro)", () => {
    const client = makeClient();
    expect(client.syncInboxIds).toBeUndefined();
  });

  it("fan-out: chamadas paralelas por inbox retornam conjuntos distintos", async () => {
    const seenInboxes: string[] = [];
    server.use(
      http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, ({ request }) => {
        const url = new URL(request.url);
        const inbox = url.searchParams.get("inbox_id") ?? "none";
        seenInboxes.push(inbox);
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: `conv-${inbox}-1`,
              status: "open",
              inbox_id: inbox,
              contact: { id: `${inbox}-c1`, name: `Cliente ${inbox}` },
            },
          ],
        });
      })
    );

    const client = makeClient(["inbox-A", "inbox-B", "inbox-C"]);
    const inboxIds = client.syncInboxIds ?? [];
    const results = await Promise.all(
      inboxIds.map((id) => client.listConversations(10, { inbox_id: id }))
    );

    expect(seenInboxes.sort()).toEqual(["inbox-A", "inbox-B", "inbox-C"]);
    const totalRows = results.flat().length;
    expect(totalRows).toBe(3);
    const ids = results.flat().map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
  });
});
