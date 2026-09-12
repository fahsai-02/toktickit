# AGENTS.md

Tok TickIT — IT service desk app, a KMUTT CPE334-SE course project (2 packages: `client/`, `server/`). Early-stage lab work; source intentionally contains `TODO(Issue N)` markers and unimplemented functions that later lab issues fill in.

## Commands (pnpm only; not a pnpm workspace)

> A root `package.json` exists **only** for Playwright E2E tooling
> (`pnpm test:e2e`, `pnpm test:e2e:headed`) and is not a shared workspace.
> `client/` and `server/` remain two independent packages with their own
> lockfiles; their commands below must still be run inside each package dir.

- `pnpm install` in `client/` AND `server/` separately (two independent lockfiles, not a pnpm workspace)
- `server`: `pnpm dev` (tsx watch src/index.ts), `pnpm build` (tsc → dist), `pnpm start`, `pnpm test`
- `client`: `pnpm dev` (Vite, port 5173), `pnpm build` (tsc && vite build), `pnpm test`
- No lint script exists anywhere despite ESLint configs in both packages; skip it.
- Node 24 + pnpm 11.20 required (see `server/package.json`).

## Verification rule (mandatory)

After **every** completed task/step, the agent MUST explicitly tell the user how to verify the work themselves — concrete commands to run and what "correct" output looks like. Include commands, expected results, and how to check in the DB/UI when relevant. (e.g. `pnpm test`, `pnpm build`, `curl` hits against the running server, queries against Postgres via docker, UI steps in the browser.)

## Plan style (mandatory)

When the user asks for a plan ("plan", "วางแผน", "จะทำอะไรบ้าง", "อยากให้ทำเป็นขั้น"), the agent MUST:
- Produce a **detailed, beginner-friendly plan**: step-by-step, easy to follow.
- Explain every **jargon / technical term** in plain, everyday language for a novice web developer who does not yet understand web dev deeply (e.g. explain what an `endpoint`, a `component`, `state`, `useEffect`, `validation`, `staged files`, `mock`, `jsdom`, a database `migration`, etc. mean in simple words).
- State the **reason / why** behind each step or choice, not just the what.
Prioritize clarity and teaching over brevity in the plan itself.

## Time will be lost if you miss…

- **Prisma 7 (not v6)**: `schema.prisma`'s generated client uses provider `prisma-client` and writes to `server/src/generated/prisma` (gitignored). The datasource has NO `url` in the schema — it comes from `server/prisma.config.ts`, which reads `DATABASE_URL` from `server/.env`. After `pnpm install`, run `pnpm exec prisma generate` in `server/` or imports will fail. Migrations: commit generated migrations, use `prisma migrate dev`/`deploy` (never `db push` unless asked).
- **Local DB**: PostgreSQL 17 via root `docker-compose.yml` reads env from `server/.env` (`POSTGRES_*` + `DATABASE_URL`). `server/.env` is gitignored; copy `server/.env.example` to create it. Start with `docker compose up -d` from repo root before migrate/tests that touch the DB.
- **ESM + `.js` suffixes**: both packages are `"type": "module"` with `verbatimModuleSyntax`. Import local files with the `.js` extension even though the files are `.ts`/`.tsx` (e.g. `import app from './app.js'`, `import App from '../../src/App.js'`). Use `import type` for type-only exports in the server.
- **Client→server URL**: Vite proxies `/api` to `http://localhost:5000` (see `client/vite.config.ts`). `client/src/api.ts` reads `import.meta.env.VITE_API_URL` and defaults to `""` (same-origin → dev proxy); set `VITE_API_URL` in `client/.env` only when the client must call the backend from a different origin (e.g. `VITE_API_URL=http://localhost:5000`).

## Client CSS Architecture (CSS Layers)

The client uses CSS Layers to manage style priority without `!important`. Layer order in `index.css`:

```
@layer reset, bootstrap, components, layout;
```

| Layer | File | What goes here |
|-------|------|----------------|
| `reset` | `index.css` | CSS variables, box-sizing, focus/active neutralize |
| `bootstrap` | (imported) | Bootstrap styles |
| `components` | `index.css`, `Button.css`, `Spinner.css` | Typography, fields, reusable component styles |
| `layout` | `App.css` | Header, nav, shell, page-level styles (highest priority) |

- `layout` layer always wins over `components` — use this for page-specific overrides
- To override a component variant (e.g. `.btn-primary`), put the override in `App.css` (layout layer), NOT with `!important`
- Bootstrap is imported via `@import "bootstrap/dist/css/bootstrap.min.css" layer(bootstrap);` in `index.css` — do NOT import Bootstrap in `main.tsx`
- When a Button needs custom styling (no variant class), omit the `variant` prop and use `className` directly

## Client Routing

React Router v7 with `BrowserRouter` in `main.tsx`. Routes:

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Redirect → `/my-tickets` | If requester selected |
| `/select-requester` | `RequesterSelection` | Redirect → `/my-tickets` if requester exists |
| `/my-tickets` | `MyTickets` | Full screen with search, filter, sort, pagination (Issue 9) |
| `/create-ticket` | `CreateTicket` | Placeholder until Issue 8 |

- `AppShell` uses `<Outlet />` for nested routes
- `Navbar` uses React Router `<NavLink>` with `className` callback for active state
- Guard: if no requester in context, all routes redirect to `/select-requester`

## Tests

- Server: Vitest + Supertest in `server/tests/lab-01/*.test.ts`, imports Express `app` from `src/app.ts` directly (no DB needed for the health test).
- Client: Vitest in `client/tests/lab-01/*.test.tsx` (jsdom, setup `client/tests/setup.ts`); configured inside `client/vite.config.ts` (imported from `vitest/config`), `include: ["tests/**/*.test.tsx"]` — tests are NOT colocated with source.
- Run `pnpm test` inside the relevant package; the working example test asserts the `/api/health` shape exactly `{ status: 'ok', service: 'TokTickIT API' }`.

## Repo workflow / scope (course-specific)

- Git flow: `main` and `lab1-staging` exist; work one issue at a time on its own `feature/<n>-<slug>` branch off `lab1-staging` (current: `feature/1-project-foundation`). See `docs/lab-01/ai_instructions.md` for the staged issue plan (health check → category seed → category list) and hard constraints: NO auth or image uploads yet.
- **Always ask before deleting code from previous labs.** If the user does not respond, do not delete — keep the code as-is.
- `docs/lab-01/` holds the lab spec, test plan, and peer-review sheets — read it before adding features; do not invent scope beyond the current lab issue.

## Review protocol (when asked to check / review)

- Whenever the user says "check", "review", "verify", or pastes someone else's review, read the code and compare against **EVERY** spec doc in `docs/<lab>/` for the relevant lab — `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` (plus `ai_instructions.md` if present). Never rely on memory.
- Next to every finding, cite the exact evidence: a spec line number, section heading, or AC/FR/BR number from `docs/<lab>/`. If a claim has no spec backing, say so — do not invent findings or rubber-stamp others'. When referring to a spec's subsection in prose, write the word "section" (e.g. "section 5.2"), never the `§` symbol.
- Verify each claim independently; catching one true item does not make the rest correct. Check the real code paths (imports, forwarded props, computed styles, query strings, doc tables) before agreeing or disagreeing.
- At a lab's sprint close, proactively list the files that must be updated/checked per that lab's Definition of Done (e.g. `tests.md` statuses `Planned`→`Pass`, `reviewer.md`, `ai-use.md`, `README`, screenshot artifacts + `ui-spec.md` visual checklist) — never skip the close-out docs.

## PR format (standard for every PR in this repo)

- Title: `<type>(<scope>): <summary> (<GitHub issue number>)` — use the REAL GitHub issue number, not the local plan numbering.
- Body sections, always in this order:
  1. `## Summary` — 2–4 lines of what and why.
  2. `## What's included` — table or bullets of the changes.
  3. `## Notes for reviewers` — review guidance, evidence pointers, intentional exclusions.
  4. Footer: `close #<issue>` (keyword is fine for clarity, but see next bullet).
- PRs target `<labN>-staging`, NOT the default branch, so the keyword neither links nor auto-closes the issue (instructor GitHub Workflow Guide, Part 4): after opening the PR, link the issue via the PR's **Development panel**, verify the sidebar shows "Successfully merging this pull request may close these issues", then after merge close the issue by hand and drag the board card to Done.
- Never mention machine-local-only files (e.g. gitignored course handouts or uncommitted `.gitignore` edits) as PR content.
- Refer to planned-but-later work generically ("added at release time"), never by internal issue/phase numbers from planning notes.
- Docs-only edits while an issue is in progress ride along on the same feature branch/PR; docs edited after its code merged get their own `docs/<lab>-<topic>` branch + PR (never push directly to staging/main).

---

## Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens

### Lab 3 Sprint Goal

Replace the temporary Development Requester selector with real authentication and role-based authorization. Introduce IT Staff ticketing workflow and Administrator user management. Three roles: **Requester**, **IT Staff**, **Administrator**.

### Lab 3 — What's Included

| Area | Scope |
|------|-------|
| **Authentication** | Email + password login, logout, current-user endpoint, mandatory first-login password change |
| **Requester regression** | All Lab 2 ticket/attachment functions continue using authenticated identity; Dev Requester selector removed |
| **IT Staff Ticket Queue** | Shared queue with search, filters, sorting, pagination; open Ticket Detail |
| **IT Staff Ticket Detail** | Claim/reassign ownership, set IT Priority, permitted status changes, Public Comments, Internal Notes, Attachments |
| **Requester Comments** | Post Public Comments; indicate "problem appears resolved" (cannot formally resolve/close) |
| **Admin User Management** | User list (search/filter), create user, edit name/email/role/activation, set new initial password, self-deactivate guard, last-admin guard |

### Lab 3 — Explicitly Excluded

Email invitations, password-reset email, MFA, social login, SSO, self-registration, Actions Taken, SLA/escalation, dashboards/KPI, multi-tenant orgs, production deployment, multiple roles per user, user deletion, bulk ops, import/export, profile photos, account audit history, advanced user-list pagination/sorting/filters.

### Lab 3 Roles and Authorization Matrix

| Role | Permitted Behavior |
|------|-------------------|
| **Requester** | Create Tickets; view/manage only own Tickets; post Public Comments; indicate problem appears resolved |
| **IT Staff** | View IT Staff Ticket Queue; open Tickets; claim/reassign ownership; set IT Priority; permitted status changes; post Public Comments; create Internal Notes |
| **Administrator** | Manage user accounts: view list, create user, edit name/email/role/activation, set initial password, activate/deactivate |

> **Critical rule:** Every protected operation must be enforced by the backend. A hidden/disabled frontend control is NOT authorization.

### Lab 3 Required Ticket Statuses

`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`

A transition matrix must be defined in `docs/lab-03/specification.md`. Lab 3 does NOT include Actions Taken (deferred to Lab 4).

### Lab 3 Data Model Evolution (Prisma)

Current Lab 2 models: `Requester`, `Category`, `RelatedSystem`, `Ticket`, `Attachment`

**New models needed for Lab 3:**

| Model | Purpose | Key Relationships |
|-------|---------|-------------------|
| `User` | Real authenticated accounts with role, password hash, activation, password-change flag | Has many Tickets (as requester), many Comments (as author), many Notes (as author) |
| `PublicComment` | Append-only public conversation on a Ticket | Belongs to Ticket + User (author) |
| `InternalNote` | Append-only private operational notes | Belongs to Ticket + User (author) |

**Schema changes to existing models:**
- `Ticket`: add `ownerId` (optional User FK for IT Staff/Admin assignment), `itPriority` (already exists but must be populated)
- `Requester` model: migrate or map to `User` model (or keep `Requester` as a legacy reference and link via `requesterId` to `User`)
- Seed data: 4+ active Requesters, 1 inactive Requester; 3+ active IT Staff, 1 inactive IT Staff; 1+ active Admin; realistic tickets across Requesters/statuses/priorities; example Public Comments and Internal Notes

> **Passwords must never be stored in plaintext.** Use bcrypt or argon2 hashing.

### Lab 3 Client Routing (planned)

| Path | Component | Role Access |
|------|-----------|-------------|
| `/` | Redirect → appropriate default | — |
| `/login` | `Login` | Unauthenticated |
| `/change-password` | `ChangePassword` | Authenticated (must change) |
| `/my-tickets` | `MyTickets` | Requester |
| `/create-ticket` | `CreateTicket` | Requester |
| `/tickets/:id` | `TicketDetail` | Requester (own only), IT Staff |
| `/staff/queue` | `StaffTicketQueue` | IT Staff |
| `/staff/tickets/:id` | `StaffTicketDetail` | IT Staff |
| `/admin/users` | `UserManagement` | Administrator |
| `/select-requester` | `RequesterSelection` | **REMOVED in Lab 3** — replaced by real auth |

- `AppShell` uses role-aware navigation; Navbar shows only permitted links
- Guard: unauthenticated users redirect to `/login`; users with `mustChangePassword` flag redirect to `/change-password`

### Lab 3 Required API Endpoints (summary — full spec in `docs/lab-03/api-spec.md`)

**Authentication:**
- `POST /api/auth/login` — authenticate with email/password
- `POST /api/auth/logout` — invalidate session
- `GET /api/auth/me` — current authenticated user
- `POST /api/auth/change-password` — mandatory first-login change

**Requester (authenticated, ownership-enforced):**
- All Lab 2 Ticket and Attachment endpoints continue, but `requesterId` comes from session, not client body

**IT Staff:**
- `GET /api/staff/tickets` — queue with search, filters, sorting, pagination
- `GET /api/staff/tickets/:id` — ticket detail for staff operations
- `PUT /api/staff/tickets/:id/claim` — claim ownership
- `PUT /api/staff/tickets/:id/assign` — reassign to another staff
- `PUT /api/staff/tickets/:id/priority` — set IT Priority
- `PUT /api/staff/tickets/:id/status` — permitted status transitions
- `POST /api/staff/tickets/:id/comments` — post Public Comment
- `GET /api/staff/tickets/:id/comments` — list Public Comments
- `POST /api/staff/tickets/:id/notes` — create Internal Note
- `GET /api/staff/tickets/:id/notes` — list Internal Notes

**Requester Comments:**
- `POST /api/tickets/:id/comments` — post Public Comment (authenticated requester, own ticket)
- `GET /api/tickets/:id/comments` — list Public Comments

**Administrator User Management:**
- `GET /api/admin/users` — list users (search by name/email, optional role filter)
- `POST /api/admin/users` — create user with one role and initial password
- `PUT /api/admin/users/:id` — edit name, email, role, activation
- `POST /api/admin/users/:id/reset-password` — set new initial password (must change at next login)

### Lab 3 Test Structure

**Server tests** in `server/tests/lab-03/`:
```
auth.api.test.ts              — login/logout/current-user/change-password
authorization.api.test.ts     — role-based access, ownership checks
staff-queue.api.test.ts       — queue search/filter/sort/pagination
staff-ticket-detail.api.test.ts — claim/reassign/priority/status
comments-notes.api.test.ts    — Public Comments + Internal Notes
users-admin.api.test.ts       — Admin user CRUD, safety rules
```

**Client tests** in `client/tests/lab-03/`:
```
Login.test.tsx
ChangePassword.test.tsx
StaffTicketQueue.test.tsx
StaffTicketDetail.test.tsx
UserManagement.test.tsx
```

**E2E tests** in `e2e/lab-03/`:
```
authentication.spec.ts
staff-ticket-flow.spec.ts
user-administration.spec.ts
```

### Lab 3 Branch Flow

- Branch off `lab3-staging` (to be created from `main` after Lab 2 merge)
- Feature branches: `feature/<n>-<slug>` targeting `lab3-staging`
- PR → `lab3-staging` for review, then `lab3-staging` → `main` at sprint close

### Lab 3 Required Docs

```
docs/lab-03/
├── specification.md    — numbered FRs, BRs, authorization matrix, ACs, migration decisions, DoD
├── tests.md            — test plan with AC traceability, file paths, final status
├── ui-spec.md          — screen layouts, modes, responsive rules, visual checklist
├── api-spec.md         — endpoints, request/response shapes, auth mechanism, safe errors
├── reviewer.md         — peer review records
└── ai-use.md           — LLM prompts used + reflection
```

### Lab 3 Seed Data Requirements

- 4+ active Requester accounts, 1 inactive Requester
- 3+ active IT Staff accounts, 1 inactive IT Staff
- 1+ active Administrator account
- Realistic tickets distributed across Requesters, statuses, priorities, assigned/unassigned ownership
- Example Public Comments and Internal Notes (no sensitive info)
- Credentials for local dev only; clearly documented

### Lab 3 Key Business Rules (summary — full list in `docs/lab-03/specification.md`)

| BR ID | Rule |
|-------|------|
| BR-01 | Only active user with valid credentials may authenticate |
| BR-02 | User with `mustChangePassword` cannot enter normal app until new password saved |
| BR-03 | Authenticated user identity determines ownership, not client-supplied `requesterId` |
| BR-04 | Public Comments visible to Requester, IT Staff, Administrator; Internal Notes visible only to IT Staff and Administrator |
| BR-05 | Requester may indicate problem appears resolved, but cannot formally set Resolved/Closed |
| BR-06+ | Login attempts, password handling, logout, inactive users, duplicate emails, current-user, ticket ownership, IT assignment, IT priority, status transitions, validation, failures, regression, admin safety rules (must be defined in specification.md) |

### Lab 3 Zen Green Requirements

- Reuse Zen Green design language from Lab 2 (tokens, forms, cards, badges, buttons, validation, responsive rules, accessibility)
- Replace Dev Requester display with authenticated user name + role
- Provide Logout and permitted profile/password actions
- Show role-specific navigation (no unauthorized destinations visible)
- Consistent badges for Ticket status, Requested Priority, IT Priority, and role
- Clear editable vs read-only field styling
- Loading, saving, success, validation, empty, no-results, forbidden, and safe failure feedback
- Usable on desktop, tablet, and mobile

### Lab 3 — Issue 15 (#56) Data Foundation Agreed Decisions (source of truth: `docs/lab-03/lab3-engineering-spec-transcription.md`, then `docs/lab-03/specification.md` §7 + `api-spec.md`)

These were agreed with the student and MUST be respected in every future chat:

1. **Schema target (`server/prisma/schema.prisma`):**
   - New `UserRole` enum: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
   - `TicketStatus` expanded to 8 values: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
   - New `User` model (email unique, passwordHash, name, role, isActive, mustChangePassword default true, timestamps).
   - New `PublicComment` + `InternalNote` models (ticketId FK, authorId FK→User, content, createdAt; append-only, `@@index([ticketId, createdAt])`).
   - `Ticket` additions: `ownerId` (optional FK→User), `requesterUserId` (optional FK→User, NEW auth-identity link), `resolutionSummary` (nullable), `requesterIndicatedResolved` (Boolean default false), `indicatedResolvedAt` (nullable), `@@index([ownerId])`, `@@index([currentStatus])`.
   - Named relations on User↔Ticket: `"TicketRequester"` (requesterUser) and `"TicketOwner"` (owner).
   - **`Requester` model is KEPT as a legacy reference.** `Ticket.requesterId` and `Attachment.uploadedByRequesterId` continue to point at `Requester`; `Attachment` model is untouched.

2. **Migration:** `prisma migrate dev --name lab3_user_auth_models` preserves ALL Lab 2 data (dev DB currently: Requester 6, Category 4, RelatedSystem 7, Ticket 343, Attachment 179 — these counts must survive). `requesterUserId` backfill is done in the SEED (via raw SQL join on Requester/User email, `WHERE "requesterUserId" IS NULL`), NOT in the migration SQL.

3. **Password hashing:** use `bcryptjs` (NOT native `bcrypt`), cost/rounds **12** (spec §11 line 316). Hashes start with `$2`; `bcrypt.compare` must succeed.

4. **Seed credentials (separate per role, all documented in `docs/lab-03/seed-credentials.md` + seed file comments, local-dev-only):**
   - Requester (6, mapped from Lab 2 Requesters): `TempPass123!`, `mustChangePassword = true`.
   - IT Staff: `StaffPass1!` (3 active + 1 inactive). 1 of the active ones has `mustChangePassword = true` (satisfies "≥1 fresh user with true"); the rest `false`.
   - Administrator (1): `AdminPass1!`, `mustChangePassword = false` (documented password IS the real password — grader logs straight in).
   - `TempPass123!` was chosen for Requester to match `api-spec.md` example payloads exactly.
   - Correct understanding: users holding an INITIAL password MUST change it at first login (transcription line 24/50, BR-02). `mustChangePassword = false` means the documented password is the account's real password, not an initial one.

5. **Seed ticket numbering (no collision with real tickets):** format `TKT-YYYY-NNNNNN`. Historical/realistic seeds use year **2025** (`TKT-2025-000001`, …); a couple of recent ones use 2026 block **`TKT-2026-000900+`** (real tickets are at `TKT-2026-000344` max). Seed is idempotent via upsert on `ticketNumber` (@unique); comments/notes idempotent via `deleteMany({ content: { in: [seed strings] } })` then recreate.
   - Seed tickets cover ALL 8 statuses, both priorities (requested + itPriority), assigned/unassigned ownership, some `resolutionSummary`, and ≥1 with `requesterIndicatedResolved = true`. PublicComments on ≥2 tickets, InternalNotes on ≥2 tickets (staff authors).

6. **MIG-01 automated test is IN this issue** (`server/tests/lab-03/migration-regression.api.test.ts`): verifies counts preserved, FK correctness, `requesterUserId` backfilled for all tickets, hashes start `$2` + compare succeeds, all-8 statuses present. Update `docs/lab-03/tests.md` MIG-01 `Planned` → `Pass` after it passes.

7. **Docs/evidence to touch in this issue:** `docs/lab-03/seed-credentials.md` (create), `docs/lab-03/tests.md` (MIG-01 status + run results), spec §7 only if reality diverges from what's written. PR branch `feature/15-data-foundation` → `lab3-staging`, title `feat(schema): lab3 user models, migration & seed (#56)`.