import { describe, expect, it } from "vitest";
import { classifyAgentsRouteError } from "../errors";

describe("classifyAgentsRouteError", () => {
  it("returns an actionable code when Evo Auth credentials are missing", () => {
    const error = new Error(
      "Credenciais do Evo Auth Service ausentes — defina EVO_AUTH_EMAIL e EVO_AUTH_PASSWORD."
    );

    expect(classifyAgentsRouteError(error)).toEqual({
      status: 503,
      code: "EVO_AUTH_MISSING",
      message:
        "Agentes IA dependem das credenciais do Evo Auth Service. Configure EVO_AUTH_EMAIL e EVO_AUTH_PASSWORD no ambiente.",
    });
  });
});
