import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /api/dev/requesters", () => {
  it("returns 200 with active requesters wrapped in { data }", async () => {
    const res = await request(app).get("/api/dev/requesters");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns each requester with id, name, email, and department", async () => {
    const res = await request(app).get("/api/dev/requesters");

    expect(res.status).toBe(200);
    for (const requester of res.body.data) {
      expect(Object.keys(requester).sort()).toEqual([
        "department",
        "email",
        "id",
        "name",
      ]);
      expect(typeof requester.id).toBe("number");
      expect(typeof requester.name).toBe("string");
      expect(typeof requester.email).toBe("string");
    }
  });

  it("does not return inactive requesters (Robert Brown)", async () => {
    const res = await request(app).get("/api/dev/requesters");

    expect(res.status).toBe(200);
    const names = res.body.data.map((r: { name: string }) => r.name);
    expect(names).not.toContain("Robert Brown");
  });

  it("returns at least 4 active requesters from seed", async () => {
    const res = await request(app).get("/api/dev/requesters");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });
});
