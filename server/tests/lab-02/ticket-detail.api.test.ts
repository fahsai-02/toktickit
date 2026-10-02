import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedUserFor, authedAgent } from "../helpers/auth.js";
import { SEED_CATEGORIES, SEED_RELATED_SYSTEMS } from "../../src/lib/seedData.js";

// Lab 2 detail behavior migrated to the authenticated contract (Issue 18):
// ownership is session-derived, `itPriority` starts equal to `requestedPriority`
// (FR-14), and the payload is enriched (resolutionSummary, indicate-resolved
// flag, `_count`, owner).

let agent: ReturnType<typeof request.agent>;
let otherAgent: ReturnType<typeof request.agent>;
let legacyRequesterId: number;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;
let ticketId2: number;

beforeAll(async () => {
  agent = await authedAgent("REQUESTER", 0);
  otherAgent = await authedAgent("REQUESTER", 1);
  const acctA = seedUserFor("REQUESTER", 0)!;
  legacyRequesterId = (await db.requester.findUnique({
    where: { email: acctA.email },
    select: { id: true },
  }))!.id;

  categoryId = (await db.category.findUnique({
    where: { name: SEED_CATEGORIES[0].name },
    select: { id: true },
  }))!.id;
  relatedSystemId = (await db.relatedSystem.findUnique({
    where: { name: SEED_RELATED_SYSTEMS[0].name },
    select: { id: true },
  }))!.id;

  const validBody = {
    categoryId,
    relatedSystemId,
    requestedPriority: "MEDIUM",
    summary: "Detail test ticket",
    description: "Full description for detail test.",
  };

  const res1 = await agent.post("/api/tickets").send(validBody);
  ticketId = res1.body.data.id;

  const res2 = await agent
    .post("/api/tickets")
    .send({ ...validBody, summary: "Detail test ticket 2" });
  ticketId2 = res2.body.data.id;
}, 30000);

afterAll(async () => {
  await db.attachment.deleteMany({
    where: { ticketId: { in: [ticketId, ticketId2] } },
  });
  await db.publicComment.deleteMany({
    where: { ticketId: { in: [ticketId, ticketId2] } },
  });
  await db.ticket.deleteMany({ where: { id: { in: [ticketId, ticketId2] } } });
  await db.$disconnect();
});

describe("GET /api/tickets/:id", () => {
  it("API-11: returns 200 with full ticket data for the owner", async () => {
    const res = await agent.get(`/api/tickets/${ticketId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: ticketId,
      ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
      summary: "Detail test ticket",
      description: "Full description for detail test.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      requesterIndicatedResolved: false,
      resolutionSummary: null,
      owner: null,
      // Echoed relations: assert the resolved id (session-derived) and that names
      // exist as strings, without binding the test to specific seed values.
      requester: { id: legacyRequesterId },
      category: { id: categoryId },
      relatedSystem: { id: relatedSystemId },
    });
    expect(res.body.data._count).toMatchObject({
      attachments: 0,
      comments: 0,
      notes: 0,
    });
    expect(typeof res.body.data.requester.name).toBe("string");
    expect(typeof res.body.data.category.name).toBe("string");
    expect(typeof res.body.data.relatedSystem.name).toBe("string");
    expect(res.body.data.ticketDate).toBeTruthy();
    expect(res.body.data.createdAt).toBeTruthy();
    expect(res.body.data.updatedAt).toBeTruthy();
    expect(res.body.data.requesterId).toBeUndefined();
    expect(res.body.data.requesterUserId).toBeUndefined();
    expect(Array.isArray(res.body.data.attachments)).toBe(true);
    if (res.body.data.attachments.length > 1) {
      const dates = res.body.data.attachments.map(
        (a: { createdAt: string }) => new Date(a.createdAt).getTime()
      );
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    }
  });

  it("API-12: returns 403 when requesting another requester's ticket", async () => {
    const res = await otherAgent.get(`/api/tickets/${ticketId}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.data).toBeUndefined();
  });

  it("API-13: returns 404 for an unknown ticket id", async () => {
    const res = await agent.get("/api/tickets/99999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for non-numeric ticket id", async () => {
    const res = await agent.get("/api/tickets/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("includes removed attachments in metadata", async () => {
    const createRes = await agent.post("/api/tickets").send({
      categoryId,
      relatedSystemId,
      requestedPriority: "LOW",
      summary: "Ticket with removed attachment test",
      description: "Testing removed attachment metadata.",
    });
    const tid = createRes.body.data.id;

    await db.attachment.create({
      data: {
        ticketId: tid,
        originalFileName: "removed-file.pdf",
        storageFileName: `test-removed-${Date.now()}.pdf`,
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedByRequesterId: legacyRequesterId,
        isRemoved: true,
        removedAt: new Date(),
        removalReason: "Wrong file",
      },
    });

    const res = await agent.get(`/api/tickets/${tid}`);

    expect(res.status).toBe(200);
    expect(res.body.data.attachments.length).toBe(1);
    expect(res.body.data.attachments[0]).toMatchObject({
      originalFileName: "removed-file.pdf",
      isRemoved: true,
      removalReason: "Wrong file",
    });

    await db.attachment.deleteMany({ where: { ticketId: tid } });
    await db.ticket.delete({ where: { id: tid } });
  });
});