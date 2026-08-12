/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardLoading from "../../../app/(app)/dashboard/loading";

describe("DashboardLoading", () => {
  it("matches the command-center structure instead of the old bento dashboard", () => {
    render(<DashboardLoading />);

    expect(screen.getByLabelText("Carregando painel de comando")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando próxima ação")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando radar de grupos")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando gargalos de vendas")).toBeInTheDocument();
  });
});
