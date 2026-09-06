import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";

let ticketId: number;
let ticketId2: number;

const validBody = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: "MEDIUM",
  summary: "Detail test ticket",
  description: "Full description for detail test.",
};

const validBody2 = {
  requesterId: 2,
  categoryId: 3,
  relatedSystemId: 4,
  requestedPriority: "HIGH",
  summary: "Detail test ticket for requester 2",
  description: "Another description for detail test.",
};

beforeAll(async () => {
  const res1 = await request(app).post("/api/tickets").send(validBody);
  ticketId = res1.body.data.id;

  const res2 = await request(app).post("/api/tickets").send(validBody2);
  ticketId2 = res2.body.data.id;
});

afterAll(async () => {
  await db.attachment.deleteMany({ where: { ticketId: { in: [ticketId, ticketId2] } } });
  await db.ticket.deleteMany({ where: { id: { in: [ticketId, ticketId2] } } });
});

describe("GET /api/tickets/:id", () => {
  it("API-11: returns 200 with full ticket data for the owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}?requesterId=1`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: ticketId,
      ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
      summary: "Detail test ticket",
      description: "Full description for detail test.",
      requestedPriority: "MEDIUM",
      itPriority: null,
      currentStatus: "NEW",
      requester: { id: 1, name: "Jennifer Anderson" },
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 7, name: "Corporate Laptop" },
    });
    expect(res.body.data.ticketDate).toBeTruthy();
    expect(res.body.data.createdAt).toBeTruthy();
    expect(res.body.data.updatedAt).toBeTruthy();
    expect(Array.isArray(res.body.data.attachments)).toBe(true);
    if (res.body.data.attachments.length > 1) {
      const dates = res.body.data.attachments.map((a: { createdAt: string }) => new Date(a.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    }
  });

  it("API-12: returns 403 when requesting another requester's ticket", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}?requesterId=2`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.data).toBeUndefined();
  });

  it("API-13: returns 404 for an unknown ticket id", async () => {
    const res = await request(app)
      .get("/api/tickets/99999?requesterId=1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 when requesterId is missing", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.requesterId).toBeTruthy();
  });

  it("returns 400 for non-numeric ticket id", async () => {
    const res = await request(app)
      .get("/api/tickets/abc?requesterId=1");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for unknown requester", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}?requesterId=99999`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("includes removed attachments in metadata", async () => {
    const createRes = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 7,
      requestedPriority: "LOW",
      summary: "Ticket with removed attachment test",
      description: "Testing removed attachment metadata.",
    });
    const tid = createRes.body.data.id;

    await db.attachment.create({
      data: {
        ticketId: tid,
        originalFileName: "removed-file.pdf",
        storageFileName: "test-removed.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        uploadedByRequesterId: 1,
        isRemoved: true,
        removedAt: new Date(),
        removalReason: "Wrong file",
      },
    });

    const res = await request(app)
      .get(`/api/tickets/${tid}?requesterId=1`);

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
