import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { db } from "../../src/db.js";

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

  it("never returns inactive requesters", async () => {
    const inactive = await db.requester.findMany({
      where: { isActive: false },
      select: { name: true },
    });
    expect(inactive.length).toBeGreaterThanOrEqual(1);

    const res = await request(app).get("/api/dev/requesters");

    expect(res.status).toBe(200);
    const returned = res.body.data.map((r: { name: string }) => r.name);
    for (const u of inactive) {
      expect(returned).not.toContain(u.name);
    }
  });

  it("returns every active requester (count matches DB)", async () => {
    const activeCount = await db.requester.count({ where: { isActive: true } });

    const res = await request(app).get("/api/dev/requesters");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(activeCount);
  });
});
