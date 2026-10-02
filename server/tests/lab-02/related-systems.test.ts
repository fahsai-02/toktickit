import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /api/related-systems", () => {
  it("returns 200 with active related systems wrapped in { data }", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns each system with id, name, and categoryId", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    for (const system of res.body.data) {
      expect(Object.keys(system).sort()).toEqual([
        "categoryId",
        "id",
        "name",
      ]);
    }
  });

  it("returns at least 6 related systems from seed", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
  });

  it("filters by categoryId — returns matching + general (null) systems", async () => {
    const catsRes = await request(app).get("/api/categories");
    expect(catsRes.status).toBe(200);
    const categories = catsRes.body.data as Array<{ id: number }>;
    expect(categories.length).toBeGreaterThan(0);

    const allRes = await request(app).get("/api/related-systems");
    expect(allRes.status).toBe(200);
    const allSystems = allRes.body.data as Array<{ categoryId: number | null }>;

    // Verify the filter against every category that actually has systems, so the
    // test cannot silently pass when no systems exist (the seed guarantees some).
    let verified = 0;
    for (const cat of categories) {
      const matching = allSystems.filter((s) => s.categoryId === cat.id).length;
      if (matching === 0) continue;

      const filteredRes = await request(app).get(
        `/api/related-systems?categoryId=${cat.id}`
      );

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.data.length).toBeGreaterThanOrEqual(matching);
      for (const system of filteredRes.body.data) {
        expect(
          system.categoryId === cat.id || system.categoryId === null
        ).toBe(true);
      }
      verified++;
    }

    expect(verified).toBeGreaterThan(0);
  });

  it("returns 400 for non-numeric categoryId", async () => {
    const res = await request(app).get(
      "/api/related-systems?categoryId=abc"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for zero or negative categoryId", async () => {
    const res0 = await request(app).get("/api/related-systems?categoryId=0");
    const resNeg = await request(app).get(
      "/api/related-systems?categoryId=-1"
    );

    expect(res0.status).toBe(400);
    expect(resNeg.status).toBe(400);
  });
});
