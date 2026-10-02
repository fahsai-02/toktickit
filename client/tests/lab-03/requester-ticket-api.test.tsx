import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchTicket,
  fetchTickets,
  fetchTicketComments,
  postPublicComment,
  indicateResolved,
  uploadAttachment,
  downloadAttachment,
  removeAttachment,
} from "../../src/api.js";

const response = (ok: boolean, status: number, body: unknown) =>
  ({
    ok,
    status,
    json: async () => body,
    blob: async () => new Blob(["pdf"]),
  }) as unknown as Response;

const okJson = (body: unknown) => response(true, 200, body);

// Issue 18 (requester regression): every ticket/comment/attachment call is
// session-authenticated and carries no client-supplied requesterId.
// Traceability: specification.md FR-12/FR-16/FR-17/FR-19, BR-03, api-spec 4.7-4.9.

describe("fetchTicket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/tickets/:id with credentials and no requesterId query param", async () => {
    const data = { id: 12, ticketNumber: "TKT-2026-000912" };
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTicket(12)).resolves.toMatchObject(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string | URL,
      RequestInit | undefined
    ];
    expect(String(url)).toMatch(/\/api\/tickets\/12$/);
    expect(String(url)).not.toContain("requesterId");
    expect(options?.method ?? "GET").toBe("GET");
    expect(options?.credentials).toBe("include");
  });
});

describe("fetchTickets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does NOT send a requesterId query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchTickets({ search: "laptop" });

    const [url] = fetchMock.mock.calls[0] as [string | URL];
    expect(String(url)).toMatch(/\/api\/tickets\?/);
    expect(String(url)).not.toContain("requesterId");
    expect(String(url)).toContain("search=laptop");
  });
});

describe("fetchTicketComments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs /api/tickets/:id/comments with credentials", async () => {
    const data = [
      { id: 1, ticketId: 12, content: "Thank you." },
    ];
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTicketComments(12)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string | URL,
      RequestInit | undefined
    ];
    expect(String(url)).toMatch(/\/api\/tickets\/12\/comments$/);
    expect(options?.credentials).toBe("include");
  });
});

describe("postPublicComment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs only { content } to /api/tickets/:id/comments", async () => {
    const data = { id: 9, ticketId: 12, content: "Please help." };
    const fetchMock = vi.fn().mockResolvedValue(
      response(true, 201, { data })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(postPublicComment(12, "Please help.")).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/tickets\/12\/comments$/);
    expect(options?.method).toBe("POST");
    expect(options?.credentials).toBe("include");
    expect(options?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options?.body as string)).toEqual({ content: "Please help." });
  });
});

describe("indicateResolved", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs an empty body to /api/tickets/:id/indicate-resolved", async () => {
    const data = {
      id: 12,
      requesterIndicatedResolved: true,
      indicatedResolvedAt: "2026-09-03T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(indicateResolved(12)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/tickets\/12\/indicate-resolved$/);
    expect(options?.method).toBe("PUT");
    expect(options?.credentials).toBe("include");
    expect(options?.body).toBe("{}");
  });
});

describe("attachments (Issue 18 — no requesterId anywhere)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploadAttachment sends only the file, no requesterId field", async () => {
    const data = { id: 50, originalFileName: "a.pdf" };
    const fetchMock = vi.fn().mockResolvedValue(
      response(true, 201, { data })
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["content"], "a.pdf", { type: "application/pdf" });
    await expect(uploadAttachment(12, file)).resolves.toEqual(data);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/tickets\/12\/attachments$/);
    expect(options?.method).toBe("POST");
    expect(options?.credentials).toBe("include");
    const body = options?.body as FormData;
    expect(body.get("file")).toBe(file);
    expect(body.get("requesterId")).toBeNull();
  });

  it("downloadAttachment drops the requesterId query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(true, 200, {})
    );
    vi.stubGlobal("fetch", fetchMock);

    await downloadAttachment(50);

    const [url] = fetchMock.mock.calls[0] as [string | URL];
    expect(String(url)).toMatch(/\/api\/attachments\/50\/download$/);
    expect(String(url)).not.toContain("requesterId");
  });

  it("removeAttachment sends only removalReason in the body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data: { id: 50 } }));
    vi.stubGlobal("fetch", fetchMock);

    await removeAttachment(50, "Wrong file");

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit | undefined
    ];
    expect(url).toMatch(/\/api\/attachments\/50$/);
    expect(options?.method).toBe("DELETE");
    expect(options?.credentials).toBe("include");
    expect(JSON.parse(options?.body as string)).toEqual({
      removalReason: "Wrong file",
    });
  });
});