/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppModuleNav } from "../whatsapp-module-nav";

let pathname = "/whatsapp-intelligence";
let query = "";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(query),
}));

beforeEach(() => {
  pathname = "/whatsapp-intelligence";
  query = "";
});

describe("WhatsAppModuleNav", () => {
  it("separates groups, individual conversations, history, and agents in the top navigation", () => {
    render(<WhatsAppModuleNav />);

    expect(screen.getByRole("link", { name: "Grupos" })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence"
    );
    expect(screen.getByRole("link", { name: "Conversas individuais" })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence?modo=agora"
    );
    expect(screen.getByRole("link", { name: "Histórico" })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence?modo=historico"
    );
    expect(screen.getByRole("link", { name: "Agentes IA" })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence/agentes"
    );
    expect(screen.queryByRole("link", { name: "Painel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Conversas" })).not.toBeInTheDocument();
  });

  it("marks individual conversations as active when the live conversation mode is selected", () => {
    query = "modo=agora";

    render(<WhatsAppModuleNav />);

    expect(screen.getByRole("link", { name: "Conversas individuais" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Grupos" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
