/**
 * Testes do helper de auditoria de agentes IA.
 *
 * Foco:
 *  - logAgentActivity nunca lanca, mesmo quando o insert falha
 *  - diffAgentFields detecta mudancas reais e ignora "" <-> null
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const insertMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({ insert: insertMock }),
  }),
}));

import {
  AGENT_ACTIVITY_EVENT_TYPES,
  diffAgentFields,
  logAgentActivity,
} from "../agent-activity";

describe("logAgentActivity", () => {
  beforeEach(() => {
    insertMock.mockReset();
  });

  it("escreve linha em agent_activity_log com os campos esperados", async () => {
    insertMock.mockResolvedValueOnce({ error: null });

    await logAgentActivity(
      "company-1",
      "agent-1",
      { type: "activated" },
      "user-1"
    );

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith({
      company_id: "company-1",
      agent_id: "agent-1",
      event_type: "activated",
      details: {},
      actor_user_id: "user-1",
    });
  });

  it("usa null como actor_user_id quando nao passado (sistema/webhook)", async () => {
    insertMock.mockResolvedValueOnce({ error: null });

    await logAgentActivity("company-1", "agent-1", {
      type: "message_handled",
      details: { conversation_id: "c1", message_id: "m1" },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ actor_user_id: null })
    );
  });

  it("propaga details do evento", async () => {
    insertMock.mockResolvedValueOnce({ error: null });

    await logAgentActivity("c1", "a1", {
      type: "config_updated",
      details: { changed: ["name", "description"] },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "config_updated",
        details: { changed: ["name", "description"] },
      })
    );
  });

  it("nao lanca quando o insert retorna error (best-effort)", async () => {
    insertMock.mockResolvedValueOnce({ error: { message: "db down" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      logAgentActivity("c1", "a1", { type: "deactivated" })
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("nao lanca quando o client throw (best-effort)", async () => {
    insertMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      logAgentActivity("c1", "a1", { type: "error", details: { operation: "x" } })
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("expoe AGENT_ACTIVITY_EVENT_TYPES com 9 tipos esperados", () => {
    expect(AGENT_ACTIVITY_EVENT_TYPES).toEqual([
      "activated",
      "deactivated",
      "config_updated",
      "inbox_linked",
      "inbox_unlinked",
      "message_handled",
      "error",
      "created",
      "deleted",
    ]);
  });
});

describe("diffAgentFields", () => {
  const fields = ["name", "description", "role", "model", "is_active"] as const;

  it("retorna campos que mudaram", () => {
    const before = { name: "A", description: "x", role: "r", model: "m", is_active: true };
    const after = { name: "B", description: "x", role: "r", model: "n", is_active: true };
    expect(diffAgentFields(before, after, fields)).toEqual(["name", "model"]);
  });

  it("trata '' e null como equivalentes (nada mudou)", () => {
    const before = { description: "" };
    const after = { description: null };
    expect(diffAgentFields(before, after, ["description"])).toEqual([]);
  });

  it("trata null e undefined como equivalentes", () => {
    const before = { role: null };
    const after = { role: undefined };
    expect(diffAgentFields(before, after, ["role"])).toEqual([]);
  });

  it("detecta toggle de boolean", () => {
    expect(
      diffAgentFields({ is_active: false }, { is_active: true }, ["is_active"])
    ).toEqual(["is_active"]);
  });

  it("retorna [] quando nada mudou", () => {
    const obj = { name: "X", model: "Y" };
    expect(diffAgentFields(obj, { ...obj }, ["name", "model"])).toEqual([]);
  });
});
