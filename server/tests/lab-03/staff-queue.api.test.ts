import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import {
  authedAgent,
  seedUserFor,
  type AuthedAgent,
} from "../helpers/auth.js";

// IT Staff Ticket Queue — "My Queue" (api-spec section 5.1; FR-22/23/24,
// AC-08). API-21..33 rows in docs/lab-03/tests.md. Identity comes from
// seedData.ts (single source of truth); no seed row counts are asserted so a
// fresh or long-lived dev DB both satisfy the suite.

const STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const STAFF_SORT_WHITELIST = [
  "updatedAt",
  "createdAt",
  "itPriority",
  "currentStatus",
  "ticketNumber",
] as const;

async function queryStaff(agent: AuthedAgent, query: string) {
  return agent.get(`/api/staff/tickets${query}`);
}

describe("GET /api/staff/tickets — basic retrieval (API-21)", () => {
  let staff: AuthedAgent;
  let admin: AuthedAgent;
  let totalFromDb: number;

  beforeAll(async () => {
    staff = await authedAgent("IT_STAFF", 0);
    admin = await authedAgent("ADMINISTRATOR", 0);
    totalFromDb = await db.ticket.count({});
  });

  it("returns { data, meta } envelope with the 200 shape", async () => {
    const res = await queryStaff(staff, "?page=1&pageSize=5");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toMatchObject({
      page: 1,
      pageSize: 5,
      total: totalFromDb,
    });
    expect(res.body.meta.totalPages).toBe(Math.ceil(totalFromDb / 5));
    for (const ticket of res.body.data.slice(0, 3)) {
      expect(ticket).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
          summary: expect.any(String),
          requestedPriority: expect.any(String),
          itPriority: expect.toSatisfy(
            (v: unknown) => v === null || typeof v === "string"
          ),
          currentStatus: expect.any(String),
          category: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
          }),
          requester: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
          }),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
    }
  });

  it("admins may read the staff queue (ADMINISTRATOR role allowed)", async () => {
    const res = await queryStaff(admin, "?pageSize=1");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it("requesters are forbidden (403, API-19 regression)", async () => {
    const requester = await authedAgent("REQUESTER", 0);
    const res = await queryStaff(requester, "");
    expect(res.status).toBe(403);
  });

  it("unauthenticated requests are rejected (401)", async () => {
    const res = await queryStaff(request.agent(app), "");
    expect(res.status).toBe(401);
  });
});

describe("search + filters (API-22..28)", () => {
  let staff: AuthedAgent;
  let totalFromDb: number;

  beforeAll(async () => {
    staff = await authedAgent("IT_STAFF", 0);
    totalFromDb = await db.ticket.count({});
  });

  it("finds a ticket by ticket number (API-22)", async () => {
    const res = await queryStaff(staff, "?pageSize=1");
    const target = res.body.data[0] as { ticketNumber: string };
    const found = await queryStaff(staff, `?search=${target.ticketNumber}&pageSize=50`);
    expect(found.status).toBe(200);
    expect(found.body.data.length).toBeGreaterThan(0);
    expect(found.body.data[0]).toMatchObject({ ticketNumber: target.ticketNumber });
  });

  it("finds a ticket by partial summary (API-23)", async () => {
    const res = await queryStaff(staff, "?pageSize=1");
    const target = res.body.data[0] as { summary: string };
    // Use the first two words of a known ticket so the substring is stable.
    const needle = target.summary.split(" ").slice(0, 2).join(" ");
    const found = await queryStaff(staff, `?search=${encodeURIComponent(needle)}&pageSize=50`);
    expect(found.status).toBe(200);
    expect(found.body.data.length).toBeGreaterThan(0);
    expect(
      found.body.data.some(
        (t: { summary: string }) =>
          t.summary.toLowerCase().includes(needle.toLowerCase())
      )
    ).toBe(true);
  });

  it("filters by currentStatus (API-24)", async () => {
    for (const status of STATUSES) {
      const res = await queryStaff(staff, `?currentStatus=${status}&pageSize=50`);
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.currentStatus).toBe(status);
      }
    }
  });

  it("filters by requestedPriority (API-25)", async () => {
    for (const p of ["LOW", "MEDIUM", "HIGH", "URGENT"]) {
      const res = await queryStaff(staff, `?requestedPriority=${p}&pageSize=50`);
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.requestedPriority).toBe(p);
      }
    }
  });

  it("filters by itPriority (api-spec 5.1 — not a tests.md row, extra guard)", async () => {
    for (const p of ["LOW", "MEDIUM", "HIGH", "URGENT"]) {
      const res = await queryStaff(staff, `?itPriority=${p}&pageSize=50`);
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.itPriority).toBe(p);
      }
    }
  });

  it("filters by categoryId (API-26) and unassigned owner (API-28)", async () => {
    const categorySample = await db.category.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    const byCategory = await queryStaff(
      staff,
      `?categoryId=${categorySample!.id}&pageSize=50`
    );
    expect(byCategory.status).toBe(200);
    for (const t of byCategory.body.data) {
      expect(t.category.id).toBe(categorySample!.id);
    }

    const unassigned = await queryStaff(staff, "?ownerId=unassigned&pageSize=50");
    expect(unassigned.status).toBe(200);
    for (const t of unassigned.body.data) {
      expect(t.owner).toBeNull();
    }
  });

  it("submits search + filters together and still returns envelopes (AC-08)", async () => {
    const res = await queryStaff(
      staff,
      `?search=PROJECTOR&currentStatus=NEW&requestedPriority=HIGH&itPriority=URGENT&pageSize=50`
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("meta.total");
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

describe("ownerId filters incl 'me' + sorting + pagination + empty (API-27, API-29..33)", () => {
  let staff: { agent: AuthedAgent; id: number };

  beforeAll(async () => {
    const acct = seedUserFor("IT_STAFF", 0)!;
    const user = (await db.user.findUnique({
      where: { email: acct.email },
      select: { id: true },
    }))!;
    staff = { agent: await authedAgent("IT_STAFF", 0), id: user.id };
  });

  it("'me' returns only tickets the staff user owns (API-29)", async () => {
    const res = await queryStaff(staff.agent, "?ownerId=me&pageSize=50");
    expect(res.status).toBe(200);
    for (const t of res.body.data) {
      expect(t.owner).toMatchObject({ id: staff.id });
    }
  });

  it("integer ownerId returns only that owner's tickets (API-27)", async () => {
    // Pick an owner that exists from any ticket row.
    const anyOwner = await db.ticket.findFirst({
      where: { ownerId: { not: null } },
      select: { ownerId: true },
    });
    if (!anyOwner?.ownerId) {
      // No assigned tickets today — nothing more to prove deterministically.
      expect(true).toBe(true);
      return;
    }
    const res = await queryStaff(staff.agent, `?ownerId=${anyOwner.ownerId}&pageSize=50`);
    expect(res.status).toBe(200);
    for (const t of res.body.data) {
      expect(t.owner.id).toBe(anyOwner.ownerId);
    }
  });

  it("default ordering is updatedAt desc (API-30, FR-23)", async () => {
    const res = await queryStaff(staff.agent, "?pageSize=50");
    expect(res.status).toBe(200);
    const times = res.body.data.map((t: { updatedAt: string }) => t.updatedAt);
    // Non-increasing (ties allowed): seed rows can share identical updatedAt,
    // so a strict comparator would flake. Comparing strings is safe because
    // the server emits zero-padded UTC ISO timestamps.
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1] >= times[i]).toBe(true);
    }
  });

  it("sortBy=itPriority is honored (API-31, ui-spec 5.4)", async () => {
    const res = await queryStaff(staff.agent, "?sortBy=itPriority&sortOrder=asc&pageSize=50");
    expect(res.status).toBe(200);
    const rank = (p: string | null) =>
      p === null ? Infinity : PRIORITIES.indexOf(p as (typeof PRIORITIES)[number]);
    const itP = res.body.data.map((t: { itPriority: string }) => t.itPriority);
    for (let i = 1; i < itP.length; i++) {
      expect(rank(itP[i - 1])).toBeLessThanOrEqual(rank(itP[i]));
    }

    const desc = await queryStaff(staff.agent, "?sortBy=itPriority&sortOrder=desc&pageSize=20");
    expect(desc.status).toBe(200);
  });

  it("invalid params produce 400 VALIDATION_ERROR (API-32, FR-24)", async () => {
    const bad = await queryStaff(staff.agent, "?sortBy=summary");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
    expect(bad.body.error.fields.sortBy).toMatch(/sortBy must be one of/);

    // `sortBy=requestedPriority` is NOT in the api-spec 5.1 whitelist — must 400.
    const badSortBy = await queryStaff(staff.agent, "?sortBy=requestedPriority");
    expect(badSortBy.status).toBe(400);
    expect(badSortBy.body.error.code).toBe("VALIDATION_ERROR");
    expect(badSortBy.body.error.fields.sortBy).toMatch(
      new RegExp(`must be one of: ${STAFF_SORT_WHITELIST.join(", ")}`)
    );

    const badStatus = await queryStaff(staff.agent, "?currentStatus=NOT_A_STATUS");
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error.fields.currentStatus).toMatch(/must be one of/);

    const badPage = await queryStaff(staff.agent, "?page=abc");
    expect(badPage.status).toBe(400);
    expect(badPage.body.error.fields.page).toMatch(/integer >= 1/);

    const badPageSize = await queryStaff(staff.agent, "?pageSize=999");
    expect(badPageSize.status).toBe(400);
    expect(badPageSize.body.error.fields.pageSize).toMatch(/between 1 and 50/);
  });

  it("filters matching nothing return empty data with total=0 (API-33, AC-08)", async () => {
    // Sentinel search: a ticket-number-shaped string no seeded ticket can
    // contain. Not a seed value — it asserts emptiness regardless of the DB.
    const res = await queryStaff(staff.agent, "?search=TKT-9999-999999&pageSize=50");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const byOwner = await queryStaff(staff.agent, "?ownerId=99999999");
    expect(byOwner.status).toBe(200);
    expect(byOwner.body.data).toEqual([]);
  });
});

// AGENTS.md Test-writing rule 8: every suite that opens the DB must tear it down.
afterAll(async () => {
  await db.$disconnect();
});
