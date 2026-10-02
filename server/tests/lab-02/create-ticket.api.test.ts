import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { seedUserFor, authedAgent } from "../helpers/auth.js";
import { SEED_CATEGORIES, SEED_RELATED_SYSTEMS } from "../../src/lib/seedData.js";

// Lab 2 create-ticket behavior, migrated to the authenticated contract
// (Issue 18): `requesterId` is never sent; identity comes from the session
// (specification BR-03; api-spec section 4.1). Same assertions as before plus
// the new `requesterUserId` + `itPriority` initialization (FR-14, API-20).

const createdTicketIds: number[] = [];

async function cleanUp(): Promise<void> {
  await db.publicComment.deleteMany({
    where: { ticketId: { in: createdTicketIds } },
  });
  await db.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
  await db.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  createdTicketIds.length = 0;
}

afterAll(async () => {
  await cleanUp();
  await db.$disconnect();
});

let agent: ReturnType<typeof request.agent>;
let userId: number;
let legacyRequesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  agent = await authedAgent("REQUESTER", 0);
  const acct = seedUserFor("REQUESTER", 0)!;
  const user = await db.user.findUnique({
    where: { email: acct.email },
    select: { id: true, email: true },
  });
  userId = user!.id;
  legacyRequesterId = (await db.requester.findUnique({
    where: { email: acct.email },
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
}, 30000);

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    categoryId,
    relatedSystemId,
    requestedPriority: "MEDIUM",
    summary: "Laptop battery drains quickly",
    description: "Battery drops from 100% to 20% within two hours.",
    ...overrides,
  };
}

describe("POST /api/tickets", () => {
  it("creates a ticket with status NEW and returns the official ticket number (201)", async () => {
    const res = await agent.post("/api/tickets").send(validBody());

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      summary: "Laptop battery drains quickly",
      description: "Battery drops from 100% to 20% within two hours.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      requesterId: legacyRequesterId,
      requesterUserId: userId,
      categoryId,
      relatedSystemId,
    });
    expect(res.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    // The requester echo comes from the session-derived legacy row.
    expect(res.body.data.requester).toMatchObject({ id: legacyRequesterId });
    expect(typeof res.body.data.requester.name).toBe("string");
    expect(res.body.data.category).toMatchObject({ id: categoryId });
    expect(typeof res.body.data.category.name).toBe("string");
    expect(res.body.data.relatedSystem).toMatchObject({
      id: relatedSystemId,
    });
    expect(typeof res.body.data.relatedSystem.name).toBe("string");

    createdTicketIds.push(res.body.data.id);
  });

  it("trims incoming string values before persisting", async () => {
    const res = await agent.post("/api/tickets").send(
      validBody({
        summary: "  Laptop battery drains  ",
        description: "  Some description with spaces.  ",
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.data.summary).toBe("Laptop battery drains");
    expect(res.body.data.description).toBe("Some description with spaces.");

    createdTicketIds.push(res.body.data.id);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).post("/api/tickets").send(validBody());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 with a field error when required fields are missing", async () => {
    const res = await agent.post("/api/tickets").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.summary).toBeTruthy();
    expect(res.body.error.fields.categoryId).toBeTruthy();
    expect(res.body.error.fields.relatedSystemId).toBeTruthy();
    expect(res.body.error.fields.requestedPriority).toBeTruthy();
    expect(res.body.error.fields.description).toBeTruthy();
  });

  it("treats whitespace-only summary as missing (no API persistence)", async () => {
    const res = await agent.post("/api/tickets").send(validBody({ summary: "   " }));

    expect(res.status).toBe(400);
    expect(res.body.error.fields.summary).toBeTruthy();
  });

  it("rejects summary >120 and description >2000 characters (400)", async () => {
    const longSummary = await agent
      .post("/api/tickets")
      .send(validBody({ summary: "a".repeat(121) }));
    expect(longSummary.status).toBe(400);
    expect(longSummary.body.error.fields.summary).toBeTruthy();

    const longDescription = await agent
      .post("/api/tickets")
      .send(validBody({ description: "a".repeat(2001) }));
    expect(longDescription.status).toBe(400);
    expect(longDescription.body.error.fields.description).toBeTruthy();
  });

  it("accepts values exactly at the length limit", async () => {
    const res = await agent.post("/api/tickets").send(
      validBody({
        summary: "a".repeat(120),
        description: "a".repeat(2000),
      })
    );

    expect(res.status).toBe(201);
    createdTicketIds.push(res.body.data.id);
  });

  it("rejects an unknown category with 404", async () => {
    const res = await agent
      .post("/api/tickets")
      .send(validBody({ categoryId: 99999 }));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects an unknown related system with 404", async () => {
    const res = await agent
      .post("/api/tickets")
      .send(validBody({ relatedSystemId: 99999 }));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("allows any active session user (e.g. IT Staff) to create a ticket", async () => {
    const staffAgent = await authedAgent("IT_STAFF", 0);
    const res = await staffAgent.post("/api/tickets").send(validBody());
    expect(res.status).toBe(201);

    const staff = await db.user.findUnique({
      where: { email: seedUserFor("IT_STAFF", 0).email },
      select: { id: true },
    });
    expect(res.body.data.requesterUserId).toBe(staff!.id);
    createdTicketIds.push(res.body.data.id);
  });

  it("rejects an invalid requestedPriority with 400", async () => {
    const res = await agent
      .post("/api/tickets")
      .send(validBody({ requestedPriority: "BOGUS" }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.requestedPriority).toBeTruthy();
  });

  it("trims whitespace around requestedPriority before validating", async () => {
    const res = await agent
      .post("/api/tickets")
      .send(validBody({ requestedPriority: "  MEDIUM  " }));

    expect(res.status).toBe(201);
    expect(res.body.data.requestedPriority).toBe("MEDIUM");
    createdTicketIds.push(res.body.data.id);
  });

  it("rejects malformed numeric ids (1e2, true, 1.5, 0, -1)", async () => {
    for (const field of ["categoryId", "relatedSystemId"] as const) {
      for (const bad of ["1e2", true, 1.5, 0, -1]) {
        const res = await agent
          .post("/api/tickets")
          .send(validBody({ [field]: bad }));
        expect(res.status).toBe(400);
        expect(res.body.error.fields[field]).toBeTruthy();
      }
    }
  });

  it("returns a JSON error envelope for malformed JSON body (no stack trace)", async () => {
    const res = await agent
      .post("/api/tickets")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof res.text).toBe("string");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("creates all tickets uniquely under concurrent submissions", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        agent.post("/api/tickets").send(
          validBody({
            summary: `Concurrent ticket ${i}`,
            description: `Body ${i}`,
          })
        )
      )
    );

    for (const res of results) {
      expect(res.status).toBe(201);
    }
    const numbers = results.map((r) => r.body.data.ticketNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    createdTicketIds.push(...results.map((r) => r.body.data.id));
  });
});