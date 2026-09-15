import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express, { type Request, type Response } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { db } from "../../src/db.js";
import { requireAuth, requireRole } from "../../src/middleware/auth.js";
import { BCRYPT_ROUNDS, ROLE_TO_PASSWORD } from "../../src/lib/seedCredentials.js";
import { SEED_ACCOUNTS } from "../../src/lib/seedData.js";

// API-01..13 — Authentication endpoints (`docs/lab-03/api-spec.md` section 2;
// tests.md API-01..13). Runs against the real app + local PostgreSQL.
//
// Identity for assertions is derived from src/lib/seedData.ts (the SAME module
// the seed script consumes), never hard-coded, per the test-writing rules.
//
// The change-password tests mutate a throwaway user created here and deleted in
// afterAll, so the seeded accounts (and MIG-01's assertions over them) are
// never touched. server/vitest.config.ts runs test files serially, so the
// cleanup happens before MIG-01 counts rows.
//
// bcrypt cost is 12 (~450ms/hash, pure JS). Any test that performs a login
// carryies an explicit 20s timeout; full coverage beats sampling one role.

const GENERIC_LOGIN_ERROR = "Invalid email or password. Please try again.";

const THROWAWAY_PASSWORD = "CurrentPass456!";
const THROWAWAY_PASSWORD_HASH = bcrypt.hashSync(THROWAWAY_PASSWORD, BCRYPT_ROUNDS);

const UNIQUE_TAG = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const CHANGE_PW_EMAIL = `auth.changepw.${UNIQUE_TAG}@toktickit.dev`;
const MIDDLEWARE_EMAIL = `auth.middleware.${UNIQUE_TAG}@toktickit.dev`;

let changedPasswordUserId: number;

// Seed-derived identities (never hard-coded).
const adminAccount = SEED_ACCOUNTS.find((a) => a.role === "ADMINISTRATOR" && a.isActive)!;
const adminPassword = ROLE_TO_PASSWORD[adminAccount.role];
const inactiveRequester = SEED_ACCOUNTS.find((a) => a.role === "REQUESTER" && !a.isActive)!;
const requesterPassword = ROLE_TO_PASSWORD[inactiveRequester.role];

async function loginAs(
  agent: ReturnType<typeof request.agent>,
  email: string,
  password: string
) {
  const res = await agent.post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return res;
}

beforeAll(async () => {
  await db.user.deleteMany({
    where: { email: { in: [CHANGE_PW_EMAIL, MIDDLEWARE_EMAIL] } },
  });
  const created = await db.user.create({
    data: {
      name: "Auth Change-Password Test User",
      email: CHANGE_PW_EMAIL,
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
      passwordHash: THROWAWAY_PASSWORD_HASH,
    },
    select: { id: true },
  });
  changedPasswordUserId = created.id;

  await db.user.create({
    data: {
      name: "Middleware Test User",
      email: MIDDLEWARE_EMAIL,
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
      passwordHash: THROWAWAY_PASSWORD_HASH,
    },
  });
});

afterAll(async () => {
  await db.user.deleteMany({
    where: { email: { in: [CHANGE_PW_EMAIL, MIDDLEWARE_EMAIL] } },
  });
  await db.$disconnect();
});

describe("API-01 — Login, valid (AC-01, FR-01, FR-02)", () => {
  it(
    "returns 200, sets a session cookie, and returns the user identity without the hash",
    async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/login")
        .send({ email: adminAccount.email, password: adminPassword });

      expect(res.status).toBe(200);
      const cookies = res.headers["set-cookie"]?.join("") ?? "";
      expect(cookies).toContain("connect.sid=");
      expect(cookies.toLowerCase()).toContain("httponly");

      expect(res.body.data).toMatchObject({
        email: adminAccount.email,
        role: adminAccount.role,
        mustChangePassword: false,
      });
      expect(res.body.data.id).toBeGreaterThan(0);
      expect(res.body.data.name).toBeTruthy();
      expect("passwordHash" in res.body.data).toBe(false);
    },
    20000,
  );

  it(
    "returns mustChangePassword true for a user holding an initial password (issues.md AC — BR-02)",
    async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/login")
        .send({ email: CHANGE_PW_EMAIL, password: THROWAWAY_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        email: CHANGE_PW_EMAIL,
        mustChangePassword: true,
      });
    },
    20000,
  );

  it(
    "normalizes an uppercased email to lowercase before matching (BR-07)",
    async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/login")
        .send({ email: adminAccount.email.toUpperCase(), password: adminPassword });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(adminAccount.email);
    },
    20000,
  );
});

describe("API-02 — Login, invalid credentials (AC-05, FR-02)", () => {
  it(
    "returns 401 with the generic message for a wrong password (never reveals account existence)",
    async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: adminAccount.email, password: "DefinitelyWrong123!" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: "UNAUTHORIZED", message: GENERIC_LOGIN_ERROR },
      });
    },
    20000,
  );

  it(
    "returns 401 with the same generic message for an unknown email",
    async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: `ghost.${UNIQUE_TAG}@toktickit.dev`, password: `Whatever${UNIQUE_TAG}!` });

      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: "UNAUTHORIZED",
        message: GENERIC_LOGIN_ERROR,
      });
    },
    20000,
  );
});

describe("API-03 — Login, inactive account (AC-06, FR-03)", () => {
  it(
    "returns 401 with the same generic message (does not reveal the account is inactive)",
    async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: inactiveRequester.email, password: requesterPassword });

      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: "UNAUTHORIZED",
        message: GENERIC_LOGIN_ERROR,
      });
    },
    20000,
  );
});

describe("API-04 — Logout (FR-04)", () => {
  it(
    "destroys the session so subsequent protected calls return 401",
    async () => {
      const agent = request.agent(app);
      await loginAs(agent, adminAccount.email, adminPassword);

      const logout = await agent.post("/api/auth/logout").send({});
      expect(logout.status).toBe(200);
      expect(logout.body).toEqual({ data: { message: "Logged out successfully" } });

      const me = await agent.get("/api/auth/me");
      expect(me.status).toBe(401);
      expect(me.body.error.code).toBe("UNAUTHORIZED");
    },
    20000,
  );
});

describe("API-05 — Current user (AC-01, FR-05)", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toContain("logged in");
  });

  it("returns 200 with the current user identity when authenticated", async () => {
    const agent = request.agent(app);
    await loginAs(agent, adminAccount.email, adminPassword);

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      email: adminAccount.email,
      role: adminAccount.role,
      mustChangePassword: false,
    });
    expect("passwordHash" in res.body.data).toBe(false);
  }, 20000);
});

describe("API — Login validation", () => {
  it("returns 400 VALIDATION_ERROR with field errors for empty body", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.email).toBeTruthy();
    expect(res.body.error.fields.password).toBeTruthy();
  });

  it("returns 400 VALIDATION_ERROR for a malformed email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: `X${UNIQUE_TAG}!` });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.email).toBeTruthy();
  });
});

describe("Change password — rejection paths (FR-07, api-spec 2.4)", () => {
  // API-07..13 run BEFORE the valid change (API-06) because each failed attempt
  // leaves the throwaway user's current password unchanged. The valid change
  // swaps it to a new value and is therefore declared last.
  const changeFor = async (payload: Record<string, string>) => {
    const agent = request.agent(app);
    await loginAs(agent, CHANGE_PW_EMAIL, THROWAWAY_PASSWORD);
    return agent.post("/api/auth/change-password").send(payload);
  };
  const sendUpdate = {
    currentPassword: THROWAWAY_PASSWORD,
    newPassword: "NewSecure123!",
    confirmPassword: "NewSecure123!",
  };

  it("API-07 — rejects a wrong current password with field message", async () => {
    const res = await changeFor({
      ...sendUpdate,
      currentPassword: "WrongCurrent456!",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.currentPassword).toBe("Current password is incorrect.");
  }, 20000);

  it("API-08 — rejects a password shorter than 8 characters", async () => {
    const res = await changeFor({ ...sendUpdate, newPassword: "Short1!", confirmPassword: "Short1!" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.newPassword).toBe("Password must be at least 8 characters.");
  }, 20000);

  it("API-09 — rejects a password missing an uppercase letter", async () => {
    const res = await changeFor({ ...sendUpdate, newPassword: "lowercase123!", confirmPassword: "lowercase123!" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.newPassword).toBe("Password must include at least one uppercase letter.");
  }, 20000);

  it("API-10 — rejects a password missing a lowercase letter", async () => {
    const res = await changeFor({ ...sendUpdate, newPassword: "UPPERCASE123!", confirmPassword: "UPPERCASE123!" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.newPassword).toBe("Password must include at least one lowercase letter.");
  }, 20000);

  it("API-11 — rejects a password missing a digit", async () => {
    const res = await changeFor({ ...sendUpdate, newPassword: "NoDigitPass!", confirmPassword: "NoDigitPass!" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.newPassword).toBe("Password must include at least one digit.");
  }, 20000);

  it("API-12 — rejects a password missing a special character", async () => {
    const res = await changeFor({ ...sendUpdate, newPassword: "NoSpecial123", confirmPassword: "NoSpecial123" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.newPassword).toBe("Password must include at least one special character.");
  }, 20000);

  it("API-13 — rejects a confirmation mismatch", async () => {
    const res = await changeFor({
      ...sendUpdate,
      confirmPassword: "NewSecure124!",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.confirmPassword).toBe("Passwords do not match.");
  }, 20000);
});

describe("API-06 — Change password, valid (AC-02, FR-07)", () => {
  it(
    "clears mustChangePassword and makes the new password usable for login",
    async () => {
      const agent = request.agent(app);
      await loginAs(agent, CHANGE_PW_EMAIL, THROWAWAY_PASSWORD);

      const res = await agent.post("/api/auth/change-password").send({
        currentPassword: THROWAWAY_PASSWORD,
        newPassword: "NewSecure123!",
        confirmPassword: "NewSecure123!",
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: { message: "Password changed successfully" } });

      const stored = await db.user.findUnique({
        where: { id: changedPasswordUserId },
        select: { mustChangePassword: true, passwordHash: true },
      });
      expect(stored?.mustChangePassword).toBe(false);
      expect(stored?.passwordHash.startsWith("$2")).toBe(true);

      await agent.post("/api/auth/logout").send({});
      const fresh = request.agent(app);
      const relogin = await fresh
        .post("/api/auth/login")
        .send({ email: CHANGE_PW_EMAIL, password: "NewSecure123!" });
      expect(relogin.status).toBe(200);
    },
    20000,
  );
});

describe("Auth middleware — requireAuth / requireRole", () => {
  // Stand-alone Express app so middleware 401/403 behavior can be exercised
  // without exposing throwaway test routes on the production `app`.
  const miniApp = express();
  miniApp.use(express.json());
  miniApp.use(
    session({
      secret: "auth-middleware-test-secret",
      store: new session.MemoryStore(),
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax" },
    })
  );
  miniApp.get("/user-info", requireAuth, (req: Request, res: Response) => {
    res.json({ data: req.user });
  });
  miniApp.get("/admin-only", requireAuth, requireRole("ADMINISTRATOR"), (req: Request, res: Response) => {
    res.json({ data: req.user });
  });
  miniApp.get("/role-only", requireRole("ADMINISTRATOR"), (req: Request, res: Response) => {
    res.json({ data: req.user });
  });
  miniApp.get("/login-as", (req: Request, res: Response) => {
    const userId = Number(req.query.userId);
    if (!Number.isSafeInteger(userId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "userId required" } });
      return;
    }
    req.session.userId = userId;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
        return;
      }
      res.json({ data: { userId } });
    });
  });

  const miniAgent = () => request.agent(miniApp);

  it("requireAuth returns 401 without a session", async () => {
    const res = await miniAgent().get("/user-info");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("requireRole without requireAuth returns 401 without a session", async () => {
    const res = await miniAgent().get("/role-only");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it(
    "requireAuth loads the current user from the session and exposes it on req.user",
    async () => {
      const midRow = await db.user.findUnique({
        where: { email: MIDDLEWARE_EMAIL },
        select: { id: true, email: true, role: true },
      });
      const agent = miniAgent();
      await agent.get(`/login-as?userId=${midRow!.id}`);
      const res = await agent.get("/user-info");
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: midRow!.id, email: midRow!.email, role: midRow!.role });
    },
    20000,
  );

  it("requireRole blocks a Requester with 403 FORBIDDEN", async () => {
    const midRow = await db.user.findUnique({
      where: { email: MIDDLEWARE_EMAIL },
      select: { id: true },
    });
    const agent = miniAgent();
    await agent.get(`/login-as?userId=${midRow!.id}`);
    const res = await agent.get("/admin-only");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toContain("permission");
  });

  it("requireRole permits an active Administrator", async () => {
    const adminRow = await db.user.findUnique({
      where: { email: adminAccount.email },
      select: { id: true },
    });
    const agent = miniAgent();
    await agent.get(`/login-as?userId=${adminRow!.id}`);
    const res = await agent.get("/admin-only");
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("ADMINISTRATOR");
  });

  it("requireAuth re-reads the DB so a deactivated account loses access immediately", async () => {
    const midRow = await db.user.findUnique({
      where: { email: MIDDLEWARE_EMAIL },
      select: { id: true },
    });
    const agent = miniAgent();
    await agent.get(`/login-as?userId=${midRow!.id}`);

    await db.user.update({ where: { id: midRow!.id }, data: { isActive: false } });
    const deactivated = await agent.get("/user-info");
    expect(deactivated.status).toBe(401);

    await db.user.update({ where: { id: midRow!.id }, data: { isActive: true } });
    const reactivated = await agent.get("/user-info");
    expect(reactivated.status).toBe(200);
  });

  it("requireAuth returns 401 when the session user no longer exists", async () => {
    const midRow = await db.user.findUnique({
      where: { email: MIDDLEWARE_EMAIL },
      select: { id: true },
    });
    const agent = miniAgent();
    await agent.get(`/login-as?userId=${midRow!.id}`);

    await db.user.delete({ where: { id: midRow!.id } });
    const res = await agent.get("/user-info");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});