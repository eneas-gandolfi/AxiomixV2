import { describe, expect, it } from "vitest";
import { getAuthenticatedDefaultRoute } from "../default-route";

describe("getAuthenticatedDefaultRoute", () => {
  it("returns WhatsApp Intelligence as the authenticated product entry point", () => {
    expect(getAuthenticatedDefaultRoute()).toBe("/whatsapp-intelligence");
  });
});
