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


export type SeedActionTaken = {
  // Stable id the seed owns: re-seeding deletes exactly these rows and
  // recreates them, never a whole-Ticket sweep (specification.md section 7
  // "replace the Lab 4 Action Taken rows by their own known ids").
  id: number;
  ticketNumber: string;
  performedBy: string; // email of IT Staff/Admin
  actionDate: string;
  description: string;
  result: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
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
  // =====================================================================
  // Lab 4 seed block TKT-2026-000903 .. 000917 (BR-24, specification.md
  // section 7 "Seed Data Requirements"). These numbers are reserved for Lab 4
  // and must never be reused by a real Ticket (the seed upserts on
  // ticketNumber). The block deliberately mixes statuses, priorities,
  // assigned/unassigned ownership, and itPriority set AND unset (the unset
  // case exercises BR-25's IS NULL branch). Action Taken coverage is handled by
  // SEED_ACTIONS_TAKEN below: zero/one/many across this block only.
  // =====================================================================
  {
    ticketNumber: "TKT-2026-000903",
    summary: "Laptop will not start after BIOS update",
    description: "The corporate laptop hangs at the vendor logo after a scheduled BIOS update and will not reach Windows.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.OPEN,
    requester: "jennifer.anderson@toktickit.dev",
    owner: "itstaff.kevin@toktickit.dev",
    relatedSystem: "Corporate Laptop",
    category: "Hardware",
    ticketDate: "2026-09-20T07:45:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000904",
    summary: "Unable to log into LEB2 App after password reset",
    description: "The user reset their password but the LEB2 App still rejects the new credentials at login.",
    requestedPriority: "MEDIUM",
    itPriority: null,
    currentStatus: TicketStatus.NEW,
    requester: "david.lee@toktickit.dev",
    owner: null,
    relatedSystem: "LEB2 App",
    category: "Software",
    ticketDate: "2026-09-20T13:30:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000905",
    summary: "Printer in Room 305 offline",
    description: "The shared printer in Room 305 shows offline in the print queue and no jobs are processing.",
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
    requester: "sarah.johnson@toktickit.dev",
    owner: "itstaff.sara@toktickit.dev",
    relatedSystem: "Printer",
    category: "Hardware",
    ticketDate: "2026-09-22T08:00:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000906",
    summary: "Grade submission app rejects CSV upload",
    description: "Uploading the semester grades as a CSV fails with a generic error after the first column.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.IN_PROGRESS,
    requester: "michael.brown@toktickit.dev",
    owner: "itstaff.james@toktickit.dev",
    relatedSystem: "Grade Submission App",
    category: "Software",
    ticketDate: "2026-09-21T09:15:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000907",
    summary: "Email not syncing on mobile after travel",
    description: "After returning from travel, the user's mailbox no longer syncs on the mobile mail app.",
    requestedPriority: "URGENT",
    itPriority: null,
    currentStatus: TicketStatus.REOPENED,
    requester: "napat.chaiwong@toktickit.dev",
    owner: null,
    relatedSystem: "Email",
    category: "Account and Access",
    ticketDate: "2026-09-22T17:20:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000908",
    summary: "New hire laptop imaging request",
    description: "A new staff member starts next week and needs a corporate laptop imaged with the standard software set.",
    requestedPriority: "MEDIUM",
    itPriority: null,
    currentStatus: TicketStatus.NEW,
    requester: "jennifer.anderson@toktickit.dev",
    owner: null,
    relatedSystem: "Corporate Laptop",
    category: "Hardware",
    ticketDate: "2026-09-23T10:05:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000909",
    summary: "Campus Wi-Fi very slow in Building 2",
    description: "Wi-Fi in Building 2 is nearly unusable during office hours; the signal bar shows full strength.",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: TicketStatus.IN_PROGRESS,
    requester: "david.lee@toktickit.dev",
    owner: "itstaff.kevin@toktickit.dev",
    relatedSystem: "Campus Wi-Fi",
    category: "Network",
    ticketDate: "2026-09-23T08:30:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000910",
    summary: "VPN keeps disconnecting on campus network",
    description: "The VPN tunnel drops every few minutes for one user while the laptop is on the campus LAN.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.OPEN,
    requester: "sarah.johnson@toktickit.dev",
    owner: "itstaff.sara@toktickit.dev",
    relatedSystem: "VPN",
    category: "Network",
    ticketDate: "2026-09-23T14:40:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000911",
    summary: "Request admin rights for lab software install",
    description: "A lab assistant needs temporary local admin rights to install a package for classroom exercises.",
    requestedPriority: "LOW",
    itPriority: null,
    currentStatus: TicketStatus.NEW,
    requester: "michael.brown@toktickit.dev",
    owner: null,
    relatedSystem: "Corporate Laptop",
    category: "Account and Access",
    ticketDate: "2026-09-24T09:00:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000912",
    summary: "No audio output on video calls",
    description: "The laptop plays system sounds but produces no audio during Zoom and Teams calls.",
    requestedPriority: "LOW",
    itPriority: null,
    currentStatus: TicketStatus.OPEN,
    requester: "napat.chaiwong@toktickit.dev",
    owner: "itstaff.james@toktickit.dev",
    relatedSystem: "Corporate Laptop",
    category: "Hardware",
    ticketDate: "2026-09-24T11:25:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000913",
    summary: "Printer tray jam in Room 210",
    description: "Tray 2 keeps jamming when paper is loaded, disrupting printing for the whole floor.",
    requestedPriority: "URGENT",
    itPriority: "HIGH",
    currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
    requester: "jennifer.anderson@toktickit.dev",
    owner: "itstaff.sara@toktickit.dev",
    relatedSystem: "Printer",
    category: "Hardware",
    ticketDate: "2026-09-25T08:10:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000914",
    summary: "Shared drive very slow on marketing folder",
    description: "Opening the marketing shared drive takes over a minute and file copies stall.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: TicketStatus.OPEN,
    requester: "david.lee@toktickit.dev",
    owner: "itstaff.kevin@toktickit.dev",
    relatedSystem: "Email",
    category: "Account and Access",
    ticketDate: "2026-09-25T13:50:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000915",
    summary: "Outlook crashes when opening the calendar",
    description: "Outlook closes without warning every time the user opens the shared calendar view.",
    requestedPriority: "MEDIUM",
    itPriority: null,
    currentStatus: TicketStatus.NEW,
    requester: "sarah.johnson@toktickit.dev",
    owner: null,
    relatedSystem: "Email",
    category: "Account and Access",
    ticketDate: "2026-09-26T09:35:00.000Z",
    resolutionSummary: null,
  },
  {
    ticketNumber: "TKT-2026-000916",
    summary: "Grade submission app server crash on final upload",
    description: "The upload service crashed twice under concurrent final submissions; grades were not persisted.",
    requestedPriority: "URGENT",
    itPriority: "URGENT",
    currentStatus: TicketStatus.IN_PROGRESS,
    requester: "michael.brown@toktickit.dev",
    owner: "itstaff.kevin@toktickit.dev",
    relatedSystem: "Grade Submission App",
    category: "Software",
    ticketDate: "2026-09-24T08:20:00.000Z",
    resolutionSummary: "Raised the upload worker memory limit and verified uploads succeed at full load.",
  },
  {
    ticketNumber: "TKT-2026-000917",
    summary: "Downloaded campus app shows stale course list",
    description: "The campus app keeps showing last semester's course list even after the data refresh.",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: TicketStatus.IN_PROGRESS,
    requester: "napat.chaiwong@toktickit.dev",
    owner: "itstaff.james@toktickit.dev",
    relatedSystem: "LEB2 App",
    category: "Software",
    ticketDate: "2026-09-26T14:10:00.000Z",
    resolutionSummary: "Waiting for the backend cache flush; summary written but work is not yet complete.",
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

// Lab 4 seed block (BR-24): TKT-2026-000903 .. TKT-2026-000917. Derived from
// SEED_TICKETS so the block definition and the tickets can never drift.
export const SEED_LAB4_TICKET_NUMBERS: string[] = SEED_TICKETS.map(
  (t) => t.ticketNumber,
).filter((n) => /^TKT-2026-0009(?:0[3-9]|1[0-7])$/.test(n));

// Seed Actions Taken (Lab 4, handout section 5.3). Only tickets in the Lab 4
// block carry seeded actions — historical Tickets keep zero Action Taken
// (BR-21), so all three shapes are demonstrable:
//   zero     TKT-2026-000904, 000907, 000908, 000910, 000911, 000912, 000913,
//            000914, 000915 and 000917 carry NO actions (000917 has a
//            resolution summary but no action, exercising the BR-11 gate
//            reject side).
//   one      TKT-2026-000905 carries exactly one action, no follow-up.
//   many     TKT-2026-000903, 000906, 000909 and 000916 carry 2-3 actions;
//            000906 has a pair sharing one actionDate to exercise the BR-06
//            tie-break; 000906 and 000909 include a performer who is NOT the
//            Ticket Owner (BR-02); 000903 and 000906 include a
//            followUpRequired = true action with a note (BR-04).
export const SEED_ACTIONS_TAKEN: SeedActionTaken[] = [
  // TKT-2026-000903: many actions (3) — Kevin then Sara
  {
    id: 1,
    ticketNumber: "TKT-2026-000903",
    performedBy: "itstaff.kevin@toktickit.dev",
    actionDate: "2026-09-20T09:00:00.000Z",
    description: "Reviewed the BIOS update logs from the boot partition.",
    result: "Failed update detected; recovery image available.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: "See bios-update-log.png in the ticket attachments.",
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-000903",
    performedBy: "itstaff.kevin@toktickit.dev",
    actionDate: "2026-09-20T09:40:00.000Z",
    description: "Reapplied the previous BIOS version from the recovery image.",
    result: "The laptop boots normally again.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
  {
    id: 3,
    ticketNumber: "TKT-2026-000903",
    performedBy: "itstaff.sara@toktickit.dev",
    actionDate: "2026-09-20T11:00:00.000Z",
    description: "Checked that all drivers reloaded after the BIOS restore.",
    result: "No further boot errors reported by the user.",
    followUpRequired: true,
    followUpNote: "Monitor the laptop for 48 hours; advise pausing BIOS updates until IT approves.",
    attachmentNotes: null,
  },
  // TKT-2026-000905: exactly one action, no follow-up
  {
    id: 4,
    ticketNumber: "TKT-2026-000905",
    performedBy: "itstaff.sara@toktickit.dev",
    actionDate: "2026-09-22T08:30:00.000Z",
    description: "Inspected the printer's network connection and print queue.",
    result: "Printer was paused on the print server; queue resumed.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
  // TKT-2026-000906: many actions (3), incl. a same-actionDate pair (BR-06
  // tie-break) and a performer (Sara) who is not the Owner (James, BR-02)
  {
    id: 5,
    ticketNumber: "TKT-2026-000906",
    performedBy: "itstaff.james@toktickit.dev",
    actionDate: "2026-09-21T10:00:00.000Z",
    description: "Reproduced the CSV parse failure with the upload sample.",
    result: "Confirmed a UTF-8 BOM handling bug in the import parser.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
  {
    id: 6,
    ticketNumber: "TKT-2026-000906",
    performedBy: "itstaff.sara@toktickit.dev",
    actionDate: "2026-09-21T10:00:00.000Z",
    description: "Patched the parser to strip the BOM before header mapping.",
    result: "The sample CSV now imports cleanly.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
  {
    id: 7,
    ticketNumber: "TKT-2026-000906",
    performedBy: "itstaff.james@toktickit.dev",
    actionDate: "2026-09-21T14:00:00.000Z",
    description: "Deployed the parser patch to the staging environment.",
    result: "Staging import passes the full regression suite.",
    followUpRequired: true,
    followUpNote: "Schedule the production deploy after the requester confirms the sample output.",
    attachmentNotes: "See import-fix-report.png in the ticket attachments.",
  },
  // TKT-2026-000909: many actions (2) — both by Sara, who is not the Owner
  // (Kevin, BR-02)
  {
    id: 8,
    ticketNumber: "TKT-2026-000909",
    performedBy: "itstaff.sara@toktickit.dev",
    actionDate: "2026-09-23T08:00:00.000Z",
    description: "Ran a site survey in Building 2 near the reported access point.",
    result: "Found radio interference from a newly installed lab device.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
  {
    id: 9,
    ticketNumber: "TKT-2026-000909",
    performedBy: "itstaff.sara@toktickit.dev",
    actionDate: "2026-09-23T10:30:00.000Z",
    description: "Reconfigured the nearest access point's channel plan.",
    result: "Signal strength measured stable across the whole floor.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
  // TKT-2026-000916: many actions (2) — meets BOTH resolution-gate conditions
  // (resolutionSummary + at least one Action Taken)
  {
    id: 10,
    ticketNumber: "TKT-2026-000916",
    performedBy: "itstaff.kevin@toktickit.dev",
    actionDate: "2026-09-24T09:00:00.000Z",
    description: "Diagnosed the application server crash during final upload.",
    result: "Out-of-memory condition under concurrent uploads.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
  {
    id: 11,
    ticketNumber: "TKT-2026-000916",
    performedBy: "itstaff.sara@toktickit.dev",
    actionDate: "2026-09-24T09:45:00.000Z",
    description: "Raised the upload worker memory limit and restarted the service.",
    result: "Uploads succeed at full load.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
  },
];

// The ids the seed owns — the only Action Taken rows a re-seed may delete.
export const SEED_ACTION_IDS: number[] = SEED_ACTIONS_TAKEN.map((a) => a.id);

// Derived view for the MIG-02 / MIG-05 regression suite: which Lab 4 block
// tickets carry actions and how many (grouping the single source of truth
// above). A ticket in the block that is absent from this record has zero.
export const SEED_ACTION_COUNTS_BY_TICKET: ReadonlyMap<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const a of SEED_ACTIONS_TAKEN) {
    counts.set(a.ticketNumber, (counts.get(a.ticketNumber) ?? 0) + 1);
  }
  return counts;
})();
