# TokTickIT

An IT service desk application built for the CPE334-SE course (KMUTT). It is a
full-stack vertical slice: **React UI → Express REST API → Prisma ORM → PostgreSQL**.

The app lets a **requester** file and track IT tickets end to end:

- Pick the requester you are acting as (single-user demo mode).
- **Create a ticket**: category + related system, requested priority, summary,
  description, and attach files (uploaded after creation).
- **My Tickets**: search, filter by category/status/priority, sort, and
  paginate through the requester's tickets (responsive table → card on mobile).
- **Ticket detail**: view the ticket, download attachments, and soft-remove an
  attachment with a required reason (the file becomes unavailable afterwards).

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma (ORM) |
| Unit / integration tests | Vitest + Supertest (API), Vitest + jsdom (UI) |
| E2E / visual tests | Playwright (system Chrome, 3 viewports) |

## Repository Structure

```
toktickit/
├── client/            # React + Vite frontend (port 5173)
│   ├── src/
│   └── tests/         # Vitest UI tests: lab-01/, lab-02/
├── server/            # Express backend (port 5000)
│   └── src/           # app.ts, routes, services
│   └── tests/         # Vitest API tests: lab-01/, lab-02/
├── e2e/               # Playwright E2E + responsive visual specs (lab-02/)
│   └── lab-02/
├── artifacts/         # Committed screenshot deliverables from the visual specs
│   └── lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/{desktop,tablet,mobile}.png
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

   The seed loads requesters, categories, and related systems (e.g. Hardware →
   Printer, Corporate Laptop; Software → LEB2 App, Grade Submission App;
   Network → Campus Wi-Fi, VPN).

## Run

| App | Command | URL |
|-----|---------|-----|
| Backend | `cd server && pnpm dev` | http://localhost:5000 |
| Frontend | `cd client && pnpm dev` | http://localhost:5173 |

Open http://localhost:5173 in a browser. Pick a requester on the selection
screen (redirects there on first visit), then use **Create Ticket** and
**My Tickets**. Use the **Change Requester** control in the header to switch
who you are acting as.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Backend status → `{ "status": "ok", "service": "TokTickIT API" }` |
| GET | `/api/dev/requesters` | Active requesters for the selection screen (dev-only seed source) |
| GET | `/api/categories` | Request categories (Account and Access, Hardware, Software, Network) |
| GET | `/api/related-systems?categoryId=` | Related systems, optionally filtered by category |
| GET | `/api/tickets?requesterId=&search=&categoryId=&currentStatus=&requestedPriority=&sortBy=&sortOrder=&page=&pageSize=` | List tickets with search/filter/sort/pagination |
| POST | `/api/tickets` | Create a ticket (category + related system + priority + summary/description) |
| GET | `/api/tickets/:id` | Ticket detail (with attachments) |
| POST | `/api/tickets/:id/attachments` | Upload an attachment (JPG/PNG/WEBP/PDF, ≤ 5 MB) |
| GET | `/api/attachments/:id/download` | Download an attachment (410 once soft-removed) |
| DELETE | `/api/attachments/:id` | Soft-remove an attachment (requires a reason) |

## Tests

### Server API tests (Vitest + Supertest)

```sh
cd server && pnpm test
```

Tests live in `server/tests/lab-01/` and `server/tests/lab-02/`. The tests that
touch the database (e.g. categories) require PostgreSQL to be running and
seeded — start it and run the seed step above first.

### Client UI tests (Vitest + jsdom)

```sh
cd client && pnpm test
```

Tests live in `client/tests/lab-01/` and `client/tests/lab-02/` (not colocated
with source; configured in `client/vite.config.ts`).

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
pnpm test:e2e          # run the full lab-02 E2E + responsive suite
pnpm test:e2e:headed   # same, with a visible browser
```

Three specs under `e2e/lab-02/`, all running on all 3 viewport projects
(desktop 1440×900, tablet 820×1180, mobile 390×844):

- `requester-ticket-flow.spec.ts` — E2E-01..03: happy-path journey
  (create → locate → detail → attach → download → soft-remove → download
  blocked), cross-requester isolation, and backend-down resilience. The My
  Tickets list assertions are viewport-aware (desktop table vs mobile card
  list).
- `responsive.visual.spec.ts` — RESP-01..09: 3 screens (create-ticket,
  my-tickets, ticket-detail) captured at 3 viewport projects (desktop 1440×900,
  tablet 820×1180, mobile 390×844), asserting no horizontal scroll and saving
  screenshots to `artifacts/lab-02/screenshots/{screen}/{project}.png`.
- `states.visual.spec.ts` — STATE captures: UI states a static happy-path
  shot cannot show (validation messages, submit busy spinner, empty vs
  no-results, uploading/invalid/removed/unavailable attachments, long-filename
  ellipsis) on every viewport, saving screenshots to
  `artifacts/lab-02/screenshots/states/{state}/{project}.png`.

The create-ticket screenshots use varied category/priority per viewport (e.g.
Hardware/MEDIUM, Software/HIGH, Network/URGENT) with a staged attachment chip;
the my-tickets screenshots seed tickets across several categories. Viewports
and Chrome channel are configured in `playwright.config.ts`.

## Git Workflow

- `main` = stable release; each lab has an integration branch
  (`lab1-staging`, `lab2-staging`, ...).
- Work one GitHub Issue at a time on its own branch:
  `feature/<n>-<slug>` (e.g. `feature/12-e2e-visual`).
- Each branch is merged into its lab staging branch via a peer-reviewed Pull
  Request whose title follows `<type>(<scope>): <summary> (#<issue>)`.
