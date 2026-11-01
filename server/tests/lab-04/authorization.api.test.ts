import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { authedAgent, seedUserFor } from "../helpers/auth.js";
import { ownershipWhereFor } from "../../src/lib/requestHelpers.js";

describe("Lab 4 — Authorization (dashboard scope & unauthenticated) (BR-19, AC-10)", () => {
  let requesterAgent: ReturnType<typeof request.agent>;
  let requesterUser: { id: number; email: string; name: string };
  let otherRequesterAgent: ReturnType<typeof request.agent>;
  let otherRequesterUser: { id: number; email: string; name: string };

  beforeAll(async () => {
    const seed1 = seedUserFor("REQUESTER", 0);
    requesterUser = await db.user.findFirstOrThrow({
      where: { email: seed1.email },
      select: { id: true, email: true, name: true },
    });
    requesterAgent = await authedAgent("REQUESTER", 0);

    const seed2 = seedUserFor("REQUESTER", 1);
    otherRequesterUser = await db.user.findFirstOrThrow({
      where: { email: seed2.email },
      select: { id: true, email: true, name: true },
    });
    otherRequesterAgent = await authedAgent("REQUESTER", 1);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("AUTH-04: requester dashboard scope cannot be widened by client query params (?userId/ ?requesterId ignored), response deep-equal to unparameterized", async () => {
    const baseRes = await requesterAgent.get("/api/dashboards/requester");
    expect(baseRes.status).toBe(200);

    const withUserId = await requesterAgent.get(
      `/api/dashboards/requester?userId=${otherRequesterUser.id}`
    );
    expect(withUserId.status).toBe(200);
    expect(withUserId.body).toEqual(baseRes.body);

    const withRequesterId = await requesterAgent.get(
      `/api/dashboards/requester?requesterId=${otherRequesterUser.id}`
    );
    expect(withRequesterId.status).toBe(200);
    expect(withRequesterId.body).toEqual(baseRes.body);

    // Also verify counts still only reflect this user
    const scope = ownershipWhereFor(requesterUser);
    const statusRows = await db.ticket.groupBy({
      by: ["currentStatus"],
      where: scope,
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const r of statusRows) {
      map.set(r.currentStatus, r._count._all);
    }
    const cNew = map.get("NEW") ?? 0;
    const cOpen = map.get("OPEN") ?? 0;
    const cInProgress = map.get("IN_PROGRESS") ?? 0;
    const cWaiting = map.get("WAITING_FOR_REQUESTER") ?? 0;
    const cResolved = map.get("RESOLVED") ?? 0;
    const cClosed = map.get("CLOSED") ?? 0;
    const cReopened = map.get("REOPENED") ?? 0;

    const counts = withUserId.body.data.counts;
    expect(counts.open).toBe(cNew + cOpen + cInProgress + cWaiting + cReopened);
    expect(counts.resolved).toBe(cResolved);
  });

  it("API-41: unauthenticated requests to both dashboard endpoints return 401", async () => {
    const resReq = await request(app).get("/api/dashboards/requester");
    expect(resReq.status).toBe(401);

    const resStaff = await request(app).get("/api/dashboards/staff");
    expect(resStaff.status).toBe(401);
  });
});

// AUTH-02 / AUTH-03 — specification.md BR-08, BR-09, AC-05; tests.md section 2
// (Authorization). Issue 29. Fixtures are throw-away Tickets (never a seeded
// Ticket's status/version), and every role is exercised on every endpoint.
describe("Lab 4 — Role matrix on write endpoints (AUTH-02, AUTH-03; BR-08, BR-09, AC-05)", () => {
  type Agent = ReturnType<typeof request.agent>;
  const PREFIX = `TKT-L4-AUTH-${process.pid}-${Date.now()}`;
  const createdTicketIds: number[] = [];
  let counter = 0;
  let requesterAgent: Agent;
  let staffAgent: Agent;
  let adminAgent: Agent;
  let requesterEmail: string;
  let foreignTicketId: number;
  let foreignActionDescription: string;
  let requesterRowId: number;
  let requesterUserId: number;
  let otherRequesterRowId: number;
  let otherRequesterUserId: number;
  let staffUserId: number;
  let categoryId: number;
  let systemId: number;

  async function createTicket(opts: { own: boolean }) {
    counter += 1;
    const t = await db.ticket.create({
      data: {
        ticketNumber: `${PREFIX}-${counter}`,
        summary: "Lab 4 authorization suite fixture",
        description: "Throw-away ticket created by the Lab 4 authorization test.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        ticketDate: new Date(),
        requesterId: opts.own ? requesterRowId : otherRequesterRowId,
        requesterUserId: opts.own ? requesterUserId : otherRequesterUserId,
        categoryId,
        relatedSystemId: systemId,
        ownerId: staffUserId,
      },
      select: { id: true, version: true },
    });
    createdTicketIds.push(t.id);
    return t;
  }

  async function createAction(ticketId: number, description: string) {
    return db.actionTaken.create({
      data: {
        ticketId,
        performedById: staffUserId,
        actionDate: new Date(),
        description,
        result: "Result recorded by the authorization fixture.",
      },
      select: { id: true, version: true },
    });
  }

  beforeAll(async () => {
    requesterEmail = seedUserFor("REQUESTER", 0).email;
    const me = await db.user.findFirstOrThrow({ where: { email: requesterEmail } });
    requesterUserId = me.id;
    requesterRowId = (await db.requester.findFirstOrThrow({ where: { email: requesterEmail } })).id;
    const otherEmail = seedUserFor("REQUESTER", 1).email;
    otherRequesterUserId = (await db.user.findFirstOrThrow({ where: { email: otherEmail } })).id;
    otherRequesterRowId = (await db.requester.findFirstOrThrow({ where: { email: otherEmail } })).id;
    staffUserId = (await db.user.findFirstOrThrow({ where: { email: seedUserFor("IT_STAFF", 0).email } })).id;
    categoryId = (await db.category.findFirstOrThrow()).id;
    systemId = (await db.relatedSystem.findFirstOrThrow()).id;

    requesterAgent = await authedAgent("REQUESTER", 0);
    staffAgent = await authedAgent("IT_STAFF", 0);
    adminAgent = await authedAgent("ADMINISTRATOR", 0);

    const foreign = await createTicket({ own: false });
    foreignTicketId = foreign.id;
    foreignActionDescription = `Foreign-ticket marker ${PREFIX}`;
    await createAction(foreignTicketId, foreignActionDescription);
  }, 30_000);

  afterAll(async () => {
    await db.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
    await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    await db.$disconnect();
  });

  const actionBody = (label: string) => ({
    description: `AUTH-02 ${label} description`,
    result: `AUTH-02 ${label} result`,
  });

  it("AUTH-02: POST /api/tickets/:id/actions — Requester 403 (own Ticket), IT Staff and Administrator 201", async () => {
    const own = await createTicket({ own: true });
    const denied = await requesterAgent.post(`/api/tickets/${own.id}/actions`).send(actionBody("requester"));
    expect(denied.status).toBe(403);
    expect(await db.actionTaken.count({ where: { ticketId: own.id } })).toBe(0);

    const staff = await staffAgent.post(`/api/tickets/${own.id}/actions`).send(actionBody("staff"));
    expect(staff.status).toBe(201);
    const admin = await adminAgent.post(`/api/tickets/${own.id}/actions`).send(actionBody("admin"));
    expect(admin.status).toBe(201);
    expect(await db.actionTaken.count({ where: { ticketId: own.id } })).toBe(2);
  });

  it("AUTH-02: PUT /api/actions/:id — Requester 403 (own Ticket), IT Staff and Administrator 200", async () => {
    const own = await createTicket({ own: true });
    const action = await createAction(own.id, "AUTH-02 original");

    const denied = await requesterAgent
      .put(`/api/actions/${action.id}`)
      .send({ ...actionBody("requester"), version: action.version });
    expect(denied.status).toBe(403);
    const unchanged = await db.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
    expect(unchanged.description).toBe("AUTH-02 original");
    expect(unchanged.version).toBe(action.version);

    const staff = await staffAgent
      .put(`/api/actions/${action.id}`)
      .send({ ...actionBody("staff"), version: action.version });
    expect(staff.status).toBe(200);
    const admin = await adminAgent
      .put(`/api/actions/${action.id}`)
      .send({ ...actionBody("admin"), version: staff.body.data.version });
    expect(admin.status).toBe(200);
  });

  it("AUTH-02: PUT /api/staff/tickets/:id/status — Requester 403 (own Ticket), IT Staff and Administrator 200", async () => {
    const own = await createTicket({ own: true });
    const denied = await requesterAgent
      .put(`/api/staff/tickets/${own.id}/status`)
      .send({ currentStatus: "OPEN" });
    expect(denied.status).toBe(403);
    expect((await db.ticket.findUniqueOrThrow({ where: { id: own.id } })).currentStatus).toBe("NEW");

    // NEW -> OPEN (staff), then OPEN -> IN_PROGRESS (admin): every permitted
    // transition is non-terminal and needs no resolution gate.
    const staff = await staffAgent
      .put(`/api/staff/tickets/${own.id}/status`)
      .send({ currentStatus: "OPEN" });
    expect(staff.status).toBe(200);
    const admin = await adminAgent
      .put(`/api/staff/tickets/${own.id}/status`)
      .send({ currentStatus: "IN_PROGRESS" });
    expect(admin.status).toBe(200);
    expect((await db.ticket.findUniqueOrThrow({ where: { id: own.id } })).currentStatus).toBe("IN_PROGRESS");
  });

  it("AUTH-03: a Requester reading a foreign Ticket's actions gets 403 and no row of that Ticket in the body", async () => {
    const res = await requesterAgent.get(`/api/tickets/${foreignTicketId}/actions`);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain(foreignActionDescription);
    expect(res.body.data).toBeUndefined();

    // Control: staff can read the same Ticket, so the marker really exists.
    const staff = await staffAgent.get(`/api/tickets/${foreignTicketId}/actions`);
    expect(staff.status).toBe(200);
    expect(JSON.stringify(staff.body)).toContain(foreignActionDescription);
  });
});

