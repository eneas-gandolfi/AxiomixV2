/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupsRadarSkeleton } from "../groups-radar-skeleton";

describe("GroupsRadarSkeleton", () => {
  it("shows a focused loading state for the groups dashboard", () => {
    render(<GroupsRadarSkeleton />);

    expect(screen.getByText("Carregando grupos em foco")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Carregando card de grupo")).toHaveLength(4);
  });
});
