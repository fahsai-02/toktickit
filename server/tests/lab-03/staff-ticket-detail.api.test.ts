import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import {
  authedAgent,
  seedUserFor,
  type AuthedAgent,
} from "../helpers/auth.js";
import { SEED_CATEGORIES, SEED_RELATED_SYSTEMS } from "../../src/lib/seedData.js";

// IT Staff Ticket Detail operations (api-spec section 5.2-5.7, 5.12; FR-26..31,
// FR-39; AC-09). API-34..46 + API-73 rows in docs/lab-03/tests.md. Every ticket
// used here is created in this suite and removed in afterAll so the seeded rows
// MIG-01 depends on stay untouched.

const VALID_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

const createdTicketIds: number[] = [];

async function cleanup(): Promise<void> {
  await db.publicComment.deleteMany({
    where: { ticketId: { in: createdTicketIds } },
  });
  await db.internalNote.deleteMany({
    where: { ticketId: { in: createdTicketIds } },
  });
  await db.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
  await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  createdTicketIds.length = 0;
}

let requester: AuthedAgent;
let staff: AuthedAgent;
let admin: AuthedAgent;
let ticketId: number;
let otherTicketIds: number[] = [];

async function createTicketVia(agent: AuthedAgent): Promise<number> {
  const category = (await db.category.findUnique({
    where: { name: SEED_CATEGORIES[0].name },
    select: { id: true },
  }))!;
  const system = (await db.relatedSystem.findUnique({
    where: { name: SEED_RELATED_SYSTEMS[0].name },
    select: { id: true },
  }))!;
  const res = await agent.post("/api/tickets").send({
    categoryId: category.id,
    relatedSystemId: system.id,
    requestedPriority: "MEDIUM",
    summary: "Staff ticket detail test ticket",
    description: "Created by the staff-ticket-detail suite.",
  });
  expect(res.status).toBe(201);
  const id = res.body.data.id as number;
  createdTicketIds.push(id);
  return id;
}

beforeAll(async () => {
  requester = await authedAgent("REQUESTER", 0);
  staff = await authedAgent("IT_STAFF", 0);
  admin = await authedAgent("ADMINISTRATOR", 0);

  ticketId = await createTicketVia(requester);

  // A couple of extra tickets for claim/assign isolation.
  otherTicketIds = [
    await createTicketVia(requester),
    await createTicketVia(requester),
  ];
}, 40000);

afterAll(async () => {
  createdTicketIds.push(...otherTicketIds);
  otherTicketIds = [];
  await cleanup();
  await db.$disconnect();
});

describe("GET /api/staff/tickets/:id — full detail (API-34, FR-26)", () => {
  it("returns the full payload with owner, resolution, resolved-indicator and counts", async () => {
    const res = await staff.get(`/api/staff/tickets/${ticketId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: ticketId,
        ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
        summary: expect.any(String),
        description: expect.any(String),
        requestedPriority: expect.any(String),
        itPriority: expect.any(String),
        currentStatus: expect.any(String),
        requester: expect.objectContaining({ id: expect.any(Number) }),
        category: expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
        relatedSystem: expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
        resolutionSummary: null,
        requesterIndicatedResolved: false,
        owner: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        _count: {
          attachments: expect.any(Number),
          comments: expect.any(Number),
          notes: expect.any(Number),
        },
        attachments: expect.any(Array),
      })
    );
  });

  it("an administrator may read any ticket detail (ADMINISTRATOR role allowed)", async () => {
    const res = await admin.get(`/api/staff/tickets/${ticketId}`);
    expect(res.status).toBe(200);
  });

  it("a requester is forbidden from the staff detail endpoint", async () => {
    const res = await requester.get(`/api/staff/tickets/${ticketId}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("unauthenticated requests are rejected (401)", async () => {
    const res = await request.agent(app).get(`/api/staff/tickets/${ticketId}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown ticket", async () => {
    const res = await staff.get("/api/staff/tickets/999999");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("claim + assign (API-35..38, FR-27/28)", () => {
  it("claims an unassigned ticket (API-35)", async () => {
    const target = otherTicketIds[0];
    const me = (await db.user.findUnique({
      where: { email: seedUserFor("IT_STAFF", 0)!.email },
      select: { id: true },
    }))!;
    const res = await staff.put(`/api/staff/tickets/${target}/claim`);
    expect(res.status).toBe(200);
    expect(res.body.data.owner).toMatchObject({ id: me.id, role: "IT_STAFF" });
    expect(res.body.data.owner.name).toEqual(expect.any(String));
  });

  it("returns 409 when claiming a ticket already owned by the same user (API-36)", async () => {
    const target = otherTicketIds[1];
    await staff.put(`/api/staff/tickets/${target}/claim`);
    const res = await staff.put(`/api/staff/tickets/${target}/claim`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("reassigns a ticket to another active IT Staff user (API-37)", async () => {
    const other = (await db.user.findUnique({
      where: { email: seedUserFor("IT_STAFF", 1)!.email },
      select: { id: true },
    }))!;
    const target = otherTicketIds[0]; // claimed by `staff` above
    const res = await staff.put(`/api/staff/tickets/${target}/assign`).send({
      ownerId: other.id,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.owner).toMatchObject({ id: other.id, role: "IT_STAFF" });
  });

  it("returns 404 when assigning to a non-existent user (API-38)", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/assign`)
      .send({ ownerId: 99999999 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when assigning to an offline requester account", async () => {
    const requesterAcct = (await db.user.findUnique({
      where: { email: seedUserFor("REQUESTER", 0)!.email },
      select: { id: true },
    }))!;
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/assign`)
      .send({ ownerId: requesterAcct.id });
    expect(res.status).toBe(404);
  });

  it("returns 400 when ownerId is missing or not a positive integer", async () => {
    const noId = await staff.put(`/api/staff/tickets/${ticketId}/assign`).send({});
    expect(noId.status).toBe(400);
    expect(noId.body.error.fields.ownerId).toBeTruthy();

    const badId = await staff
      .put(`/api/staff/tickets/${ticketId}/assign`)
      .send({ ownerId: "not-a-number" });
    expect(badId.status).toBe(400);
  });
});

describe("IT priority (API-39/40, FR-29, ui-spec 5.5)", () => {
  it("sets a valid IT priority (API-39)", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/priority`)
      .send({ itPriority: "URGENT" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ itPriority: "URGENT" });
  });

  it("rejects an invalid IT priority (API-40)", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/priority`)
      .send({ itPriority: "CRITICAL" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.itPriority).toMatch(/LOW, MEDIUM, HIGH, or URGENT/);
  });
});

describe("status transitions (API-41..43, API-73, AC-09, FR-30, BR-12)", () => {
  it("moves NEW → OPEN (API-41)", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/status`)
      .send({ currentStatus: "OPEN" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ currentStatus: "OPEN" });
  });

  it("rejects OPEN → RESOLVED with BUSINESS_RULE_VIOLATION (API-42)", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/status`)
      .send({ currentStatus: "RESOLVED" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
    expect(res.body.error.message).toMatch(/Cannot transition from OPEN to RESOLVED/);
    expect(res.body.error.message).toMatch(
      /Permitted transitions: IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED/
    );
  });

  it("rejects NEW → CANCELLED (not permitted from NEW) (API-43)", async () => {
    // A fresh ticket created in this suite; reset ticketId to NEW first via a
    // fresh row so the assertion is independent of prior transitions.
    const fresh = await createTicketVia(requester);
    const res = await staff
      .put(`/api/staff/tickets/${fresh}/status`)
      .send({ currentStatus: "CANCELLED" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it("rejects an unknown status value with VALIDATION_ERROR", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/status`)
      .send({ currentStatus: "DELETED" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.currentStatus).toBe("Invalid status value.");
  });

  it("walks the full chain through to CLOSED → REOPENED (API-73)", async () => {
    const target = await createTicketVia(requester);
    const steps = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED"];
    let previous = "NEW";
    for (const step of steps) {
      expect(previous).not.toBe(step);
      const res = await staff
        .put(`/api/staff/tickets/${target}/status`)
        .send({ currentStatus: step });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe(step);
      previous = step;
    }
  });

  it("permits OPEN → CANCELLED (in the matrix; the client asks for confirmation)", async () => {
    const fresh = await createTicketVia(requester);
    // OPEN → CANCELLED must work (it is in the matrix) but needs confirmation.
    await staff.put(`/api/staff/tickets/${fresh}/status`).send({ currentStatus: "OPEN" });
    const res = await staff
      .put(`/api/staff/tickets/${fresh}/status`)
      .send({ currentStatus: "CANCELLED" });
    expect(res.status).toBe(200);
  });

  it("validates every listed status is reachable input guard (statuses whitelist)", async () => {
    for (const s of VALID_STATUSES) {
      // Only the value validation matters here; a valid status targets any row.
      const res = await staff
        .put(`/api/staff/tickets/${ticketId}/status`)
        .send({ currentStatus: s, _probe: true });
      expect([200, 400]).toContain(res.status);
      // It must never 500 from a malformed-looking but enum-valid value.
      expect(res.status).not.toBe(500);
    }
  });
});

describe("category (Issue 20 decision — editable dropdown, api-spec section 5.14)", () => {
  it("changes the category to another active seeded category", async () => {
    const other = (await db.category.findUnique({
      where: { name: SEED_CATEGORIES[1].name },
      select: { id: true, name: true },
    }))!;
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/category`)
      .send({ categoryId: other.id });
    expect(res.status).toBe(200);
    expect(res.body.data.category).toMatchObject({ id: other.id, name: other.name });
  });

  it("rejects a missing or non-integer categoryId with 400", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/category`)
      .send({ categoryId: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toBeTruthy();
  });

  it("returns 404 for a non-existent category", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/category`)
      .send({ categoryId: 99999999 });
    expect(res.status).toBe(404);
  });

  // api-spec section 5.14: only ACTIVE categories may be referenced. The seed
  // has none inactive, so a throwaway row is created here and removed after.
  it("returns 404 for a deactivated category", async () => {
    const probe = await db.category.create({
      data: { name: "ZZZ Deactivated Category Probe", isActive: false },
    });
    let res;
    try {
      res = await staff
        .put(`/api/staff/tickets/${ticketId}/category`)
        .send({ categoryId: probe.id });
    } finally {
      await db.category.delete({ where: { id: probe.id } }).catch(() => undefined);
    }
    expect(res!.status).toBe(404);
    expect(res!.body.error.code).toBe("NOT_FOUND");

    const stillOwned = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { categoryId: true },
    });
    expect(stillOwned?.categoryId).not.toBe(probe.id);
  });
});

describe("staff attachment uploader identity (Issue 20 decision #1)", () => {
  it("tags a staff upload with the ticket's own requester row, not a fabricated Requester", async () => {
    const requesterAcct = seedUserFor("REQUESTER", 0)!;

    const res = await staff
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 staff upload"), {
        filename: "staff-note.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(201);

    const attachment = await db.attachment.findUnique({
      where: { id: res.body.data.id },
    });
    const ticket = (await db.ticket.findUnique({
      where: { id: ticketId },
      select: { requesterId: true },
    }))!;
    expect(attachment?.uploadedByRequesterId).toBe(ticket.requesterId);

    const ticketRequester = (await db.requester.findUnique({
      where: { id: ticket.requesterId },
      select: { email: true },
    }))!;
    expect(ticketRequester.email).toBe(requesterAcct.email);
  });

  it("keeps a requester's own upload mapped to their session legacy row", async () => {
    const requesterAcct = seedUserFor("REQUESTER", 0)!;
    const legacy = (await db.requester.findUnique({
      where: { email: requesterAcct.email },
      select: { id: true },
    }))!;

    const res = await requester
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 requester upload"), {
        filename: "requester-note.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(201);

    const attachment = await db.attachment.findUnique({
      where: { id: res.body.data.id },
    });
    expect(attachment?.uploadedByRequesterId).toBe(legacy.id);
  });
});

describe("resolution summary (API-44..46, FR-31, BR-19)", () => {
  it("saves a valid resolution summary (API-44)", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/resolution-summary`)
      .send({ resolutionSummary: "Root cause found and patched." });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ resolutionSummary: "Root cause found and patched." });

    const detail = await staff.get(`/api/staff/tickets/${ticketId}`);
    expect(detail.body.data.resolutionSummary).toBe("Root cause found and patched.");
  });

  it("rejects empty or whitespace-only summary (API-45)", async () => {
    for (const value of ["", "   "]) {
      const res = await staff
        .put(`/api/staff/tickets/${ticketId}/resolution-summary`)
        .send({ resolutionSummary: value });
      expect(res.status).toBe(400);
      expect(res.body.error.fields.resolutionSummary).toBeTruthy();
    }
  });

  it("rejects a summary over 2000 characters (API-46)", async () => {
    const res = await staff
      .put(`/api/staff/tickets/${ticketId}/resolution-summary`)
      .send({ resolutionSummary: "x".repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.resolutionSummary).toMatch(/1-2000/);
  });

  it("a requester cannot set the resolution summary (BR-19 regression)", async () => {
    const res = await requester
      .put(`/api/staff/tickets/${ticketId}/resolution-summary`)
      .send({ resolutionSummary: "nope" });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/staff/users (FR-39, api-spec 5.12)", () => {
  it("returns exactly the active IT_STAFF + ADMINISTRATOR users, name-asc", async () => {
    const expected = await db.user.findMany({
      where: { isActive: true, OR: [{ role: "IT_STAFF" }, { role: "ADMINISTRATOR" }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    });

    const res = await staff.get("/api/staff/users");
    expect(res.status).toBe(200);
    const ids = res.body.data.map((u: { id: number }) => u.id);
    expect(ids).toEqual(expected.map((u) => u.id));

    for (const u of res.body.data as Array<{ role: string }>) {
      expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(u.role);
    }
    const names = res.body.data.map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort());
  });

  it("requesters are forbidden", async () => {
    const res = await requester.get("/api/staff/users");
    expect(res.status).toBe(403);
  });
});