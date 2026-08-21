# Lab 2 Sprint Engineering Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 2: Requester Ticketing MVP with UI Foundation |
| **Version** | v1.0 APPROVED — student-reviewed, baseline for implementation |
| **Date** | 2026-08-21 |
| **Sources** | Derived from the CPE 334 Lab 2 labsheet (course-provided handouts, kept outside the repository) |
| **Related docs** | `api-spec.md`, `ui-spec.md`, `tests.md` |

---

## 1. Sprint Goal

Deliver a professional, responsive Requester-facing ticketing experience. A Requester selects a temporary Development Requester identity (testing mechanism, not authentication), creates an IT support ticket with category, related system, priority, description, and attachments, receives a unique backend-generated Ticket Number, and can then find their own tickets in My Tickets using search, filters, sorting, and pagination, open a read-only Ticket Detail, and manage attachments (add, download, soft-remove with reason). All screens follow a reusable Zen Green design system, and one Requester can never see another Requester's data.

## 2. Stakeholder Request Interpretation

The IT department wants real end users to start submitting support requests now, before login exists. So this sprint simulates identity: the user first picks who they are from seeded Development Requesters, and everything they do afterwards belongs to that person. The core loop is: describe a problem → classify it → attach evidence → submit → find it again later → inspect and manage its attachments. The system must generate the official ticket number itself, keep data safe, and strictly separate requesters from each other. The UI must establish a consistent Zen Green visual system that later sprints reuse instead of reinventing.

## 3. Scope

### Included
- Development Requester Selection screen (simulated "login") and requester context with Change Requester.
- Create Ticket screen: all required fields, frontend + backend validation, attachment staging, busy submit, success state showing the generated Ticket Number.
- My Tickets screen: owned-ticket list with search, filters, sorting, pagination, and loading / empty / no-results / error states.
- Requester Ticket Detail screen: read-only ticket information plus attachment management.
- Attachment lifecycle: upload (type/size/count validated), download of active files, soft removal with mandatory reason.
- Ownership protection enforced in the backend on every ticket/attachment endpoint.
- Reference data APIs: active Categories, active Related Systems, active Development Requesters.
- Idempotent seed data and Prisma schema/migrations for all new models.
- Zen Green theme tokens and reusable form/list/badge/state components.
- Automated tests: unit, API, UI component, UI style, responsive, E2E.

### Excluded
- Authentication and security: login/logout, passwords, hashing, sessions, tokens, role-based authorization. The selector is explicitly NOT secure authentication.
- IT Staff workflow: staff dashboard/queue, claiming, reassigning, changing IT Priority.
- Collaboration: Public Comments, Internal Notes, Actions Taken.
- Lifecycle beyond creation: any status change after New (resolve, close, reopen, cancel).
- Administration: managing users, requesters, roles, categories, related systems.

## 4. Functional Requirements

- **FR-01:** The app loads active Development Requesters from the database into the Selection screen dropdown.
- **FR-02:** After selection, the shell displays the selected requester's name and offers a Change Requester action; changing the selection reloads all requester-specific data.
- **FR-03:** Ticket screens are inaccessible until a requester is selected; the app redirects to the Selection screen.
- **FR-04:** The Selection screen shows loading, empty (no active requesters), and API-failure states safely.
- **FR-05:** The Create Ticket form captures Category, Related System, Requested Priority, Summary, Description, and staged Attachments; Ticket Number, Ticket Date, and Requester are displayed read-only.
- **FR-06:** The Related System dropdown always filters its options by the chosen Category: a system appears when its `categoryId` matches the selected category or when it has no category assignment (general system).
- **FR-07:** Both client and server validate every submitted field; server validation is authoritative.
- **FR-08:** On successful creation the backend generates the official Ticket Number, sets status New, persists the ticket, and returns it; the success state displays the number and a next action.
- **FR-09:** While a submission is in flight the Submit button is disabled and shows a busy indicator; duplicate submissions are impossible.
- **FR-10:** If creation fails (validation or network/server error), all user-entered values remain in the form with field-level messages where applicable.
- **FR-11:** My Tickets lists only the selected requester's tickets with columns/card fields sufficient to identify each ticket (Ticket Number, Summary, Category, Requested Priority, IT Priority, Current Status, Last Updated).
- **FR-12:** My Tickets supports case-insensitive partial search over Ticket Number and Summary.
- **FR-13:** My Tickets supports filtering by Category, Current Status, and Requested Priority, combinable with search, plus Clear Filters.
- **FR-14:** My Tickets supports sorting by these whitelisted fields only: Last Updated (`updatedAt`), Created Date (`createdAt`), Requested Priority (`requestedPriority`), Ticket Number (`ticketNumber`) each in ascending or descending order; any other `sortBy` value is rejected (BR-19).
- **FR-15:** My Tickets pagination returns page metadata (total, page, pageSize, totalPages) and page-size selection (bounded).
- **FR-16:** Ticket Detail shows one owned ticket fully read-only, grouped clearly, with status/priority badges and back navigation.
- **FR-17:** The owner can add permitted attachments to an existing owned ticket and download active attachments.
- **FR-18:** The owner can soft-remove an active attachment after providing a mandatory removal reason of 3–200 characters after trim (per BR-15; trivial input such as "." or spaces is rejected); removed attachments stay listed as metadata but cannot be downloaded or previewed.

## 5. Business Rules

- **BR-01:** The official Ticket Number is generated only by the backend on successful creation, format `TKT-YYYY-XXXXXX` (year + zero-padded sequence), globally unique.
- **BR-02:** Every new Ticket starts with Current Status `NEW`; no other transition exists in Lab 2.
- **BR-03:** The Development Requester selector is a testing mechanism replacing login; it provides no security and must be labeled as such in the UI.
- **BR-04:** Inactive requesters never appear in the selector and cannot own new tickets (requests referencing them fail).
- **BR-05:** A requester can view, search, open, and modify attachments only for tickets they own (`requesterId` must match). Foreign resources return 403; missing resources return 404.
- **BR-06:** Allowed attachment types: JPG/JPEG, PNG, WEBP, PDF (checked by MIME type and extension).
- **BR-07:** Maximum attachment size: 5 MB per file (violations → 413).
- **BR-08:** Maximum 5 active (non-removed) attachments per ticket at any time (violations → 400).
- **BR-09:** Removal is soft only: set `isRemoved = true`, record `removedAt` timestamp and mandatory `removalReason`. Files are never hard-deleted in Lab 2.
- **BR-10:** Removed attachments remain visible as metadata (name, size, removed date, reason) but download/preview is blocked (410 Gone).
- **BR-11:** Submit actions show a busy state and are disabled during processing to prevent duplicate submissions.
- **BR-12:** On submission failure all user-entered form values are retained.
- **BR-13:** Required fields: Category, Related System, Requested Priority, Summary, Description. Values are trimmed before validation and save; whitespace-only counts as empty.
- **BR-14:** Length limits: Summary 1–120 chars, Description 1–2000 chars (after trim), enforced on both client and server.
- **BR-15:** Removal reason is required free text, 3–200 chars after trim.
- **BR-16:** Only the owning requester may add or remove attachments on a ticket.
- **BR-17:** Search matches partial strings, case-insensitive, across Ticket Number and Summary only.
- **BR-18:** Default list sort: Last Updated descending; secondary sort key Ticket Number descending for stable ordering.
- **BR-19:** Invalid query parameters (unknown sortBy, non-numeric page, pageSize out of range) return 400 with a safe message.
- **BR-20:** Empty state (requester owns no tickets) and no-results state (filters matched nothing) are visually distinct.
- **BR-21:** Ticket Date equals creation timestamp and is read-only thereafter.
- **BR-22:** Attachment staging at create time validates type/size/count client-side before submission; actual upload happens only after the ticket is created. If an upload fails, the ticket remains valid and the user sees which file failed with a retry action (compensation strategy, see AD-03).

## 6. UI Specification Summary

Full details in `ui-spec.md`. Summary:

- **Application shell:** TokTickIT brand header (primary green), navigation for My Tickets and Create Ticket, current requester name with Change Requester, clear active-page indication, responsive mobile navigation.
- **Requester Selection:** centered card, explanatory text that this is Lab 2 testing only (not login), dropdown of active requesters, Continue button, loading/empty/failure states, keyboard accessible.
- **Create Ticket:** read-only system fields visually distinct at top (shaded background); classification group (Category, Related System, Priority); full-width Summary and Description; attachment staging area below; primary Submit + Cancel at bottom. Field-level validation messages under each invalid field; red asterisk on required fields; success panel shows generated Ticket Number.
- **My Tickets:** filter bar (search, three filters, Clear Filters) with an always-visible Create Ticket action, desktop table / mobile cards, badge styling for Requested Priority, IT Priority, Current Status, pagination controls, four distinct states (loading, empty, no-results, error).
- **Ticket Detail:** read-only info grid, badges, attachment section (active list with download/remove, removed list as muted metadata, upload control), no comments/notes/actions sections.
- **Zen Green tokens:** Primary #006B3C, Secondary #0B7A46, Pale #EAF6EF, Page #F5F7F6, Text #1C2826, Error #B91C1C, Warning #D97706, Success #047857; editable vs read-only field shading distinct.
- **Responsive:** desktop ≥992px multi-column centered (max 1200px); tablet 768–991px two-column; mobile <768px single column, touch-friendly targets, no horizontal page scrolling.

## 7. Data Changes

New Prisma models (PostgreSQL). Existing `Category` model extended.

| Model | Fields (key ones) | Notes |
| :--- | :--- | :--- |
| **Requester** | id, name, email (unique), department?, isActive (default true), createdAt, updatedAt | Development identity; designed so Lab 3 auth can link a real User without breaking tickets |
| **Category** | id, name (unique), description?, isActive (default true), createdAt | Add `isActive` + `description` to existing Lab 1 model |
| **RelatedSystem** | id, name (unique), categoryId? FK (null = general system), isActive (default true), createdAt, updatedAt | Specific service/app/device affected; nullable FK enables Category filtering |
| **Ticket** | id, ticketNumber (unique), summary, description, requestedPriority (enum), itPriority (enum, nullable), currentStatus (enum, default NEW), ticketDate (default now), requesterId FK, categoryId FK, relatedSystemId FK, createdAt, updatedAt | See indexes below |
| **Attachment** | id, ticketId FK, originalFileName, storageFileName (unique), fileSize Int, mimeType, uploadedByRequesterId FK, isRemoved (default false), removedAt?, removalReason?, createdAt | Soft removal via flag + timestamp + reason |

**Enums:** `RequestedPriority`: LOW, MEDIUM, HIGH, URGENT. `TicketStatus`: NEW only in Lab 2 — this is the sole value; no other status exists and no status transition is implemented or exposed anywhere (per BR-02).

**Relationships:** Requester 1-N Ticket; Ticket 1-N Attachment; Category 1-N Ticket; RelatedSystem 1-N Ticket; Attachment also records uploading requester (FK) for audit.

**Indexes and constraints:**
- `ticketNumber` unique (also the lookup key for search).
- `@@index([requesterId, updatedAt])` on Ticket — **justification:** every list query filters by `requesterId` and default-sorts by `updatedAt`; this composite index serves both without extra reads.
- `@@index([ticketId, isRemoved])` on Attachment — count/list active attachments fast for the 5-file cap check.
- FK columns indexed (`categoryId`, `relatedSystemId`) for filter joins.
- Soft removal represented by `isRemoved` + `removedAt` + `removalReason` (audit trail preserved; rows never deleted).
- Optional fields: `department`, `description` (both reference models), `itPriority`, `removedAt`, `removalReason`.
- **Lab 3 evolution:** adding real auth means mapping Requester to an authenticated User; keeping `requesterId` as an explicit FK on Ticket/Attachment today means endpoints switch from query/body-supplied ID to token-derived ID with minimal schema change.

**Migration decision:** incremental `prisma migrate dev` migrations committed to the repo; seed via idempotent upserts in `prisma/seed.ts`.

**Seed data (idempotent):**
- Categories exactly: Account and Access, Hardware, Software, Network.
- Related Systems (7): Email, Campus Wi-Fi, VPN, LEB2 App, Grade Submission App, Printer, Corporate Laptop — each assigned a `categoryId` where a clear primary category exists (e.g., Campus Wi-Fi → Network); systems spanning categories stay unassigned (general).
- Active requesters (5): Jennifer Anderson, David Lee, Sarah Johnson, Michael Brown, Napat Chaiwong — realistic emails `@toktickit.dev`.
- Inactive requester (1): Robert Brown (`isActive: false`) — must never appear in the selector.

## 8. API Contract

Full request/response shapes in `api-spec.md`. Endpoint summary:

| Method | Path | Purpose | Success | Errors |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/dev/requesters` | Active requesters for selector | 200 | 500 |
| GET | `/api/categories` | Active categories | 200 | 500 |
| GET | `/api/related-systems?categoryId=` | Active related systems | 200 | 400, 500 |
| POST | `/api/tickets` | Create ticket (JSON body incl. `requesterId`) | 201 | 400, 404, 500 |
| GET | `/api/tickets?requesterId=&search=&categoryId=&currentStatus=&requestedPriority=&sortBy=&sortOrder=&page=&pageSize=` | Owned paginated list | 200 | 400, 404, 500 |
| GET | `/api/tickets/:id?requesterId=` | Owned detail + attachment metadata | 200 | 400, 403, 404, 500 |
| POST | `/api/tickets/:id/attachments` | Upload (multipart: file + requesterId) | 201 | 400, 403, 404, 413, 415, 500 |
| GET | `/api/attachments/:id/download?requesterId=` | Binary download of active file | 200 | 400, 403, 404, 410, 500 |
| DELETE | `/api/attachments/:id` | Soft remove (body: requesterId, removalReason) | 200 | 400, 403, 404, 500 |

Contract decisions:
- Identity transport: `requesterId` as query parameter on GET, JSON body field on POST/DELETE (AD-02).
- Ownership mismatch → 403; resource does not exist → 404 (AD-01).
- Download endpoint: active file → 200 with binary content; soft-removed file → **410 Gone** (per BR-10 / AC-24); foreign attachment → 403; unknown id → 404.
- Attachment metadata is returned inside the Ticket Detail response (covers the "retrieve attachment metadata" capability without a separate endpoint).
- List response envelope: `{ data: [...], meta: { total, page, pageSize, totalPages } }`.
- All unexpected errors return 500 with a safe generic message; no stack traces or internal details.

## 9. Acceptance Criteria

Creation
- **AC-01:** Given valid ticket data, when the requester submits, then one ticket is saved with status NEW and the success state displays the backend-generated Ticket Number.
- **AC-02:** Given Summary is empty or whitespace, when submitted, then a field-level message appears and no API call is made.
- **AC-03:** Given Summary >120 or Description >2000 chars, when submitted, then validation blocks submission with a length message on both client and server side.
- **AC-04:** Given a submission is in flight, when the user clicks Submit again, then nothing happens (button disabled/busy) and exactly one ticket is created.
- **AC-05:** Given the backend is unreachable, when the user submits, then a safe error appears and all typed values remain in the form.
- **AC-06:** Given a staged file of a disallowed type or >5 MB, when added, then it is rejected immediately with a clear message and never sent to the server.

Development Requester context
- **AC-07:** Given no requester is selected, when the user opens My Tickets or Create Ticket, then they are redirected to the Selection screen.
- **AC-08:** Given seeded data, when the dropdown loads, then only active requesters appear (inactive Robert Brown absent).
- **AC-09:** Given requester A is selected and the user switches to B, then all requester-specific data reloads for B and the header shows B's name.
- **AC-10:** Given a selected requester, when the browser refreshes, then the selection is restored from localStorage.

Listing
- **AC-11:** Given requester A owns tickets and requester B is selected, then only B's tickets are returned (never A's).
- **AC-12:** Given a search term, when applied, then results match Ticket Number or Summary partially and case-insensitively.
- **AC-13:** Given multiple filters combined with search, when applied, then results satisfy all conditions simultaneously; Clear Filters resets everything.
- **AC-14:** Given a sort field and order, when applied, then results order accordingly; default is Last Updated descending.
- **AC-15:** Given page/pageSize parameters, when requested, then correct subset and metadata `{total, page, pageSize, totalPages}` return; pageSize >50 or unknown sortBy returns 400.
- **AC-16:** Given a requester with no tickets vs. filters matching nothing, then the empty state and the no-results state render distinctly.

Detail and ownership
- **AC-17:** Given an owned ticket, when opened, then all fields display read-only with correct badges and no edit controls.
- **AC-18:** Given requester B requests ticket of requester A by ID, then the API responds 403 and no ticket data is exposed; unknown ID returns 404.

Attachments
- **AC-19:** Given an owned ticket with <5 active attachments, when the owner uploads a valid file, then it appears in the active list (201).
- **AC-20:** Given a 6th active attachment attempt, then the API rejects with 400 and the UI explains the limit.
- **AC-21:** Given an oversized (>5 MB) or unsupported-type upload reaching the server, then it returns 413 or 415 respectively.
- **AC-22:** Given an active attachment, when the owner downloads it, then the original file content downloads correctly.
- **AC-23:** Given an active attachment, when the owner removes it without a reason, then removal is blocked; with a valid reason (3–200 chars), then it becomes removed with timestamp recorded and stays listed as metadata.
- **AC-24:** Given a removed attachment, when anyone attempts download, then the API returns 410 and the UI disables the action.

Responsive and accessibility
- **AC-25:** At mobile width (<768px), all screens stack vertically with no horizontal page scrolling and touch-friendly controls.
- **AC-26:** All forms are keyboard operable with visible focus indicators, labels associated with controls, and required-field asterisks present (asterisk never replaces the validation message).

## 10. Definition of Done (Product)

- [ ] All Included scope implemented; no Excluded features present.
- [ ] Every AC above verified by at least one automated test traced in `tests.md`.
- [ ] All unit, API, UI, style, responsive, and E2E tests pass from documented commands on final `main`.
- [ ] No test skipped, disabled, or commented out.
- [ ] Backend enforces ownership on every ticket/attachment endpoint (verified by cross-requester tests).
- [ ] Screens conform to `ui-spec.md` (tokens, states, badges, responsive breakpoints) confirmed by screenshots at 3 viewports.
- [ ] Implemented endpoints conform to `api-spec.md` (paths, request/response shapes, validation, status codes); Prisma schema matches Section 7 with committed migrations.
- [ ] Responsive screenshots captured at Desktop, Tablet, and Mobile into `artifacts/lab-02/screenshots/` (create-ticket, my-tickets, ticket-detail), ready for submission evidence Parts 1 and 9.
- [ ] Peer-review evidence recorded in `docs/lab-02/reviewer.md`: reviewer identity, PR links, comments given and received, responses, and approvals.
- [ ] Validation works identically client- and server-side; failure paths preserve data (BR-12).
- [ ] Seed runs idempotently; migrations apply cleanly on an empty database.
- [ ] README documents setup, env vars, docker, prisma generate/migrate/seed, and test commands accurately.
- [ ] `docs/lab-02/ai-use.md` records the LLM used, 6–10 key prompts, and a short reflection.
- [ ] All work merged through reviewed PRs: feature branches → `lab2-staging` → one release PR → `main`; GitHub Project Kanban shows every issue in Done.
- [ ] Student can explain every implementation choice and demonstrate failure cases live.

## 11. Assumptions and Decisions

Student-approved decisions:
- **AD-01:** Ownership failures use guide-style mixed statuses: 403 when the resource exists but belongs to another requester, 404 when it does not exist.
- **AD-02:** `requesterId` travels as a query parameter on GET requests and a JSON body field on POST/DELETE (matches guide examples; no headers needed).
- **AD-03:** Create-time attachments are staged client-side, validated locally, uploaded sequentially after successful ticket creation; a failed upload keeps the ticket and shows a per-file retry warning (ticket is never rolled back — compensation strategy).
- **AD-04:** Selected requester persists in localStorage across refreshes; Change Requester always available; clearing storage returns to the Selection screen.

Additional assumptions (agent-proposed, student to confirm):
- **AD-05:** Related System is required; its dropdown always filters by the chosen Category (definitive, resolving the handout's ambiguous "may be filtered"). Systems without a category assignment are treated as general and appear for every category. Implemented via nullable `categoryId` FK on RelatedSystem.
- **AD-06:** `itPriority` column exists (nullable) for schema completeness but is never set in Lab 2; My Tickets renders "—" until later labs.
- **AD-07:** Pagination defaults: `page=1`, `pageSize=10`, allowed range 1–50; sortable whitelist: `updatedAt`, `createdAt`, `requestedPriority`, `ticketNumber`.
- **AD-08:** Ticket numbers sequence per calendar year derived from a counted max inside the create transaction, protected by the unique constraint with retry on collision.
- **AD-09:** Uploads stored on local disk under a gitignored `server/uploads/` directory with UUID-based storage filenames; original names kept as metadata only.
- **AD-10:** Single Playwright project covers the responsive screenshot matrix (desktop 1440px, tablet 820px, mobile 390px).

---

*End of specification. This document is the engineering contract for the AI coding agent; changes require student approval and a version bump.*

**Approval:** Reviewed and approved by the student on 2026-08-21. AD-01–AD-10 confirmed. This version is the implementation baseline (Spec DD evidence).
