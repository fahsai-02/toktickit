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