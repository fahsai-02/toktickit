import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Agent } from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import type { TicketStatus } from "../../src/generated/prisma/client.js";
import { SEED_BASELINE_COUNTS } from "../../src/lib/seedData.js";
import {
  TICKET_STATUSES,
  canTransition,
  requiresConfirmation,
} from "../../src/lib/statusTransitions.js";
import { authedAgent, seedUserFor } from "../helpers/auth.js";

// Lab 4 — Ticket workflow: version check + resolution gate
// (docs/lab-04/api-spec.md section 5.1; docs/lab-04/tests.md rows UNIT-04 and
// API-19..API-28). Setup creates throw-away Tickets so the seeded Lab 4 block
// that migration-regression.api.test.ts asserts over is never mutated;
// everything created here is deleted in afterAll.

const FRESH_TICKET_PREFIX = `TKT-L4-WF-${process.pid}-${Date.now()}`;

describe("Lab 4: ticket workflow & resolution gate (api-spec 5.1)", () => {
  let staffAgent: Agent;
  let requesterAgent: Agent;
  let requesterAccount: { email: string; name: string };
  let requesterRowId: number;
  let requesterUserId: number;
  let staffUserId: number;
  let categoryId: number;
  let systemId: number;
  const createdIds: number[] = [];
  let counter = 0;

  beforeAll(async () => {
    requesterAccount = seedUserFor("REQUESTER", 0);
    requesterRowId = (
      await db.requester.findFirstOrThrow({
        where: { email: requesterAccount.email },
      })
    ).id;
    requesterUserId = (
      await db.user.findFirstOrThrow({
        where: { email: requesterAccount.email },
      })
    ).id;
    staffUserId = (
      await db.user.findFirstOrThrow({
        where: { email: seedUserFor("IT_STAFF", 0).email },
      })
    ).id;
    categoryId = (await db.category.findFirstOrThrow()).id;
    systemId = (await db.relatedSystem.findFirstOrThrow()).id;

    staffAgent = await authedAgent("IT_STAFF");
    requesterAgent = await authedAgent("REQUESTER");
  });

  /** Create a throw-away Ticket; tracked for afterAll cleanup. */
  async function createTicket(
    opts: {
      status?: TicketStatus;
      summary?: string | null;
      withAction?: boolean;
    } = {}
  ): Promise<{ id: number; version: number; currentStatus: TicketStatus }> {
    counter += 1;
    const ticket = await db.ticket.create({
      data: {
        ticketNumber: `${FRESH_TICKET_PREFIX}-${counter}`,
        summary: "Lab 4 workflow suite fixture",
        description: "Throw-away ticket created by the Lab 4 workflow test.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: opts.status ?? "NEW",
        ticketDate: new Date(),
        requesterId: requesterRowId,
        requesterUserId,
        categoryId,
        relatedSystemId: systemId,
        ownerId: staffUserId,
        resolutionSummary: opts.summary ?? null,
      },
      select: { id: true, version: true, currentStatus: true },
    });
    createdIds.push(ticket.id);
    if (opts.withAction) {
      await db.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUserId,
          actionDate: new Date(),
          description: "Diagnosed the fault.",
          result: "Replaced the part and re-verified.",
        },
      });
    }
    return ticket;
  }

  const putStatus = (agent: Agent, id: number, body: Record<string, unknown>) =>
    agent.put(`/api/staff/tickets/${id}/status`).send(body);

  const statusOf = (id: number) =>
    db.ticket.findFirstOrThrow({
      where: { id },
      select: { currentStatus: true, version: true, resolutionSummary: true },
    });

  describe("UNIT-04 — Lab 3 transition matrix unchanged (BR-12, AC-08)", () => {
    // The Lab 3 BR-12 matrix (docs/lab-03/specification.md lines 140-151).
    // Duplicated here on purpose: Lab 4 must not have altered it.
    const PERMITTED: Record<TicketStatus, readonly TicketStatus[]> = {
      NEW: ["OPEN"],
      OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED"],
      WAITING_FOR_REQUESTER: ["IN_PROGRESS", "REOPENED"],
      RESOLVED: ["CLOSED", "REOPENED"],
      CLOSED: ["REOPENED"],
      REOPENED: ["IN_PROGRESS"],
      CANCELLED: [],
    };

    it("permits exactly the Lab 3 rows and denies every other pair", () => {
      for (const from of TICKET_STATUSES) {
        for (const to of TICKET_STATUSES) {
          expect(canTransition(from, to)).toBe(PERMITTED[from].includes(to));
        }
      }
    });

    it("flags confirmation only for OPEN→CANCELLED and IN_PROGRESS→RESOLVED", () => {
      const confirmed = new Set(["OPEN→CANCELLED", "IN_PROGRESS→RESOLVED"]);
      for (const from of TICKET_STATUSES) {
        for (const to of TICKET_STATUSES) {
          expect(requiresConfirmation(from, to)).toBe(
            confirmed.has(`${from}→${to}`)
          );
        }
      }
    });
  });

  describe("Gate rejects (BR-11, AC-07)", () => {
    it("API-19: IN_PROGRESS → RESOLVED with no summary and no action → 400, status unchanged", async () => {
      const t = await createTicket({ status: "IN_PROGRESS" });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "RESOLVED",
        version: t.version,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
      // Names BOTH unmet conditions.
      expect(res.body.error.message).toContain("resolution summary");
      expect(res.body.error.message).toContain("Action Taken");

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("IN_PROGRESS");
      expect(after.version).toBe(t.version);
    });

    it("API-20: summary but no action → 400 naming the action condition only", async () => {
      const t = await createTicket({
        status: "IN_PROGRESS",
        summary: "Replaced the battery.",
      });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "RESOLVED",
        version: t.version,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
      expect(res.body.error.message).toContain("Action Taken");
      expect(res.body.error.message).not.toContain("resolution summary");

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("IN_PROGRESS");
    });

    it("API-21: action but no summary → 400 naming the summary condition only", async () => {
      const t = await createTicket({ status: "IN_PROGRESS", withAction: true });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "RESOLVED",
        version: t.version,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
      expect(res.body.error.message).toContain("resolution summary");
      expect(res.body.error.message).not.toContain("Action Taken");

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("IN_PROGRESS");
    });

    it("API-26: the gate also guards → CLOSED (BR-11)", async () => {
      // RESOLVED is reached here directly through the fixture, so the CLOSED
      // attempt has no summary and no action.
      const t = await createTicket({ status: "RESOLVED" });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "CLOSED",
        version: t.version,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("RESOLVED");
    });
  });

  describe("Gate allows and stays scoped (BR-11, AC-07)", () => {
    it("API-22: gate met (summary + action) → 200 RESOLVED, version incremented", async () => {
      const t = await createTicket({
        status: "IN_PROGRESS",
        summary: "Replaced the battery.",
        withAction: true,
      });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "RESOLVED",
        version: t.version,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("RESOLVED");
      expect(res.body.data.version).toBe(t.version + 1);

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("RESOLVED");
    });

    it("API-27: the gate does NOT apply to CANCELLED or REOPENED", async () => {
      const cancelT = await createTicket({ status: "OPEN" });
      const cancelRes = await putStatus(staffAgent, cancelT.id, {
        currentStatus: "CANCELLED",
        version: cancelT.version,
      });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.currentStatus).toBe("CANCELLED");

      const reopenT = await createTicket({ status: "CLOSED" });
      const reopenRes = await putStatus(staffAgent, reopenT.id, {
        currentStatus: "REOPENED",
        version: reopenT.version,
      });
      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.data.currentStatus).toBe("REOPENED");
    });
  });

  describe("Matrix still enforced (BR-12, AC-08)", () => {
    it("API-23: a transition outside the matrix → 400, status unchanged", async () => {
      const t = await createTicket({ status: "NEW" });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "RESOLVED",
        version: t.version,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
      expect(res.body.error.message).toContain("Cannot transition from NEW to RESOLVED");

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("NEW");
      expect(after.version).toBe(t.version);
    });
  });

  describe("Order of checks (api-spec 5.1)", () => {
    // api-spec 5.1 step 4 (Ticket exists) precedes step 5 (valid enum), so an
    // unknown Ticket is 404 even when the body also carries an invalid status.
    // Guards against the validate-before-exists reversal the local review found.
    it("a nonexistent Ticket with an invalid enum is 404, not 400", async () => {
      const res = await putStatus(staffAgent, 999999, {
        currentStatus: "BOGUS",
        version: 1,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Optimistic concurrency (FR-12, AC-06)", () => {
    it("API-24: a stale version → 409 carrying the Ticket's latest copy", async () => {
      const t = await createTicket({ status: "NEW" });
      const ok = await putStatus(staffAgent, t.id, {
        currentStatus: "OPEN",
        version: t.version,
      });
      expect(ok.status).toBe(200);
      expect(ok.body.data.version).toBe(t.version + 1);

      // Replay the same (now stale) version for a second transition.
      const stale = await putStatus(staffAgent, t.id, {
        currentStatus: "IN_PROGRESS",
        version: t.version,
      });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe("CONFLICT");
      expect(stale.body.data).toMatchObject({
        id: t.id,
        currentStatus: "OPEN",
        version: t.version + 1,
      });

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("OPEN");
      expect(after.version).toBe(t.version + 1);
    });

    it("API-25: no version → 200 last-write-wins (documented escape hatch)", async () => {
      const t = await createTicket({ status: "NEW" });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "OPEN",
      });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe("OPEN");
      expect(res.body.data.version).toBe(t.version + 1);
    });

    it("a non-integer version → 400 VALIDATION_ERROR naming the version field", async () => {
      const t = await createTicket({ status: "NEW" });
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "OPEN",
        version: "1",
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.version).toBeDefined();

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("NEW");
    });
  });

  describe("Requester indication stays advisory (FR-11, BR-13, AC-09)", () => {
    it("API-28: indicate-resolved sets flag + timestamp, keeps status, and does not satisfy the gate", async () => {
      const t = await createTicket({ status: "IN_PROGRESS" });
      const indicate = await requesterAgent
        .put(`/api/tickets/${t.id}/indicate-resolved`)
        .send({});
      expect(indicate.status).toBe(200);
      expect(indicate.body.data.requesterIndicatedResolved).toBe(true);
      expect(indicate.body.data.indicatedResolvedAt).toEqual(expect.any(String));

      // currentStatus is untouched by the indication.
      const afterIndicate = await statusOf(t.id);
      expect(afterIndicate.currentStatus).toBe("IN_PROGRESS");

      // The flag cannot satisfy the gate: still 400.
      const res = await putStatus(staffAgent, t.id, {
        currentStatus: "RESOLVED",
        version: t.version,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");

      const after = await statusOf(t.id);
      expect(after.currentStatus).toBe("IN_PROGRESS");
    });
  });

  describe("Ticket rows survive the version column (FR-12)", () => {
    it("the Ticket table still meets the seed floor and no version is below 1", async () => {
      const count = await db.ticket.count();
      expect(count).toBeGreaterThanOrEqual(SEED_BASELINE_COUNTS.ticket);
      const belowOne = await db.ticket.count({ where: { version: { lt: 1 } } });
      expect(belowOne).toBe(0);
    });
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await db.actionTaken.deleteMany({ where: { ticketId: id } });
      await db.ticket.delete({ where: { id } });
    }
    await db.$disconnect();
  });
});
