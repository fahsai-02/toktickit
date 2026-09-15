import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "../../src/db.js";
import { TicketStatus } from "../../src/generated/prisma/client.js";
import { ROLE_TO_PASSWORD } from "../../src/lib/seedCredentials.js";
import { SEED_ACCOUNTS, SEED_BASELINE_COUNTS } from "../../src/lib/seedData.js";

// ---------------------------------------------------------------------------
// MIG-01 — Migration / Regression (specification.md section 7; tests.md MIG-01)
//
// REQUIRES the database to already be migrated AND seeded:
//   cd server && pnpm exec prisma migrate dev && pnpm exec prisma db seed
//
// This suite runs against the real local PostgreSQL. It verifies that Lab 2 data
// survived the Lab 3 migration and that the seed produced valid auth data:
//   - legacy row counts are not below the pre-migration snapshot
//   - every Ticket resolves to both legacy Requester and new User (requesterUserId)
//   - every Attachment resolves to a legacy Requester
//   - password hashes are bcrypt ($2...) and bcrypt.compare succeeds
//   - the 8-value TicketStatus enum and new Ticket workflow fields exist/are used
//
// Source-of-truth note: the seeded user list (SEED_ACCOUNTS) and the baseline
// row-count floor (SEED_BASELINE_COUNTS) are imported from src/lib/seedData.ts —
// the SAME module prisma/seed.ts consumes. Seed rows can never drift from what
// this suite asserts: add an account in seedData.ts and both the seed and the
// tests pick it up automatically.
//
// Because this suite asserts over the whole shared dev database, it relies on
// server/vitest.config.ts setting `fileParallelism: false` so no other test file
// creates/deletes rows while these counts are taken.
// ---------------------------------------------------------------------------

// Baseline below which a table must never fall. Defaults to the fresh-install
// seed floor, derived from the seed definition itself (seedData.ts). Machines
// with Lab 2 legacy data can tighten the check by setting PRE_MIGRATION_COUNTS
// (JSON) to their own pre-migration snapshot, e.g.
//   PRE_MIGRATION_COUNTS='{"ticket":343,"attachment":179,"requester":6,"category":4,"relatedSystem":7}' pnpm test
function loadBaselineCounts(): Record<string, number> {
  const raw = process.env.PRE_MIGRATION_COUNTS;
  if (!raw) return { ...SEED_BASELINE_COUNTS };
  try {
    return { ...SEED_BASELINE_COUNTS, ...JSON.parse(raw) };
  } catch {
    console.warn("[MIG-01] Invalid PRE_MIGRATION_COUNTS JSON; using the seed baseline.");
    return { ...SEED_BASELINE_COUNTS };
  }
}

const PRE_MIGRATION_COUNTS = loadBaselineCounts();

afterAll(async () => {
  await db.$disconnect();
});

describe("MIG-01 — Lab 2 data survives the Lab 3 migration", () => {
  let counts: Record<string, number>;

  beforeAll(async () => {
    const [requester, category, relatedSystem, ticket, attachment] = await Promise.all([
      db.requester.count(),
      db.category.count(),
      db.relatedSystem.count(),
      db.ticket.count(),
      db.attachment.count(),
    ]);
    counts = { requester, category, relatedSystem, ticket, attachment };
  });

  it("keeps legacy row counts at or above the pre-migration snapshot", () => {
    for (const [table, min] of Object.entries(PRE_MIGRATION_COUNTS)) {
      expect(counts[table], `${table} count dropped below pre-migration snapshot`).toBeGreaterThanOrEqual(min);
    }
  });

  it("every Ticket still resolves to a legacy Requester via requesterId", async () => {
    const rows = await db.$queryRaw<Array<{ orphan: number }>>`
      SELECT count(*)::int AS orphan
      FROM "Ticket" t
      LEFT JOIN "Requester" r ON r.id = t."requesterId"
      WHERE r.id IS NULL
    `;
    expect(rows[0].orphan).toBe(0);
  });

  it("every Ticket has requesterUserId backfilled to the mapped User", async () => {
    const missingRows = await db.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM "Ticket" WHERE "requesterUserId" IS NULL
    `;
    expect(missingRows[0].n).toBe(0);

    const badLinkRows = await db.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n
      FROM "Ticket" t
      LEFT JOIN "User" u ON u.id = t."requesterUserId"
      WHERE t."requesterUserId" IS NOT NULL AND u.id IS NULL
    `;
    expect(badLinkRows[0].n).toBe(0);

    const mismatchedEmailRows = await db.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n
      FROM "Ticket" t
      JOIN "Requester" r ON r.id = t."requesterId"
      JOIN "User" u ON u.id = t."requesterUserId"
      WHERE r.email <> u.email
    `;
    expect(mismatchedEmailRows[0].n).toBe(0);
  });

  it("every Attachment still resolves to a legacy Requester", async () => {
    const rows = await db.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n
      FROM "Attachment" a
      LEFT JOIN "Requester" r ON r.id = a."uploadedByRequesterId"
      WHERE r.id IS NULL
    `;
    expect(rows[0].n).toBe(0);
  });
});

describe("MIG-01 — Seeded users and password hashing", () => {
  it("creates the required role distribution (derived from the seed definition)", async () => {
    // Minimums come from the seed definition itself, so the test follows the data.
    const atLeast = {
      activeRequesters: SEED_ACCOUNTS.filter((a) => a.role === "REQUESTER" && a.isActive).length,
      inactiveRequesters: SEED_ACCOUNTS.filter((a) => a.role === "REQUESTER" && !a.isActive).length,
      activeStaff: SEED_ACCOUNTS.filter((a) => a.role === "IT_STAFF" && a.isActive).length,
      inactiveStaff: SEED_ACCOUNTS.filter((a) => a.role === "IT_STAFF" && !a.isActive).length,
      activeAdmins: SEED_ACCOUNTS.filter((a) => a.role === "ADMINISTRATOR" && a.isActive).length,
    };

    const [activeRequesters, inactiveRequesters, activeStaff, inactiveStaff, activeAdmins] =
      await Promise.all([
        db.user.count({ where: { role: "REQUESTER", isActive: true } }),
        db.user.count({ where: { role: "REQUESTER", isActive: false } }),
        db.user.count({ where: { role: "IT_STAFF", isActive: true } }),
        db.user.count({ where: { role: "IT_STAFF", isActive: false } }),
        db.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }),
      ]);

    expect(activeRequesters).toBeGreaterThanOrEqual(atLeast.activeRequesters);
    expect(inactiveRequesters).toBeGreaterThanOrEqual(atLeast.inactiveRequesters);
    expect(activeStaff).toBeGreaterThanOrEqual(atLeast.activeStaff);
    expect(inactiveStaff).toBeGreaterThanOrEqual(atLeast.inactiveStaff);
    expect(activeAdmins).toBeGreaterThanOrEqual(atLeast.activeAdmins);
  });

  it("maps every legacy Requester email to a User account", async () => {
    const requesters = await db.requester.findMany({ select: { email: true } });
    const userCount = await db.user.count({ where: { email: { in: requesters.map((r) => r.email) } } });
    expect(userCount).toBe(requesters.length);
  });

  it(
    "stores only bcrypt hashes (prefix $2) and bcrypt.compare succeeds for every seeded account",
    async () => {
      const users = await db.user.findMany({
        select: { email: true, passwordHash: true, role: true, isActive: true },
      });
      expect(users.length).toBeGreaterThanOrEqual(SEED_ACCOUNTS.length);

      // cheap string check across ALL stored hashes (no bcrypt work needed)
      const badHashCount = users.filter((u) => !u.passwordHash.startsWith("$2")).length;
      expect(badHashCount, "some passwordHash values do not start with $2").toBe(0);

      // bcrypt.compare at cost 12 is ~450ms per call (pure JS); 11 accounts ≈ 5s,
      // so this test carries an explicit 20s timeout instead of sacrificing coverage.
      // Every documented seed account must authenticate with its role's documented
      // password, not just a single sample per role.
      const expectedByEmail = new Map(SEED_ACCOUNTS.map((a) => [a.email, a.role]));
      const seeded = users.filter((u) => expectedByEmail.has(u.email));
      expect(seeded.length, "not all documented seed accounts exist").toBe(SEED_ACCOUNTS.length);

      let verifiedAuthUsers = 0;
      for (const user of seeded) {
        const role = expectedByEmail.get(user.email)!;
        const expectedPassword = ROLE_TO_PASSWORD[role];
        const matches = bcrypt.compareSync(expectedPassword, user.passwordHash);
        expect(matches, `bcrypt.compare failed for ${user.email} (${role})`).toBe(true);
        if (matches) verifiedAuthUsers++;
      }
      expect(verifiedAuthUsers).toBe(seeded.length);
    },
    20000,
  );

  it("seed accounts carry the documented first-login flags (admin strictly NOT forced to change)", async () => {
    const seeded = await db.user.findMany({
      where: { email: { in: SEED_ACCOUNTS.map((a) => a.email) } },
      select: { email: true, role: true, isActive: true, mustChangePassword: true },
    });
    const byEmail = new Map(seeded.map((u) => [u.email, u]));
    expect(byEmail.size).toBe(SEED_ACCOUNTS.length);

    for (const acct of SEED_ACCOUNTS) {
      const row = byEmail.get(acct.email);
      expect(row, `seeded account ${acct.email} is missing`).toBeTruthy();
      expect(row!.role, `${acct.email} role mismatch`).toBe(acct.role);

      if (acct.role === "ADMINISTRATOR") {
        expect(row!.isActive, "the administrator account must be active").toBe(true);
        expect(
          row!.mustChangePassword,
          "the administrator account must NOT be forced to change its password on login",
        ).toBe(false);
      }
      if (acct.role === "REQUESTER") {
        expect(row!.mustChangePassword, "every seeded requester must change its initial password").toBe(true);
      }
    }

    const activeStaff = seeded.filter((u) => u.role === "IT_STAFF" && u.isActive);
    expect(activeStaff.some((u) => u.mustChangePassword), "at least one active IT Staff must be forced to change").toBe(true);
    expect(activeStaff.some((u) => !u.mustChangePassword), "at least one active IT Staff must log in directly").toBe(true);
  });

  it("has at least one fresh user with mustChangePassword = true (first-login flow)", async () => {
    const fresh = await db.user.count({ where: { mustChangePassword: true, isActive: true } });
    expect(fresh).toBeGreaterThanOrEqual(1);
  });
});

describe("MIG-01 — Expanded schema is effective", () => {
  it("uses all 8 TicketStatus values across the seeded tickets", async () => {
    const rows = await db.ticket.groupBy({ by: ["currentStatus"] });
    const used = new Set(rows.map((r) => r.currentStatus));
    for (const status of Object.values(TicketStatus)) {
      expect(used.has(status), `status ${status} is never used`).toBe(true);
    }
  });

  it("uses the new Ticket workflow fields", async () => {
    const [withSummary, withIndication, withOwner, withItPriority] = await Promise.all([
      db.ticket.count({ where: { resolutionSummary: { not: null } } }),
      db.ticket.count({ where: { requesterIndicatedResolved: true } }),
      db.ticket.count({ where: { ownerId: { not: null } } }),
      db.ticket.count({ where: { itPriority: { not: null } } }),
    ]);

    expect(withSummary).toBeGreaterThanOrEqual(1);
    expect(withIndication).toBeGreaterThanOrEqual(1);
    expect(withOwner).toBeGreaterThanOrEqual(1);
    expect(withItPriority).toBeGreaterThanOrEqual(1);
  });

  it("seed tickets cover assigned + unassigned ownership and populated vs null IT Priority", async () => {
    const [assigned, unassigned, withPriority, withoutPriority] = await Promise.all([
      db.ticket.count({ where: { ownerId: { not: null } } }),
      db.ticket.count({ where: { ownerId: null } }),
      db.ticket.count({ where: { itPriority: { not: null } } }),
      db.ticket.count({ where: { itPriority: null } }),
    ]);

    expect(assigned, "at least one seeded ticket must be assigned to an owner").toBeGreaterThanOrEqual(1);
    expect(unassigned, "at least one seeded ticket must be unassigned (staff queue 'Unassigned' filter)").toBeGreaterThanOrEqual(1);
    expect(withPriority, "at least one seeded ticket must carry an IT Priority").toBeGreaterThanOrEqual(1);
    expect(withoutPriority, "at least one seeded ticket must have IT Priority null").toBeGreaterThanOrEqual(1);
  });

  it("never leaves a resolved indication without a timestamp or a blank resolutionSummary", async () => {
    const [orphanIndications, blankSummaries] = await Promise.all([
      db.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n FROM "Ticket"
        WHERE "requesterIndicatedResolved" = true AND "indicatedResolvedAt" IS NULL
      `,
      db.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n FROM "Ticket"
        WHERE "resolutionSummary" IS NOT NULL AND btrim("resolutionSummary") = ''
      `,
    ]);

    expect(orphanIndications[0].n, "requesterIndicatedResolved = true must be paired with indicatedResolvedAt").toBe(0);
    expect(blankSummaries[0].n, "resolutionSummary must be a non-empty string when set").toBe(0);
  });

  it("seeds Public Comments on at least 2 tickets and Internal Notes (staff authors only)", async () => {
    const commentTickets = await db.publicComment.groupBy({ by: ["ticketId"] });
    const noteTickets = await db.internalNote.groupBy({ by: ["ticketId"] });
    const notes = await db.internalNote.findMany({
      select: { author: { select: { role: true } } },
    });
    const allAuthorsStaff = notes.every(
      (n) => n.author.role === "IT_STAFF" || n.author.role === "ADMINISTRATOR",
    );

    expect(commentTickets.length).toBeGreaterThanOrEqual(2);
    expect(noteTickets.length).toBeGreaterThanOrEqual(2);
    expect(notes.length).toBeGreaterThan(0);
    expect(allAuthorsStaff).toBe(true);
  });
});