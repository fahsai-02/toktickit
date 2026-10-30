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
