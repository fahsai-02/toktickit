# Lab 3 Sprint Engineering Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens |
| **Version** | v1.0 DRAFT — student-reviewed, baseline for implementation |
| **Date** | 2026-09-10 |
| **Sources** | Derived from the CPE 334 Lab 3 labsheet (course-provided handout) and Lab 2 completed increment |
| **Related docs** | `api-spec.md`, `ui-spec.md`, `tests.md` |

---

## 1. Sprint Goal

Replace the temporary Development Requester selector with real email/password authentication and role-based authorization. Introduce three roles — Requester, IT Staff, and Administrator — with server-side enforcement. Deliver an IT Staff Ticket Queue and Ticket Detail with claim/reassign, IT Priority, permitted status transitions, Public Comments, and Internal Notes. Deliver a minimalist Administrator User Management screen. All Lab 2 Requester functions continue to work using the authenticated identity. Every protected operation is enforced by the backend; hiding a button is not authorization.

## 2. Stakeholder Request Interpretation

The IT department needs real users instead of the simulated Development Requester selector. Administrators need a simple User Management screen to create accounts, assign roles, and manage activation. Requesters must keep using the ticket functions from Lab 2, but their identity must now come from a real login rather than a dropdown. IT Staff need a professional shared Ticket Queue to discover and prioritize work, open Ticket Detail, claim or reassign ownership, set IT Priority, communicate with Requesters through Public Comments, record private Internal Notes, and move Tickets through a permitted workflow. The system must be secure: every API and screen must be protected according to role and ownership.

## 3. Scope

### Included

- Email/password authentication with session-based identity.
- Mandatory first-login password change for users with an initial password.
- Role-based navigation and server-side authorization for Requester, IT Staff, and Administrator.
- Migration from Development Requester identity to the authenticated User model.
- Continued Requester ownership protection for all Lab 2 Ticket and Attachment functions.
- Public Comments on Tickets (append-only in Lab 3).
- "Problem Appears Resolved" indication by Requester (does not change formal status).
- IT Staff Ticket Queue with search, filters, sorting, and pagination.
- IT Staff Ticket Detail with claim/reassign, IT Priority, permitted status changes, Public Comments, Internal Notes, Resolution Summary, and Attachments.
- Minimalist Administrator User Management: user list, create user, edit name/email/role/activation, set initial password, safety rules (self-deactivation guard, last-admin guard).
- Idempotent seed data for all three roles with realistic ticket distribution.
- Prisma schema evolution without discarding existing data.
- Zen Green UI extensions for all new screens.

### Explicitly Excluded

- Email invitations, password-reset email, MFA, social login, SSO, self-registration.
- Actions Taken by IT Staff (deferred to Lab 4).
- Formal SLA calculation, escalation rules, notification services.
- Dashboards and KPI analytics beyond simple queue counts.
- Multi-tenant organizations, departments, customer administration.
- Production-grade deployment or cloud infrastructure.
- Multiple roles per user.
- User deletion, bulk operations, import/export, account-history screens.
- Department, organization, profile-photo, and extended user-profile management.
- Email delivery of initial passwords or reset links.
- Account unlocking, administrator approval workflows, advanced identity management.
- Advanced user-list pagination, multi-column sorting, multiple simultaneous filters.

## 4. Functional Requirements

### Authentication and Session

- **FR-01:** The login screen accepts an email address and password; on valid credentials the backend establishes a session and returns the authenticated user identity and role.
- **FR-02:** On invalid credentials the backend returns a generic "Invalid email or password. Please try again." message without revealing whether the email exists.
- **FR-03:** An inactive user cannot authenticate; the backend returns a safe error without exposing account status.
- **FR-04:** `POST /api/auth/logout` destroys the server session; subsequent protected calls return 401.
- **FR-05:** `GET /api/auth/me` returns the current authenticated user (id, name, email, role, mustChangePassword) or 401 if not authenticated.
- **FR-06:** A user with `mustChangePassword = true` cannot access normal application screens; the client redirects to `/change-password` until a valid new password is saved.
- **FR-07:** `POST /api/auth/change-password` validates the current password, enforces new-password rules (≥8 chars, upper+lower, digit, special char), hashes the new password, and clears `mustChangePassword`.
- **FR-08:** The authenticated application shell displays the current user's name and role; the Profile dropdown offers "Change Password" and "Logout" actions.

### Role-Based Navigation and Authorization

- **FR-09:** Unauthenticated users are redirected to `/login` from any protected route.
- **FR-10:** The Navbar shows only navigation links permitted for the authenticated user's role.
- **FR-11:** Every protected API endpoint distinguishes unauthenticated (401), authenticated-but-forbidden (403), invalid input (400), missing resource (404), and unexpected server error (500).

### Requester Regression and Public Comments

- **FR-12:** All Lab 2 ticket and attachment endpoints continue to work; `requesterId` is derived from the authenticated session, not from the client request body or query.
- **FR-13:** A client-supplied `requesterId` in the ticket-creation body is ignored; the server uses the session identity.
- **FR-14:** Newly created tickets initialize `itPriority` to the submitted `requestedPriority` value.
- **FR-15:** Requesters can only view and manage their own tickets; foreign tickets return 403.
- **FR-16:** `POST /api/tickets/:id/comments` creates a Public Comment on an own ticket (authenticated Requester); content is validated (1–2000 chars), author and timestamp are recorded server-side.
- **FR-17:** `GET /api/tickets/:id/comments` returns Public Comments for an own ticket, ordered newest-first.
- **FR-18:** Public Comments are append-only in Lab 3: `PUT` and `DELETE` on comment endpoints return 405.
- **FR-19:** `PUT /api/tickets/:id/indicate-resolved` toggles `requesterIndicatedResolved`: sets true (with timestamp) if currently false, clears to false if currently true; `currentStatus` is never changed by this endpoint.
- **FR-20:** The Requester Ticket Detail displays `resolutionSummary` in read-only ticket info when it has been set by IT Staff; when null the field is not shown.
- **FR-21:** The development-only `GET /api/dev/requesters` endpoint is removed from the server; the `/select-requester` route is removed from the client.

### IT Staff Ticket Queue

- **FR-22:** `GET /api/staff/tickets` returns a paginated ticket list for IT Staff and Administrators, with search (ticket number, summary), filters (status, priority, category, owner including "Unassigned" and "Assigned to me"), sorting (created date, updated date, IT Priority, status), and pagination metadata.
- **FR-23:** The default queue ordering when no `sort` parameter is provided is `updatedAt` descending; default page size is 10.
- **FR-24:** Invalid query parameters return 400 with a `VALIDATION_ERROR` code and descriptive field messages.
- **FR-25:** The UI renders a table with columns: Ticket No., Created Date, Summary, Category, Req. Priority, IT Priority, Status, Owner, Last Updated; status and priority columns show color-coded badges.

### IT Staff Ticket Detail

- **FR-26:** `GET /api/staff/tickets/:id` returns full ticket detail for staff including requester info, owner, priority, status, `resolutionSummary`, `requesterIndicatedResolved` indicator, and comments/notes/attachments with counts.
- **FR-27:** `PUT /api/staff/tickets/:id/claim` sets the current user as ticket owner (ticket must be unassigned or owned by another staff/admin).
- **FR-28:** `PUT /api/staff/tickets/:id/assign` reassigns the ticket to another active IT Staff or Administrator user.
- **FR-29:** `PUT /api/staff/tickets/:id/priority` updates IT Priority (only IT Staff or Administrator).
- **FR-30:** `PUT /api/staff/tickets/:id/status` enforces the status-transition matrix; disallowed transitions return 400.
- **FR-31:** `PUT /api/staff/tickets/:id/resolution-summary` saves a resolution summary visible to the Requester; empty/whitespace-only content is rejected (400).
- **FR-32:** `POST /api/staff/tickets/:id/comments` creates a Public Comment (staff/admin); `GET /api/staff/tickets/:id/comments` lists Public Comments (newest-first).
- **FR-33:** `POST /api/staff/tickets/:id/notes` creates an Internal Note (staff/admin); `GET /api/staff/tickets/:id/notes` lists Internal Notes (newest-first).
- **FR-34:** Internal Notes are append-only in Lab 3: `PUT` and `DELETE` on note endpoints return 405.
- **FR-35:** Internal Notes endpoint returns 403 for Requester role.
- **FR-36:** Comment and note content is validated (1–2000 chars); empty/whitespace-only and over-length content are rejected (400).
- **FR-37:** The IT Staff Ticket Detail UI shows breadcrumbs (`My Queue > Ticket Detail`), operational meta fields with correct editability, description card with Resolution Summary input, tabs for Public Comments, Internal Notes, and Attachments, and a "Requester indicates resolved" badge when applicable.
- **FR-38:** The status dropdown in the UI only lists permitted next states based on the current status.
- **FR-39:** The owner dropdown lists active IT Staff and Administrator users fetched from the backend.

### Administrator User Management

- **FR-40:** `GET /api/admin/users` returns the user list (name, email, role, isActive) with optional search (name/email) and optional role filter.
- **FR-41:** `POST /api/admin/users` creates a user with name, email, role, isActive, and an initial password; password is bcrypt-hashed; `mustChangePassword` is set to true.
- **FR-42:** Duplicate email addresses are rejected with 409 Conflict.
- **FR-43:** `PUT /api/admin/users/:id` updates name, email, role, and isActive.
- **FR-44:** `POST /api/admin/users/:id/reset-password` sets a new initial password and sets `mustChangePassword = true`.
- **FR-45:** An Administrator cannot deactivate their own account (403).
- **FR-46:** The last active Administrator cannot be deactivated (409).
- **FR-47:** Non-Administrator users cannot access admin endpoints (403).
- **FR-48:** The User Management UI displays a user list with Name, Email, Role, Status (Active/Inactive badge), and Edit action; a "+ Create User" button opens a right-side drawer; the drawer supports create and edit modes with validation, deactivation confirmation dialog, and safety feedback.

## 5. Business Rules

- **BR-01:** Only an active user with valid credentials may authenticate. Inactive users are rejected with a safe generic error that does not reveal account existence.
- **BR-02:** A user marked with `mustChangePassword = true` cannot enter the normal application until a new valid password is saved. The client enforces this via route guards; the backend returns `mustChangePassword` in the login/me response.
- **BR-03:** The authenticated user identity, not a `requesterId` supplied by the client, determines ownership of all Requester operations. A client-supplied `requesterId` is ignored.
- **BR-04:** Public Comments are visible to the Requester (ticket owner), IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator.
- **BR-05:** A Requester may indicate that the problem appears resolved (`requesterIndicatedResolved` toggle), but cannot formally set the Ticket to Resolved or Closed.
- **BR-06:** Login rate limiting and account lockout are explicitly deferred to a future lab; the authentication API does not enforce attempt limits in Lab 3.
- **BR-07:** Email addresses are normalized to lowercase on create and update; uniqueness comparison is case-insensitive.
- **BR-08:** Passwords must never be stored in plaintext; bcrypt hashing (cost 12) is used.
- **BR-09:** Session storage uses an in-memory store (acceptable for local development); session cookie is `httpOnly`, `sameSite: 'lax'`, with a defined `maxAge`. CSRF mitigation relies on `sameSite=lax` cookies combined with JSON-only API requests (no form-based state-changing endpoints).
- **BR-10:** The official Ticket Number is generated only by the backend on successful creation, format `TKT-YYYY-XXXXXX`, globally unique (unchanged from Lab 2).
- **BR-11:** Every new Ticket starts with Current Status `NEW`; `itPriority` is initialized from `requestedPriority` on creation.
- **BR-12:** The Ticket Status transition matrix defines all permitted from→to transitions, allowed roles, and confirmation requirements:

| From Status | To Status | Allowed Roles | Confirmation |
| :--- | :--- | :--- | :--- |
| NEW | OPEN | IT Staff, Administrator | No |
| OPEN | IN_PROGRESS | IT Staff, Administrator | No |
| OPEN | WAITING_FOR_REQUESTER | IT Staff, Administrator | No |
| OPEN | CANCELLED | IT Staff, Administrator | Yes |
| IN_PROGRESS | WAITING_FOR_REQUESTER | IT Staff, Administrator | No |
| IN_PROGRESS | RESOLVED | IT Staff, Administrator | Yes |
| WAITING_FOR_REQUESTER | IN_PROGRESS | IT Staff, Administrator | No |
| WAITING_FOR_REQUESTER | REOPENED | IT Staff, Administrator | No |
| RESOLVED | CLOSED | IT Staff, Administrator | No |
| RESOLVED | REOPENED | IT Staff, Administrator | No |
| REOPENED | IN_PROGRESS | IT Staff, Administrator | No |
| CLOSED | REOPENED | IT Staff, Administrator | No |

- **BR-13:** A Ticket may have zero or one primary Ticket Owner who is an active IT Staff or Administrator user. A Ticket may initially be unassigned.
- **BR-14:** Public Comments and Internal Notes are append-only in Lab 3; editing and deletion are excluded.
- **BR-15:** Comment and Note content is validated: 1–2000 characters after trim; whitespace-only content is rejected.
- **BR-16:** Each Comment and Note records its author (User) and creation timestamp from the backend; the client cannot supply these.
- **BR-17:** Administrator user management is limited to: creating a user with one permitted role, updating name/email/role/activation, preventing duplicate emails, setting a new initial password that must be changed at next login, preventing self-deactivation, preventing removal of the last active Administrator, and using deactivation instead of deletion.
- **BR-18:** Allowed attachment types remain: JPG/JPEG, PNG, WEBP, PDF. Maximum size 5 MB per file. Maximum 5 active attachments per ticket. Soft removal with mandatory reason (unchanged from Lab 2).
- **BR-19:** `ResolutionSummary` is stored on the Ticket and visible to the Requester. Empty/whitespace-only content is rejected on save.
- **BR-20:** The "Problem Appears Resolved" indication is a persisted boolean + timestamp on the Ticket; it does not change `currentStatus` in either direction.

## 6. UI Specification Summary

Full details in `ui-spec.md`. Summary:

- **Login Screen:** "TokTickIT" brand, "Sign in to your account" title, email and password fields, error banner for invalid credentials, busy state, "Forgot your password?" placeholder link (non-functional — email reset excluded).
- **Change Password Screen:** "Change Your Password" title, current/new/confirm password fields, real-time password strength checklist mirroring backend rules, "Continue" button, blocks all other routes until completed.
- **Authenticated App Shell:** Navbar shows user name + role badge, permitted navigation links, Profile dropdown with "Change Password" and "Logout". Dev Requester selector and Change Requester action removed.
- **Requester Ticket Detail:** Existing Lab 2 read-only layout plus Resolution Summary (read-only, shown when set), Public Comments tab with comment timeline (newest-first), comment input, "Problem Appears Resolved" toggle action.
- **IT Staff Ticket Queue ("My Queue"):** Search bar, filters (status, priority, category, owner), results count, table with 9 columns, status/priority badges, row click to detail, pagination, loading/empty/no-results/failure states.
- **IT Staff Ticket Detail:** Breadcrumbs, operational meta (editable dropdowns for Category, Status, Owner, IT Priority; read-only Requester, Related System, Requested Priority), description card with Resolution Summary input, tabs for Public Comments / Internal Notes / Attachments, comment/note timelines with input areas, visual distinction between public and internal channels.
- **Administrator User Management:** Search bar, "+ Create User" button, user list table (Name, Email, Role, Status, Edit), right-side drawer for create/edit with form fields, deactivation confirmation dialog, safety feedback.
- **Zen Green Continuity:** All new screens reuse existing tokens, form conventions, cards, badges, buttons, validation placement, responsive rules, and accessibility expectations from Lab 2.
- **Responsive:** Desktop ≥992px multi-column; tablet 768–991px two-column; mobile <768px single column, touch-friendly, no horizontal scrolling.

## 7. Data Changes

### New Prisma Models

| Model | Fields | Notes |
| :--- | :--- | :--- |
| **User** | id, email (unique, lowercase), passwordHash, name, role (UserRole), isActive (default true), mustChangePassword (default true), createdAt, updatedAt | Real authenticated accounts; one role per user |
| **PublicComment** | id, ticketId FK, authorId FK (User), content (String), createdAt | Append-only; author and timestamp from backend |
| **InternalNote** | id, ticketId FK, authorId FK (User), content (String), createdAt | Append-only; author and timestamp from backend |

### New Enum

| Enum | Values |
| :--- | :--- |
| **UserRole** | REQUESTER, IT_STAFF, ADMINISTRATOR |

### Expanded Enum

| Enum | Values |
| :--- | :--- |
| **TicketStatus** | NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED |

### Schema Changes to Existing Models

**Ticket model additions:**
- `ownerId` (optional FK to User) — primary IT Staff/Administrator owner
- `resolutionSummary` (nullable String) — IT Staff resolution summary visible to Requester
- `requesterIndicatedResolved` (Boolean, default false) — Requester's "problem appears resolved" indication
- `indicatedResolvedAt` (nullable DateTime) — timestamp of the indication

**Ticket model index additions:**
- `@@index([ownerId])` — fast lookup for owner-based filters in the staff queue
- `@@index([currentStatus])` — fast filter by status in the staff queue

**Attachment model:** No schema changes. `uploadedByRequesterId` continues to reference the legacy `Requester` model for Lab 2 data integrity (see Migration Decision below).

### Migration Decision

The Lab 2 `Requester` model is **kept as a legacy reference**. Existing `Ticket.requesterId` and `Attachment.uploadedByRequesterId` FK columns continue to point at the `Requester` table. A new `User` model is added alongside.

Migration strategy:
1. Add the `User`, `PublicComment`, `InternalNote` models and `UserRole` enum.
2. Expand `TicketStatus` enum to 8 values (existing `NEW` rows are unaffected).
3. Add `ownerId`, `resolutionSummary`, `requesterIndicatedResolved`, `indicatedResolvedAt` to `Ticket`.
4. Add `requesterUserId` (optional FK to User) on `Ticket` — a new column that links the ticket to the authenticated User. The migration SQL itself leaves this column `NULL`; the seed script backfills it after deploy by joining `Requester`/`User` on matching email (`WHERE "requesterUserId" IS NULL`), so no backfill logic lives in the migration. The existing `requesterId` (FK to legacy `Requester`) is kept for data integrity.
5. Map existing Lab 2 Requester records to User accounts: each active Requester gets a corresponding User record with `role = REQUESTER`, a documented initial password, and `mustChangePassword = true`. The mapping is recorded in the seed script.
6. Existing Tickets and Attachments retain their original `requesterId` FK values; no destructive data changes.

**Justification:** Keeping the legacy `Requester` table avoids a risky multi-column FK remap on a production-like dataset. The new `requesterUserId` column provides the authenticated identity link while `requesterId` preserves the historical record. This is a pragmatic incremental migration that maintains data integrity.

### Seed Data Requirements

- Idempotent seed behavior safe to run repeatedly.
- At least 4 active Requester accounts and 1 inactive Requester.
- At least 3 active IT Staff accounts and 1 inactive IT Staff.
- At least 1 active Administrator account.
- Realistic Tickets distributed across Requesters, statuses (all 8 values), priorities, and assigned/unassigned ownership.
- Example Public Comments on at least 2 different tickets.
- Example Internal Notes on at least 2 different tickets.
- All passwords bcrypt-hashed; seed password strings documented in the seed file and/or `docs/lab-03/seed-credentials.md`, marked local-dev-only.
- At least one fresh user created with `mustChangePassword = true` for testing the first-login flow.

## 8. API Contract

Full request/response shapes in `api-spec.md`. Endpoint summary:

### Authentication

| Method | Path | Purpose | Auth | Success | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/auth/login` | Authenticate with email/password | None | 200 + session cookie | 400, 401, 500 |
| POST | `/api/auth/logout` | Destroy session | Session | 200 | 500 |
| GET | `/api/auth/me` | Current authenticated user | Session | 200 | 401 |
| POST | `/api/auth/change-password` | Mandatory first-login change | Session | 200 | 400, 401, 500 |

### Requester (authenticated, ownership-enforced)

| Method | Path | Purpose | Auth | Success | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/tickets` | Create ticket (session-derived requesterId) | Session | 201 | 400, 404, 500 |
| GET | `/api/tickets` | Owned paginated list | Session | 200 | 400, 404, 500 |
| GET | `/api/tickets/:id` | Owned detail + attachments | Session | 200 | 400, 403, 404, 500 |
| POST | `/api/tickets/:id/attachments` | Upload attachment | Session | 201 | 400, 403, 404, 413, 415, 500 |
| GET | `/api/attachments/:id/download` | Download active file | Session | 200 | 400, 403, 404, 410, 500 |
| DELETE | `/api/attachments/:id` | Soft remove attachment | Session | 200 | 400, 403, 404, 500 |
| POST | `/api/tickets/:id/comments` | Post Public Comment (own ticket) | Session | 201 | 400, 403, 404, 500 |
| GET | `/api/tickets/:id/comments` | List Public Comments (own ticket) | Session | 200 | 403, 404, 500 |
| PUT | `/api/tickets/:id/indicate-resolved` | Toggle "problem appears resolved" | Session | 200 | 403, 404, 500 |

### IT Staff (IT Staff + Administrator)

| Method | Path | Purpose | Auth | Success | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/staff/tickets` | Queue with search/filter/sort/pagination | IT_STAFF, ADMIN | 200 | 400, 403, 500 |
| GET | `/api/staff/tickets/:id` | Full ticket detail for staff | IT_STAFF, ADMIN | 200 | 403, 404, 500 |
| PUT | `/api/staff/tickets/:id/claim` | Claim ticket ownership | IT_STAFF, ADMIN | 200 | 403, 404, 409, 500 |
| PUT | `/api/staff/tickets/:id/assign` | Reassign to another staff/admin | IT_STAFF, ADMIN | 200 | 400, 403, 404, 500 |
| PUT | `/api/staff/tickets/:id/priority` | Set IT Priority | IT_STAFF, ADMIN | 200 | 400, 403, 404, 500 |
| PUT | `/api/staff/tickets/:id/status` | Permitted status transition | IT_STAFF, ADMIN | 200 | 400, 403, 404, 409, 500 |
| PUT | `/api/staff/tickets/:id/resolution-summary` | Save resolution summary | IT_STAFF, ADMIN | 200 | 400, 403, 404, 500 |
| POST | `/api/staff/tickets/:id/comments` | Post Public Comment | IT_STAFF, ADMIN | 201 | 400, 403, 404, 500 |
| GET | `/api/staff/tickets/:id/comments` | List Public Comments | IT_STAFF, ADMIN | 200 | 403, 404, 500 |
| POST | `/api/staff/tickets/:id/notes` | Create Internal Note | IT_STAFF, ADMIN | 201 | 400, 403, 404, 500 |
| GET | `/api/staff/tickets/:id/notes` | List Internal Notes | IT_STAFF, ADMIN | 200 | 403, 404, 500 |
| GET | `/api/staff/users` | List active IT Staff/Admin for owner dropdown | IT_STAFF, ADMIN | 200 | 403, 500 |

### Administrator

| Method | Path | Purpose | Auth | Success | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/admin/users` | List users (search/filter) | ADMIN | 200 | 400, 403, 500 |
| POST | `/api/admin/users` | Create user | ADMIN | 201 | 400, 403, 409, 500 |
| PUT | `/api/admin/users/:id` | Edit user | ADMIN | 200 | 400, 403, 404, 409, 500 |
| POST | `/api/admin/users/:id/reset-password` | Set new initial password | ADMIN | 200 | 400, 403, 404, 500 |

### Reference (public)

| Method | Path | Purpose | Auth | Success | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/categories` | Active categories | None | 200 | 500 |
| GET | `/api/related-systems` | Active related systems | None | 200 | 400, 500 |

### Error Envelope

All errors return the same safe shape as Lab 2:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary of what went wrong.",
    "fields": { "field": "Specific field error message." }
  }
}
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `UNAUTHORIZED`, `CONFLICT`, `GONE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `BUSINESS_RULE_VIOLATION`, `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR`.

### Authentication Decisions

- Password hashing: bcrypt with cost 12.
- Session: `express-session` with in-memory `MemoryStore` (acceptable for local development; does not survive restart — justified in `api-spec.md`).
- Cookie: `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 24 hours`, `secure: false` in development (true in production).
- Session secret: read from `server/.env` (`SESSION_SECRET`), never committed.
- CSRF mitigation: `sameSite=lax` cookies + JSON-only API (no form-encoded state-changing requests) + same-origin checks.
- Logout: `req.session.destroy()` invalidates the server session.

## 9. Acceptance Criteria

- **AC-01:** Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns the permitted user identity and role.
- **AC-02:** Given a user who must change the initial password, when login succeeds, then normal application screens remain unavailable until a new valid password is saved.
- **AC-03:** Given an authenticated Requester, when the client supplies another `requesterId`, then the backend still applies the authenticated identity and does not return another Requester's data.
- **AC-04:** Given a Requester account, when an Internal Note endpoint is requested, then the operation is rejected (403) without exposing note content.
- **AC-05:** Given an invalid email or password, when login is attempted, then the response is 401 with a generic "Invalid email or password. Please try again." message.
- **AC-06:** Given an inactive account, when login is attempted, then the response is 401 with a safe error that does not reveal account existence.
- **AC-07:** Given an authenticated Requester, when the "Problem Appears Resolved" toggle is activated, then `requesterIndicatedResolved` is set to true with a timestamp and `currentStatus` is not changed.
- **AC-08:** Given the IT Staff Ticket Queue, when search/filter/sort/pagination parameters are applied, then results match the documented behavior and invalid parameters return 400.
- **AC-09:** Given a ticket in OPEN status, when an IT Staff user attempts to transition it to IN_PROGRESS, then the transition succeeds; when attempting to transition to RESOLVED directly, then the transition is rejected (400).
- **AC-10:** Given an Administrator, when a user is created with an initial password, then the password is bcrypt-hashed, `mustChangePassword` is true, and the new user can log in with the initial password and is redirected to `/change-password`.
- **AC-11:** Given an Administrator, when attempting to deactivate their own account, then the operation is rejected (403).
- **AC-12:** Given one active Administrator, when attempting to deactivate that Administrator, then the operation is rejected (409).
- **AC-13:** Given a non-Administrator user, when accessing any admin endpoint, then the response is 403.
- **AC-14:** Given duplicate email addresses, when a user is created or updated, then the operation is rejected with 409 Conflict.
- **AC-15:** Given all screens, when rendered on desktop (1440×900), tablet (820×1180), and mobile (390×844), then layouts are correct with no horizontal overflow, no clipping, and no overlap.

## 10. Definition of Done (Product)

- [ ] All Included scope implemented; no Excluded features present.
- [ ] Every AC above verified by at least one automated test traced in `tests.md`.
- [ ] All unit, API, UI, and E2E tests pass from documented commands on final `main`.
- [ ] No test skipped, disabled, or commented out.
- [ ] Backend enforces authentication and role-based authorization on every protected endpoint (verified by authorization tests).
- [ ] Backend enforces ownership on every Requester ticket/attachment endpoint.
- [ ] Screens conform to `ui-spec.md` (tokens, states, badges, responsive breakpoints) confirmed by screenshots at 3 viewports.
- [ ] Implemented endpoints conform to `api-spec.md`; Prisma schema matches Section 7 with committed migrations.
- [ ] Seed runs idempotently; migrations apply cleanly on an existing database with Lab 2 data intact.
- [ ] Responsive screenshots captured at Desktop, Tablet, and Mobile into `artifacts/lab-03/screenshots/`.
- [ ] Peer-review evidence recorded in `docs/lab-03/reviewer.md`.
- [ ] `docs/lab-03/ai-use.md` records the LLM used, 6–10 key prompts, and a short reflection.
- [ ] All work merged through reviewed PRs: feature branches → `lab3-staging` → one release PR → `main`.
- [ ] Student can explain every implementation choice and demonstrate failure cases live.

## 11. Assumptions and Decisions

- **AD-01:** Login rate limiting / account lockout is explicitly deferred to a future lab; the authentication API does not enforce attempt limits in Lab 3.
- **AD-02:** Session storage uses in-memory `MemoryStore` from `express-session`; acceptable for local development, does not survive server restart. Production deployment is excluded per section 4.2.
- **AD-03:** CSRF mitigation relies on `sameSite=lax` cookies combined with JSON-only API (Content-Type: application/json). No CSRF token is implemented. This is sufficient for the local-development scope.
- **AD-04:** The Lab 2 `Requester` model is kept as a legacy reference. Existing `Ticket.requesterId` and `Attachment.uploadedByRequesterId` FK columns continue to point at the `Requester` table. A new `requesterUserId` FK on `Ticket` links to the authenticated `User`.
- **AD-05:** "Problem Appears Resolved" is modeled as a boolean + nullable timestamp on `Ticket`, not as a status change. This preserves the formal status workflow while recording the Requester's indication.
- **AD-06:** Administrators may claim/own staff tickets and operate on them alongside IT Staff (the ticket owner may be "IT Staff or Administrator"). This is consistent with the handout page 3 authorization matrix and the assignment matrix in section 4.5.
- **AD-07:** Email addresses are stored and compared in lowercase for uniqueness (AD-07).
- **AD-08:** Comment and Note maximum content length is 2000 characters. Both Public Comments and Internal Notes apply the same limit. Timelines render newest-first.
- **AD-09:** Queue default ordering is `updatedAt` descending; default page size is 10; "sort by priority" means `itPriority`.
- **AD-10:** The initial password for a newly created user is provided by the Administrator at creation time (mandatory field). The user gets `mustChangePassword = true` and must change it at first login. No email delivery is involved.
- **AD-11:** `itPriority` is initialized from `requestedPriority` on ticket creation and may only be changed by IT Staff or Administrator thereafter.
- **AD-12:** Single Playwright project covers the responsive screenshot matrix (desktop 1440px, tablet 820px, mobile 390px), same as Lab 2.

---

*End of specification. This document is the engineering contract for the AI coding agent; changes require student approval and a version bump.*

**Approval:** Reviewed and approved by the student on 2026-09-10. AD-01–AD-12 confirmed. This version is the implementation baseline (Spec DD evidence).
