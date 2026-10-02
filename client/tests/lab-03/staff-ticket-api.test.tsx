import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchStaffTicket,
  claimTicket,
  assignTicket,
  updateStaffTicketPriority,
  updateStaffTicketStatus,
  updateStaffTicketCategory,
  saveResolutionSummary,
  fetchStaffComments,
  postStaffComment,
  fetchInternalNotes,
  createInternalNote,
  fetchStaffUsers,
} from "../../src/api.js";

const response = (ok: boolean, status: number, body: unknown) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as unknown as Response;

const okJson = (body: unknown) => response(true, 200, body);

// Issue 20 (staff ticket detail): every IT Staff API wrapper must hit the
// staff endpoints with credentials and the exact method + JSON body.
// Traceability: specification.md FR-26..FR-31, FR-39, api-spec 5.2-5.12.
// Rule 5: assert the real request (method, URL, headers, body), not just the
// returned value.

describe("fetchStaffTicket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/staff/tickets/:id with credentials", async () => {
    const data = {
      id: 12,
      ticketNumber: "TKT-2026-000912",
      _count: { attachments: 0, comments: 1, notes: 2 },
    };
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStaffTicket(12)).resolves.toMatchObject(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string | URL,
      RequestInit | undefined
    ];
    expect(String(url)).toMatch(/\/api\/staff\/tickets\/12$/);
    expect(options?.method ?? "GET").toBe("GET");
    expect(options?.credentials).toBe("include");
  });
});

describe("claimTicket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs an empty body to /api/staff/tickets/:id/claim", async () => {
    const data = { owner: { id: 7, name: "Sara Patel", role: "IT_STAFF" } };
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(claimTicket(12)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/claim$/);
    expect(options?.method).toBe("PUT");
    expect(options?.credentials).toBe("include");
    expect(options?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(options?.body).toBe("{}");
  });
});

describe("assignTicket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs { ownerId } to /api/staff/tickets/:id/assign", async () => {
    const data = { owner: { id: 8, name: "James Wilson", role: "IT_STAFF" } };
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(assignTicket(12, 8)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/assign$/);
    expect(options?.method).toBe("PUT");
    expect(options?.credentials).toBe("include");
    expect(JSON.parse(options?.body as string)).toEqual({ ownerId: 8 });
  });
});

describe("updateStaffTicketPriority", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs { itPriority } to /api/staff/tickets/:id/priority", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data: { itPriority: "URGENT" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateStaffTicketPriority(12, "URGENT")).resolves.toEqual({
      itPriority: "URGENT",
    });

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/priority$/);
    expect(options?.method).toBe("PUT");
    expect(JSON.parse(options?.body as string)).toEqual({ itPriority: "URGENT" });
  });
});

describe("updateStaffTicketStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs { currentStatus } to /api/staff/tickets/:id/status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okJson({ data: { currentStatus: "IN_PROGRESS" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateStaffTicketStatus(12, "IN_PROGRESS")).resolves.toEqual({
      currentStatus: "IN_PROGRESS",
    });

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/status$/);
    expect(options?.method).toBe("PUT");
    expect(JSON.parse(options?.body as string)).toEqual({ currentStatus: "IN_PROGRESS" });
  });
});

describe("updateStaffTicketCategory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs { categoryId } to /api/staff/tickets/:id/category", async () => {
    const data = { category: { id: 2, name: "Hardware" } };
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateStaffTicketCategory(12, 2)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/category$/);
    expect(options?.method).toBe("PUT");
    expect(JSON.parse(options?.body as string)).toEqual({ categoryId: 2 });
  });
});

describe("saveResolutionSummary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs { resolutionSummary } to /api/staff/tickets/:id/resolution-summary", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okJson({ data: { resolutionSummary: "Patched." } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveResolutionSummary(12, "Patched.")).resolves.toEqual({
      resolutionSummary: "Patched.",
    });

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/resolution-summary$/);
    expect(options?.method).toBe("PUT");
    expect(options?.credentials).toBe("include");
    expect(JSON.parse(options?.body as string)).toEqual({ resolutionSummary: "Patched." });
  });
});

describe("fetchStaffComments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/staff/tickets/:id/comments with credentials", async () => {
    const data = [{ id: 4, ticketId: 12, content: "Thanks", authorId: 3 }];
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStaffComments(12)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string | URL,
      RequestInit | undefined
    ];
    expect(String(url)).toMatch(/\/api\/staff\/tickets\/12\/comments$/);
    expect(options?.credentials).toBe("include");
  });
});

describe("postStaffComment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs only { content } to /api/staff/tickets/:id/comments", async () => {
    const data = { id: 5, ticketId: 12, content: "Please update" };
    const fetchMock = vi.fn().mockResolvedValue(response(true, 201, { data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(postStaffComment(12, "Please update")).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/comments$/);
    expect(options?.method).toBe("POST");
    expect(options?.credentials).toBe("include");
    expect(JSON.parse(options?.body as string)).toEqual({ content: "Please update" });
  });
});

describe("fetchInternalNotes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/staff/tickets/:id/notes with credentials", async () => {
    const data = [{ id: 6, ticketId: 12, content: "Escalate", authorId: 7 }];
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchInternalNotes(12)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string | URL,
      RequestInit | undefined
    ];
    expect(String(url)).toMatch(/\/api\/staff\/tickets\/12\/notes$/);
    expect(options?.credentials).toBe("include");
  });
});

describe("createInternalNote", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs only { content } to /api/staff/tickets/:id/notes", async () => {
    const data = { id: 7, ticketId: 12, content: "Internal: keep quiet" };
    const fetchMock = vi.fn().mockResolvedValue(response(true, 201, { data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createInternalNote(12, "Internal: keep quiet")).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/staff\/tickets\/12\/notes$/);
    expect(options?.method).toBe("POST");
    expect(options?.credentials).toBe("include");
    expect(JSON.parse(options?.body as string)).toEqual({ content: "Internal: keep quiet" });
  });
});

describe("fetchStaffUsers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/staff/users with credentials", async () => {
    const data = [
      { id: 7, name: "Sara Patel", role: "IT_STAFF" },
      { id: 1, name: "Administrator", role: "ADMINISTRATOR" },
    ];
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStaffUsers()).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string | URL,
      RequestInit | undefined
    ];
    expect(String(url)).toMatch(/\/api\/staff\/users$/);
    expect(options?.credentials).toBe("include");
  });
});