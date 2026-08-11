/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhatsAppHistoryOverview } from "../whatsapp-history-overview";

describe("WhatsAppHistoryOverview", () => {
  it("frames history around WhatsApp groups, individual conversations, and AI activity", () => {
    render(
      <WhatsAppHistoryOverview
        windowDays={30}
        groups={{
          total: 44,
          active: 12,
          messages: 318,
          aiSignals: 27,
        }}
        conversations={{
          total: 126,
          withoutReturn: 18,
          opportunities: 34,
        }}
        ai={{
          responses: 42,
          blocked: 4,
          insights: 61,
        }}
      />
    );

    expect(screen.getByText("Histórico de Inteligência WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Grupos monitorados")).toBeInTheDocument();
    expect(screen.getByText("Conversas individuais")).toBeInTheDocument();
    expect(screen.getByText("IA em ação")).toBeInTheDocument();
    expect(screen.getByText("44")).toBeInTheDocument();
    expect(screen.getByText("318")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
