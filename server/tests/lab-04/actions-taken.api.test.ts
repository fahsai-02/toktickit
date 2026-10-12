import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Agent } from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import {
  SEED_ACTIONS_TAKEN,
  SEED_TICKETS,
} from "../../src/lib/seedData.js";
import { authedAgent, seedUserFor } from "../helpers/auth.js";

// Lab 4 — Actions Taken API (docs/lab-04/api-spec.md sections 2.1–2.4;
// docs/lab-04/tests.md rows API-01..API-18, API-03/04/05).
//
// Setup creates two throw-away Tickets so the suite never mutates the seeded
// Lab 4 block that migration-regression.api.test.ts (MIG-02/03/05) asserts
// over: `ownTicket` is requester-owned, `staffOwnedTicket` is also Staff-owned.
// Everything the suite creates is deleted in afterAll.

const FRESH_TICKET_PREFIX = `TKT-L4-AT-${process.pid}-${Date.now()}`;

describe("Lab 4: Actions Taken API (api-spec section 2)", () => {
  let staffAgent: Agent;
  let adminAgent: Agent;
  let requesterAgent: Agent;
  let requesterAccount: { email: string; name: string };
  let staffAccount: { email: string; name: string };
  let ownTicket: { id: number };
  let staffOwnedTicket: { id: number };
  let emptyTicket: { id: number };

  beforeAll(async () => {
    requesterAccount = seedUserFor("REQUESTER", 0);
    staffAccount = seedUserFor("IT_STAFF", 0);

    const requesterRow = await db.requester.findFirstOrThrow({
      where: { email: requesterAccount.email },
    });
    const requesterUser = await db.user.findFirstOrThrow({
      where: { email: requesterAccount.email },
    });
    const staffUser = await db.user.findFirstOrThrow({
      where: { email: staffAccount.email },
    });
    const category = await db.category.findFirstOrThrow();
    const system = await db.relatedSystem.findFirstOrThrow();

    const base = {
      summary: "Lab 4 actions-taken suite fixture",
      description: "Throw-away ticket created by the Lab 4 actions test.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM",
      currentStatus: "NEW" as const,
      ticketDate: new Date(),
      requesterId: requesterRow.id,
      requesterUserId: requesterUser.id,
      categoryId: category.id,
      relatedSystemId: system.id,
    };

    ownTicket = await db.ticket.create({
      data: { ...base, ticketNumber: `${FRESH_TICKET_PREFIX}-OWN` },
      select: { id: true },
    });
    staffOwnedTicket = await db.ticket.create({
      data: {
        ...base,
        ticketNumber: `${FRESH_TICKET_PREFIX}-STAFF`,
        ownerId: staffUser.id,
      },
      select: { id: true },
    });
    // Never touched by creation tests, so the "empty history" case stays true.
    emptyTicket = await db.ticket.create({
      data: { ...base, ticketNumber: `${FRESH_TICKET_PREFIX}-EMPTY` },
      select: { id: true },
    });

    staffAgent = await authedAgent("IT_STAFF");
    adminAgent = await authedAgent("ADMINISTRATOR");
    requesterAgent = await authedAgent("REQUESTER");
  });

  const postAction = (
    agent: Agent,
    ticketId: number,
    body: Record<string, unknown>,
  ) => agent.post(`/api/tickets/${ticketId}/actions`).send(body);

  describe("API-01/02 creation (FR-01, FR-02, AC-01)", () => {
    it("API-01: IT Staff creates an Action Taken — 201, linked, version 1", async () => {
      const sentActionDate = new Date(Date.now() + 60_000).toISOString();
      const res = await postAction(staffAgent, ownTicket.id, {
        actionDate: sentActionDate,
        description: "Diagnosed an intermittent power fault.",
        result: "Replaced the power adapter and re-verified.",
        followUpRequired: true,
        followUpNote: "Order a spare adapter for the front desk.",
        attachmentNotes: "See adapter-after.png in the attachments.",
      });
      expect(res.status).toBe(201);
      const a = res.body.data;
      expect(a.id).toEqual(expect.any(Number));
      expect(a.ticketId).toBe(ownTicket.id);
      expect(a.version).toBe(1);
      expect(new Date(a.actionDate).toISOString()).toBe(sentActionDate);
      expect(a.description).toBe("Diagnosed an intermittent power fault.");
      expect(a.result).toBe("Replaced the power adapter and re-verified.");
      expect(a.followUpRequired).toBe(true);
      expect(a.followUpNote).toBe("Order a spare adapter for the front desk.");
      expect(a.attachmentNotes).toBe("See adapter-after.png in the attachments.");
      expect(a.createdAt).toBeDefined();
      expect(a.updatedAt).toBeDefined();

      const row = await db.actionTaken.findUnique({
        where: { id: a.id },
        include: { performedBy: { select: { email: true } } },
      });
      expect(row).toBeTruthy();
      expect(row!.ticketId).toBe(ownTicket.id);
      expect(row!.performedBy.email).toBe(staffAccount.email);
    });

    it("API-02: body-sent performedById is ignored (FR-02, AC-01)", async () => {
      const res = await postAction(staffAgent, ownTicket.id, {
        description: "Verify the identity source of truth.",
        result: "performedById always comes from the session.",
        performedById: 999_999,
      });
      expect(res.status).toBe(201);
      const a = res.body.data;
      const row = await db.actionTaken.findUnique({
        where: { id: a.id },
        include: { performedBy: { select: { email: true } } },
      });
      expect(row!.performedById).not.toBe(999_999);
      expect(row!.performedBy.email).toBe(staffAccount.email);
    });

    it("API-01: Administrator may also create (AC-01)", async () => {
      const res = await postAction(adminAgent, ownTicket.id, {
        description: "Admin records an action.",
        result: "Allowed for administrators.",
      });
      expect(res.status).toBe(201);
    });
  });

  describe("API-03/04/05 authorization (BR-08, BR-09, AC-05)", () => {
    it("API-03: Requester cannot create — 403 (BR-08, AC-05)", async () => {
      const res = await postAction(requesterAgent, ownTicket.id, {
        description: "Requester write attempt.",
        result: "Must be forbidden.",
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("API-04: Requester cannot update — 403, record unchanged (BR-08, AC-05)", async () => {
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
      });
      const res = await requesterAgent.put(`/api/actions/${target.id}`).send({
        version: target.version,
        description: "User tries to rewrite the history.",
        result: "Must be ignored.",
      });
      expect(res.status).toBe(403);
      const after = await db.actionTaken.findUnique({
        where: { id: target.id },
      });
      expect(after!.description).toBe(target.description);
      expect(after!.version).toBe(target.version);
    });

    it("API-05: staff may act on any Ticket in the queue — ownership not required (BR-09)", async () => {
      const owned = await postAction(staffAgent, staffOwnedTicket.id, {
        description: "Record on a ticket this staff member owns.",
        result: "Allowed.",
      });
      const unowned = await postAction(staffAgent, ownTicket.id, {
        description: "Record on a ticket this staff member does NOT own.",
        result: "Also allowed — BR-09.",
      });
      expect(owned.status).toBe(201);
      expect(unowned.status).toBe(201);
    });
  });

  describe("API-06/07 read path (FR-03, BR-06, AC-03, AC-05)", () => {
    it("API-06: list ordering — actionDate asc, createdAt tie-break (BR-06, AC-03)", async () => {
      // Two actions SHARE one actionDate but were inserted seconds apart, so
      // createdAt breaks the tie deterministically in insertion order.
      const sharedDate = "2026-09-28T09:30:00.000Z";
      const [first, second] = await Promise.all([
        db.actionTaken.create({
          data: {
            ticketId: ownTicket.id,
            performedById: (await db.user.findFirstOrThrow({
              where: { email: staffAccount.email },
            })).id,
            actionDate: new Date(sharedDate),
            description: "Tie-break row A (earlier createdAt).",
            result: "Inserted first.",
            createdAt: new Date("2026-09-28T09:30:00.100Z"),
          },
        }),
        db.actionTaken.create({
          data: {
            ticketId: ownTicket.id,
            performedById: (await db.user.findFirstOrThrow({
              where: { email: staffAccount.email },
            })).id,
            actionDate: new Date(sharedDate),
            description: "Tie-break row B (later createdAt).",
            result: "Inserted second.",
            createdAt: new Date("2026-09-28T09:30:01.100Z"),
          },
        }),
      ]);

      const res = await staffAgent.get(`/api/tickets/${ownTicket.id}/actions`);
      expect(res.status).toBe(200);
      const dates = res.body.data.map((a: { actionDate: string }) => a.actionDate);
      const sorted = [...dates].sort();
      expect(dates).toEqual(sorted);

      const tieA = res.body.data.find((a: { description: string }) => a.description === "Tie-break row A (earlier createdAt).");
      const tieB = res.body.data.find((a: { description: string }) => a.description === "Tie-break row B (later createdAt).");
      expect(res.body.data.indexOf(tieA)).toBeLessThan(res.body.data.indexOf(tieB));
    });

    it("API-07: Requester reads own Ticket read-only with the documented fields (AC-05)", async () => {
      const res = await requesterAgent.get(`/api/tickets/${ownTicket.id}/actions`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBe(res.body.data.length);
      // Guard against a vacuous pass: the loop below only means something if the
      // list is non-empty (earlier tests created actions on this Ticket).
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const a of res.body.data) {
        expect(a).toMatchObject({
          id: expect.any(Number),
          ticketId: ownTicket.id,
          actionDate: expect.any(String),
          description: expect.any(String),
          result: expect.any(String),
          performedById: expect.any(Number),
          performedBy: expect.objectContaining({ id: expect.any(Number) }),
          followUpRequired: expect.any(Boolean),
          version: expect.any(Number),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
        expect(a).not.toHaveProperty("canEdit");
        expect(a).not.toHaveProperty("canDelete");
      }
    });

    it("API-07: Requester reading a FOREIGN Ticket is 403 (AC-05)", async () => {
      const foreignSeed = SEED_TICKETS.find(
        (t) => t.requester !== requesterAccount.email,
      );
      expect(foreignSeed).toBeTruthy();
      const foreign = await db.ticket.findFirstOrThrow({
        where: { ticketNumber: foreignSeed!.ticketNumber },
        select: { id: true },
      });
      const res = await requesterAgent.get(`/api/tickets/${foreign.id}/actions`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("API-06: empty history returns 200 with empty array and meta.total 0", async () => {
      const res = await staffAgent.get(`/api/tickets/${emptyTicket.id}/actions`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe("API-09..API-12 validation (FR-05, FR-01, AC-02, AC-04)", () => {
    it("API-09: followUpRequired=true with blank note → 400, no record (AC-02)", async () => {
      const before = await db.actionTaken.count({
        where: { ticketId: ownTicket.id },
      });
      const res = await postAction(staffAgent, ownTicket.id, {
        description: "Needs a follow-up note.",
        result: "Must fail without it.",
        followUpRequired: true,
        followUpNote: "   ",
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.followUpNote).toBeDefined();
      const after = await db.actionTaken.count({
        where: { ticketId: ownTicket.id },
      });
      expect(after).toBe(before);
    });

    // api-spec section 2.1 types `followUpRequired` as a boolean: a non-boolean
    // value must not be coerced into `false`, which on PUT would silently lift
    // the FR-05/BR-04 note gate.
    it("API-09: non-boolean followUpRequired → 400 fields.followUpRequired, nothing written", async () => {
      const before = await db.actionTaken.count({
        where: { ticketId: ownTicket.id },
      });
      const create = await postAction(staffAgent, ownTicket.id, {
        description: "Type-checked field.",
        result: "Must not be coerced to false.",
        followUpRequired: "true",
        followUpNote: "A note the client meant to require.",
      });
      expect(create.status).toBe(400);
      expect(create.body.error.code).toBe("VALIDATION_ERROR");
      expect(create.body.error.fields.followUpRequired).toBeDefined();
      const after = await db.actionTaken.count({
        where: { ticketId: ownTicket.id },
      });
      expect(after).toBe(before);

      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
        orderBy: { id: "asc" },
      });
      const update = await staffAgent.put(`/api/actions/${target.id}`).send({
        version: target.version,
        description: target.description,
        result: target.result,
        followUpRequired: 1,
        followUpNote: target.followUpNote,
      });
      expect(update.status).toBe(400);
      expect(update.body.error.code).toBe("VALIDATION_ERROR");
      expect(update.body.error.fields.followUpRequired).toBeDefined();
      const row = await db.actionTaken.findUnique({ where: { id: target.id } });
      expect(row!.version).toBe(target.version);
      expect(row!.followUpRequired).toBe(target.followUpRequired);
    });

    it("API-10: followUpRequired=false stores the note as submitted (FR-05)", async () => {
      const create = await postAction(staffAgent, ownTicket.id, {
        description: "Plain entry.",
        result: "Plain result.",
        followUpRequired: false,
        followUpNote: "  Note stored verbatim (FR-05)  ",
      });
      expect(create.status).toBe(201);
      expect(create.body.data.followUpNote).toBe("  Note stored verbatim (FR-05)  ");

      const update = await staffAgent
        .put(`/api/actions/${create.body.data.id}`)
        .send({
          version: create.body.data.version,
          description: "Plain entry updated.",
          result: "Plain result updated.",
          followUpRequired: false,
          followUpNote: "  Updated note also verbatim  ",
        });
      expect(update.status).toBe(200);
      expect(update.body.data.followUpNote).toBe("  Updated note also verbatim  ");
    });

    it("API-11: blank or >2000-char description/result → 400 naming the field (FR-01)", async () => {
      const before = await db.actionTaken.count({
        where: { ticketId: ownTicket.id },
      });
      const blankDesc = await postAction(staffAgent, ownTicket.id, {
        description: "   ",
        result: "ok",
      });
      expect(blankDesc.status).toBe(400);
      expect(blankDesc.body.error.fields.description).toBeDefined();

      const blankResult = await postAction(staffAgent, ownTicket.id, {
        description: "ok",
        result: "",
      });
      expect(blankResult.status).toBe(400);
      expect(blankResult.body.error.fields.result).toBeDefined();

      const longDesc = await postAction(staffAgent, ownTicket.id, {
        description: "x".repeat(2001),
        result: "ok",
      });
      expect(longDesc.status).toBe(400);
      expect(longDesc.body.error.fields.description).toBeDefined();

      const longResult = await postAction(staffAgent, ownTicket.id, {
        description: "ok",
        result: "y".repeat(2001),
      });
      expect(longResult.status).toBe(400);
      expect(longResult.body.error.fields.result).toBeDefined();

      const after = await db.actionTaken.count({
        where: { ticketId: ownTicket.id },
      });
      expect(after).toBe(before);
    });

    it("API-12: actionDate >5 min ahead → 400; within allowance → 201 (AC-04)", async () => {
      const tooFar = new Date(Date.now() + 6 * 60_000).toISOString();
      const reject = await postAction(staffAgent, ownTicket.id, {
        actionDate: tooFar,
        description: "Future-dated.",
        result: "Must be rejected.",
      });
      expect(reject.status).toBe(400);
      expect(reject.body.error.code).toBe("VALIDATION_ERROR");
      expect(reject.body.error.fields.actionDate).toContain("5 minutes");

      const ok = new Date(Date.now() + 2 * 60_000).toISOString();
      const accept = await postAction(staffAgent, ownTicket.id, {
        actionDate: ok,
        description: "Within the future allowance.",
        result: "Accepted.",
      });
      expect(accept.status).toBe(201);
    });
  });

  describe("API-13..API-15 append-only & ignored keys (FR-07, FR-24, FR-25, AC-13, AC-14)", () => {
    it("API-13: DELETE /api/actions/:id → 405; record still present (FR-07, AC-14)", async () => {
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
      });
      const res = await staffAgent.delete(`/api/actions/${target.id}`);
      expect(res.status).toBe(405);
      expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");
      const still = await db.actionTaken.findUnique({ where: { id: target.id } });
      expect(still).toBeTruthy();
    });

    it("Append-only matrix: every disallowed method is 405 — guards registered without requireAuth (api-spec 2.4)", async () => {
      const anon = request(app);
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
      });
      const cases = [
        anon.patch(`/api/actions/${target.id}`).send({}),
        anon.delete(`/api/actions/${target.id}`),
        anon.patch(`/api/tickets/${ownTicket.id}/actions`).send({}),
        anon.delete(`/api/tickets/${ownTicket.id}/actions`),
        anon.post(`/api/actions/${target.id}`).send({}),
      ];
      for (const c of cases) {
        const res = await c;
        expect(res.status).toBe(405);
        expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");
      }
      // AUTH-06: the anonymous guards read nothing, so the record is untouched.
      const untouched = await db.actionTaken.findUnique({ where: { id: target.id } });
      expect(untouched).toBeTruthy();
    });

    it("API-14: body-sent assigneeId is ignored (FR-24, BR-22, AC-13)", async () => {
      const res = await postAction(staffAgent, ownTicket.id, {
        description: "Ignored-keys probe.",
        result: "No assignee concept exists.",
        assigneeId: 123,
      });
      expect(res.status).toBe(201);
      const a = res.body.data;
      expect(a).not.toHaveProperty("assigneeId");
      expect(a).not.toHaveProperty("assignee");
      const row = await db.actionTaken.findUnique({ where: { id: a.id } });
      expect(row).not.toHaveProperty("assigneeId");
    });

    it("API-15: body-sent status is ignored; Ticket.currentStatus unchanged (FR-25, BR-23, AC-14)", async () => {
      const before = await db.ticket.findUnique({ where: { id: ownTicket.id } });
      const res = await postAction(staffAgent, ownTicket.id, {
        description: "Status probe.",
        result: "Actions never move status.",
        status: "RESOLVED",
      });
      expect(res.status).toBe(201);
      const a = res.body.data;
      expect(a).not.toHaveProperty("status");
      const after = await db.ticket.findUnique({ where: { id: ownTicket.id } });
      expect(after!.currentStatus).toBe(before!.currentStatus);
    });
  });

  describe("AUTH-05: new endpoints refuse an unauthenticated caller (FR-23, AC-17)", () => {
    it("401 on GET/POST /api/tickets/:id/actions and PUT /api/actions/:id without a session", async () => {
      const anon = request(app);
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
      });
      const cases = [
        anon.get(`/api/tickets/${ownTicket.id}/actions`),
        anon
          .post(`/api/tickets/${ownTicket.id}/actions`)
          .send({ description: "anon", result: "anon" }),
        anon
          .put(`/api/actions/${target.id}`)
          .send({ version: target.version, description: "anon", result: "anon" }),
      ];
      for (const c of cases) {
        const res = await c;
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("API-08, API-16..API-18 versioned update (FR-04, FR-12, BR-15, AC-06)", () => {
    it("API-08 / API-16: correct version → 200, version +1, editable fields update (FR-04, FR-12)", async () => {
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
        orderBy: { id: "asc" },
      });
      const res = await staffAgent.put(`/api/actions/${target.id}`).send({
        version: target.version,
        actionDate: new Date(Date.now()).toISOString(),
        description: "Corrected wording.",
        result: "Corrected result.",
        followUpRequired: true,
        followUpNote: "Recheck in 24 hours.",
        attachmentNotes: "after-update.png",
      });
      expect(res.status).toBe(200);
      const a = res.body.data;
      expect(a.version).toBe(target.version + 1);
      expect(a.description).toBe("Corrected wording.");
      expect(a.result).toBe("Corrected result.");
      expect(a.followUpNote).toBe("Recheck in 24 hours.");
      expect(a.attachmentNotes).toBe("after-update.png");

      const row = await db.actionTaken.findUnique({
        where: { id: target.id },
      });
      expect(row!.ticketId).toBe(target.ticketId);
      expect(row!.performedById).toBe(target.performedById);
    });

    it("API-08: ticketId/performedById cannot be changed by the endpoint (FR-04)", async () => {
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
        orderBy: { id: "asc" },
      });
      const res = await staffAgent.put(`/api/actions/${target.id}`).send({
        version: target.version,
        description: "Attempting to move the record.",
        result: "ticketId and performedById stay pinned.",
        ticketId: staffOwnedTicket.id,
        performedById: (await db.user.findFirstOrThrow({
          where: { email: requesterAccount.email },
        })).id,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.ticketId).toBe(target.ticketId);
      expect(res.body.data.performedById).toBe(target.performedById);
    });

    it("API-17: stale version → 409 with the latest copy; DB unchanged (AC-06)", async () => {
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
        orderBy: { id: "asc" },
      });
      const res = await staffAgent.put(`/api/actions/${target.id}`).send({
        version: target.version + 99,
        description: "Stale writer.",
        result: "Must be rejected.",
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
      expect(res.body.data.id).toBe(target.id);
      expect(res.body.data.version).toBe(target.version);
      const row = await db.actionTaken.findUnique({ where: { id: target.id } });
      expect(row!.description).toBe(target.description);
      expect(row!.version).toBe(target.version);
    });

    it("API-18: missing version → 400 (BR-15, AC-06)", async () => {
      const target = await db.actionTaken.findFirstOrThrow({
        where: { ticketId: ownTicket.id },
        orderBy: { id: "asc" },
      });
      const res = await staffAgent.put(`/api/actions/${target.id}`).send({
        description: "No version.",
        result: "Must be 400.",
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.version).toBeDefined();
    });
  });

  describe("not-found and malformed id (api-spec 2.1–2.4)", () => {
    it("POST/GET to a nonexistent Ticket → 404", async () => {
      const missing = 2_147_483_647;
      const post = await postAction(staffAgent, missing, {
        description: "Ghost",
        result: "Ghost",
      });
      expect(post.status).toBe(404);
      const get = await staffAgent.get(`/api/tickets/${missing}/actions`);
      expect(get.status).toBe(404);
    });

    it("PUT to a nonexistent Action Taken → 404", async () => {
      const res = await staffAgent
        .put("/api/actions/2147483647")
        .send({ version: 1, description: "x", result: "y" });
      expect(res.status).toBe(404);
    });

    it("malformed :id → 400 for the id field", async () => {
      const post = await postAction(staffAgent, "abc", {
        description: "x",
        result: "y",
      });
      expect(post.status).toBe(400);
      expect(post.body.error.fields.id).toBeDefined();
    });
  });

  describe("seed sanity: seeded actions remain readable and well-formed", () => {
    it("a seeded multi-action ticket lists its records with meta.total (api-spec 2.2)", async () => {
      const seedAction = SEED_ACTIONS_TAKEN.find(
        (a) =>
          SEED_ACTIONS_TAKEN.filter((x) => x.ticketNumber === a.ticketNumber)
            .length >= 2,
      );
      expect(seedAction).toBeTruthy();
      const row = await db.ticket.findFirstOrThrow({
        where: { ticketNumber: seedAction!.ticketNumber },
      });
      const res = await staffAgent.get(`/api/tickets/${row.id}/actions`);
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0].performedBy).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        role: expect.any(String),
      });
    });
  });

  afterAll(async () => {
    for (const t of [emptyTicket, ownTicket, staffOwnedTicket]) {
      if (!t) continue;
      await db.actionTaken.deleteMany({ where: { ticketId: t.id } });
      await db.ticket.delete({ where: { id: t.id } });
    }
    await db.$disconnect();
  });
});