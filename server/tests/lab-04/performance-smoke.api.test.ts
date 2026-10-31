import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Agent } from "supertest";
import { db } from "../../src/db.js";
import { authedAgent, seedUserFor } from "../helpers/auth.js";

// PERF-01..04 — tests.md section 2 (Performance smoke), Issue 29.
// Smoke checks, not benchmarks: the 300 ms / 200 ms budgets are the project's
// own choice (the handout gives no number). `Date.now()` around one Supertest
// call MEASURES a single request; no assertion depends on which request
// finishes first, so this does not break the no-timing-ordering rule.
// A warm-up call precedes each measurement so connection setup and the first
// query plan are not billed to the endpoint.

async function timed(call: () => Promise<{ status: number }>) {
  const start = Date.now();
  const res = await call();
  return { res, ms: Date.now() - start };
}

describe("Lab 4 — Performance smoke (handout section 10)", () => {
  let requesterAgent: Agent;
  let staffAgent: Agent;
  let staffUserId: number;

  beforeAll(async () => {
    requesterAgent = await authedAgent("REQUESTER", 0);
    staffAgent = await authedAgent("IT_STAFF", 0);
    staffUserId = (
      await db.user.findFirstOrThrow({ where: { email: seedUserFor("IT_STAFF", 0).email } })
    ).id;
  }, 30_000);

  afterAll(async () => {
    await db.$disconnect();
  });

  it("PERF-01: GET /api/dashboards/requester → 200 in under 300 ms (FR-13, FR-17, AC-10)", async () => {
    await requesterAgent.get("/api/dashboards/requester");
    const { res, ms } = await timed(() => requesterAgent.get("/api/dashboards/requester"));
    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(300);
  });

  it("PERF-02: GET /api/dashboards/staff, whole payload in one call → 200 in under 300 ms (FR-14, FR-17, AC-11)", async () => {
    await staffAgent.get("/api/dashboards/staff");
    const { res, ms } = await timed(() => staffAgent.get("/api/dashboards/staff"));
    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(300);
  });

  it("PERF-03: GET /api/tickets/:id/actions on the Ticket with the most actions → 200 in under 200 ms (FR-03, BR-06)", async () => {
    // Found by counting ActionTaken rows per ticketId, never by naming an id.
    const grouped = await db.actionTaken.groupBy({
      by: ["ticketId"],
      _count: { _all: true },
      orderBy: [{ _count: { ticketId: "desc" } }, { ticketId: "asc" }],
      take: 1,
    });
    expect(grouped.length, "seed must contain at least one Action Taken").toBe(1);
    const { ticketId, _count } = grouped[0];

    await staffAgent.get(`/api/tickets/${ticketId}/actions`);
    const { res, ms } = await timed(() => staffAgent.get(`/api/tickets/${ticketId}/actions`));
    expect(res.status).toBe(200);
    expect((res as unknown as { body: { data: unknown[] } }).body.data).toHaveLength(_count._all);
    expect(ms).toBeLessThan(200);
  });

  it("PERF-04: every dashboard drill-down query → 200 in under 300 ms (FR-16, AC-12)", async () => {
    // api-spec section 4.1 plus the existing filters the dashboard cards use:
    // statusGroup, currentStatus, itPriority, requestedPriority, ownerId.
    const queries = [
      "statusGroup=open",
      "statusGroup=attention",
      "statusGroup=closed",
      "currentStatus=NEW",
      "currentStatus=OPEN",
      "currentStatus=IN_PROGRESS",
      "currentStatus=WAITING_FOR_REQUESTER",
      "currentStatus=RESOLVED",
      "currentStatus=CLOSED",
      "currentStatus=REOPENED",
      "itPriority=URGENT",
      "requestedPriority=URGENT",
      "ownerId=unassigned",
      "ownerId=me",
      `ownerId=${staffUserId}`,
    ];
    await staffAgent.get("/api/staff/tickets?statusGroup=open");
    await requesterAgent.get("/api/tickets?statusGroup=open");
    for (const q of queries) {
      const staff = await timed(() => staffAgent.get(`/api/staff/tickets?${q}`));
      expect(staff.res.status, `staff ?${q}`).toBe(200);
      expect(staff.ms, `staff ?${q} took ${staff.ms} ms`).toBeLessThan(300);
    }
    // The requester list takes the same status filters (api-spec section 4.1).
    for (const q of queries.filter((x) => x.startsWith("statusGroup") || x.startsWith("currentStatus"))) {
      const own = await timed(() => requesterAgent.get(`/api/tickets?${q}`));
      expect(own.res.status, `requester ?${q}`).toBe(200);
      expect(own.ms, `requester ?${q} took ${own.ms} ms`).toBeLessThan(300);
    }
  });
});
