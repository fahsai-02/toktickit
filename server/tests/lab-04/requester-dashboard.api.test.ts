import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { authedAgent, seedUserFor, loginAs } from "../helpers/auth.js";
import { ownershipWhereFor } from "../../src/lib/requestHelpers.js";
import { BCRYPT_ROUNDS } from "../../src/lib/seedCredentials.js";

describe("Lab 4 — Requester Dashboard (specification.md section 4 FR-13, AC-10; api-spec section 3.1)", () => {
  let requesterAgent: ReturnType<typeof request.agent>;
  let requesterUser: { id: number; email: string; name: string };
  let zeroTicketAgent: ReturnType<typeof request.agent>;
  let zeroTicketUserId: number;

  const TEMP_ZERO_EMAIL = `temp-zero-req-${process.pid}-${Date.now()}@toktickit.dev`;
  const TEMP_PASS = "ZeroTicketsPass123!";

  beforeAll(async () => {
    const seed = seedUserFor("REQUESTER", 0);
    const userRow = await db.user.findFirstOrThrow({
      where: { email: seed.email },
      select: { id: true, email: true, name: true },
    });
    requesterUser = userRow;
    requesterAgent = await authedAgent("REQUESTER", 0);

    // Q7 Option A (recommended): create a temporary requester with 0 tickets for API-37
    const hash = await bcrypt.hash(TEMP_PASS, BCRYPT_ROUNDS);
    const zeroUser = await db.user.create({
      data: {
        email: TEMP_ZERO_EMAIL,
        name: "Zero Ticket Tester",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });
    zeroTicketUserId = zeroUser.id;
    zeroTicketAgent = await loginAs(TEMP_ZERO_EMAIL, TEMP_PASS);
  }, 25000);

  afterAll(async () => {
    if (zeroTicketUserId) {
      await db.user.deleteMany({ where: { id: zeroTicketUserId } });
    }
    await db.$disconnect();
  });

  it("API-36: returns authoritative counts matching DB aggregation for the session requester only", async () => {
    const res = await requesterAgent.get("/api/dashboards/requester");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    const { counts, recentTickets, recentlyResolved } = res.body.data;

    // Authoritative calculation from DB for this user
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

    expect(counts.open).toBe(cNew + cOpen + cInProgress + cWaiting + cReopened);
    expect(counts.inProgress).toBe(cInProgress);
    expect(counts.waitingForRequester).toBe(cWaiting);
    expect(counts.resolved).toBe(cResolved);
    expect(counts.closed).toBe(cClosed);
    expect(counts.attentionRequired).toBe(cWaiting + cReopened);

    expect(Array.isArray(recentTickets)).toBe(true);
    expect(recentTickets.length).toBeLessThanOrEqual(5);

    expect(Array.isArray(recentlyResolved)).toBe(true);
    expect(recentlyResolved.length).toBeLessThanOrEqual(5);
    for (const r of recentlyResolved) {
      expect(r.currentStatus).toBe("RESOLVED");
    }
  });

  it("API-37: returns 0 for all counts and empty lists for a user with no tickets (BR-20, AC-10)", async () => {
    const res = await zeroTicketAgent.get("/api/dashboards/requester");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      counts: {
        open: 0,
        inProgress: 0,
        waitingForRequester: 0,
        resolved: 0,
        closed: 0,
        attentionRequired: 0,
      },
      recentTickets: [],
      recentlyResolved: [],
    });
  });

  it("API-38: ensures every count field is of type number (never null or undefined)", async () => {
    const res = await requesterAgent.get("/api/dashboards/requester");
    expect(res.status).toBe(200);
    const { counts } = res.body.data;

    const expectedKeys = [
      "open",
      "inProgress",
      "waitingForRequester",
      "resolved",
      "closed",
      "attentionRequired",
    ] as const;

    for (const key of expectedKeys) {
      expect(typeof counts[key]).toBe("number");
      expect(Number.isFinite(counts[key])).toBe(true);
      expect(counts[key]).toBeGreaterThanOrEqual(0);
    }
  });
});

