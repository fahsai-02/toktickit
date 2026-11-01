import dotenv from "dotenv";
dotenv.config({ quiet: true });
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { BCRYPT_ROUNDS } from "../src/lib/seedCredentials.js";
import {
  SEED_CATEGORIES,
  SEED_RELATED_SYSTEMS,
  SEED_REQUESTERS,
  SEED_USERS,
  SEED_TICKETS,
  SEED_PUBLIC_COMMENTS,
  SEED_INTERNAL_NOTES,
  SEED_ACTIONS_TAKEN,
  SEED_ACTION_IDS,
} from "../src/lib/seedData.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// =====================================================================
// Seed data (local development only)
// ---------------------------------------------------------------------
//  All seed data lives in server/src/lib/seedData.ts (the single source of
//  truth) and the raw credential strings in server/src/lib/seedCredentials.ts
//  — see docs/lab-03/seed-credentials.md. Never inline seed rows here.
//
//  | Role         | Password      | mustChangePassword              |
//  |--------------|---------------|---------------------------------|
//  | Requester    | TempPass123!  | true (initial, must change)     |
//  | IT Staff     | StaffPass1!   | 1 active true, rest false       |
//  | Administrator| AdminPass1!   | false (documented = real)       |
//
//  bcrypt cost is 12 per specification.md section 11 (line 316).
// =====================================================================

async function main() {
  for (const category of SEED_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }

  const categoryRows = await prisma.category.findMany();
  const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));

  for (const system of SEED_RELATED_SYSTEMS) {
    let categoryId: number | null = null;
    if (system.categoryName) {
      categoryId = categoryIdByName.get(system.categoryName) ?? null;
      if (categoryId === null) {
        throw new Error(`Category "${system.categoryName}" not found for related system "${system.name}"`);
      }
    }
    const data = { name: system.name, categoryId, isActive: true };
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: data,
      create: data,
    });
  }

  for (const requester of SEED_REQUESTERS) {
    await prisma.requester.upsert({
      where: { email: requester.email },
      update: requester,
      create: requester,
    });
  }

  // ---- Users (real Lab 3 authentication accounts), idempotent upsert by email ----
  // Hash per user (NOT per password): bcrypt embeds a per-call random salt, so every
  // account gets a unique hash even when passwords are shared dev credentials.
  const hashFor = (password: string): string => bcrypt.hashSync(password, BCRYPT_ROUNDS);

  for (const user of SEED_USERS) {
    const data = {
      name: user.name,
      passwordHash: hashFor(user.password),
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
    await prisma.user.upsert({
      where: { email: user.email },
      update: data,
      create: { email: user.email, ...data },
    });
  }

  // ---- Backfill requesterUserId on legacy Lab 2 tickets (migration leaves them NULL) ----
  //  Mapping is requesterId -> legacy Requester -> email -> User. Only fills NULL rows,
  //  which keeps the seed idempotent. See specification.md section 7 "Migration Decision".
  await prisma.$executeRaw`
    UPDATE "Ticket" t
    SET "requesterUserId" = u.id
    FROM "Requester" r
    JOIN "User" u ON u.email = r.email
    WHERE t."requesterId" = r.id
      AND t."requesterUserId" IS NULL
  `;

  // ---- ID lookup maps for ticket/comment/note seeding ----
  const requesterIdByEmail = new Map(
    (await prisma.requester.findMany()).map((r) => [r.email, r.id]),
  );
  const userIdByEmail = new Map(
    (await prisma.user.findMany()).map((u) => [u.email, u.id]),
  );
  const systemIdByName = new Map(
    (await prisma.relatedSystem.findMany()).map((s) => [s.name, s.id]),
  );

  // ---- Seed tickets ----
  for (const seed of SEED_TICKETS) {
    const requesterId = requesterIdByEmail.get(seed.requester);
    const requesterUserId = userIdByEmail.get(seed.requester);
    const ownerId = seed.owner ? userIdByEmail.get(seed.owner) ?? null : null;
    const categoryId = categoryIdByName.get(seed.category);
    const relatedSystemId = systemIdByName.get(seed.relatedSystem);

    if (requesterId === undefined || requesterUserId === undefined) {
      throw new Error(`Requester/User mapping missing for ${seed.requester}`);
    }
    if (categoryId === undefined || relatedSystemId === undefined) {
      throw new Error(`Category/RelatedSystem mapping missing for ticket ${seed.ticketNumber}`);
    }

    const data = {
      summary: seed.summary,
      description: seed.description,
      requestedPriority: seed.requestedPriority,
      itPriority: seed.itPriority,
      currentStatus: seed.currentStatus,
      ticketDate: new Date(seed.ticketDate),
      requesterId,
      requesterUserId,
      ownerId,
      categoryId,
      relatedSystemId,
      resolutionSummary: seed.resolutionSummary,
      requesterIndicatedResolved: seed.requesterIndicatedResolved ?? false,
      indicatedResolvedAt: seed.indicatedResolvedAt ? new Date(seed.indicatedResolvedAt) : null,
    };

    await prisma.ticket.upsert({
      where: { ticketNumber: seed.ticketNumber },
      update: data,
      create: { ticketNumber: seed.ticketNumber, ...data },
    });
  }

  // ---- Seed Public Comments / Internal Notes (idempotent: delete the seeded rows only, then recreate) ----
  const commentContents = SEED_PUBLIC_COMMENTS.map((c) => c.content);
  const noteContents = SEED_INTERNAL_NOTES.map((n) => n.content);

  // Scope deletes to the seed tickets AND the exact seed strings, so a user-posted comment/note
  // that happens to match a seed string is never removed on re-run.
  const seedTicketIds = (
    await prisma.ticket.findMany({
      where: { ticketNumber: { in: SEED_TICKETS.map((t) => t.ticketNumber) } },
      select: { id: true },
    })
  ).map((t) => t.id);

  await prisma.publicComment.deleteMany({
    where: { ticketId: { in: seedTicketIds }, content: { in: commentContents } },
  });
  await prisma.internalNote.deleteMany({
    where: { ticketId: { in: seedTicketIds }, content: { in: noteContents } },
  });

  for (const seed of SEED_PUBLIC_COMMENTS) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: seed.ticketNumber },
      select: { id: true },
    });
    const authorId = userIdByEmail.get(seed.participant);
    if (!ticket || authorId === undefined) {
      throw new Error(`PublicComment references unknown ticket/user: ${seed.ticketNumber} / ${seed.participant}`);
    }
    await prisma.publicComment.create({
      data: { ticketId: ticket.id, authorId, content: seed.content },
    });
  }

  for (const seed of SEED_INTERNAL_NOTES) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: seed.ticketNumber },
      select: { id: true },
    });
    const authorId = userIdByEmail.get(seed.participant);
    if (!ticket || authorId === undefined) {
      throw new Error(`InternalNote references unknown ticket/user: ${seed.ticketNumber} / ${seed.participant}`);
    }
    await prisma.internalNote.create({
      data: { ticketId: ticket.id, authorId, content: seed.content },
    });
  }


  // ---- Seed Actions Taken (idempotent, scoped to the seed's own row ids) ----
  //  BR-21: seeded actions exist only on SEED_LAB4_TICKET_NUMBERS. On re-run we
  //  delete exactly the rows the seed owns (their fixed ids) and recreate them,
  //  never a whole-Ticket sweep — a user-created Action Taken on a Lab 4 ticket
  //  survives `prisma db seed`. See specification.md section 7 (replace "by
  //  their own known ids rather than a content match").
  await prisma.actionTaken.deleteMany({
    where: { id: { in: SEED_ACTION_IDS } },
  });

  for (const seed of SEED_ACTIONS_TAKEN) {
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: seed.ticketNumber },
      select: { id: true },
    });
    const performedById = userIdByEmail.get(seed.performedBy);
    if (!ticket || performedById === undefined) {
      throw new Error(`ActionTaken references unknown ticket/user: ${seed.ticketNumber} / ${seed.performedBy}`);
    }
    await prisma.actionTaken.create({
      data: {
        id: seed.id,
        ticketId: ticket.id,
        performedById,
        actionDate: new Date(seed.actionDate),
        description: seed.description,
        result: seed.result,
        followUpRequired: seed.followUpRequired ?? false,
        followUpNote: seed.followUpNote ?? null,
        attachmentNotes: seed.attachmentNotes ?? null,
      },
    });
  }

  // Creating rows with explicit ids does not advance the auto-increment
  // sequence, so realign it to MAX(id)+1; otherwise the next user-created
  // Action Taken would collide with a seed id.
  await prisma.$executeRaw`
    SELECT setval(
      pg_get_serial_sequence('"ActionTaken"', 'id'),
      COALESCE((SELECT MAX("id") FROM "ActionTaken"), 0) + 1,
      false
    )
  `;

  // ---- Summary ----
  const [
    categoryCount,
    systemCount,
    activeRequesters,
    inactiveRequesters,
    userCount,
    ticketCount,
    commentCount,
    noteCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.relatedSystem.count(),
    prisma.requester.count({ where: { isActive: true } }),
    prisma.requester.count({ where: { isActive: false } }),
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.publicComment.count(),
    prisma.internalNote.count(),
  ]);

  console.log(
    `Seeded ${categoryCount} categories, ${systemCount} related systems, ` +
      `${activeRequesters} active + ${inactiveRequesters} inactive requesters, ` +
      `${userCount} users, ${ticketCount} tickets, ${commentCount} comments, ${noteCount} notes`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });