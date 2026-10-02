// Single source of truth for local-dev seed data.
//
// Shared by:
//   - prisma/seed.ts   (performs the actual upserts against Postgres)
//   - server/tests/lab-03/migration-regression.api.test.ts  (MIG-01 verifies the
//     seeded state, so it must never drift from what this module declares)
//
// Rule: add or change a seed row HERE, and both the seed run and the MIG-01
// regression assertions automatically see it. Do NOT inline seed data in the
// seed script or in test files.
//
// Credentials are LOCAL-DEV-ONLY — documented in docs/lab-03/seed-credentials.md.
import { UserRole, TicketStatus } from "../generated/prisma/client.js";
import type { RequestedPriority } from "../generated/prisma/client.js";
import { REQUESTER_PASSWORD, STAFF_PASSWORD, ADMIN_PASSWORD } from "./seedCredentials.js";

export type SeedCategory = { name: string };

export type SeedRelatedSystem = { name: string; categoryName: string | null };

export type SeedRequester = { name: string; email: string; isActive: boolean };

export type SeedUser = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  password: string;
};

export type SeedTicket = {
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

export type SeedPublicComment = {
  content: string;
  participant: string;
  ticketNumber: string;
};

export type SeedInternalNote = {
  content: string;
  participant: string;
  ticketNumber: string;
};

export const SEED_CATEGORIES: SeedCategory[] = [
  { name: "Account and Access" },
  { name: "Hardware" },
  { name: "Software" },
  { name: "Network" },
];

export const SEED_RELATED_SYSTEMS: SeedRelatedSystem[] = [
  { name: "Email", categoryName: null },
  { name: "Campus Wi-Fi", categoryName: "Network" },
  { name: "VPN", categoryName: "Network" },
  { name: "LEB2 App", categoryName: "Software" },
  { name: "Grade Submission App", categoryName: "Software" },
  { name: "Printer", categoryName: "Hardware" },
  { name: "Corporate Laptop", categoryName: "Hardware" },
];

export const SEED_REQUESTERS: SeedRequester[] = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.dev", isActive: true },
  { name: "David Lee", email: "david.lee@toktickit.dev", isActive: true },
  { name: "Sarah Johnson", email: "sarah.johnson@toktickit.dev", isActive: true },
  { name: "Michael Brown", email: "michael.brown@toktickit.dev", isActive: true },
  { name: "Napat Chaiwong", email: "napat.chaiwong@toktickit.dev", isActive: true },
  // isActive is intentionally false; re-seeding resets manual status changes (e.g. reactivation) back to seed values.
  { name: "Robert Brown", email: "robert.brown@toktickit.dev", isActive: false },
];

// Users — the real Lab 3 authentication accounts.
// Requester accounts below must match the legacy Requester.email exactly so the
// ticket backfill (requesterUserId) can map them. See migration decision in
// specification.md section 7.
export const SEED_USERS: SeedUser[] = [
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
export const SEED_TICKETS: SeedTicket[] = [
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
    itPriority: null,
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
export const SEED_PUBLIC_COMMENTS: SeedPublicComment[] = [
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
export const SEED_INTERNAL_NOTES: SeedInternalNote[] = [
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

// Derived view for regression tests: every documented account with its identity
// flags, so a test can verify seed intent without duplicating the data.
export const SEED_ACCOUNTS: ReadonlyArray<{
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}> = SEED_USERS.map((u) => ({
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  mustChangePassword: u.mustChangePassword,
}));

// Fresh-install floor: what a `prisma migrate deploy` + `prisma db seed` produces
// on an empty database. Derived from the arrays above, so the MIG-01 regression
// suite can never drift from the seed definition. Attachments are never seeded,
// hence the 0 floor.
export const SEED_BASELINE_COUNTS = {
  requester: SEED_REQUESTERS.length,
  category: SEED_CATEGORIES.length,
  relatedSystem: SEED_RELATED_SYSTEMS.length,
  ticket: SEED_TICKETS.length,
  attachment: 0,
} as const;