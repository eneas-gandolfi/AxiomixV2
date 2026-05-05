/**
 * Arquivo: src/components/dashboard/__tests__/insights-panel.test.ts
 * Propósito: Validar a função pura `severityAccent` que mapeia severidade pra
 *            classe de borda do card. Mantém visual previsível mesmo se o
 *            registry adicionar severities novas — fallback default é primary.
 */

import { describe, it, expect } from "vitest";
import { severityAccent } from "@/components/dashboard/insights-panel";

describe("severityAccent", () => {
  it("red usa borda de --color-danger", () => {
    expect(severityAccent("red").borderClass).toContain("color-danger");
  });

  it("amber usa borda de --color-warning", () => {
    expect(severityAccent("amber").borderClass).toContain("color-warning");
  });

  it("info usa borda de --color-primary (default)", () => {
    expect(severityAccent("info").borderClass).toContain("color-primary");
  });
});
