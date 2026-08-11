import { describe, expect, it } from "vitest";
import { getInsightKindLabel } from "../group-insights-feed";

describe("getInsightKindLabel", () => {
  it("shows user-facing labels instead of internal insight codes", () => {
    expect(getInsightKindLabel("preference")).toBe("Preferência");
    expect(getInsightKindLabel("decision")).toBe("Decisão");
    expect(getInsightKindLabel("action_item")).toBe("Pendência");
    expect(getInsightKindLabel("contact_info")).toBe("Contato");
    expect(getInsightKindLabel("response")).toBe("Resposta IA");
  });
});
