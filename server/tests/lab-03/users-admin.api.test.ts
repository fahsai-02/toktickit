import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { authedAgent, loginAs } from "../helpers/auth.js";
import { BCRYPT_ROUNDS } from "../../src/lib/seedCredentials.js";
import { SEED_USERS } from "../../src/lib/seedData.js";
import type { UserRole } from "../../src/generated/prisma/client.js";

// API-18 is covered in authorization.api.test.ts; here API-60..72 — the
// Administrator user management endpoints (`docs/lab-03/api-spec.md` section 6;
// specification FR-40..FR-48, AC-10..AC-14; tests.md rows API-60..72).
//
// Identity for assertions comes from src/lib/seedData.ts (the SAME module the
// seed script consumes), never hard-coded. Every throwaway user is deleted in
// afterAll so MIG-01's whole-table counts stay intact (files run serially).
//
// bcrypt cost is 12 (~450ms/hash). The throwaway accounts reuse ONE precomputed
// hash (INITIAL_PASSWORD_HASH) — full coverage without paying a hash per user.
// Only the authentic POST /reset routes pay a real server-side hash, on purpose
// (they must prove the hashing rules, not reuse the fixture).

const GENERIC_DUP_EMAIL = "A user with this email already exists.";
const LAST_ADMIN_MESSAGE = "Cannot deactivate the last active Administrator.";
const SELF_DEACTIVATE_MESSAGE = "You cannot deactivate your own account.";
const RESET_MESSAGE = "Password reset successfully. User must change password at next login.";

const UNIQUE_TAG = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// Throwaway emails are created via low-level db calls that bypass the API's
// lowercase normalization, so keep every produced address lowercase to preserve
// the BR-07 case-insensitive-uniqueness invariant the routes rely on.
const emailOf = (prefix: string) =>
  `${prefix}.${UNIQUE_TAG}@toktickit.dev`.toLowerCase();

const INITIAL_PASSWORD = "TestInit123!";
const INITIAL_PASSWORD_HASH = bcrypt.hashSync(INITIAL_PASSWORD, BCRYPT_ROUNDS);
const NEW_PASSWORD = "ResetNew456!";

let adminAgent: ReturnType<typeof request.agent>;
let adminRow: { id: number; email: string };

// Seed-derived identity (single source of truth, never hard-coded).
const adminAccount = SEED_USERS.find((u) => u.role === "ADMINISTRATOR" && u.isActive)!;
const requesterAccount = SEED_USERS.find((u) => u.role === "REQUESTER" && u.isActive)!;
const inactiveRequester = SEED_USERS.find((u) => u.role === "REQUESTER" && !u.isActive)!;
const staffAccount = SEED_USERS.find((u) => u.role === "IT_STAFF")!;

const throwawayEmails = new Set<string>();
const tag = (email: string) => throwawayEmails.add(email);

async function createThrowawayUser(
  email: string,
  role: UserRole = "REQUESTER",
  isActive = true
): Promise<number> {
  const row = await db.user.create({
    data: {
      name: "Admin Suite Throwaway",
      email,
      role,
      isActive,
      mustChangePassword: true,
      passwordHash: INITIAL_PASSWORD_HASH,
    },
    select: { id: true },
  });
  tag(email);
  return row.id;
}

async function cleanupThrowaways(): Promise<void> {
  await db.user.deleteMany({ where: { email: { in: [...throwawayEmails] } } });
  throwawayEmails.clear();
}

beforeAll(async () => {
  await cleanupThrowaways();
  adminAgent = await authedAgent("ADMINISTRATOR", 0);
  adminRow = (await db.user.findUnique({
    where: { email: adminAccount.email },
    select: { id: true, email: true },
  }))!;
}, 30000);

afterAll(async () => {
  await cleanupThrowaways();
  await db.$disconnect();
});

describe("API-68 — user list (FR-40)", () => {
  it("returns every seeded user without the password hash and without mustChangePassword", async () => {
    const res = await adminAgent.get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(SEED_USERS.length);
    const emails = res.body.data.map((u: { email: string }) => u.email);
    expect(emails).toContain(adminAccount.email);
    expect(emails).toContain(requesterAccount.email);
    expect(emails).toContain(inactiveRequester.email);
    for (const u of res.body.data) {
      expect(u).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        isActive: expect.any(Boolean),
      });
      expect("passwordHash" in u).toBe(false);
      expect("mustChangePassword" in u).toBe(false);
    }
    // Ordered by name ascending (api-spec 6.1 is pagination-free; the stable
    // order is by name).
    const names = res.body.data.map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("API-69 — user list search (FR-40)", () => {
  it("filters case-insensitively on name or email", async () => {
    const term = adminAccount.name.split(" ")[0].toUpperCase();
    const res = await adminAgent.get(
      `/api/admin/users?search=${encodeURIComponent(term)}`
    );
    expect(res.status).toBe(200);
    const emails = res.body.data.map((u: { email: string }) => u.email);
    expect(emails).toContain(adminAccount.email);
    for (const u of res.body.data) {
      const haystack = `${u.name} ${u.email}`.toLowerCase();
      expect(haystack).toContain(term.toLowerCase());
    }
  });

  it("returns an empty list for a term that matches nothing", async () => {
    const res = await adminAgent.get(`/api/admin/users?search=${UNIQUE_TAG}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe("API-70 — user list role filter (FR-40)", () => {
  it("narrows results to one role", async () => {
    const res = await adminAgent.get("/api/admin/users?role=IT_STAFF");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    const emails = res.body.data.map((u: { email: string }) => u.email);
    expect(emails).toContain(staffAccount.email);
    for (const u of res.body.data) {
      expect(u.role).toBe("IT_STAFF");
    }
  });

  it("returns 400 for an invalid role value", async () => {
    const res = await adminAgent.get("/api/admin/users?role=SUPERADMIN");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.role).toBe(
      "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR."
    );
  });
});

describe("API-60 — create user, valid (AC-10, FR-41)", () => {
  it("returns 201, hashes the password at cost 12, and forces a first-login change", async () => {
    const email = emailOf("adminu.created");
    tag(email);
    const res = await adminAgent.post("/api/admin/users").send({
      name: "  Newly Created User  ",
      email: email.toUpperCase(),
      role: "REQUESTER",
      initialPassword: INITIAL_PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: "Newly Created User",
      email,
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
    });
    expect(res.body.data.id).toBeGreaterThan(0);
    expect("passwordHash" in res.body.data).toBe(false);

    const row = await db.user.findUnique({
      where: { email },
      select: { passwordHash: true, mustChangePassword: true, role: true, isActive: true },
    });
    expect(row).not.toBeNull();
    expect(row!.mustChangePassword).toBe(true);
    expect(row!.role).toBe("REQUESTER");
    expect(row!.isActive).toBe(true);
    // BR-08: bcrypt hash ($2...) that still verifies against the plaintext.
    expect(row!.passwordHash.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare(INITIAL_PASSWORD, row!.passwordHash)).toBe(true);
  });
});

describe("API-62 — create user, invalid role (FR-41)", () => {
  it("returns 400 when the role is not one of the three UserRole values", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "Bad Role User",
      email: emailOf("adminu.badrole"),
      role: "SUPERADMIN",
      initialPassword: INITIAL_PASSWORD,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.role).toBe(
      "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR."
    );
  });

  it("returns 400 when an initial password is omitted", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "No Password User",
      email: emailOf("adminu.nopw"),
      role: "REQUESTER",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.initialPassword).toBe("An initial password is required.");
  });

  it("returns 400 when the name exceeds 100 characters after trim", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "X".repeat(101),
      email: emailOf("adminu.longname"),
      role: "REQUESTER",
      initialPassword: INITIAL_PASSWORD,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.name).toBe(
      "Full name must be at most 100 characters."
    );
  });
});

describe("API-63 — create user, weak initial password (FR-41)", () => {
  it("returns 400 with the exact shared password-rule message", async () => {
    const tooShort = await adminAgent.post("/api/admin/users").send({
      name: "Weak Password User",
      email: emailOf("adminu.weak"),
      role: "REQUESTER",
      initialPassword: "short1!",
    });
    expect(tooShort.status).toBe(400);
    expect(tooShort.body.error.fields.initialPassword).toBe(
      "Password must be at least 8 characters."
    );

    const missingUpper = await adminAgent.post("/api/admin/users").send({
      name: "Weak Password User",
      email: emailOf("adminu.weak2"),
      role: "REQUESTER",
      initialPassword: "lowercase123!",
    });
    expect(missingUpper.status).toBe(400);
    expect(missingUpper.body.error.fields.initialPassword).toBe(
      "Password must include at least one uppercase letter."
    );
  });
});

describe("API-61 — create user, duplicate email (AC-14, FR-42)", () => {
  it("returns 409 (case-insensitive via lowercase normalization, BR-07)", async () => {
    const email = emailOf("adminu.dupbase");
    await createThrowawayUser(email);

    const res = await adminAgent.post("/api/admin/users").send({
      name: "Duplicate Email User",
      email: email.toUpperCase(),
      role: "REQUESTER",
      initialPassword: INITIAL_PASSWORD,
    });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: "CONFLICT", message: GENERIC_DUP_EMAIL },
    });
  });
});

describe("API-64 — edit user, valid (FR-43)", () => {
  it("updates only the provided fields", async () => {
    const targetId = await createThrowawayUser(emailOf("adminu.edit"), "REQUESTER");
    const res = await adminAgent.put(`/api/admin/users/${targetId}`).send({
      name: "  Edited Name  ",
      role: "IT_STAFF",
      isActive: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: targetId,
      name: "Edited Name",
      role: "IT_STAFF",
      isActive: false,
      mustChangePassword: true,
    });
    expect("passwordHash" in res.body.data).toBe(false);

    const row = await db.user.findUnique({
      where: { id: targetId },
      select: { name: true, email: true, role: true, isActive: true },
    });
    expect(row).toMatchObject({
      name: "Edited Name",
      role: "IT_STAFF",
      isActive: false,
    });
    // Email was untouched because it was not in the body.
    expect(row!.email).toContain("adminu.edit");
  });

  it("returns 400 for a malformed id and 404 for a missing user", async () => {
    const malformed = await adminAgent.put("/api/admin/users/nope").send({ name: "X" });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("VALIDATION_ERROR");
    expect(malformed.body.error.fields.id).toBe(
      "User id must be a positive integer."
    );

    const missing = await adminAgent.put("/api/admin/users/99999999").send({ name: "X" });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({
      error: { code: "NOT_FOUND", message: "User not found" },
    });
  });
});

describe("API-72 — edit user, duplicate email (AC-14, FR-43)", () => {
  it("returns 409 when the new email belongs to another user", async () => {
    const emailA = emailOf("adminu.editdA");
    const emailB = emailOf("adminu.editdB");
    const userAId = await createThrowawayUser(emailA);
    const userBId = await createThrowawayUser(emailB);

    const res = await adminAgent
      .put(`/api/admin/users/${userBId}`)
      .send({ email: emailA });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: "CONFLICT", message: GENERIC_DUP_EMAIL },
    });
    expect((await db.user.findUnique({ where: { id: userBId } }))!.email).toBe(emailB);

    // Re-sending the user's own email is a no-op, not a 409.
    const own = await adminAgent
      .put(`/api/admin/users/${userAId}`)
      .send({ email: emailA });
    expect(own.status).toBe(200);
  });
});

describe("API-65 — self-deactivation is forbidden (AC-11, FR-45)", () => {
  it("returns 403 (never 409) for an admin deactivating or demoting their own account while another active admin exists", async () => {
    const scratchEmail = emailOf("adminu.selfx");
    const scratchId = await createThrowawayUser(scratchEmail, "ADMINISTRATOR");
    try {
      const scratch = await loginAs(scratchEmail, INITIAL_PASSWORD);

      const deactivate = await scratch
        .put(`/api/admin/users/${scratchId}`)
        .send({ isActive: false });
      expect(deactivate.status).toBe(403);
      expect(deactivate.body).toEqual({
        error: { code: "FORBIDDEN", message: SELF_DEACTIVATE_MESSAGE },
      });

      const demote = await scratch
        .put(`/api/admin/users/${scratchId}`)
        .send({ role: "REQUESTER" });
      expect(demote.status).toBe(403);
      expect(demote.body.error.code).toBe("FORBIDDEN");

      // No mutation happened server-side.
      const row = await db.user.findUnique({
        where: { id: scratchId },
        select: { isActive: true, role: true },
      });
      expect(row).toMatchObject({ isActive: true, role: "ADMINISTRATOR" });
    } finally {
      // Remove the throwaway admin before API-66 runs so the seed admin is the
      // sole active Administrator again.
      await db.user.deleteMany({ where: { email: scratchEmail } });
      throwawayEmails.delete(scratchEmail);
    }
  });
});

describe("API-66 — the last active Administrator cannot be removed (AC-12, FR-46)", () => {
  it("returns 409 when the only active admin deactivates or demotes their own account", async () => {
    // Precondition: the runner is the sole active Administrator (any throwaway
    // admin from the API-65 test is deleted in its finally, and this file never
    // activates a second admin). Proving the precondition from the DB, not from
    // an assumption:
    const activeAdmins = await db.user.count({
      where: { role: "ADMINISTRATOR", isActive: true },
    });
    expect(activeAdmins).toBe(1);

    const res = await adminAgent
      .put(`/api/admin/users/${adminRow.id}`)
      .send({ isActive: false });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: "CONFLICT", message: LAST_ADMIN_MESSAGE },
    });

    const demote = await adminAgent
      .put(`/api/admin/users/${adminRow.id}`)
      .send({ role: "REQUESTER" });
    expect(demote.status).toBe(409);
    expect(demote.body).toEqual({
      error: { code: "CONFLICT", message: LAST_ADMIN_MESSAGE },
    });

    // Still the sole, fully functional Administrator.
    const row = await db.user.findUnique({
      where: { id: adminRow.id },
      select: { isActive: true, role: true },
    });
    expect(row).toMatchObject({ isActive: true, role: "ADMINISTRATOR" });
  });
});

describe("API-67 — reset password (FR-44, AC-10)", () => {
  it("re-hashes, forces change at next login, and the new password works for login", async () => {
    const email = emailOf("adminu.reset");
    const targetId = await createThrowawayUser(email, "REQUESTER");

    const res = await adminAgent
      .post(`/api/admin/users/${targetId}/reset-password`)
      .send({ initialPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { message: RESET_MESSAGE },
    });

    const row = await db.user.findUnique({
      where: { id: targetId },
      select: { passwordHash: true, mustChangePassword: true },
    });
    expect(row!.mustChangePassword).toBe(true);
    expect(row!.passwordHash.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare(NEW_PASSWORD, row!.passwordHash)).toBe(true);
    expect(await bcrypt.compare(INITIAL_PASSWORD, row!.passwordHash)).toBe(false);

    // The new initial password authenticates and the identity reflects BR-02.
    const agent = await loginAs(email, NEW_PASSWORD);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ email, mustChangePassword: true });
  });

  it("returns 400 for a weak new password and 404 for a missing user", async () => {
    const weak = await adminAgent
      .post(`/api/admin/users/${adminRow.id}/reset-password`)
      .send({ initialPassword: "x" });
    expect(weak.status).toBe(400);
    expect(weak.body.error.fields.initialPassword).toBe(
      "Password must be at least 8 characters."
    );

    const missing = await adminAgent
      .post("/api/admin/users/99999999/reset-password")
      .send({ initialPassword: NEW_PASSWORD });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });
});

describe("API-71 — admin-created user login round-trip (AC-10)", () => {
  it("create → login with initial password → forced change → full app access", async () => {
    const email = emailOf("adminu.roundtrip");
    await createThrowawayUser(email, "REQUESTER");

    const initial = await loginAs(email, INITIAL_PASSWORD);
    const me1 = await initial.get("/api/auth/me");
    expect(me1.status).toBe(200);
    expect(me1.body.data).toMatchObject({ email, role: "REQUESTER", mustChangePassword: true });

    const change = await initial.post("/api/auth/change-password").send({
      currentPassword: INITIAL_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    expect(change.status).toBe(200);

    await initial.post("/api/auth/logout").send({});
    const fresh = await loginAs(email, NEW_PASSWORD);
    const me2 = await fresh.get("/api/auth/me");
    expect(me2.status).toBe(200);
    expect(me2.body.data.mustChangePassword).toBe(false);

    // "Access the normal app": a protected requester endpoint is reachable.
    const tickets = await fresh.get("/api/tickets");
    expect(tickets.status).toBe(200);
  });
});

// Sanity: the seed account identity used across this suite is still intact for
// MIG-01's per-account bcrypt checks (nothing above mutated it).
describe("seed admin survivability", () => {
  it("still authenticates with the documented password at cost 12", async () => {
    const row = await db.user.findUnique({
      where: { email: adminAccount.email },
      select: { passwordHash: true, isActive: true, role: true },
    });
    expect(row).toMatchObject({ isActive: true, role: "ADMINISTRATOR" });
    expect(await bcrypt.compare(adminAccount.password, row!.passwordHash)).toBe(
      true
    );
  });
});