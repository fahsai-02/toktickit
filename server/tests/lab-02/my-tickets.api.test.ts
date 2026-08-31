import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";

const createdTicketIds: number[] = [];

async function cleanUp(): Promise<void> {
  await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  createdTicketIds.length = 0;
}

afterAll(async () => {
  await cleanUp();
});

async function createTicket(
  overrides: Record<string, unknown> = {}
): Promise<{ id: number; ticketNumber: string; summary: string; requestedPriority: string; itPriority: string | null; currentStatus: string; category: { id: number; name: string }; createdAt: string; updatedAt: string }> {
  const body = {
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 7,
    requestedPriority: "MEDIUM",
    summary: "Test ticket",
    description: "Test description",
    ...overrides,
  };
  const res = await request(app).post("/api/tickets").send(body);
  expect(res.status).toBe(201);
  const ticket = res.body.data;
  createdTicketIds.push(ticket.id);
  return ticket;
}

describe("GET /api/tickets", () => {
  describe("API-06: Ownership isolation", () => {
    it("returns only requester 1's tickets when requesterId=1", async () => {
      const ticketA = await createTicket({
        requesterId: 1,
        summary: "A's ticket",
      });
      const ticketB = await createTicket({
        requesterId: 2,
        summary: "B's ticket",
      });

      const res = await request(app).get("/api/tickets?requesterId=1");
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticketA.id);
      expect(ids).not.toContain(ticketB.id);
    });

    it("returns only requester 2's tickets when requesterId=2", async () => {
      const ticketA = await createTicket({
        requesterId: 1,
        summary: "A's ticket 2",
      });
      const ticketB = await createTicket({
        requesterId: 2,
        summary: "B's ticket 2",
      });

      const res = await request(app).get("/api/tickets?requesterId=2");
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticketB.id);
      expect(ids).not.toContain(ticketA.id);
    });

    it("does not leak requester A's tickets even when searching B's keywords", async () => {
      const ticketA = await createTicket({
        requesterId: 1,
        summary: "UniqueSecretKeywordXYZ",
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=2&search=UniqueSecretKeywordXYZ"
      );
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).not.toContain(ticketA.id);
    });
  });

  describe("API-07: Search", () => {
    it("finds tickets by partial ticketNumber match (case-insensitive)", async () => {
      const ticket = await createTicket({
        requesterId: 1,
        summary: "Search test",
      });

      const partial = ticket.ticketNumber.slice(0, 8);
      const res = await request(app).get(
        `/api/tickets?requesterId=1&search=${partial}`
      );
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticket.id);
    });

    it("finds tickets by summary substring (case-insensitive)", async () => {
      await createTicket({
        requesterId: 1,
        summary: "Coffee machine broken in Building A",
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=1&search=coffee"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const summaries = res.body.data.map((t: { summary: string }) =>
        t.summary.toLowerCase()
      );
      expect(summaries.some((s: string) => s.includes("coffee"))).toBe(true);
    });

    it("search is case-insensitive", async () => {
      const ticket = await createTicket({
        requesterId: 1,
        summary: "UpperAndLower case Test",
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=1&search=UPPERANDLOWER"
      );
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticket.id);
    });

    it("combined search + filter returns correct subset", async () => {
      await createTicket({
        requesterId: 1,
        summary: "Laptop issue in Hardware category",
        categoryId: 2,
        requestedPriority: "HIGH",
      });
      await createTicket({
        requesterId: 1,
        summary: "Laptop issue in Software category",
        categoryId: 3,
        requestedPriority: "HIGH",
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=1&search=Laptop&categoryId=2&requestedPriority=HIGH"
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.summary.toLowerCase()).toContain("laptop");
        expect(t.category.id).toBe(2);
        expect(t.requestedPriority).toBe("HIGH");
      }
    });

    it("returns empty data (not error) when no tickets match search", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&search=ZZZNONEXISTENTXYZ"
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe("API-08: Filters", () => {
    it("filters by categoryId", async () => {
      await createTicket({
        requesterId: 1,
        summary: "Hardware ticket",
        categoryId: 2,
      });
      await createTicket({
        requesterId: 1,
        summary: "Software ticket",
        categoryId: 3,
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=1&categoryId=2"
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.category.id).toBe(2);
      }
    });

    it("filters by currentStatus", async () => {
      await createTicket({
        requesterId: 1,
        summary: "Status NEW ticket",
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=1&currentStatus=NEW"
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.currentStatus).toBe("NEW");
      }
    });

    it("filters by requestedPriority", async () => {
      await createTicket({
        requesterId: 1,
        summary: "Urgent priority ticket",
        requestedPriority: "URGENT",
      });
      await createTicket({
        requesterId: 1,
        summary: "Low priority ticket",
        requestedPriority: "LOW",
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=1&requestedPriority=URGENT"
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.requestedPriority).toBe("URGENT");
      }
    });

    it("combines multiple filters with AND logic", async () => {
      await createTicket({
        requesterId: 1,
        summary: "Combined filter match",
        categoryId: 2,
        requestedPriority: "HIGH",
      });
      await createTicket({
        requesterId: 1,
        summary: "Combined filter no match category",
        categoryId: 3,
        requestedPriority: "HIGH",
      });
      await createTicket({
        requesterId: 1,
        summary: "Combined filter no match priority",
        categoryId: 2,
        requestedPriority: "LOW",
      });

      const res = await request(app).get(
        "/api/tickets?requesterId=1&categoryId=2&requestedPriority=HIGH"
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.category.id).toBe(2);
        expect(t.requestedPriority).toBe("HIGH");
      }
    });
  });

  describe("API-09: Sorting", () => {
    it("defaults to updatedAt descending", async () => {
      const t1 = await createTicket({
        requesterId: 1,
        summary: "First ticket sort test",
      });
      await new Promise((r) => setTimeout(r, 50));
      const t2 = await createTicket({
        requesterId: 1,
        summary: "Second ticket sort test",
      });

      const res = await request(app).get("/api/tickets?requesterId=1");
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      const idx1 = ids.indexOf(t1.id);
      const idx2 = ids.indexOf(t2.id);
      if (idx1 !== -1 && idx2 !== -1) {
        expect(idx2).toBeLessThan(idx1);
      }
    });

    it("appends ticketNumber DESC as secondary sort for stable ordering", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&sortBy=updatedAt&sortOrder=desc"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(1);

      const ticketNumbers = res.body.data.map(
        (t: { ticketNumber: string }) => t.ticketNumber
      );
      for (let i = 1; i < ticketNumbers.length; i++) {
        const prev = ticketNumbers[i - 1];
        const curr = ticketNumbers[i];
        if (res.body.data[i - 1].updatedAt === res.body.data[i].updatedAt) {
          expect(prev).toBeGreaterThan(curr);
        }
      }
    });

    it("supports sortBy=createdAt asc", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&sortBy=createdAt&sortOrder=asc"
      );
      expect(res.status).toBe(200);
      const dates = res.body.data.map((t: { createdAt: string }) =>
        new Date(t.createdAt).getTime()
      );
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it("supports sortBy=ticketNumber desc", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&sortBy=ticketNumber&sortOrder=desc"
      );
      expect(res.status).toBe(200);
      const nums = res.body.data.map((t: { ticketNumber: string }) =>
        t.ticketNumber
      );
      for (let i = 1; i < nums.length; i++) {
        expect(nums[i - 1] >= nums[i]).toBe(true);
      }
    });

    it("returns 400 for non-whitelisted sortBy", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&sortBy=description"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.sortBy).toBeTruthy();
    });
  });

  describe("API-10: Pagination", () => {
    it("returns correct subset and metadata", async () => {
      for (let i = 0; i < 5; i++) {
        await createTicket({
          requesterId: 1,
          summary: `Pagination test ticket ${i}`,
        });
      }

      const res = await request(app).get(
        "/api/tickets?requesterId=1&page=1&pageSize=2"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toMatchObject({
        page: 1,
        pageSize: 2,
      });
      expect(typeof res.body.meta.total).toBe("number");
      expect(typeof res.body.meta.totalPages).toBe("number");
      expect(res.body.meta.totalPages).toBe(
        Math.ceil(res.body.meta.total / 2)
      );
    });

    it("returns different page 2 results", async () => {
      for (let i = 0; i < 5; i++) {
        await createTicket({
          requesterId: 1,
          summary: `Pagination page2 test ${i}`,
        });
      }

      const page1 = await request(app).get(
        "/api/tickets?requesterId=1&page=1&pageSize=2"
      );
      const page2 = await request(app).get(
        "/api/tickets?requesterId=1&page=2&pageSize=2"
      );
      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      const ids1 = page1.body.data.map((t: { id: number }) => t.id);
      const ids2 = page2.body.data.map((t: { id: number }) => t.id);
      const overlap = ids1.filter((id: number) => ids2.includes(id));
      expect(overlap).toEqual([]);
    });

    it("returns 400 for page=0", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&page=0"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields.page).toBeTruthy();
    });

    it("returns 400 for negative page", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&page=-1"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields.page).toBeTruthy();
    });

    it("returns 400 for pageSize >50", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&pageSize=51"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields.pageSize).toBeTruthy();
    });

    it("returns 400 for non-numeric page", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&page=abc"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.fields.page).toBeTruthy();
    });

    it("caps pageSize at 50", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&pageSize=50"
      );
      expect(res.status).toBe(200);
      expect(res.body.meta.pageSize).toBe(50);
    });
  });

  describe("API-24: Edge cases", () => {
    it("returns 400 for unknown currentStatus enum", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&currentStatus=BOGUS"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.currentStatus).toBeTruthy();
    });

    it("returns 400 for unknown requestedPriority enum", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&requestedPriority=BOGUS"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.requestedPriority).toBeTruthy();
    });

    it("returns 400 for page=0", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&page=0"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for negative pageSize", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=1&pageSize=-1"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.pageSize).toBeTruthy();
    });

    it("returns 400 for non-numeric requesterId", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=abc"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.requesterId).toBeTruthy();
    });

    it("returns 404 for unknown requester", async () => {
      const res = await request(app).get(
        "/api/tickets?requesterId=99999"
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 400 when requesterId is missing", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.requesterId).toBeTruthy();
    });

    it("returns correct response envelope shape", async () => {
      const res = await request(app).get("/api/tickets?requesterId=1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("meta");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({
        total: expect.any(Number),
        page: expect.any(Number),
        pageSize: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it("each ticket item has the correct shape", async () => {
      await createTicket({
        requesterId: 1,
        summary: "Shape check ticket",
      });

      const res = await request(app).get("/api/tickets?requesterId=1");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      const ticket = res.body.data[0];
      expect(ticket).toHaveProperty("id");
      expect(ticket).toHaveProperty("ticketNumber");
      expect(ticket).toHaveProperty("summary");
      expect(ticket).toHaveProperty("requestedPriority");
      expect(ticket).toHaveProperty("itPriority");
      expect(ticket).toHaveProperty("currentStatus");
      expect(ticket).toHaveProperty("category");
      expect(ticket).toHaveProperty("createdAt");
      expect(ticket).toHaveProperty("updatedAt");
      expect(ticket.category).toHaveProperty("id");
      expect(ticket.category).toHaveProperty("name");

      expect(ticket).not.toHaveProperty("description");
      expect(ticket).not.toHaveProperty("requester");
      expect(ticket).not.toHaveProperty("relatedSystem");
    });
  });
});
