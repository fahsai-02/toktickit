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
    const allRes = await request(app).get("/api/related-systems");
    const allSystems = allRes.body.data;

    const categoriesWithSystems = [
      ...new Set(
        allSystems
          .filter((s: { categoryId: number | null }) => s.categoryId !== null)
          .map((s: { categoryId: number }) => s.categoryId)
      ),
    ];

    if (categoriesWithSystems.length === 0) return;

    const catId = categoriesWithSystems[0]!;
    const filteredRes = await request(app).get(
      `/api/related-systems?categoryId=${catId}`
    );

    expect(filteredRes.status).toBe(200);
    for (const system of filteredRes.body.data) {
      expect(
        system.categoryId === catId || system.categoryId === null
      ).toBe(true);
    }
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
