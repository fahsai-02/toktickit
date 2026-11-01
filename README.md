# TokTickIT

An IT service desk application built for the CPE334-SE course (KMUTT). It is a
full-stack vertical slice: **React UI → Express REST API → Prisma ORM → PostgreSQL**.

**Lab 3 adds real accounts and three roles — Requester, IT Staff and
Administrator.** The Lab 2 "pick who you are" demo mode is gone: you sign in
with an email and password, and the backend derives everything from your
session, so you can never act as someone else by editing a request.

**Lab 4 adds Actions Taken, a ticket resolution gate and role dashboards.**
IT Staff and Administrators record each piece of work on a ticket as an
*Action Taken*; a ticket can only be set to Resolved once it has a written
resolution summary **and** at least one Action Taken (enforced by the backend,
not just the UI). Every role now lands on a dashboard whose numbers are computed
on the server, and each card links to the exact list of tickets it counted.
Status changes and Action edits carry a `version`, so two people editing the
same record get a `409` conflict instead of silently overwriting each other.

**Requester** — file and track tickets, own end to end:

- **Sign in / sign out**, and change your password (forced on first login).
- **Create a ticket**: category + related system, requested priority, summary,
  description, and attach files (uploaded after creation).
- **My Tickets**: search, filter by category/status/priority, sort, and
  paginate through your own tickets (responsive table → card on mobile).
- **Ticket detail**: view the ticket, download attachments, soft-remove an
  attachment with a required reason, post Public Comments, and tell IT that the
  problem appears resolved (an indication — a Requester can never formally
  resolve or close a ticket). **Lab 4:** a read-only Actions Taken section shows
  the work IT has recorded.
- **Dashboard** (Lab 4): your ticket counts by status group (including the ones
  needing your attention), recent tickets and recently resolved tickets, each
  count linking to the matching My Tickets list.

**IT Staff** — work the shared queue:

- **Dashboard** (Lab 4): ticket counts, your own recent Actions Taken, recent
  and urgent tickets, each card drilling down to the matching queue.
- **My Queue**: every ticket, with search, filters, sorting and pagination.
- **Ticket detail**: claim or reassign ownership, set IT Priority, perform only
  the status changes the transition matrix allows, post Public Comments, and
  write Internal Notes that Requesters can never see. **Lab 4:** create, edit,
  complete or cancel Actions Taken on the ticket (a new Actions Taken tab), and
  resolve it through the resolution gate with a confirmation dialog.

**Administrator** — manage accounts:

- **User Management**: list, search, filter by role, create a user with an
  initial password, edit name/email/role, and activate or deactivate accounts.
  Two safety rules are enforced server-side: you cannot deactivate your own
  account, and the last active Administrator cannot be deactivated.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma (ORM) |
| Unit / integration tests | Vitest + Supertest (API), Vitest + jsdom (UI) |
| E2E / visual tests | Playwright (system Chrome, 3 viewport projects) |

## Repository Structure

```
toktickit/
├── client/            # React + Vite frontend (port 5173)
│   ├── src/           # auth, requester, staff and admin screens
│   └── tests/         # Vitest UI tests: lab-01/ … lab-04/
├── server/            # Express backend (port 5000)
│   └── src/           # app.ts, routes (auth, tickets, staff, admin), middleware, lib
│   └── tests/         # Vitest API tests: lab-01/ … lab-04/
├── e2e/               # Playwright E2E, visual and design-audit specs
│   ├── lab-02/        # (Lab 2 specs — skipped against the Lab 3 app)
│   ├── lab-03/        # authentication, staff flow, admin flow, visual, audit
│   └── lab-04/        # dashboards, Actions Taken, resolution flow, visual, audit
├── artifacts/         # Screenshot deliverables from the visual specs
│   ├── lab-02/screenshots/…
│   ├── lab-03/screenshots/{10 screens, states}/{desktop,tablet,mobile}.png
│   └── lab-04/screenshots/{dashboards, actions-taken, workflow, states}/…
├── docs/              # per-lab specifications, test plans, evidence & review records
├── docker-compose.yml # PostgreSQL 17
├── playwright.config.ts  # 3 viewport projects + system Chrome
├── package.json       # root: Playwright E2E scripts (not a pnpm workspace)
└── README.md
```

## Prerequisites

- Node.js 24
- pnpm 11.20
- Docker (for the local PostgreSQL database)
- Google Chrome installed at `/usr/bin/google-chrome` (Playwright uses the
  system browser via `channel: "chrome"`)

## Setup

1. **Install dependencies** (three independent locations):

   ```sh
   cd server && pnpm install
   cd ../client && pnpm install
   cd .. && pnpm install        # root: Playwright test runner
   ```

2. **Configure environment files** (copy from the provided examples):

   ```sh
   # server/ — database credentials + Prisma connection string
   cp server/.env.example server/.env
   ```

   The `client` needs **no** `.env` for local dev: Vite already proxies `/api`
   to `http://localhost:5000` (see `client/vite.config.ts`). Set
   `VITE_API_URL` in `client/.env` only when the client must call the backend
   from a different origin (e.g. `VITE_API_URL=http://localhost:5000`).

3. **Start PostgreSQL** (root directory):

   ```sh
   docker compose up -d
   ```

4. **Generate the Prisma client, create tables and seed** (in `server/`):

   ```sh
   pnpm exec prisma generate
   pnpm exec prisma migrate dev
   pnpm exec prisma db seed
   ```

   The seed is idempotent, so it is safe to re-run at any time. It loads
   categories, related systems, the Lab 2 requesters, the Lab 3 `User` accounts,
   a set of realistic tickets, and example Public Comments and Internal Notes.
   Categories and related systems include Hardware → Printer, Corporate Laptop;
   Software → LEB2 App, Grade Submission App; Network → Campus Wi-Fi, VPN.

## Run

| App | Command | URL |
|-----|---------|-----|
| Backend | `cd server && pnpm dev` | http://localhost:5000 |
| Frontend | `cd client && pnpm dev` | http://localhost:5173 |

Open http://localhost:5173 in a browser and sign in. Seeded accounts and their
passwords are listed in `docs/lab-03/seed-credentials.md` (local development
only):

| Role | What you can reach |
|------|--------------------|
| Requester | `/dashboard`, `/my-tickets`, `/create-ticket`, own ticket detail |
| IT Staff | `/staff/dashboard`, `/staff/queue`, `/staff/tickets/:id`, `/create-ticket` |
| Administrator | `/staff/dashboard`, `/staff/queue`, `/create-ticket`, `/admin/users` |

The navigation shows only the links your role is allowed to use, and the backend
re-checks every one of them — a hidden button is not authorization.

Accounts whose password is still an initial one open on **Change Password** and
cannot reach the app until a new password is saved. Seeded accounts that sign
straight in with their documented password: the Administrator, and the IT Staff
Sara Patel and James Wilson. The per-account list, with the password and its
`mustChangePassword` flag for each, is in `docs/lab-03/seed-credentials.md`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Backend status → `{ "status": "ok", "service": "TokTickIT API" }` |
| POST | `/api/auth/login` | Sign in with email + password (sets an httpOnly session cookie) |
| POST | `/api/auth/logout` | Invalidate the session |
| GET | `/api/auth/me` | The signed-in user (name, email, role) |
| POST | `/api/auth/change-password` | Mandatory first-login password change |
| GET | `/api/categories` | Request categories (Account and Access, Hardware, Software, Network) |
| GET | `/api/related-systems?categoryId=` | Related systems, optionally filtered by category |
| GET | `/api/tickets?search=&categoryId=&currentStatus=&requestedPriority=&sortBy=&sortOrder=&page=&pageSize=` | List tickets with search/filter/sort/pagination (identity from session, not `requesterId=`) |
| POST | `/api/tickets` | Create a ticket (category + related system + priority + summary/description) |
| GET | `/api/tickets/:id` | Ticket detail (with attachments) |
| POST | `/api/tickets/:id/attachments` | Upload an attachment (JPG/PNG/WEBP/PDF, ≤ 5 MB) |
| GET | `/api/attachments/:id/download` | Download an attachment (410 once soft-removed) |
| DELETE | `/api/attachments/:id` | Soft-remove an attachment (requires a reason) |
| GET/POST | `/api/tickets/:id/comments` | Public Comments on a ticket (any role that can see the ticket) |
| GET | `/api/staff/tickets` | IT Staff queue: search, filters, sorting, pagination |
| GET | `/api/staff/tickets/:id` | Staff ticket detail (ownership, IT Priority, status) |
| PUT | `/api/staff/tickets/:id/claim` · `/assign` | Claim or reassign ticket ownership |
| PUT | `/api/staff/tickets/:id/priority` · `/status` | Set IT Priority · perform a permitted status change |
| GET/POST | `/api/staff/tickets/:id/comments` · `/notes` | Public Comments · Internal Notes (IT Staff and Administrator only) |
| GET/POST | `/api/tickets/:id/actions` | **Lab 4:** list / create Actions Taken (IT Staff and Administrator write; the ticket's Requester reads) |
| PUT | `/api/actions/:id` | **Lab 4:** edit, complete or cancel an Action Taken (`version` required; stale → `409`) |
| PUT | `/api/staff/tickets/:id/status` | **Lab 4:** also enforces the resolution gate and the optional `version` check |
| GET | `/api/dashboards/requester` · `/api/dashboards/staff` | **Lab 4:** server-computed dashboard metrics and lists |
| GET | `/api/tickets` · `/api/staff/tickets` with `statusGroup=` | **Lab 4:** the exact rows a dashboard card counted |
| GET/POST | `/api/admin/users` | List (search + role filter) · create a user |
| PUT | `/api/admin/users/:id` | Edit name, email, role, activation |
| POST | `/api/admin/users/:id/reset-password` | Set a new initial password (must change at next login) |

The full contracts, including every error code, are in
`docs/lab-03/api-spec.md` and `docs/lab-04/api-spec.md`.

## Tests

### Server API tests (Vitest + Supertest)

```sh
cd server && pnpm test
```

Tests live in `server/tests/lab-01/` … `server/tests/lab-04/`. The tests that touch the database require PostgreSQL to
be running and seeded — start it and run the seed step above first. Lab 3
suites share one database, so the files run one at a time; the current result
is **29 files / 376 tests**.

### Client UI tests (Vitest + jsdom)

```sh
cd client && pnpm test
```

Tests live in `client/tests/lab-01/` … `client/tests/lab-04/` (not colocated
with source; configured in `client/vite.config.ts`). Current result:
**26 files / 286 tests**.

### E2E + Responsive visual tests (Playwright)

Playwright runs against the **real** stack, so start PostgreSQL + both dev
servers first:

```sh
docker compose up -d
cd server && pnpm dev &
cd ../client && pnpm dev &
```

Then, from the repo root:

```sh
pnpm test:e2e:lab3     # Lab 3 functional E2E (desktop project, workers = 1)
pnpm test:e2e:lab4     # Lab 4 E2E (desktop project, workers = 1)
pnpm test:e2e          # every spec (lab-02, lab-03, lab-04)
pnpm test:e2e:headed   # same, with a visible browser
```

The Lab 3 specs live in `e2e/lab-03/` and share **one** development database,
so `playwright.config.ts` pins `workers: 1` and `fullyParallel: false`; each
spec re-seeds and cleans up through the `useLab3DbHooks()` helper.

- `authentication.spec.ts`, `staff-ticket-flow.spec.ts`,
  `user-administration.spec.ts` — the functional journeys. They run on the
  **desktop** project only and skip themselves on the other viewports, so two
  browsers cannot race each other over the database or over the BR-02 password
  rotation.
- `responsive.visual.spec.ts` — RESP-01..30: 10 screens × 3 viewports, each run
  asserting "no unintended horizontal scrolling" before saving a screenshot to
  `artifacts/lab-03/screenshots/{screen}/{project}.png`.
- `states.visual.spec.ts` — STATE-01..42: the 14 states a happy-path screenshot
  cannot capture (login error and busy, field validation, empty vs no-results,
  comments vs internal notes, deactivate confirmation, both administrator safety
  errors, the queue filter card open, a filter actually applied, the internal-note
  button's measured contrast, and a sort actually applied) × 3 viewports.
- `visual-audit.spec.ts` — STYLE-05..10: the design rules a screenshot cannot
  prove, measured in the browser. It tabs through login, the queue, ticket
  detail and the admin list and reads the computed focus ring at every stop
  (≥2px `--color-secondary`), compares editable vs read-only backgrounds, checks
  that each validation message sits under its own field, intersects the boxes of
  every visible control to catch overlap, asserts the exact nav link set per
  role plus a denied destination, and measures the 2-line clamp on long
  summaries.

The Lab 4 specs live in `e2e/lab-04/` and follow the same rules (one shared
database, `workers: 1`). `dashboards`, `actions-taken-flow` and
`ticket-resolution` are the functional journeys; `responsive.visual`,
`states.visual` and `visual-audit` write the screenshots in
`artifacts/lab-04/screenshots/` and measure the design rules (tap-target floor
of 36px at 375px, no layout shift when a dashboard finishes loading). Every Lab 4
journey also fails on an unexpected console error or HTTP error response. The
three `e2e/lab-02` specs drive the Development Requester selector that Lab 3
removed, so they stay skipped on purpose (recorded as AD-21 in
`docs/lab-04/specification.md`).

After an E2E run, return the shared dev database to the seed state:

```sh
cd server && pnpm exec tsx prisma/cleanup-e2e.ts
```

### Viewport projects

| Project | Size | Used by |
|---------|------|---------|
| `desktop` | 1440×900 | functional E2E + all visual specs |
| `tablet` | 820×1180 | visual specs |
| `mobile` | 375×844 | visual specs |

Tablet stays at 820px because the CSS switches to the mobile layout at
`max-width: 768px`, so a 768px run would capture the mobile layout instead.
Mobile is 375px, the narrowest width AC-15 names, so a run at 390px would have
left the required width untested.

## Git Workflow

- `main` = stable release; each lab has an integration branch
  (`lab1-staging`, `lab2-staging`, ...).
- Work one GitHub Issue at a time on its own branch:
  `feature/<n>-<slug>` (e.g. `feature/12-e2e-visual`).
- Each branch is merged into its lab staging branch via a peer-reviewed Pull
  Request whose title follows `<type>(<scope>): <summary> (#<issue>)`.
