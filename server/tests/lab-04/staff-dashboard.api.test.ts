import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { authedAgent } from "../helpers/auth.js";
import { urgentTicketWhere } from "../../src/lib/dashboardQueries.js";
import { BY_IT_PRIORITY_BUCKETS } from "../../src/lib/dashboardQueries.js";

describe("Lab 4 — Staff Dashboard (specification.md section 4 FR-14/FR-15, AC-11; api-spec section 3.2)", () => {
  let staffAgent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;
  let requesterAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    staffAgent = await authedAgent("IT_STAFF", 0);
    adminAgent = await authedAgent("ADMINISTRATOR", 0);
    requesterAgent = await authedAgent("REQUESTER", 0);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("API-29: unassigned counts only owner-less tickets", async () => {
    const res = await staffAgent.get("/api/dashboards/staff");
    expect(res.status).toBe(200);
    const { counts } = res.body.data;

    const dbUnassigned = await db.ticket.count({ where: { ownerId: null } });
    expect(counts.unassigned).toBe(dbUnassigned);
  });

  it("API-30: myAssigned counts the caller's own tickets", async () => {
    const res = await staffAgent.get("/api/dashboards/staff");
    expect(res.status).toBe(200);
    const { counts } = res.body.data;

    // Get current user from session by calling /api/auth/me via the agent
    const me = await staffAgent.get("/api/auth/me");
    expect(me.status).toBe(200);
    const callerId = me.body.data.id;

    const dbMine = await db.ticket.count({ where: { ownerId: callerId } });
    expect(counts.myAssigned).toBe(dbMine);
  });

  it("API-31: byItPriority always has 5 buckets in order and sums to total queue", async () => {
    const res = await staffAgent.get("/api/dashboards/staff");
    expect(res.status).toBe(200);
    const { byItPriority } = res.body.data;

    expect(Array.isArray(byItPriority)).toBe(true);
    expect(byItPriority.length).toBe(5);
    // Check bucket order
    expect(byItPriority.map((b: any) => b.itPriority)).toEqual([
      "URGENT",
      "HIGH",
      "MEDIUM",
      "LOW",
      null,
    ]);

    const sum = byItPriority.reduce((acc: number, b: any) => acc + (b.count || 0), 0);
    const totalTickets = await db.ticket.count();
    expect(sum).toBe(totalTickets);
  });

  it("API-32: userCounts present for Administrator, absent for IT Staff", async () => {
    const staffRes = await staffAgent.get("/api/dashboards/staff");
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.data).not.toHaveProperty("userCounts");

    const adminRes = await adminAgent.get("/api/dashboards/staff");
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data).toHaveProperty("userCounts");
    expect(typeof adminRes.body.data.userCounts.total).toBe("number");
    expect(typeof adminRes.body.data.userCounts.active).toBe("number");
    expect(typeof adminRes.body.data.userCounts.inactive).toBe("number");
    expect(adminRes.body.data.userCounts.inactive).toBe(
      adminRes.body.data.userCounts.total - adminRes.body.data.userCounts.active
    );
  });

  it("API-33: counts.urgentTickets matches BR-25 predicate (includes itPriority URGENT and requestedPriority URGENT when itPriority null; excludes terminal and staff-deescalated)", async () => {
    const res = await staffAgent.get("/api/dashboards/staff");
    expect(res.status).toBe(200);
    const { counts } = res.body.data;

    const urgentCountDb = await db.ticket.count({ where: urgentTicketWhere() });
    expect(counts.urgentTickets).toBe(urgentCountDb);
  });

  it("API-34: counts.urgentTickets equals COUNT(*) matching BR-25 (independent of preview length)", async () => {
    const res = await staffAgent.get("/api/dashboards/staff");
    expect(res.status).toBe(200);
    const { counts, urgentTickets } = res.body.data;

    const urgentCountDb = await db.ticket.count({ where: urgentTicketWhere() });
    expect(counts.urgentTickets).toBe(urgentCountDb);
    // Preview limited to 10 regardless of count
    expect(Array.isArray(urgentTickets)).toBe(true);
    expect(urgentTickets.length).toBeLessThanOrEqual(10);
  });

  it("API-35: drill-downs from dashboard return exactly the counted sets", async () => {
    const me = await staffAgent.get("/api/auth/me");
    expect(me.status).toBe(200);
    const callerId = me.body.data.id;

    // unassigned
    const unassignedRes = await staffAgent.get("/api/staff/tickets?ownerId=unassigned&pageSize=50");
    expect(unassignedRes.status).toBe(200);
    const unassignedList = unassignedRes.body.data;
    expect(Array.isArray(unassignedList)).toBe(true);
    const dbUnassigned = await db.ticket.count({ where: { ownerId: null } });
    expect(unassignedRes.body.meta?.total).toBe(dbUnassigned);

    // myAssigned
    const myRes = await staffAgent.get(`/api/staff/tickets?ownerId=${callerId}&pageSize=50`);
    expect(myRes.status).toBe(200);
    const myList = myRes.body.data;
    expect(Array.isArray(myList)).toBe(true);
    const dbMine = await db.ticket.count({ where: { ownerId: callerId } });
    expect(myRes.body.meta?.total).toBe(dbMine);

    // urgent via priority filters - itPriority URGENT
    const urgentItRes = await staffAgent.get("/api/staff/tickets?itPriority=URGENT&pageSize=50");
    expect(urgentItRes.status).toBe(200);
    const urgentItList = urgentItRes.body.data;
    expect(Array.isArray(urgentItList)).toBe(true);
    const dbUrgentIt = await db.ticket.count({ where: { itPriority: "URGENT" } });
    expect(urgentItRes.body.meta?.total).toBe(dbUrgentIt);

    // requestedPriority URGENT
    const urgentReqRes = await staffAgent.get("/api/staff/tickets?requestedPriority=URGENT&pageSize=50");
    expect(urgentReqRes.status).toBe(200);
    const urgentReqList = urgentReqRes.body.data;
    expect(Array.isArray(urgentReqList)).toBe(true);
    const dbUrgentReq = await db.ticket.count({ where: { requestedPriority: "URGENT" } });
    expect(urgentReqRes.body.meta?.total).toBe(dbUrgentReq);
  });

  it("API-39: Administrator calling staff dashboard returns 200 including userCounts", async () => {
    const res = await adminAgent.get("/api/dashboards/staff");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("userCounts");
  });

  it("API-40: Requester calling staff dashboard returns 403", async () => {
    const res = await requesterAgent.get("/api/dashboards/staff");
    expect(res.status).toBe(403);
  });

  it("API-42: statusGroup filters the staff queue (open/attention/closed)", async () => {
    // open
    const openRes = await staffAgent.get("/api/staff/tickets?statusGroup=open");
    expect(openRes.status).toBe(200);
    const openTickets = openRes.body.data;
    expect(Array.isArray(openTickets)).toBe(true);
    for (const t of openTickets) {
      expect(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]).toContain(
        t.currentStatus
      );
    }

    // attention
    const attRes = await staffAgent.get("/api/staff/tickets?statusGroup=attention");
    expect(attRes.status).toBe(200);
    const attTickets = attRes.body.data;
    expect(Array.isArray(attTickets)).toBe(true);
    for (const t of attTickets) {
      expect(["WAITING_FOR_REQUESTER", "REOPENED"]).toContain(t.currentStatus);
    }

    // closed
    const closedRes = await staffAgent.get("/api/staff/tickets?statusGroup=closed");
    expect(closedRes.status).toBe(200);
    const closedTickets = closedRes.body.data;
    expect(Array.isArray(closedTickets)).toBe(true);
    for (const t of closedTickets) {
      expect(["RESOLVED", "CLOSED"]).toContain(t.currentStatus);
    }
  });
});
