/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversationsReturnLink } from "../conversations-return-link";

describe("ConversationsReturnLink", () => {
  it("returns the complete conversations page to the individual conversations panel", () => {
    render(<ConversationsReturnLink />);

    expect(screen.getByRole("link", { name: "Voltar à tela anterior" })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence?modo=agora"
    );
  });
});
