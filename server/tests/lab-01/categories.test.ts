import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /api/categories", () => {
  it("returns 200 with the seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });

  it("returns each category with only id and name", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    for (const category of res.body) {
      expect(Object.keys(category).sort()).toEqual(["id", "name"]);
    }
  });
});
