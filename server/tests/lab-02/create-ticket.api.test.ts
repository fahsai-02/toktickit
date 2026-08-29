import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";

const createdTicketIds: number[] = [];

async function cleanUp(): Promise<void> {
  await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  createdTicketIds.length = 0;
}

afterEach(async () => {
  await cleanUp();
});

const validBody = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: "MEDIUM",
  summary: "Laptop battery drains quickly",
  description: "Battery drops from 100% to 20% within two hours.",
};

describe("POST /api/tickets", () => {
  it("creates a ticket with status NEW and returns the official ticket number (201)", async () => {
    const res = await request(app).post("/api/tickets").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      summary: "Laptop battery drains quickly",
      description: "Battery drops from 100% to 20% within two hours.",
      requestedPriority: "MEDIUM",
      itPriority: null,
      currentStatus: "NEW",
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 7,
    });
    expect(res.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.data.requester).toEqual({
      id: 1,
      name: "Jennifer Anderson",
    });
    expect(res.body.data.category).toEqual({ id: 2, name: "Hardware" });

    createdTicketIds.push(res.body.data.id);
  });

  it("trims incoming string values before persisting", async () => {
    const res = await request(app).post("/api/tickets").send({
      ...validBody,
      summary: "  Laptop battery drains  ",
      description: "  Some description with spaces.  ",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.summary).toBe("Laptop battery drains");
    expect(res.body.data.description).toBe("Some description with spaces.");

    createdTicketIds.push(res.body.data.id);
  });

  it("returns 400 with a field error when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ requesterId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.summary).toBeTruthy();
    expect(res.body.error.fields.categoryId).toBeTruthy();
    expect(res.body.error.fields.relatedSystemId).toBeTruthy();
    expect(res.body.error.fields.requestedPriority).toBeTruthy();
    expect(res.body.error.fields.description).toBeTruthy();
  });

  it("treats whitespace-only summary as missing (no API persistence)", async () => {
    const res = await request(app).post("/api/tickets").send({
      ...validBody,
      summary: "   ",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.summary).toBeTruthy();
  });

  it("rejects summary >120 and description >2000 characters (400)", async () => {
    const longSummary = await request(app)
      .post("/api/tickets")
      .send({ ...validBody, summary: "a".repeat(121) });
    expect(longSummary.status).toBe(400);
    expect(longSummary.body.error.fields.summary).toBeTruthy();

    const longDescription = await request(app)
      .post("/api/tickets")
      .send({ ...validBody, description: "a".repeat(2001) });
    expect(longDescription.status).toBe(400);
    expect(longDescription.body.error.fields.description).toBeTruthy();
  });

  it("accepts values exactly at the length limit", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        ...validBody,
        summary: "a".repeat(120),
        description: "a".repeat(2000),
      });

    expect(res.status).toBe(201);
    createdTicketIds.push(res.body.data.id);
  });

  it("rejects an unknown requester with 404", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validBody, requesterId: 99999 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an unknown category with 404", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validBody, categoryId: 99999 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an unknown related system with 404", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validBody, relatedSystemId: 99999 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an inactive requester with 400 BUSINESS_RULE_VIOLATION", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validBody, requesterId: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it("rejects an invalid requestedPriority with 400", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({ ...validBody, requestedPriority: "BOGUS" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.requestedPriority).toBeTruthy();
  });
});
