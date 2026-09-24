// Local dev helper: remove residue created by the Lab 3 E2E specs so the
// shared dev DB returns to the documented seed state (Issue 22, E2E-03/04/05).
// The seed only upserts known rows, so e2e-created users, tickets, Public
// Comments, and Internal Notes would otherwise accumulate and break exact-count
// suites such as API-68 (docs/lab-03/tests.md). Run with:
// `pnpm exec tsx prisma/cleanup-e2e.ts`
import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// E2E-05 creates one ticket per run with a summary prefixed "E2E requester
// regression" (e2e/lab-03/requester-regression.spec.ts). Delete those tickets
// and everything attached to them; the seed handles the spec's other changes
// (ticket state upserts, password rotation) so no row outside this prefix is
// touched.
const e2eTickets = await prisma.ticket.findMany({
  where: { summary: { startsWith: "E2E requester regression" } },
  select: { id: true },
});
const ticketIds = e2eTickets.map((t) => t.id);

const [attachments, comments, notes, tickets, users] = await Promise.all([
  ticketIds.length
    ? prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } })
    : Promise.resolve({ count: 0 }),
  ticketIds.length
    ? prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } })
    : Promise.resolve({ count: 0 }),
  ticketIds.length
    ? prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } })
    : Promise.resolve({ count: 0 }),
  ticketIds.length
    ? prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } })
    : Promise.resolve({ count: 0 }),
  prisma.user.deleteMany({ where: { email: { startsWith: "e2e." } } }),
]);

// E2E-03 posts a Public Comment and an Internal Note on a SEED ticket, and
// E2E-05 attaches one to its own ticket (deleted above); the seed recreates its
// own comments/notes, but the E2E "E2E ..." rows on seed tickets would persist.
const strayComments = await prisma.publicComment.deleteMany({
  where: { content: { startsWith: "E2E " } },
});
const strayNotes = await prisma.internalNote.deleteMany({
  where: { content: { startsWith: "E2E " } },
});

const userCount = await prisma.user.count();
const ticketCount = await prisma.ticket.count();
console.log(
  `cleanup-e2e: deleted ${tickets.count} tickets (${attachments.count} attachments, ` +
    `${comments.count} comments, ${notes.count} notes), ${strayComments.count} stray ` +
    `comments, ${strayNotes.count} stray notes, ${users.count} users; ` +
    `users now ${userCount}, tickets ${ticketCount}`
);
await prisma.$disconnect();