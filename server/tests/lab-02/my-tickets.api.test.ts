import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedUserFor, authedAgent } from "../helpers/auth.js";
import { SEED_CATEGORIES, SEED_RELATED_SYSTEMS } from "../../src/lib/seedData.js";

// Lab 2 list/search/filter/sort/pagination behavior migrated to the
// authenticated contract (Issue 18): no `requesterId` query param — the session
// user's tickets are returned (BR-03, api-spec section 4.2).

const createdTicketIds: number[] = [];

async function cleanUp(): Promise<void> {
  await db.publicComment.deleteMany({
    where: { ticketId: { in: createdTicketIds } },
  });
  await db.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
  await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  createdTicketIds.length = 0;
}

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;
let categoryIds: Record<string, number>;
let relatedSystemId: number;

beforeAll(async () => {
  agentA = await authedAgent("REQUESTER", 0);
  agentB = await authedAgent("REQUESTER", 1);

  categoryIds = {} as Record<string, number>;
  for (const c of SEED_CATEGORIES) {
    categoryIds[c.name] = (await db.category.findUnique({
      where: { name: c.name },
      select: { id: true },
    }))!.id;
  }
  relatedSystemId = (await db.relatedSystem.findUnique({
    where: { name: SEED_RELATED_SYSTEMS[0].name },
    select: { id: true },
  }))!.id;
}, 30000);

async function createTicket(
  agent: ReturnType<typeof request.agent>,
  overrides: Record<string, unknown> = {}
): Promise<{
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  category: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}> {
  const body = {
    categoryId: categoryIds["Hardware"],
    relatedSystemId,
    requestedPriority: "MEDIUM",
    summary: "Test ticket",
    description: "Test description",
    ...overrides,
  };
  const res = await agent.post("/api/tickets").send(body);
  expect(res.status).toBe(201);
  const ticket = res.body.data;
  createdTicketIds.push(ticket.id);
  return ticket;
}

describe("GET /api/tickets", () => {
  describe("API-06: Ownership isolation", () => {
    it("returns only user A's tickets", async () => {
      const ticketA = await createTicket(agentA, {
        summary: "A's ticket",
      });
      const ticketB = await createTicket(agentB, {
        summary: "B's ticket",
      });

      const res = await agentA.get("/api/tickets");
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticketA.id);
      expect(ids).not.toContain(ticketB.id);
    });

    it("returns only user B's tickets", async () => {
      const ticketA = await createTicket(agentA, {
        summary: "A's ticket 2",
      });
      const ticketB = await createTicket(agentB, {
        summary: "B's ticket 2",
      });

      const res = await agentB.get("/api/tickets");
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticketB.id);
      expect(ids).not.toContain(ticketA.id);
    });

    it("does not leak user A's tickets even when searching B's keywords", async () => {
      const ticketA = await createTicket(agentA, {
        summary: "UniqueSecretKeywordXYZ",
      });

      const res = await agentB.get(
        "/api/tickets?search=UniqueSecretKeywordXYZ"
      );
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).not.toContain(ticketA.id);
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("API-07: Search", () => {
    it("finds tickets by partial ticketNumber match (case-insensitive)", async () => {
      const ticket = await createTicket(agentA, {
        summary: "Search test",
      });

      const partial = ticket.ticketNumber.slice(0, 8);
      const res = await agentA.get(`/api/tickets?search=${partial}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticket.id);
    });

    it("finds tickets by summary substring (case-insensitive)", async () => {
      await createTicket(agentA, {
        summary: "Coffee machine broken in Building A",
      });

      const res = await agentA.get("/api/tickets?search=coffee");
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const summaries = res.body.data.map((t: { summary: string }) =>
        t.summary.toLowerCase()
      );
      expect(summaries.some((s: string) => s.includes("coffee"))).toBe(true);
    });

    it("search is case-insensitive", async () => {
      const ticket = await createTicket(agentA, {
        summary: "UpperAndLower case Test",
      });

      const res = await agentA.get("/api/tickets?search=UPPERANDLOWER");
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      expect(ids).toContain(ticket.id);
    });

    it("combined search + filter returns correct subset", async () => {
      await createTicket(agentA, {
        summary: "Laptop issue in Hardware category",
        categoryId: categoryIds["Hardware"],
        requestedPriority: "HIGH",
      });
      await createTicket(agentA, {
        summary: "Laptop issue in Software category",
        categoryId: categoryIds["Software"],
        requestedPriority: "HIGH",
      });

      const res = await agentA.get(
        `/api/tickets?search=Laptop&categoryId=${categoryIds["Hardware"]}&requestedPriority=HIGH`
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.summary.toLowerCase()).toContain("laptop");
        expect(t.category.id).toBe(categoryIds["Hardware"]);
        expect(t.requestedPriority).toBe("HIGH");
      }
    });

    it("returns empty data (not error) when no tickets match search", async () => {
      const res = await agentA.get("/api/tickets?search=ZZZNONEXISTENTXYZ");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe("API-08: Filters", () => {
    it("filters by categoryId", async () => {
      await createTicket(agentA, {
        summary: "Hardware ticket",
        categoryId: categoryIds["Hardware"],
      });
      await createTicket(agentA, {
        summary: "Software ticket",
        categoryId: categoryIds["Software"],
      });

      const res = await agentA.get(
        `/api/tickets?categoryId=${categoryIds["Hardware"]}`
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.category.id).toBe(categoryIds["Hardware"]);
      }
    });

    it("filters by currentStatus", async () => {
      await createTicket(agentA, {
        summary: "Status NEW ticket",
      });

      const res = await agentA.get("/api/tickets?currentStatus=NEW");
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.currentStatus).toBe("NEW");
      }
    });

    it("filters by requestedPriority", async () => {
      await createTicket(agentA, {
        summary: "Urgent priority ticket",
        requestedPriority: "URGENT",
      });
      await createTicket(agentA, {
        summary: "Low priority ticket",
        requestedPriority: "LOW",
      });

      const res = await agentA.get("/api/tickets?requestedPriority=URGENT");
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.requestedPriority).toBe("URGENT");
      }
    });

    it("combines multiple filters with AND logic", async () => {
      await createTicket(agentA, {
        summary: "Combined filter match",
        categoryId: categoryIds["Hardware"],
        requestedPriority: "HIGH",
      });
      await createTicket(agentA, {
        summary: "Combined filter no match category",
        categoryId: categoryIds["Software"],
        requestedPriority: "HIGH",
      });
      await createTicket(agentA, {
        summary: "Combined filter no match priority",
        categoryId: categoryIds["Hardware"],
        requestedPriority: "LOW",
      });

      const res = await agentA.get(
        `/api/tickets?categoryId=${categoryIds["Hardware"]}&requestedPriority=HIGH`
      );
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.category.id).toBe(categoryIds["Hardware"]);
        expect(t.requestedPriority).toBe("HIGH");
      }
    });
  });

  describe("API-09: Sorting", () => {
    it("defaults to updatedAt descending", async () => {
      const t1 = await createTicket(agentA, {
        summary: "First ticket sort test",
      });
      const t2 = await createTicket(agentA, {
        summary: "Second ticket sort test",
      });

      const res = await agentA.get("/api/tickets");
      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: { id: number }) => t.id);
      const idx1 = ids.indexOf(t1.id);
      const idx2 = ids.indexOf(t2.id);

      // t2 was created after t1: its updatedAt is strictly later, OR equal with a
      // higher ticketNumber, which the secondary DESC sort puts first in both cases.
      expect(idx1).toBeGreaterThanOrEqual(0);
      expect(idx2).toBeGreaterThanOrEqual(0);
      expect(idx2).toBeLessThan(idx1);
    });

    it("appends ticketNumber DESC as secondary sort for stable ordering", async () => {
      const res = await agentA.get(
        "/api/tickets?sortBy=updatedAt&sortOrder=desc"
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
      const res = await agentA.get(
        "/api/tickets?sortBy=createdAt&sortOrder=asc"
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
      const res = await agentA.get(
        "/api/tickets?sortBy=ticketNumber&sortOrder=desc"
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
      const res = await agentA.get("/api/tickets?sortBy=description");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.sortBy).toBeTruthy();
    });

    it("returns 400 for non-whitelisted sortOrder", async () => {
      const res = await agentA.get(
        "/api/tickets?sortBy=createdAt&sortOrder=sideways"
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.sortOrder).toBeTruthy();
    });
  });

  describe("API-10: Pagination", () => {
    it("returns correct subset and metadata", async () => {
      for (let i = 0; i < 5; i++) {
        await createTicket(agentA, {
          summary: `Pagination test ticket ${i}`,
        });
      }

      const res = await agentA.get("/api/tickets?page=1&pageSize=2");
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
        await createTicket(agentA, {
          summary: `Pagination page2 test ${i}`,
        });
      }

      const page1 = await agentA.get("/api/tickets?page=1&pageSize=2");
      const page2 = await agentA.get("/api/tickets?page=2&pageSize=2");
      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      const ids1 = page1.body.data.map((t: { id: number }) => t.id);
      const ids2 = page2.body.data.map((t: { id: number }) => t.id);
      const overlap = ids1.filter((id: number) => ids2.includes(id));
      expect(overlap).toEqual([]);
    });

    it("returns 400 for page=0", async () => {
      const res = await agentA.get("/api/tickets?page=0");
      expect(res.status).toBe(400);
      expect(res.body.error.fields.page).toBeTruthy();
    });

    it("returns 400 for negative page", async () => {
      const res = await agentA.get("/api/tickets?page=-1");
      expect(res.status).toBe(400);
      expect(res.body.error.fields.page).toBeTruthy();
    });

    it("returns 400 for pageSize >50", async () => {
      const res = await agentA.get("/api/tickets?pageSize=51");
      expect(res.status).toBe(400);
      expect(res.body.error.fields.pageSize).toBeTruthy();
    });

    it("returns 400 for non-numeric page", async () => {
      const res = await agentA.get("/api/tickets?page=abc");
      expect(res.status).toBe(400);
      expect(res.body.error.fields.page).toBeTruthy();
    });

    it("caps pageSize at 50", async () => {
      const res = await agentA.get("/api/tickets?pageSize=50");
      expect(res.status).toBe(200);
      expect(res.body.meta.pageSize).toBe(50);
    });
  });

  describe("API-24: Edge cases", () => {
    it("returns 400 for unknown currentStatus enum", async () => {
      const res = await agentA.get("/api/tickets?currentStatus=BOGUS");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.currentStatus).toBeTruthy();
    });

    it("returns 400 for unknown requestedPriority enum", async () => {
      const res = await agentA.get("/api/tickets?requestedPriority=BOGUS");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.requestedPriority).toBeTruthy();
    });

    it("returns 400 for negative pageSize", async () => {
      const res = await agentA.get("/api/tickets?pageSize=-1");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.pageSize).toBeTruthy();
    });

    it("returns correct response envelope shape", async () => {
      const res = await agentA.get("/api/tickets");
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
      await createTicket(agentA, {
        summary: "Shape check ticket",
      });

      const res = await agentA.get("/api/tickets");
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