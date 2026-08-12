/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WhatsAppIntelligenceLoading from "../../../app/(app)/whatsapp-intelligence/loading";

describe("WhatsAppIntelligenceLoading", () => {
  it("uses the current intelligence module structure while loading", () => {
    render(<WhatsAppIntelligenceLoading />);

    expect(screen.getByLabelText("Carregando módulo de inteligência")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando navegação da inteligência")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando painel principal da inteligência")).toBeInTheDocument();
  });
});
