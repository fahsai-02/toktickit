import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("Express app", () => {

  it("mounts an Express application that responds to requests", async () => {
    const res = await request(app).get("/unknown-route");
    expect(res.status).toBe(404);
  });
});
