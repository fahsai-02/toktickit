# AGENTS.md

Tok TickIT — IT service desk app, a KMUTT CPE334-SE course project (2 packages: `client/`, `server/`). Early-stage lab work; source intentionally contains `TODO(Issue N)` markers and unimplemented functions that later lab issues fill in.

## Commands (run inside the package dir; pnpm only, no root package.json)

- `pnpm install` in `client/` AND `server/` separately (two independent lockfiles, not a pnpm workspace)
- `server`: `pnpm dev` (tsx watch src/index.ts), `pnpm build` (tsc → dist), `pnpm start`, `pnpm test`
- `client`: `pnpm dev` (Vite, port 5173), `pnpm build` (tsc && vite build), `pnpm test`
- No lint script exists anywhere despite ESLint configs in both packages; skip it.
- Node 24 + pnpm 11.20 required (see `server/package.json`).

## Time will be lost if you miss…

- **Prisma 7 (not v6)**: `schema.prisma`'s generated client uses provider `prisma-client` and writes to `server/src/generated/prisma` (gitignored). The datasource has NO `url` in the schema — it comes from `server/prisma.config.ts`, which reads `DATABASE_URL` from `server/.env`. After `pnpm install`, run `pnpm exec prisma generate` in `server/` or imports will fail. Migrations: commit generated migrations, use `prisma migrate dev`/`deploy` (never `db push` unless asked).
- **Local DB**: PostgreSQL 17 via root `docker-compose.yml` reads env from `server/.env` (`POSTGRES_*` + `DATABASE_URL`). `server/.env` is gitignored; copy `server/.env.example` to create it. Start with `docker compose up -d` from repo root before migrate/tests that touch the DB.
- **ESM + `.js` suffixes**: both packages are `"type": "module"` with `verbatimModuleSyntax`. Import local files with the `.js` extension even though the files are `.ts`/`.tsx` (e.g. `import app from './app.js'`, `import App from '../../src/App.js'`). Use `import type` for type-only exports in the server.
- **Client→server URL is not wired up**: Vite has no proxy; `client/src/api.ts` defaults to `http://localhost:3000`, but the server actually listens on `PORT || 5000`. Set `VITE_API_URL` in `client/.env` (copy from `client/.env.example`) or the UI hits the wrong port.

## Tests

- Server: Vitest + Supertest in `server/tests/lab-01/*.test.ts`, imports Express `app` from `src/app.ts` directly (no DB needed for the health test).
- Client: Vitest in `client/tests/lab-01/*.test.tsx` (jsdom, setup `client/tests/setup.ts`); configured inside `client/vite.config.ts` (imported from `vitest/config`), `include: ["tests/**/*.test.tsx"]` — tests are NOT colocated with source.
- Run `pnpm test` inside the relevant package; the working example test asserts the `/api/health` shape exactly `{ status: 'ok', service: 'TokTickIT API' }`.

## Repo workflow / scope (course-specific)

- Git flow: `main` and `lab1-staging` exist; work one issue at a time on its own `feature/<n>-<slug>` branch off `lab1-staging` (current: `feature/1-project-foundation`). See `docs/lab-01/ai_instructions.md` for the staged issue plan (health check → category seed → category list) and hard constraints: NO auth or image uploads yet.
- `docs/lab-01/` holds the lab spec, test plan, and peer-review sheets — read it before adding features; do not invent scope beyond the current lab issue.