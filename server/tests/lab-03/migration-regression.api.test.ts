import { describe, it, expect, beforeAll } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "../../src/db.js";
import { TicketStatus } from "../../src/generated/prisma/client.js";

// ---------------------------------------------------------------------------
// MIG-01 — Migration / Regression (specification.md §7; tests.md MIG-01)
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
// ---------------------------------------------------------------------------

// Snapshot taken before the Lab 3 migration (prisma migrate dev), for the dev DB.
// Re-seeding may ADD tickets on other machines, so we assert "at least" (>=).
const PRE_MIGRATION_COUNTS = {
  requester: 6,
  category: 4,
  relatedSystem: 7,
  ticket: 343,
  attachment: 179,
};

const SEED_EMAIL_TO_PASSWORD: Record<string, string> = {
  "jennifer.anderson@toktickit.dev": "TempPass123!",
  "david.lee@toktickit.dev": "TempPass123!",
  "sarah.johnson@toktickit.dev": "TempPass123!",
  "michael.brown@toktickit.dev": "TempPass123!",
  "napat.chaiwong@toktickit.dev": "TempPass123!",
  "robert.brown@toktickit.dev": "TempPass123!",
  "itstaff.kevin@toktickit.dev": "StaffPass1!",
  "itstaff.sara@toktickit.dev": "StaffPass1!",
  "itstaff.james@toktickit.dev": "StaffPass1!",
  "itstaff.lisa@toktickit.dev": "StaffPass1!",
  "admin@toktickit.dev": "AdminPass1!",
};

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
  it("creates the required role distribution", async () => {
    const [activeRequesters, inactiveRequesters, activeStaff, inactiveStaff, activeAdmins] =
      await Promise.all([
        db.user.count({ where: { role: "REQUESTER", isActive: true } }),
        db.user.count({ where: { role: "REQUESTER", isActive: false } }),
        db.user.count({ where: { role: "IT_STAFF", isActive: true } }),
        db.user.count({ where: { role: "IT_STAFF", isActive: false } }),
        db.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }),
      ]);

    expect(activeRequesters).toBeGreaterThanOrEqual(4);
    expect(inactiveRequesters).toBeGreaterThanOrEqual(1);
    expect(activeStaff).toBeGreaterThanOrEqual(3);
    expect(inactiveStaff).toBeGreaterThanOrEqual(1);
    expect(activeAdmins).toBeGreaterThanOrEqual(1);
  });

  it("maps every legacy Requester email to a User account", async () => {
    const requesters = await db.requester.findMany({ select: { email: true } });
    const userCount = await db.user.count({ where: { email: { in: requesters.map((r) => r.email) } } });
    expect(userCount).toBe(requesters.length);
  });

  it("stores only bcrypt hashes (prefix $2) and bcrypt.compare succeeds for seeded passwords", async () => {
    const users = await db.user.findMany({ select: { email: true, passwordHash: true, isActive: true } });
    expect(users.length).toBeGreaterThanOrEqual(11);

    const badHashCount = users.filter((u) => !u.passwordHash.startsWith("$2")).length;
    expect(badHashCount, "some passwordHash values do not start with $2").toBe(0);

    let verifiedAuthUsers = 0;
    for (const user of users) {
      const plain = SEED_EMAIL_TO_PASSWORD[user.email];
      if (!plain) continue;
      const matches = bcrypt.compareSync(plain, user.passwordHash);
      expect(matches, `bcrypt.compare failed for ${user.email}`).toBe(true);
      if (matches && user.isActive) verifiedAuthUsers++;
    }
    // at least one active seeded user is verifiable end-to-end (documented password + hash)
    expect(verifiedAuthUsers).toBeGreaterThanOrEqual(1);
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