import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /api/categories (Lab 2 contract)", () => {
  it("returns 200 with categories wrapped in { data }", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns only the 4 active seeded categories (no extras, no inactive)", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    const names = res.body.data.map((c: { name: string }) => c.name);
    expect(names).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });

  it("returns each category with only id and name", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    for (const category of res.body.data) {
      expect(Object.keys(category).sort()).toEqual(["id", "name"]);
    }
  });
});
