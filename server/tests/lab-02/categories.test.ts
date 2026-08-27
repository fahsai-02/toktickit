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

  it("returns only active categories", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    const names = res.body.data.map((c: { name: string }) => c.name);
    expect(names).toContain("Account and Access");
    expect(names).toContain("Hardware");
    expect(names).toContain("Software");
    expect(names).toContain("Network");
  });

  it("returns each category with only id and name", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    for (const category of res.body.data) {
      expect(Object.keys(category).sort()).toEqual(["id", "name"]);
    }
  });
});
