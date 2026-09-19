import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedUserFor, authedAgent } from "../helpers/auth.js";
import { SEED_CATEGORIES, SEED_RELATED_SYSTEMS } from "../../src/lib/seedData.js";

// Requester Public Comments + "Problem Appears Resolved" (docs/lab-03/api-spec.md
// section 4.7-4.11; specification FR-16/17/18/19, BR-05/15/16/20). Tests.md
// API-52/53/56/57/58/59 rows.
//
// The commented ticket is created here (owned by user A) and fully cleaned up in
// afterAll, so the seeded comment rows used by MIG-01 stay untouched.

const createdTicketIds: number[] = [];
let ownedTicketId: number;

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
let userA: { id: number; name: string; email: string };

const VALID_COMMENT = "Thanks for investigating — please keep me updated.";

beforeAll(async () => {
  agentA = await authedAgent("REQUESTER", 0);
  agentB = await authedAgent("REQUESTER", 1);

  const acctA = seedUserFor("REQUESTER", 0)!;
  userA = (await db.user.findUnique({
    where: { email: acctA.email },
    select: { id: true, name: true, email: true },
  }))!;

  const categoryId = (await db.category.findUnique({
    where: { name: SEED_CATEGORIES[0].name },
    select: { id: true },
  }))!.id;
  const relatedSystemId = (await db.relatedSystem.findUnique({
    where: { name: SEED_RELATED_SYSTEMS[0].name },
    select: { id: true },
  }))!.id;

  const ticketRes = await agentA.post("/api/tickets").send({
    categoryId,
    relatedSystemId,
    requestedPriority: "MEDIUM",
    summary: "Public comments test ticket",
    description: "Owned by user A for the requester-comment suite.",
  });
  expect(ticketRes.status).toBe(201);
  ownedTicketId = ticketRes.body.data.id;
  createdTicketIds.push(ownedTicketId);
}, 30000);

afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("API-56/57 — comment validation (FR-16, BR-15)", () => {
  it("rejects empty or whitespace-only content with 400", async () => {
    for (const content of ["", "   "]) {
      const res = await agentA
        .post(`/api/tickets/${ownedTicketId}/comments`)
        .send({ content });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.content).toBeTruthy();
    }
  });

  it("rejects content over 2000 characters with 400", async () => {
    const res = await agentA
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "a".repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.content).toBeTruthy();
  });

  it("accepts content exactly at the 2000-character limit", async () => {
    const res = await agentA
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "a".repeat(2000) });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toHaveLength(2000);
  });
});

describe("Requester Public Comments (FR-16/17, BR-16)", () => {
  it("posts a comment with author + timestamp from the backend", async () => {
    const res = await agentA
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: VALID_COMMENT });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      ticketId: ownedTicketId,
      authorId: userA.id,
      content: VALID_COMMENT,
      author: {
        id: userA.id,
        name: userA.name,
        role: "REQUESTER",
      },
    });
    expect(res.body.data.createdAt).toBeTruthy();
  });

  it("lists comments newest-first for the owner", async () => {
    await agentA
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "Older comment." });
    await agentA
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "Newest comment." });

    const res = await agentA.get(`/api/tickets/${ownedTicketId}/comments`);
    expect(res.status).toBe(200);
    const langs = res.body.data.map((c: { content: string }) => c.content);
    expect(langs).toContain("Newest comment.");
    expect(langs).toContain("Older comment.");
    const dates = res.body.data.map((c: { createdAt: string }) =>
      new Date(c.createdAt).getTime()
    );
    for (let i = 1; i < dates.length; i += 1) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it("returns 403 when another requester lists or posts on the ticket", async () => {
    const list = await agentB.get(`/api/tickets/${ownedTicketId}/comments`);
    expect(list.status).toBe(403);
    expect(list.body.error.code).toBe("FORBIDDEN");

    const post = await agentB
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "intrusion attempt" });
    expect(post.status).toBe(403);
    expect(post.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for an unknown ticket", async () => {
    const res = await agentA.get("/api/tickets/999999/comments");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("API-52/53 — append-only enforcement (FR-18, FR-34)", () => {
  it("returns 405 for PUT on the comments endpoint", async () => {
    const res = await agentA
      .put(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "edited" });
    expect(res.status).toBe(405);
    expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("returns 405 for PUT on a comment item (api-spec 4.11)", async () => {
    const created = await agentA
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "immutable comment" });
    expect(created.status).toBe(201);

    const res = await agentA
      .put(`/api/tickets/${ownedTicketId}/comments/${created.body.data.id}`)
      .send({ content: "edited" });
    expect(res.status).toBe(405);
    expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("returns 405 for DELETE on the comments endpoint without an id", async () => {
    const res = await agentA.delete(`/api/tickets/${ownedTicketId}/comments`);
    expect(res.status).toBe(405);
    expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("returns 405 for DELETE on a comment", async () => {
    const created = await agentA
      .post(`/api/tickets/${ownedTicketId}/comments`)
      .send({ content: "deletable-looking comment" });
    expect(created.status).toBe(201);

    const res = await agentA.delete(
      `/api/tickets/${ownedTicketId}/comments/${created.body.data.id}`
    );
    expect(res.status).toBe(405);
    expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });
});

describe("API-58/59 — Problem Appears Resolved toggle (AC-07, FR-19, BR-05/20)", () => {
  it("sets the flag with a timestamp without changing currentStatus", async () => {
    // Force a deterministic false state (ticket is fresh, but safe on re-runs).
    await db.ticket.update({
      where: { id: ownedTicketId },
      data: { requesterIndicatedResolved: false, indicatedResolvedAt: null },
    });
    const before = await db.ticket.findUnique({
      where: { id: ownedTicketId },
      select: { currentStatus: true, requesterIndicatedResolved: true },
    });
    expect(before!.requesterIndicatedResolved).toBe(false);

    const res = await agentA.put(
      `/api/tickets/${ownedTicketId}/indicate-resolved`
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      requesterIndicatedResolved: true,
    });
    expect(res.body.data.indicatedResolvedAt).toBeTruthy();

    const after = await db.ticket.findUnique({
      where: { id: ownedTicketId },
      select: { currentStatus: true },
    });
    expect(after!.currentStatus).toBe(before!.currentStatus);
  });

  it("clears the flag on a repeated call and never changes currentStatus", async () => {
    // Force a known false state so the toggle sequence is deterministic.
    await db.ticket.update({
      where: { id: ownedTicketId },
      data: { requesterIndicatedResolved: false, indicatedResolvedAt: null },
    });
    const before = await db.ticket.findUnique({
      where: { id: ownedTicketId },
      select: { currentStatus: true },
    });

    await agentA.put(`/api/tickets/${ownedTicketId}/indicate-resolved`);
    const res = await agentA.put(
      `/api/tickets/${ownedTicketId}/indicate-resolved`
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      requesterIndicatedResolved: false,
      indicatedResolvedAt: null,
    });

    const after = await db.ticket.findUnique({
      where: { id: ownedTicketId },
      select: { currentStatus: true },
    });
    expect(after!.currentStatus).toBe(before!.currentStatus);
  });

  it("returns 403 when another requester toggles the flag", async () => {
    const res = await agentB.put(
      `/api/tickets/${ownedTicketId}/indicate-resolved`
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("Requester resolution-summary reservation (api-spec 4.10)", () => {
  it("returns 403 when a requester tries to set the resolution summary", async () => {
    const res = await agentA
      .put(`/api/tickets/${ownedTicketId}/resolution-summary`)
      .send({ resolutionSummary: "Cannot set from requester API." });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});