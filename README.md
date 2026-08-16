# TokTickIT

An IT service desk application built for the CPE334-SE course (KMUTT).
Lab 1 delivers a full-stack vertical slice: **React UI → Express REST API → Prisma ORM → PostgreSQL**.

The app shows the backend service status and the supported request categories
(Account and Access, Hardware, Software, Network) stored in the database.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript + Vite + Bootstrap |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma (ORM) |
| Testing | Vitest (UI) + Supertest (API) |

## Repository Structure

```
toktickit/
├── client/            # React + Vite frontend (port 5173)
│   ├── src/
│   └── tests/lab-01/
├── server/            # Express backend (port 5000)
│   ├── prisma/        # schema + migrations
│   ├── src/
│   └── tests/lab-01/
├── docs/lab-01/       # lab sheet, test plan & evidence, AI-use & peer-review records
├── docker-compose.yml # PostgreSQL 17
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 24
- pnpm 11.20
- Docker (for the local PostgreSQL database)

## Setup

1. **Clone and install dependencies** (two independent packages, run in each):

   ```sh
   cd server && pnpm install
   cd ../client && pnpm install
   ```

2. **Configure environment files** (copy from the provided examples):

   ```sh
   # server/ — database credentials + Prisma connection string
   cp server/.env.example server/.env

   # client/ — backend API base URL
   cp client/.env.example client/.env
   ```

   In `client/.env`, set `VITE_API_URL` to the backend port, e.g.
   `VITE_API_URL="http://localhost:5000"`.

3. **Start PostgreSQL** (root directory):

   ```sh
   docker compose up -d
   ```

4. **Generate the Prisma client, create tables and seed the categories** (in `server/`):

   ```sh
   pnpm exec prisma generate
   pnpm exec prisma migrate dev
   pnpm exec prisma db seed
   ```

## Run

| App | Command | URL |
|-----|---------|-----|
| Backend | `cd server && pnpm dev` | http://localhost:5000 |
| Frontend | `cd client && pnpm dev` | http://localhost:5173 |

Open http://localhost:5173 in a browser and click **[Check System]**.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Backend status → `{ "status": "ok", "service": "TokTickIT API" }` |
| GET | `/api/categories` | Seeded request categories from PostgreSQL |

## Tests

```sh
cd server && pnpm test    # Supertest API tests (Vitest)
cd client && pnpm test    # Vitest UI tests
```

Test files live in `server/tests/lab-01/` and `client/tests/lab-01/`
(not colocated with source).

Note: the server's `GET /api/categories` test reads from the real database,
so start PostgreSQL and run the seed step above before `pnpm test` in `server/`.

## Git Workflow

- `main` = stable release, `lab1-staging` = Lab 1 integration branch.
- Work one GitHub Issue at a time on its own branch: `feature/1-project-foundation`,
  `feature/2-health-check`, `feature/3-category-seed`, `feature/4-category-list`.
- Each branch is merged into `lab1-staging` via a peer-reviewed Pull Request.