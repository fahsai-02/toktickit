import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedUserFor, authedAgent, loginAs } from "../helpers/auth.js";
import {
  SEED_CATEGORIES,
  SEED_RELATED_SYSTEMS,
} from "../../src/lib/seedData.js";
import {
  BCRYPT_ROUNDS,
  REQUESTER_PASSWORD,
} from "../../src/lib/seedCredentials.js";

// Requester ownership + session-identity contract (docs/lab-03/api-spec.md
// section 4; specification FR-12/13/14/15, BR-03). API-14/15/16/20 rows in
// docs/lab-03/tests.md.
//
// Identity comes from src/lib/seedData.ts (single source of truth). Tickets
// created here are cleaned up so seeded row counts never drift for MIG-01.

const createdTicketIds: number[] = [];

async function cleanup(): Promise<void> {
  await db.publicComment.deleteMany({
    where: { ticketId: { in: createdTicketIds } },
  });
  await db.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
  await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  createdTicketIds.length = 0;
}

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;
let agentAUser: { id: number; name: string; email: string };
let agentBUser: { id: number; name: string; email: string };
let categoryId: number;
let relatedSystemId: number;
let legacyRequesterBId: number;

const VALID_SUMMARY = "Requester authorization test ticket";
const VALID_DESCRIPTION = "Ownership and identity are derived from the session.";

beforeAll(async () => {
  agentA = await authedAgent("REQUESTER", 0);
  agentB = await authedAgent("REQUESTER", 1);

  const acctA = seedUserFor("REQUESTER", 0)!;
  const acctB = seedUserFor("REQUESTER", 1)!;
  agentAUser = (await db.user.findUnique({
    where: { email: acctA.email },
    select: { id: true, name: true, email: true },
  }))!;
  agentBUser = (await db.user.findUnique({
    where: { email: acctB.email },
    select: { id: true, name: true, email: true },
  }))!;

  const requesterB = await db.requester.findUnique({
    where: { email: acctB.email },
    select: { id: true },
  });
  legacyRequesterBId = requesterB!.id;

  categoryId = (await db.category.findUnique({
    where: { name: SEED_CATEGORIES[0].name },
    select: { id: true },
  }))!.id;
  relatedSystemId = (await db.relatedSystem.findUnique({
    where: { name: SEED_RELATED_SYSTEMS[0].name },
    select: { id: true },
  }))!.id;
}, 30000);

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

async function createTicketAs(
  agent: ReturnType<typeof request.agent>,
  overrides: Record<string, unknown> = {}
): Promise<{ id: number; ticketNumber: string }> {
  const res = await agent.post("/api/tickets").send({
    categoryId,
    relatedSystemId,
    requestedPriority: "MEDIUM",
    summary: VALID_SUMMARY,
    description: VALID_DESCRIPTION,
    ...overrides,
  });
  expect(res.status).toBe(201);
  createdTicketIds.push(res.body.data.id);
  return res.body.data;
}

describe("Unauthenticated requests (401 UNAUTHORIZED)", () => {
  it("requireAuth guards every requester endpoint", async () => {
    const cases: Array<[string, string]> = [
      ["get", "/api/tickets"],
      ["post", "/api/tickets"],
      ["get", "/api/tickets/1"],
      ["get", "/api/tickets/1/comments"],
      ["post", "/api/tickets/1/comments"],
      ["put", "/api/tickets/1/indicate-resolved"],
      ["put", "/api/tickets/1/resolution-summary"],
      ["get", "/api/attachments/1/download"],
      ["delete", "/api/attachments/1"],
    ];
    for (const [method, url] of cases) {
      const res = await (request(app) as unknown as Record<string, unknown>)[method](
        url
      );
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("the temporary dev requester list is gone (404)", async () => {
    const res = await request(app).get("/api/dev/requesters");
    expect(res.status).toBe(404);
  });
});

describe("API-14 — create ignores client-supplied requesterId (AC-03, FR-13)", () => {
  it("owns the ticket by session identity even when a foreign requesterId is sent", async () => {
    const res = await agentA.post("/api/tickets").send({
      categoryId,
      relatedSystemId,
      requestedPriority: "URGENT",
      summary: "Ignored requesterId test",
      description: "The requesterId sent by the browser must be ignored.",
      requesterId: legacyRequesterBId,
    });
    expect(res.status).toBe(201);
    createdTicketIds.push(res.body.data.id);

    expect(res.body.data.requesterUserId).toBe(agentAUser.id);
    expect(res.body.data.requesterId).not.toBe(legacyRequesterBId);
    expect(res.body.data.requester.id).toBe(agentAUser.id);
    expect(res.body.data.requester.name).toBe(agentAUser.name);
  });

  it("auto-creates a legacy Requester row for a user without one", async () => {
    // A throwaway user with no mapped Requester row proves the fallback path
    // through the real API (login -> create ticket -> legacy row materialized).
    const ghostEmail = `authz.ghost.${Date.now()}@toktickit.dev`;
    const ghostHash = bcrypt.hashSync(REQUESTER_PASSWORD, BCRYPT_ROUNDS);
    const ghost = await db.user.create({
      data: {
        name: "Ghost Requester",
        email: ghostEmail,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
        passwordHash: ghostHash,
      },
      select: { id: true },
    });

    try {
      const ghostAgent = await loginAs(ghostEmail, REQUESTER_PASSWORD);
      const res = await ghostAgent.post("/api/tickets").send({
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        summary: "Auto-created legacy requester test",
        description: VALID_DESCRIPTION,
      });
      expect(res.status).toBe(201);
      createdTicketIds.push(res.body.data.id);

      expect(res.body.data.requesterUserId).toBe(ghost.id);
      const legacy = await db.requester.findUnique({
        where: { email: ghostEmail },
        select: { id: true, name: true },
      });
      expect(legacy).toMatchObject({ name: "Ghost Requester" });
      expect(res.body.data.requesterId).toBe(legacy!.id);
    } finally {
      // The ghost ticket still references the auto-created Requester row, so
      // drop it (and any of its children) before deleting the legacy row.
      await db.publicComment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await db.attachment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
      createdTicketIds.length = 0;
      await db.user.delete({ where: { id: ghost.id } });
      await db.requester.deleteMany({ where: { email: ghostEmail } });
    }
  });
});

describe("API-20 — ticket creation initializes itPriority (FR-14)", () => {
  it("sets itPriority equal to requestedPriority on create", async () => {
    const ticket = await createTicketAs(agentA, {
      requestedPriority: "HIGH",
    });
    const row = await db.ticket.findUnique({
      where: { id: ticket.id },
      select: { itPriority: true, requestedPriority: true },
    });
    expect(row).toMatchObject({ itPriority: "HIGH", requestedPriority: "HIGH" });
  });
});

describe("API-15 — requester ownership on list (AC-03, FR-15)", () => {
  it("returns only the session user's tickets", async () => {
    const ticketA = await createTicketAs(agentA, { summary: "A owns list ticket" });
    const ticketB = await createTicketAs(agentB, { summary: "B owns list ticket" });

    const res = await agentA.get("/api/tickets");
    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: { id: number }) => t.id);
    expect(ids).toContain(ticketA.id);
    expect(ids).not.toContain(ticketB.id);
  });

  it("does not leak another user's tickets via search", async () => {
    const ticketA = await createTicketAs(agentA, {
      summary: "UniqueSecretSearchTermXYZ",
    });
    const res = await agentB.get(
      "/api/tickets?search=UniqueSecretSearchTermXYZ"
    );
    expect(res.status).toBe(200);
    const ids = res.body.data.map((t: { id: number }) => t.id);
    expect(ids).not.toContain(ticketA.id);
  });

  it("expands the status filter to all 8 Lab 3 statuses", async () => {
    for (const status of [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ]) {
      const res = await agentA.get(`/api/tickets?currentStatus=${status}`);
      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.currentStatus).toBe(status);
      }
    }
  });
});

describe("API-16 — requester ownership on detail (AC-03, FR-15)", () => {
  it("returns 403 for another user's ticket", async () => {
    const ticketB = await createTicketAs(agentB, {
      summary: "B detail ownership ticket",
    });
    const res = await agentA.get(`/api/tickets/${ticketB.id}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns own ticket with full detail and counts", async () => {
    const ticketA = await createTicketAs(agentA, {
      summary: "A detail ownership ticket",
    });
    const res = await agentA.get(`/api/tickets/${ticketA.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: ticketA.id,
      summary: "A detail ownership ticket",
      itPriority: "MEDIUM",
    });
expect(res.body.data._count).toMatchObject({
      attachments: 0,
      comments: 0,
      notes: 0,
    });
    expect(res.body.data.resolutionSummary).toBeNull();
    expect(res.body.data.requesterIndicatedResolved).toBe(false);
    expect(res.body.data.owner).toBeNull();
  });
});

// API-18 — docs/lab-03/tests.md row "API-18 | API | AC-13, FR-47 | Non-admin
// forbidden from admin endpoints | Requester calls GET /api/admin/users → 403".
// The admin endpoints themselves are implemented in the Issue 21 suite
// (`users-admin.api.test.ts`); here we only prove the route is locked down so
// the 403 is enforced by the backend, never by a hidden UI control.
describe("API-18 — non-admin forbidden from admin endpoints (AC-13, FR-47)", () => {
  it("rejects unauthenticated calls with 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a Requester with 403 FORBIDDEN", async () => {
    const res = await agentA.get("/api/admin/users");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toContain("permission");
  });

  it("rejects an IT Staff member with 403 FORBIDDEN", async () => {
    const staffAgent = await authedAgent("IT_STAFF", 0);
    const res = await staffAgent.get("/api/admin/users");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});