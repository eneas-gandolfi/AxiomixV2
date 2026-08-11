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
