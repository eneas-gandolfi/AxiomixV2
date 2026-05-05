/**
 * Arquivo: src/app/api/whatsapp/operator-nudges/__tests__/route.test.ts
 * Propósito: Garante o contrato dos endpoints de nudges:
 *   - GET 401 sem auth · retorna lista do usuário com unreadCount
 *   - POST valida payload, exige conversa válida, propaga 403 quando RLS bloqueia
 *   - PATCH (sem id) marca todas como lidas, retorna markedCount
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// Mocks
// =============================================================================

const mockGetUser = vi.fn();
const mockSelectNudges = vi.fn();
const mockSelectConversation = vi.fn();
const mockInsertNudge = vi.fn();
const mockUpdateAllNudges = vi.fn();
const mockCountAssignedConversations = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseRouteHandlerClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "operator_nudges") {
        return {
          // GET: select().is().order().limit()
          select: (cols: string) => {
            // .insert(...).select(...).single() — POST returns this chain
            if (cols === "id, created_at") {
              return { single: mockInsertNudge };
            }
            // GET path
            return {
              is: () => ({
                order: () => ({ limit: mockSelectNudges }),
              }),
            };
          },
          insert: () => ({
            select: (cols: string) =>
              cols === "id, created_at"
                ? { single: mockInsertNudge }
                : { maybeSingle: vi.fn() },
          }),
          // PATCH (sem id): update().is().select() — bulk mark all read
          update: () => ({
            is: () => ({ select: mockUpdateAllNudges }),
          }),
        };
      }
      if (table === "conversations") {
        return {
          select: () => ({
            eq: () => ({
              // POST path: lookup da conversa por id
              maybeSingle: mockSelectConversation,
              // GET path (paralelo com nudges): count de assigned_to=user
              limit: mockCountAssignedConversations,
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

import { GET, POST, PATCH } from "../route";

function makeRequest(method: "GET" | "POST" | "PATCH", body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/whatsapp/operator-nudges", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// =============================================================================
// GET
// =============================================================================

describe("GET /api/whatsapp/operator-nudges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: nenhuma conversa atribuída ao user (gestor puro)
    mockCountAssignedConversations.mockResolvedValue({ count: 0, error: null });
  });

  it("retorna 401 sem auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "no" } });

    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("retorna nudges com unreadCount quando autenticado", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSelectNudges.mockResolvedValue({
      data: [
        {
          id: "nudge-1",
          company_id: "co-1",
          conversation_id: "conv-1",
          from_user_id: "manager-1",
          customer_name: "Maria",
          wait_seconds: 510,
          created_at: "2026-05-07T15:00:00Z",
          read_at: null,
        },
      ],
      error: null,
    });

    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.unreadCount).toBe(1);
    expect(body.nudges).toHaveLength(1);
    expect(body.nudges[0].customer_name).toBe("Maria");
  });

  it("retorna unreadCount=0 quando não há nudges", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSelectNudges.mockResolvedValue({ data: [], error: null });

    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.unreadCount).toBe(0);
    expect(body.nudges).toEqual([]);
  });

  it("retorna 500 quando o banco falha", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSelectNudges.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("FETCH_ERROR");
  });

  it("retorna isOperator=false quando user não tem conversas atribuídas e nem nudges", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "gestor-puro" } },
      error: null,
    });
    mockSelectNudges.mockResolvedValue({ data: [], error: null });
    mockCountAssignedConversations.mockResolvedValue({ count: 0, error: null });

    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isOperator).toBe(false);
  });

  it("retorna isOperator=true quando user tem conversas atribuídas", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "atendente-1" } },
      error: null,
    });
    mockSelectNudges.mockResolvedValue({ data: [], error: null });
    mockCountAssignedConversations.mockResolvedValue({ count: 7, error: null });

    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isOperator).toBe(true);
  });

  it("retorna isOperator=true quando user tem nudges (mesmo sem conversas atribuídas no momento)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "ex-atendente" } },
      error: null,
    });
    mockSelectNudges.mockResolvedValue({
      data: [
        {
          id: "nudge-old",
          company_id: "co-1",
          conversation_id: "conv-1",
          from_user_id: "manager-1",
          customer_name: "Maria",
          wait_seconds: 510,
          created_at: "2026-05-07T15:00:00Z",
          read_at: null,
        },
      ],
      error: null,
    });
    mockCountAssignedConversations.mockResolvedValue({ count: 0, error: null });

    const response = await GET(makeRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isOperator).toBe(true);
    expect(body.unreadCount).toBe(1);
  });
});

// =============================================================================
// POST
// =============================================================================

describe("POST /api/whatsapp/operator-nudges", () => {
  beforeEach(() => vi.clearAllMocks());

  // UUIDs v4 válidos (versão 4 + variant 8/9/a/b)
  const validBody = {
    conversationId: "11111111-1111-4111-8111-111111111111",
    toUserId: "22222222-2222-4222-8222-222222222222",
    customerName: "Maria Silva",
    waitSeconds: 510,
  };

  it("retorna 401 sem auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "no" } });

    const response = await POST(makeRequest("POST", validBody));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("rejeita payload sem conversationId", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    });

    const response = await POST(
      makeRequest("POST", { toUserId: validBody.toUserId }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("rejeita payload com UUID inválido", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    });

    const response = await POST(
      makeRequest("POST", {
        conversationId: "not-a-uuid",
        toUserId: validBody.toUserId,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("retorna 404 quando conversa não existe", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    });
    mockSelectConversation.mockResolvedValue({ data: null, error: null });

    const response = await POST(makeRequest("POST", validBody));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("CONVERSATION_NOT_FOUND");
  });

  it("retorna 403 quando RLS bloqueia (cross-tenant)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    });
    mockSelectConversation.mockResolvedValue({
      data: { id: validBody.conversationId, company_id: "co-1" },
      error: null,
    });
    mockInsertNudge.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "insufficient privilege" },
    });

    const response = await POST(makeRequest("POST", validBody));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("cria nudge com sucesso", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    });
    mockSelectConversation.mockResolvedValue({
      data: { id: validBody.conversationId, company_id: "co-1" },
      error: null,
    });
    mockInsertNudge.mockResolvedValue({
      data: { id: "nudge-1", created_at: "2026-05-07T15:00:00Z" },
      error: null,
    });

    const response = await POST(makeRequest("POST", validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.nudge.id).toBe("nudge-1");
  });
});

// =============================================================================
// PATCH (mark all as read)
// =============================================================================

describe("PATCH /api/whatsapp/operator-nudges (bulk)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 sem auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "no" } });

    const response = await PATCH(makeRequest("PATCH"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("marca todas as nudges não-lidas como lidas, retorna markedCount", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "operator-1" } },
      error: null,
    });
    mockUpdateAllNudges.mockResolvedValue({
      data: [{ id: "n1" }, { id: "n2" }, { id: "n3" }],
      error: null,
    });

    const response = await PATCH(makeRequest("PATCH"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.markedCount).toBe(3);
  });

  it("retorna markedCount=0 quando não havia nudges não-lidas", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "operator-1" } },
      error: null,
    });
    mockUpdateAllNudges.mockResolvedValue({ data: [], error: null });

    const response = await PATCH(makeRequest("PATCH"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.markedCount).toBe(0);
  });

  it("retorna 500 quando o banco falha", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "operator-1" } },
      error: null,
    });
    mockUpdateAllNudges.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    const response = await PATCH(makeRequest("PATCH"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("MARK_ALL_ERROR");
  });
});
