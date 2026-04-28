import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createSupabaseAdminClient before importing the route
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { GET } from "../route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockAbortSignal = vi.fn();

function setupMockClient(error: { message: string } | null = null) {
  mockAbortSignal.mockResolvedValue({ data: [{ id: "test" }], error });
  mockLimit.mockReturnValue({ abortSignal: mockAbortSignal });
  mockSelect.mockReturnValue({ limit: mockLimit });

  vi.mocked(createSupabaseAdminClient).mockReturnValue({
    from: () => ({ select: mockSelect }),
  } as unknown as ReturnType<typeof createSupabaseAdminClient>);
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with status ok when DB is reachable", async () => {
    setupMockClient(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
  });

  it("returns 503 with db error when DB query fails", async () => {
    setupMockClient({ message: "connection refused" });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("error");
  });

  it("returns 503 with db timeout when DB throws", async () => {
    mockAbortSignal.mockRejectedValue(new Error("aborted"));
    mockLimit.mockReturnValue({ abortSignal: mockAbortSignal });
    mockSelect.mockReturnValue({ limit: mockLimit });

    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      from: () => ({ select: mockSelect }),
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("timeout");
  });

  it("response shape includes status, db, uptime, and timestamp", async () => {
    setupMockClient(null);

    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("db");
    expect(body).toHaveProperty("uptime");
    expect(body).toHaveProperty("timestamp");
  });

  it("uptime is a non-negative integer", async () => {
    setupMockClient(null);

    const response = await GET();
    const body = await response.json();

    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(body.uptime)).toBe(true);
  });

  it("timestamp is valid ISO 8601 UTC with Z suffix", async () => {
    setupMockClient(null);

    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});
