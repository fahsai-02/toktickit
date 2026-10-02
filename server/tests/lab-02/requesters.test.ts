import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// The temporary Development Requester selector endpoint is REMOVED in Lab 3
// (specification FR-21; specification section 7). This file regresses that the
// endpoint no longer exists and no client source reaches for it.

describe("GET /api/dev/requesters (removed in Lab 3)", () => {
  it("returns 404 when the endpoint is requested", async () => {
    const res = await request(app).get("/api/dev/requesters");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});