import dotenv from "dotenv";
dotenv.config({ quiet: true });
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, TicketStatus, RequestedPriority } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// =====================================================================
// Seed credentials (local development only — see docs/lab-03/seed-credentials.md)
// ---------------------------------------------------------------------
//  All seeded passwords are LOCAL-DEV-ONLY. Never use these in production,
//  and never use real personal passwords in this repository.
//
//  | Role         | Password      | mustChangePassword              |
//  |--------------|---------------|---------------------------------|
//  | Requester    | TempPass123!  | true (initial, must change)     |
//  | IT Staff     | StaffPass1!   | 1 active true, rest false       |
//  | Administrator| AdminPass1!   | false (documented = real)       |
//
//  bcrypt cost is 12 per specification.md §11 (line 316).
// =====================================================================

const BCRYPT_ROUNDS = 12;

const REQUESTER_PASSWORD = "TempPass123!";
const STAFF_PASSWORD = "StaffPass1!";
const ADMIN_PASSWORD = "AdminPass1!";

const categories = [
  { name: "Account and Access" },
  { name: "Hardware" },
  { name: "Software" },
  { name: "Network" },
];

const relatedSystems = [
  { name: "Email", categoryName: null },
  { name: "Campus Wi-Fi", categoryName: "Network" },
  { name: "VPN", categoryName: "Network" },
  { name: "LEB2 App", categoryName: "Software" },
  { name: "Grade Submission App", categoryName: "Software" },
  { name: "Printer", categoryName: "Hardware" },
  { name: "Corporate Laptop", categoryName: "Hardware" },
];

const requesters = [
  {
    name: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.dev",
    isActive: true,
  },
  {
    name: "David Lee",
    email: "david.lee@toktickit.dev",
    isActive: true,
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@toktickit.dev",
    isActive: true,
  },
  {
    name: "Michael Brown",
    email: "michael.brown@toktickit.dev",
    isActive: true,
  },
  {
    name: "Napat Chaiwong",
    email: "napat.chaiwong@toktickit.dev",
    isActive: true,
  },
  // NOTE: isActive is intentionally false; re-seeding resets manual status changes (e.g. reactivation) back to seed values.
  {
    name: "Robert Brown",
    email: "robert.brown@toktickit.dev",
    isActive: false,
  },
];

// Users — the real Lab 3 authentication accounts.
// Requester accounts below must match the legacy Requester.email exactly so the
// ticket backfill (requesterUserId) can map them. See migration decision in
// specification.md §7.
const users = [
  // 6 Requesters mapped from Lab 2 (5 active + 1 inactive), all holding an initial password.
  { name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.dev", role: UserRole.REQUESTER, isActive: true, mustChangePassword: true, password: REQUESTER_PASSWORD },
  { name: "David Lee", email: "david.lee@toktickit.dev", role: UserRole.REQUESTER, isActive: true, mustChangePassword: true, password: REQUESTER_PASSWORD },
  { name: "Sarah Johnson", email: "sarah.johnson@toktickit.dev", role: UserRole.REQUESTER, isActive: true, mustChangePassword: true, password: REQUESTER_PASSWORD },
  { name: "Michael Brown", email: "michael.brown@toktickit.dev", role: UserRole.REQUESTER, isActive: true, mustChangePassword: true, password: REQUESTER_PASSWORD },
  { name: "Napat Chaiwong", email: "napat.chaiwong@toktickit.dev", role: UserRole.REQUESTER, isActive: true, mustChangePassword: true, password: REQUESTER_PASSWORD },
  { name: "Robert Brown", email: "robert.brown@toktickit.dev", role: UserRole.REQUESTER, isActive: false, mustChangePassword: true, password: REQUESTER_PASSWORD },
  // 4 IT Staff (3 active + 1 inactive). Kevin holds an initial password to test first-login flow.
  { name: "Kevin Smith", email: "itstaff.kevin@toktickit.dev", role: UserRole.IT_STAFF, isActive: true, mustChangePassword: true, password: STAFF_PASSWORD },
  { name: "Sara Patel", email: "itstaff.sara@toktickit.dev", role: UserRole.IT_STAFF, isActive: true, mustChangePassword: false, password: STAFF_PASSWORD },
  { name: "James Wilson", email: "itstaff.james@toktickit.dev", role: UserRole.IT_STAFF, isActive: true, mustChangePassword: false, password: STAFF_PASSWORD },
  { name: "Lisa Tan", email: "itstaff.lisa@toktickit.dev", role: UserRole.IT_STAFF, isActive: false, mustChangePassword: false, password: STAFF_PASSWORD },
  // 1 Administrator (active). Documented password is the real password.
  { name: "Administrator", email: "admin@toktickit.dev", role: UserRole.ADMINISTRATOR, isActive: true, mustChangePassword: false, password: ADMIN_PASSWORD },
];

// Seed tickets use ticketNumbers that never collide with real tickets (max real: TKT-2026-000344).
// Historical/realistic seeds use year 2025; a couple of recent ones use block TKT-2026-000900+.
// Idempotency: upsert on ticketNumber (@unique).
type SeedTicket = {
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: TicketStatus;
  requester: string;
  owner: string | null;
  relatedSystem: string;
  category: string;
  ticketDate: string;
  resolutionSummary: string | null;
  requesterIndicatedResolved?: boolean;
  indicatedResolvedAt?: string;
};

const seedTickets: SeedTicket[] = [
  {
    ticketNumber: "TKT-2025-000001",
    summary: "Cannot access faculty email after password reset",
    description: "User reset the email password but Outlook still prompts for credentials and the connection fails.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.RESOLVED,
    requester: "jennifer.anderson@toktickit.dev",
    owner: "itstaff.kevin@toktickit.dev",
    relatedSystem: "Email",
    category: "Account and Access",
    ticketDate: "2025-02-11T09:30:00.000Z",
    resolutionSummary: "Reset the Office 365 cache credentials for the account; mail flow verified for 48 hours.",
  },
  {
    ticketNumber: "TKT-2025-000002",
    summary: "Printer in Room 501 prints blank pages",
    description: "The shared printer produces blank pages for every print job regardless of the source application.",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: TicketStatus.CLOSED,
    requester: "david.lee@toktickit.dev",
    owner: "itstaff.sara@toktickit.dev",
    relatedSystem: "Printer",
    category: "Hardware",
    ticketDate: "2025-03-02T10:15:00.000Z",
    resolutionSummary: "Replaced the empty cyan toner cartridge; test page printed successfully.",
  },
  {
    ticketNumber: "TKT-2025-000003",
    summary: "LEB2 app crashes on attendance check-in",
    description: "App closes itself immediately after tapping the check-in button on the home screen.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.REOPENED,
    requester: "sarah.johnson@toktickit.dev",
    owner: "itstaff.james@toktickit.dev",
    relatedSystem: "LEB2 App",
    category: "Software",
    ticketDate: "2025-04-15T14:45:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2025-000004",
    summary: "VPN profile request for external conference",
    description: "Requested a client VPN profile to allow access from an external conference venue.",
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: TicketStatus.CANCELLED,
    requester: "michael.brown@toktickit.dev",
    owner: null,
    relatedSystem: "VPN",
    category: "Network",
    ticketDate: "2025-04-22T08:00:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2025-000005",
    summary: "Campus Wi-Fi drops constantly in library",
    description: "The laptop disconnects from Campus Wi-Fi every few minutes in the central library building.",
    requestedPriority: "URGENT",
    itPriority: "URGENT",
    currentStatus: TicketStatus.OPEN,
    requester: "napat.chaiwong@toktickit.dev",
    owner: null,
    relatedSystem: "Campus Wi-Fi",
    category: "Network",
    ticketDate: "2025-05-06T11:20:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2025-000006",
    summary: "Replace aging corporate laptop",
    description: "Current laptop is over 5 years old, battery lasts less than an hour, and the fan is very loud.",
    requestedPriority: "MEDIUM",
    itPriority: null,
    currentStatus: TicketStatus.NEW,
    requester: "jennifer.anderson@toktickit.dev",
    owner: null,
    relatedSystem: "Corporate Laptop",
    category: "Hardware",
    ticketDate: "2025-06-01T09:05:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2025-000007",
    summary: "Grade submission app shows 500 on final upload",
    description: "After finishing data entry, clicking submit returns an error page and the grades are not saved.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.IN_PROGRESS,
    requester: "david.lee@toktickit.dev",
    owner: "itstaff.kevin@toktickit.dev",
    relatedSystem: "Grade Submission App",
    category: "Software",
    ticketDate: "2025-07-19T15:40:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2025-000008",
    summary: "Access to shared department drive",
    description: "New staff member needs read/write access to the shared marketing drive.",
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
    requester: "sarah.johnson@toktickit.dev",
    owner: "itstaff.sara@toktickit.dev",
    relatedSystem: "Email",
    category: "Account and Access",
    ticketDate: "2025-08-03T13:10:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2025-000009",
    summary: "Outlook signature missing for new domain",
    description: "Email signature banner is missing from outgoing messages after the domain change.",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: TicketStatus.RESOLVED,
    requester: "michael.brown@toktickit.dev",
    owner: "itstaff.sara@toktickit.dev",
    relatedSystem: "Email",
    category: "Account and Access",
    ticketDate: "2025-08-27T16:00:00.000Z",
    resolutionSummary: "Re-applied the default signature policy to the mailbox.",
  },
  {
    ticketNumber: "TKT-2025-000010",
    summary: "Printer tray keeps feeding wrong paper size",
    description: "Tray 2 always loads A5 instead of A4, causing frequent paper jams.",
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: TicketStatus.CLOSED,
    requester: "napat.chaiwong@toktickit.dev",
    owner: "itstaff.james@toktickit.dev",
    relatedSystem: "Printer",
    category: "Hardware",
    ticketDate: "2025-09-14T10:30:00.000Z",
    resolutionSummary: "Calibrated tray guides and reset default paper size setting.",
  },
  {
    ticketNumber: "TKT-2025-000011",
    summary: "LEB2 app missing department list dropdown",
    description: "The department selector is empty when registering a new device in the app.",
    requestedPriority: "HIGH",
    itPriority: null,
    currentStatus: TicketStatus.OPEN,
    requester: "jennifer.anderson@toktickit.dev",
    owner: null,
    relatedSystem: "LEB2 App",
    category: "Software",
    ticketDate: "2025-10-05T08:50:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2025-000012",
    summary: "New employee requires email group update",
    description: "Add the new hire to the faculty and staff distribution groups.",
    requestedPriority: "LOW",
    itPriority: null,
    currentStatus: TicketStatus.NEW,
    requester: "sarah.johnson@toktickit.dev",
    owner: null,
    relatedSystem: "Email",
    category: "Account and Access",
    ticketDate: "2025-11-18T12:00:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000900",
    summary: "Cannot connect to campus Wi-Fi after update",
    description: "After the operating system update, the laptop refuses to connect to Campus Wi-Fi.",
    requestedPriority: "URGENT",
    itPriority: null,
    currentStatus: TicketStatus.NEW,
    requester: "david.lee@toktickit.dev",
    owner: null,
    relatedSystem: "Campus Wi-Fi",
    category: "Network",
    ticketDate: "2026-09-08T09:45:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000901",
    summary: "VPN certificate expired on personal device",
    description: "The VPN client reports an expired certificate and refuses to establish the tunnel.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.OPEN,
    requester: "napat.chaiwong@toktickit.dev",
    owner: "itstaff.sara@toktickit.dev",
    relatedSystem: "VPN",
    category: "Network",
    ticketDate: "2026-09-10T14:20:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000902",
    summary: "Corporate laptop overheating on video calls",
    description: "Laptop gets very hot and the fan runs at maximum speed during video conference calls.",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: TicketStatus.IN_PROGRESS,
    requester: "jennifer.anderson@toktickit.dev",
    owner: "itstaff.kevin@toktickit.dev",
    relatedSystem: "Corporate Laptop",
    category: "Hardware",
    ticketDate: "2026-09-11T10:00:00.000Z",
    resolutionSummary: null,
    requesterIndicatedResolved: true,
    indicatedResolvedAt: "2026-09-11T16:30:00.000Z",
  },
];

// Seed Public Comments (at least 2 different tickets, no sensitive info).
const seedPublicComments = [
  {
    content: "The blank pages are still happening after my last message — anything else I can try?",
    participant: "jennifer.anderson@toktickit.dev",
    ticketNumber: "TKT-2025-000001",
  },
  {
    content: "We replaced the toner and verified print output — please confirm it is working on your side.",
    participant: "itstaff.kevin@toktickit.dev",
    ticketNumber: "TKT-2025-000001",
  },
  {
    content: "Fan noise improvement noticed after the cleaning — how long before we can close this?",
    participant: "jennifer.anderson@toktickit.dev",
    ticketNumber: "TKT-2026-000902",
  },
  {
    content: "We are waiting on a replacement thermal pad from the vendor before we schedule the repair.",
    participant: "itstaff.kevin@toktickit.dev",
    ticketNumber: "TKT-2026-000902",
  },
  {
    content: "Any update on the attendance check-in crash from this morning?",
    participant: "sarah.johnson@toktickit.dev",
    ticketNumber: "TKT-2025-000003",
  },
];

// Seed Internal Notes (at least 2 different tickets, staff authors only).
const seedInternalNotes = [
  {
    content: "Found stale cache credentials in the mailbox profile; cleared and re-verified access ourselves.",
    participant: "itstaff.kevin@toktickit.dev",
    ticketNumber: "TKT-2025-000001",
  },
  {
    content: "Contacted the vendor; replacement thermal pad expected next week before the on-site repair.",
    participant: "itstaff.kevin@toktickit.dev",
    ticketNumber: "TKT-2026-000902",
  },
  {
    content: "Root cause looks like a race condition in the sync service; logged for backend team review.",
    participant: "itstaff.james@toktickit.dev",
    ticketNumber: "TKT-2025-000003",
  },
  {
    content: "Requested a re-issue of the certificate from the CA; follow up Friday.",
    participant: "itstaff.sara@toktickit.dev",
    ticketNumber: "TKT-2026-000901",
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }

  const categoryRows = await prisma.category.findMany();
  const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));

  for (const system of relatedSystems) {
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

  for (const requester of requesters) {
    await prisma.requester.upsert({
      where: { email: requester.email },
      update: requester,
      create: requester,
    });
  }

  // ---- Users (real Lab 3 authentication accounts), idempotent upsert by email ----
  const hashCache = new Map<string, string>();
  const hashFor = (password: string): string => {
    let hash = hashCache.get(password);
    if (!hash) {
      hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      hashCache.set(password, hash);
    }
    return hash;
  };

  for (const user of users) {
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
  //  which keeps the seed idempotent. See specification.md §7 "Migration Decision".
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
  for (const seed of seedTickets) {
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
  const commentContents = seedPublicComments.map((c) => c.content);
  const noteContents = seedInternalNotes.map((n) => n.content);

  // Scope deletes to the seed tickets AND the exact seed strings, so a user-posted comment/note
  // that happens to match a seed string is never removed on re-run.
  const seedTicketIds = (
    await prisma.ticket.findMany({
      where: { ticketNumber: { in: seedTickets.map((t) => t.ticketNumber) } },
      select: { id: true },
    })
  ).map((t) => t.id);

  await prisma.publicComment.deleteMany({
    where: { ticketId: { in: seedTicketIds }, content: { in: commentContents } },
  });
  await prisma.internalNote.deleteMany({
    where: { ticketId: { in: seedTicketIds }, content: { in: noteContents } },
  });

  for (const seed of seedPublicComments) {
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

  for (const seed of seedInternalNotes) {
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