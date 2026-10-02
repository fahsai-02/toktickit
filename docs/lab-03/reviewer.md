# Lab 3 — Peer Review Record

**Author:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  
**Peer reviewer (PR #65–#71, #73–#74):** Theeraphat Jaengam — 67070501063 — GitHub: @thrxpt  
**Second reviewer (PR #72 only):** Titihinan Sobking — GitHub: @Ohmmykung09  
**Last verified against the GitHub API:** 2026-09-29

**Status.** Every one of the ten pull requests in the first table (#65–#74) is
merged into `lab3-staging`. In the second table, the seven pull requests
authored by my partner were reviewed by me in his fork (#39–#45) and all seven
are merged there.

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|---|---|---|
| #65 | feature/14-sprint3-engineering-contract | approved 2026-09-11 (merged 2026-09-11) |
| #66 | feature/15-data-foundation | changes requested 2026-09-14 and 2026-09-15 → approved 2026-09-15 (merged 2026-09-15) |
| #67 | feature/16-auth-api-middleware | **commented** 2026-09-16 (4 actionable items, all addressed) → approved 2026-09-16 (merged 2026-09-16) |
| #68 | feature/17-auth-ui | changes requested 2026-09-18 → approved 2026-09-18 (merged 2026-09-18) |
| #69 | feature/18-requester-regression | changes requested 2026-09-19 → approved 2026-09-19 (merged 2026-09-19) |
| #70 | feature/19-staff-ticket-queue | changes requested 2026-09-20 → approved 2026-09-21 (merged 2026-09-21) |
| #71 | feature/20-staff-ticket-detail | changes requested 2026-09-21 → approved 2026-09-22 (merged 2026-09-22) |
| #72 | feature/21-admin-user-management | changes requested 2026-09-23, twice (@Ohmmykung09) → fixes applied 2026-09-23, merged 2026-09-24 without a re-approval |
| #73 | feature/22-comprehensive-testing | changes requested 2026-09-25 → approved 2026-09-26 (merged 2026-09-26) |
| #74 | feature/23-release-polish | approved 2026-09-29 (merged 2026-09-29) |

---

## Pull Requests I reviewed for my partner

| PR | Branch | My verdict |
|---|---|---|
| #39 | feature/14-lab3-contract | approved 2026-09-10 (merged 2026-09-10) |
| #40 | feature/15-auth-foundation | changes requested 2026-09-16 → approved 2026-09-16 (merged 2026-09-16) |
| #41 | feature/16-auth-shell-regression | changes requested 2026-09-18 → approved 2026-09-19 (merged 2026-09-19) |
| #42 | feature/17-staff-ticket-queue | changes requested 2026-09-19 → approved 2026-09-20 (merged 2026-09-20) |
| #43 | feature/18-staff-ticket-detail | changes requested 2026-09-20 → approved 2026-09-21 (merged 2026-09-21) |
| #44 | feature/19-comments-and-notes | one comment round 2026-09-22 (2 inline nits) → approved 2026-09-23 (merged 2026-09-23) |
| #45 | feature/20-admin-user-management | changes requested 2026-09-24 → approved 2026-09-24 (merged 2026-09-24) |

---

## Detail — PRs I authored

### PR #65 — feature/14-sprint3-engineering-contract

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/65>

**PR title on GitHub:** docs(lab-03): create engineering contract and specifications (#55)

#### Reviewer approval (`APPROVED`, 2026-09-11, @thrxpt)

> LGTM

**Merged into `lab3-staging` 2026-09-11 (#65)** (merge commit `6b7977e`, merged by @thrxpt)

---

### PR #66 — feature/15-data-foundation

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/66>

**PR title on GitHub:** feat(schema): lab3 user models, migration & seed (#56)

#### Reviewer review (`COMMENTED`, 2026-09-14, @thrxpt)

> *(Superseded by the Changes Requested review below)*

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-14, @thrxpt)

> ### Changes Requested: Data Foundation (Schema, Migration & Seed) — #66
>
> This is solid foundational work for Lab 3—the schema expansion, additive migration, bcrypt password hashing, and baseline regression tests are well structured.
>
> However, there are a couple of blocking documentation and standards items that need to be resolved before merging:
>
> ---
>
> #### Required Changes
>
> 1. **Clarify Server Suite status in `docs/lab-03/tests.md` (section 6, line 214):**
>    - **Issue:** Section 6 records the **Server (unit + API)** suite as `Pass — 12 files / 135 tests (2026-09-12)`. But in section 2, all Lab 3 endpoints (`UNIT-01..03` and `API-01..73`) are rightfully marked `Planned` as they belong to subsequent sprint issues (Issues 16–21). Marking the entire server suite as passed at this stage is premature per `tests.md` section 6 preamble and DoD item 2.
>    - **Fix:** Update the label in section 6 to clarify that the passing result reflects the **Migration & Regression Baseline (MIG-01 + Lab 1/2 tests)** rather than the complete Lab 3 server suite.
>
> 2. **Replace forbidden `§` symbols with the word `section`:**
>    - **Issue:** `AGENTS.md` (Review Protocol) explicitly specifies: *"When referring to a spec's subsection in prose, write the word 'section' (e.g. 'section 5.2'), never the § symbol."*
>    - **Fix:** Replace all occurrences of `§<n>` with `section <n>` in:
>      - `docs/lab-03/seed-credentials.md:6` (`specification.md §11` → `specification.md section 11`)
>      - `server/prisma/seed.ts:22, 83, 454` (`§11` / `§7` → `section 11` / `section 7`)
>      - `server/tests/lab-03/migration-regression.api.test.ts:7` (`specification.md §7` → `specification.md section 7`)
>
> 3. **Use type-only import in `server/prisma/seed.ts` (line 5):**
>    - **Issue:** `RequestedPriority` is only used as a type annotation in `type SeedTicket`.
>    - **Fix:** Use `import type { RequestedPriority }` to adhere to ESM/`verbatimModuleSyntax` rules.
>
> ---
>
> #### Non-blocking Notes (Recommended)
>
> - **Automated count assertion:** Note that `BASELINE_COUNTS_DEFAULT` in `migration-regression.api.test.ts` defaults to 0 attachments and 15 tickets. Documenting that `PRE_MIGRATION_COUNTS` should be supplied for strict local regression checks against snapshot data is recommended.
> - **N+1 queries in seed (`server/prisma/seed.ts:538-568`):** Memoizing ticket IDs from the earlier query would avoid `findUnique` database calls inside each comment/note insert loop.
> - **Naming:** Renaming `participant` in seed fixtures to `authorEmail` would align better with the domain model's `author` / `authorId`.
>
> Once the three required items above are updated, I will approve the PR immediately.

#### Author's response (2026-09-14, @fahsai-02)

> **Thanks for the careful review! I've fixed all 3 blocking items.**
>
> ## 1. Server suite status in tests.md (section 6)
>
> Fixed. The table now says the `Pass` result only covers the **Migration & Regression Baseline (MIG-01 + Lab 1/2 tests)**, and that the Lab 3 endpoint tests stay `Planned` until Issues 16–21.
>
> ## 2. `§` → `section`
>
> Done. Replaced every `§` reference:
>
> - `docs/lab-03/seed-credentials.md` → `specification.md section 11`
> - `server/prisma/seed.ts` → `section 11` and `section 7`
> - `server/tests/lab-03/migration-regression.api.test.ts` → `section 7`
> - Also fixed one I found in `docs/lab-03/tests.md` (MIG-01 row)
>
> ## 3. Type-only import in seed.ts
>
> Done. `RequestedPriority` is now imported with `import type { RequestedPriority }` since it is only used as a type.
>
> `cd server && pnpm build` passed with no errors.
>
> ---
>
> ## Non-blocking notes. Thanks, I agree these are good ideas
>
> - **`PRE_MIGRATION_COUNTS`** — acknowledged. The test already documents this in the header comment; for strict checks, you can run:
>
>   ```bash
>   cd server && PRE_MIGRATION_COUNTS='{"ticket":343,"attachment":179,"requester":6,"category":4,"relatedSystem":7}' pnpm test
>   ```
>
> - **N+1 `findUnique` calls in the seed** — agreed, we can memoize ticket IDs. I left it for a future cleanup to keep this PR focused.
> - **Renaming `participant` → `authorEmail`** — agreed it fits the domain model better. Also left for a future cleanup. Would you like me to do these two now?
>
> ---
>
> Also added a small fix: I clarified the MIG-01 baseline note in `tests.md` line 167 to match the new wording. The changes are committed on `feature/15-data-foundation`, ready for your re-review.

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-15, @thrxpt)

> ### PR Review Update: Follow-up on commit `634386a` — #66
>
> Thanks for addressing the previous feedback! The updates in commit `634386a` look great:
> - The `tests.md` section 6 suite status is now clearly described as the baseline regression suite.
> - All `§` references have been cleanly replaced with `section`.
> - `RequestedPriority` is now imported using `import type`.
>
> ---
>
> #### Remaining Blocker: Test Timeout in `migration-regression.api.test.ts`
>
> When running the full server test suite (`cd server && pnpm test`), one test in `server/tests/lab-03/migration-regression.api.test.ts` consistently times out:
>
> - **Failing Test:** `stores only bcrypt hashes (prefix $2) and bcrypt.compare succeeds for seeded passwords` (line 141)
> - **Error:**
>   ```text
>   Error: Test timed out in 5000ms.
>   If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
>   ```
> - **Root Cause:**
>   The test runs `bcrypt.compareSync` across all 11 seeded users. Because `bcryptjs` is pure JavaScript and uses cost factor 12, each hash verification takes ~450–500ms. Doing 11 comparisons synchronously takes ~5.2–5.5s, which consistently exceeds Vitest’s default 5000ms timeout when running the entire suite.
>
> - **Suggested Fix (1-line change):**
>   Either pass an explicit timeout to the test:
>   ```ts
>   it(
>     "stores only bcrypt hashes (prefix $2) and bcrypt.compare succeeds for seeded passwords",
>     async () => {
>       // test logic
>     },
>     15000 // <--- explicit timeout
>   );
>   ```
>   *Or* verify 1 sample user per role (1 Requester, 1 IT Staff, 1 Administrator), reducing total comparisons from 11 to 3 (~1.2s total execution time) while still verifying password hashing across all roles.
>
> ---
>
> Once this timeout is patched and `pnpm test` passes 135/135 tests cleanly, I will approve immediately!

#### Author's response (2026-09-15, @fahsai-02)

> Thanks for the follow-up and for confirming the three earlier fixes. The remaining blocker is fixed, and I also landed a few extra fixes in the same wave. Commits after your review (`f8c38a8`, `8d1caa1`, `709e419`, `399647d`):
>
> **1. Blocker, bcrypt test timeout (fixed in `f8c38a8`)**
> - The MIG-01 test now passes an explicit `20000ms` timeout (Vitest third argument) so it never hits the default 5000ms.
> - I kept your explicit-timeout option rather than the "1 sample per role" one. The follow-up `8d1caa1` actually goes further: `bcrypt.compare` is now verified for **every** documented seed account (all 11), inside the same explicit timeout, with emails/roles/passwords imported from `src/lib/seedData.ts` + `src/lib/seedCredentials.ts` — the same modules `prisma/seed.ts` consumes, so seed and test can no longer drift.
>
> **2. Same-wave extras (all behind the blocker fix)**
> - **Per-user salt hashing** (`f8c38a8`): each account gets a unique hash even when shared dev passwords are used (removed the password→hash cache) — bcrypt's per-call random salt is preserved.
> - **Ownerless + null-priority contrast** (`f8c38a8`): one seed ticket (Campus Wi-Fi) now has `itPriority: null` with no owner, so the staff queue "Unassigned" filter has real data to filter and the seed covers both populated/null priority.
> - **Single source of truth for seed** (`8d1caa1`): all seed rows moved to `seedData.ts`, credentials to `seedCredentials.ts`; `seed.ts` imports them instead of redefining inline.
> - **Deterministic DB assertions** (`8d1caa1`): `server/vitest.config.ts` sets `fileParallelism: false` so MIG-01's whole-table counts can never race other suites' create/delete rows.
> - **Lab 2 regression suites made seed-independent** (`709e419`): removed hard-coded ids/names/counts (`Jennifer Anderson`, `Hardware` id 2, `Robert Brown`, etc.); tests now query the DB or the seed module. The copied `validateAttachmentType` helper was also extracted to `src/lib/attachmentValidation.ts` and shared by `app.ts` + the unit test.
> - **AGENTS.md** (`399647d`): documented the test-writing rules and recorded a pending client-test stash that is intentionally deferred (client-only; not part of this server issue).
>
> **Verification on the current branch:**
> cd server && pnpm test      → 12 files / 138 tests Pass (135 before; +3 MIG-01 assertions)
> cd server && pnpm run build → Pass
> pnpm exec prisma db seed    → idempotent (ran twice, same counts)

#### Reviewer approval (`APPROVED`, 2026-09-15, @thrxpt)

> LGTM

**Merged into `lab3-staging` 2026-09-15 (#66)** (merge commit `8f666bd`, merged by @thrxpt)

---

### PR #67 — feature/16-auth-api-middleware

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/67>

**PR title on GitHub:** feat(auth): authentication API & middleware foundation (#57)

#### Reviewer review (`COMMENTED`, 2026-09-16, @thrxpt)

> Nice work on the authentication foundation! The session security setup (HTTP-only, `sameSite: "lax"`, 24-hour expiration, and production-only `secure` cookies), constant-time dummy bcrypt comparison for timing attack defense, case-insensitive email normalization, and clean throwaway test data lifecycle are well executed.
>
> All 166 tests across 13 test files are currently passing, and `pnpm build` succeeds with zero TypeScript errors.
>
> Before merging into `lab3-staging`, please take a look at the following findings:
>
> ---
>
> ### 🔍 Actionable / Items to Address
>
> 1. **Missing `UNIT-02` Unit Test File (`docs/lab-03/tests.md` line 35)**
>    - **Spec Reference**: `docs/lab-03/tests.md` line 35 defines:
>      > `| UNIT-02 | Unit | FR-07, AC-02 | New-password validation rules | Rejects <8 chars, missing uppercase, missing lowercase, missing digit, missing special char; accepts valid password | server/tests/lab-03/password-validation.unit.test.ts | Planned |`
>    - **Observation**: `validateNewPassword` in `server/src/lib/passwordValidation.ts` is exercised via the API endpoints in `auth.api.test.ts`, but the dedicated unit test file `server/tests/lab-03/password-validation.unit.test.ts` does not yet exist and remains marked `Planned` in `tests.md`.
>    - **Recommendation**: Add `server/tests/lab-03/password-validation.unit.test.ts` to test `validateNewPassword()` directly and flip `UNIT-02` to `Pass` in `docs/lab-03/tests.md`.
>
> 2. **Update Test Summary in `docs/lab-03/tests.md` (section 6 line 203)**
>    - **Spec Reference**: `docs/lab-03/tests.md` section 6 line 203.
>    - **Observation**: While API-01 through API-13 were flipped to `Pass`, the summary table at the bottom still lists the old baseline: `Pass — 12 files / 138 tests (2026-09-14)`.
>    - **Recommendation**: Update the summary line to reflect the current test run: `Pass — 13 files / 166 tests` (or 14 files / 170+ tests once `UNIT-02` is added).
>
> 3. **Missing Test Traceability Comments (`AGENTS.md` Test-Writing Rule 9)**
>    - **Spec Reference**: `AGENTS.md` Test-writing Rule 9 requires every test group to name its spec anchor.
>    - **Observation**: In `server/tests/lab-03/auth.api.test.ts`:
>      - Line 283: `describe("API — Login validation", ...)` is missing a spec citation (e.g. `docs/lab-03/api-spec.md section 2.1`).
>      - Line 424: `describe("Auth middleware — requireAuth / requireRole", ...)` is missing a spec citation (e.g. `docs/lab-03/specification.md section 6`, FR-11).
>    - **Recommendation**: Add the spec reference comments above both `describe` blocks.
>
> 4. **Unnecessary `async` on Synchronous `requireRole` Middleware (`server/src/middleware/auth.ts` line 52)**
>    - **Observation**:
>      ```ts
>      export function requireRole(...roles: UserRole[]) {
>        return async (req: Request, res: Response, next: NextFunction) => { ... }
>      }
>      ```
>      `requireRole` performs only in-memory checks on `req.user.role` with no asynchronous operations (`await`).
>    - **Recommendation**: Remove `async` and return `(req: Request, res: Response, next: NextFunction): void` to avoid unnecessary Promise wrapping and microtask ticks on every role-protected request.
>
> ---
>
> ### 💡 Observations / Notes (Non-blocking)
>
> - **`isActive` in response payload (`POST /login` & `GET /me`)**:
>   `docs/lab-03/api-spec.md` section 2.1 and section 2.3 define user payloads with `{ id, name, email, role, mustChangePassword }`. Including `isActive` is harmless, consistent with `requireAuth`, and documented in the PR notes, but keep in mind that frontend clients or strict contract tests might only expect the fields from `api-spec.md`.
> - **`POST /api/auth/logout` without session**:
>   `docs/lab-03/specification.md` section 8 line 246 indicates `POST /api/auth/logout` requires an active session (`Session` protection). The current implementation allows calling logout without a session and returns 200 (idempotent). This is acceptable and avoids unneeded errors during client cleanup, but if strict session enforcement is desired, `requireAuth` can be attached.
> - **Session Store Decision in `api-spec.md`**:
>   Acceptance criterion #16 in Issue #57 requested documenting the session store choice in `docs/lab-03/api-spec.md`. It is currently documented in `docs/lab-03/specification.md` AD-02 and in `server/src/app.ts`. Consider adding a 1-line note under `api-spec.md` section 1 for completeness.
>
> ---
>
> ### Verdict
> Requesting minor updates (primarily adding `UNIT-02` to close out the planned test in `tests.md` and updating the test baseline count). The core authentication implementation and security controls look solid!

#### Author's response (2026-09-16, @fahsai-02)

> **Thanks for the thorough review! I've addressed all 4 actionable findings and considered the 3 non-blocking observations.**
>
> ## Actionable items
>
> **1. Missing `UNIT-02` unit test file**
> Added `server/tests/lab-03/password-validation.unit.test.ts` — 7 direct tests for `validateNewPassword()`: accepts a fully valid password, rejects each rule individually (fewer than 8 chars, missing uppercase, missing lowercase, missing digit, missing special char), and verifies the first-failing-rule ordering. `docs/lab-03/tests.md` UNIT-02 is now flipped to **Pass**.
>
> **2. Stale test summary in `tests.md` (section 6)**
> Updated to the current run: **Pass — 14 files / 173 tests (2026-09-16)**. Also refreshed the file-count comment in `server/vitest.config.ts` (12 → 14 files).
>
> **3. Missing traceability comments (AGENTS.md Rule 9)**
> Added spec-anchor comments above both `describe` blocks in `auth.api.test.ts`:
> - `API — Login validation` → `docs/lab-03/api-spec.md` section 2
> - `Auth middleware — requireAuth / requireRole` → `docs/lab-03/specification.md` section 6, FR-11
>
> **4. Unnecessary `async` on `requireRole`**
> Removed `async`; `requireRole` now returns a synchronous `(req, res, next) => void` since it only performs in-memory role checks.
>
> ## Non-blocking observations (acknowledged)
>
> - **`isActive` in login/me payload** — agreed it's beyond the api-spec section 2.1/2.3 field list. Kept because `requireAuth` re-reads it from the DB on every request and the client needs it to render account state; will revisit if a strict contract test flags it.
> - **Logout without session** — intentionally idempotent (`200`), so client cleanup never surfaces spurious 401s; FR-04 session invalidation still holds for active sessions.
> - **Session store note in api-spec.md** — added a one-line note under section 1 documenting the in-memory `MemoryStore` (pointing at AD-02), closing out AC #16.
>
> ## Verification
>
> ```
> cd server && pnpm test    → 14 files / 173 tests Pass
> cd server && pnpm build   → Pass (tsc, zero errors)
> ```
>
> Committed as `3689c96` (fixes) + `03b3924` (reviewer.md record) on `feature/16-auth-api-middleware`, ready for your re-review.

#### Reviewer approval (`APPROVED`, 2026-09-16, @thrxpt)

> Ready to merge into `lab3-staging`. Great job on the security foundation!

**Merged into `lab3-staging` 2026-09-16 (#67)** (merge commit `e211131`, merged by @thrxpt)

---

### PR #68 — feature/17-auth-ui

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/68>

**PR title on GitHub:** feat(auth-ui): Authentication UI — Login, Change Password & App Shell (#58)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-18, @thrxpt)

> Great work on this milestone! Replacing the temporary Dev Requester selector with session-based authentication and role-aware navigation is a major leap forward for Lab 3. The implementation of the real-time 3-rule password checklist matching the backend validation, clean route guards that avoid flashing unauthenticated screens, full session cookie propagation across all API calls, and the integration of the deferred client test hardening stash are all exceptionally well executed.
>
> All **103 client tests across 11 files** and **173 server tests across 14 files** pass cleanly, and `pnpm build` succeeds with zero errors in both packages.
>
> Before merging into `lab3-staging`, please address the following minor items:
>
> ---
>
> #### Actionable / Items to Address
>
> 1. **Comment out `VITE_API_URL` in `client/.env.example`**
>    - **Context:** The PR description notes: *"Dev networking is intended to be same-origin... client/.env.example now keeps the variable commented out to document this."*
>    - **Finding:** In git, `client/.env.example` was not modified and still has active `VITE_API_URL="http://localhost:5000"`. If copied directly to `.env`, browser requests bypass the Vite dev proxy and fail credentialed CORS on login.
>    - **Fix:** Update `client/.env.example` to `# VITE_API_URL="http://localhost:5000"` so the file matches the PR description and guides new setups safely.
>
> 2. **Clean up dead CSS and add mobile truncation for `.profile-name` (`client/src/App.css:408-422`)**
>    - **Context:** `ui-spec.md` section 4 requires: *"Mobile (<768px): header keeps brand + user name (truncated)..."*
>    - **Finding:** While `.btn-change-requester` and `.requester-name` were removed from desktop styles, they were accidentally left behind inside the `@media (max-width: 768px)` block. Because `.profile-name` was not given a mobile rule, it retains its desktop `max-width: 160px`, which can crowd narrow mobile headers (<360px) alongside the badge and hamburger.
>    - **Fix:** Remove the obsolete `.btn-change-requester` / `.requester-name` rules and add mobile truncation for the profile name:
>      ```css
>      .profile-name {
>        max-width: 80px;
>        min-width: 0;
>      }
>      ```
>
> 3. **Update Client Suite status in `docs/lab-03/tests.md` (section 6)**
>    - **Finding:** Rows `UI-01` through `UI-06` were updated from `Planned` to `Pass`, but the summary table in section 6 still lists `Client (component + style) | *TBD at sprint close*`.
>    - **Fix:** Update the row to record the new passing baseline:
>      ```markdown
>      | Client (component + style) | `cd client && pnpm test` | **Pass** — 11 files / 103 tests (2026-09-17) |
>      ```
>
> ---
>
> #### Observations / Notes (Non-blocking)
>
> - **Test coverage for `roleBadgeVariant` (`ui-spec.md` section 9.1 item 7):** `roleBadgeVariant()` and role badge styles (`.badge-role-requester`, etc.) work as intended, but unlike status/priority badges, there is no automated assertion in `zen-green-style.test.tsx` verifying the mapping. Consider adding a quick check in `client/tests/lab-02/zen-green-style.test.tsx`.
> - **DRY Route Guard Loading (`client/src/App.tsx`):** The 5-line `<div className="selection-page" data-testid="app-loading"><Spinner /></div>` block is repeated across 5 route guards. A small `<AuthLoading />` helper component would keep `App.tsx` concise.
> - **Voluntary Change Password UX:** When a user visits `/change-password` voluntarily from the profile menu, they can return to the app via the browser back button, but adding an explicit "Cancel" link back to `/` in a future polish issue would enhance usability.

#### Author's response (2026-09-18, @fahsai-02)

> **Thanks for the thorough review! I've addressed all 3 actionable items plus the `roleBadgeVariant` note, committed as `7c0b7ae` on `feature/17-auth-ui`.**
>
> ## Actionable items
>
> **1. `client/.env.example`**
>
> Fixed — `VITE_API_URL` is now commented out (`# VITE_API_URL="http://localhost:5000"`), so a fresh copy to `.env` stays on the same-origin Vite dev proxy and never hits the credentialed-CORS failure on login.
>
> **2. Dead CSS + mobile `.profile-name` (`client/src/App.css`)**
>
> Fixed — removed the leftover `.btn-change-requester` / `.btn-change-requester__full` / `.requester-name` rules from the `@media (max-width: 768px)` block and added the requested mobile truncation:
>
> ```css
> .profile-name {
>   max-width: 80px;
>   min-width: 0;
> }
> ```
>
> **3. Client suite status in `docs/lab-03/tests.md` (section 6)**
>
> Fixed — the summary row now records the passing baseline.
>
> ## Observations / Notes
>
> - **`roleBadgeVariant` coverage** — addressed: added 2 tests in `client/tests/lab-02/zen-green-style.test.tsx` asserting the REQUESTER/IT_STAFF/ADMINISTRATOR → `.badge-role-*` mapping, the documented blue/green/purple tints (`docs/lab-03/ui-spec.md` section 3), the neutral fallback, and the rendered badge class. The suite is now **11 files / 105 tests**.
> - **DRY route-guard loading** — agreed, the spinner block repeats across 5 guards; left for a polish issue to keep this PR focused on the review items.
> - **Voluntary change-password "Cancel" link** — agreed it improves usability; noted for the same future polish issue.
>
> ## Verification
>
> ```
> cd client && pnpm test   → 11 files / 105 tests Pass
> cd client && pnpm build  → Pass (zero errors)
> ```
>
> Ready for your re-review.

#### Reviewer approval (`APPROVED`, 2026-09-18, @thrxpt)

> ### PR Review Update: Follow-up on commit `7c0b7ae` — #68
>
> Thanks for the prompt turnaround! Commit `7c0b7ae` resolves all review items cleanly:
>
> - `client/.env.example` now comments out `VITE_API_URL` to protect local dev from cross-origin CORS cookie failures.
> - Obsolete Lab 2 Dev Requester styles (`.btn-change-requester`, `.requester-name`) have been removed from `client/src/App.css`, and `.profile-name` now has mobile truncation (`max-width: 80px`) preventing header overflow on small viewports.
> - `docs/lab-03/tests.md` Section 6 test summary has been updated to the current passing baseline (`11 files / 105 tests`).
> - Bonus: automated test coverage for `roleBadgeVariant` and role badge tokens added to `zen-green-style.test.tsx`, fully satisfying `ui-spec.md` Section 3 / Section 9.1 Item 7.
>
> #### Verification
> - Client test suite: `11 files / 105 passed (105)` (`cd client && pnpm test`)
> - Client build: `tsc && vite build` passed with zero errors
> - Server test suite: `14 files / 173 passed (173)` (`cd server && pnpm test`)
> - Server build: `tsc` passed with zero errors
>
> LGTM! Ready to merge into `lab3-staging`.

**Merged into `lab3-staging` 2026-09-18 (#68)** (merge commit `c75022e`, merged by @thrxpt)

---

### PR #69 — feature/18-requester-regression

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/69>

**PR title on GitHub:** feat(server,client): requester regression — session identity, public comments, resolve indicator (#59)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-19, @thrxpt)

> Great work on this issue! Regressing all Lab 2 requester and attachment endpoints behind session authentication (`requireAuth`) while strictly ignoring any client-supplied `requesterId` (BR-03, FR-12, FR-13) is implemented cleanly.
>
> The ownership guards (403 `FORBIDDEN` across list, detail, attachments, download, soft removal, comments, and indicate-resolved), the append-only 405 enforcement, and the non-mutating "Problem Appears Resolved" toggle (FR-19, BR-20) all strictly adhere to the contracts.
>
> All test suites and builds are verified green:
> - **Server**: 16 files / 193 tests pass (`pnpm test`) + clean `tsc` build (`pnpm build`).
> - **Client**: 13 files / 119 tests pass (`pnpm test`) + clean Vite production build (`pnpm build`).
> - **E2E**: E2E-05 requester regression flow verified.
>
> Before approving and merging into `lab3-staging`, please address the following items:
>
> ---
>
> ### Actionable / Items to Address
>
> 1. **Missing CSS styling for Resolution Summary (`docs/lab-03/ui-spec.md` section 5.3)**  
>    `ui-spec.md` section 5.3 explicitly states:  
>    > *"Resolution Summary (read-only, shown when set by IT Staff): displayed in the info grid as a read-only field with pale green background. When null/not set, the field is hidden."*  
>
>    In `client/src/TicketDetail.tsx` (line 280), the element has `className="field-readonly resolution-summary"`, but `client/src/App.css` does not define `.resolution-summary`. It currently falls back to the default neutral read-only background (`--color-field-readonly`, `#F0F4F2`) rather than pale green (`var(--color-pale)`, `#EAF6EF`).  
>    **Suggested fix:** In `client/src/App.css` (inside `@layer layout`), add:
>    ```css
>    .field-readonly.resolution-summary {
>      background: var(--color-pale);
>      white-space: pre-wrap;
>    }
>    ```
>
> 2. **Documentation Typo in `README.md` (lines 102–106)**  
>    `README.md` lines 102–106 reference `docs/lab-01/seed-credentials.md` and `docs/lab-02/seed-credentials.md`, which do not exist (auth and credentials were first introduced in Lab 3).  
>    **Suggested fix:** Update the sentence to point directly to `docs/lab-03/seed-credentials.md`:
>    ```markdown
>    Open http://localhost:5173 in a browser. Sign in using an account from
>    `docs/lab-03/seed-credentials.md`. Then use **Create Ticket** and **My Tickets**
>    from the authenticated app shell.
>    ```
>
> ---
>
> ### Observations / Non-blocking Nits
>
> - **Test Data Single Source of Truth (`AGENTS.md` Test-writing Rule 2):** In `e2e/lab-03/helpers.ts` (lines 12–14), `REQ_EMAIL = "david.lee@toktickit.dev"` and `REQ_INITIAL_PASSWORD = "TempPass123!"` are hard-coded literals. Where possible, consider importing credentials from `server/src/lib/seedData.ts` and `server/src/lib/seedCredentials.ts` to keep the seed as the single source of truth across all tiers.
> - **Atomic Legacy Requester Upsert (`server/src/app.ts` line 186):** In `resolveLegacyRequesterIdForUser`, replacing `findUnique` + `create` with `db.requester.upsert({ where: { email }, update: {}, create: { name, email, isActive: true } })` avoids a potential `P2002` race if two concurrent requests from a fresh user hit simultaneously.
>
> ---
>
> ### Verification Instructions
>
> After applying the fixes, please verify with:
> ```bash
> # 1. Server tests and build
> cd server && pnpm test && pnpm build
>
> # 2. Client tests and build
> cd ../client && pnpm test && pnpm build
> ```

#### Author's response (2026-09-19, @fahsai-02)

> **Thanks for the careful review! Both actionable items are fixed, and the atomic-upsert nit is applied too. Committed as `b039dd5` on `feature/18-requester-regression`.**
>
> ## 1. Resolution Summary CSS (`docs/lab-03/ui-spec.md` section 5.3)
>
> Fixed. Added in `client/src/App.css` (inside `@layer layout`):
> ```css
> .field-readonly.resolution-summary {
>   background: var(--color-pale);
>   white-space: pre-wrap;
> }
> ```
>
> The read-only field now renders with the documented pale-green background (`var(--color-pale)`, `#EAF6EF`) instead of the neutral `--color-field-readonly` fallback, and stays hidden when `resolutionSummary` is null.
>
> ## 2. README seed-credentials typo
>
> Fixed. The sentence now points directly to `docs/lab-03/seed-credentials.md` (the only such file that exists — auth was first introduced in Lab 3).
>
> ## Nits
>
> - **Atomic requester upsert (`server/src/app.ts`)** — applied. `resolveLegacyRequesterIdForUser` now uses `db.requester.upsert({ where: { email }, update: {}, create: { name, email, isActive: true } })`, closing the `P2002` race for concurrent first requests while keeping identical behavior (existing rows untouched; `isActive` only set on create).
> - **E2E hard-coded credentials (`e2e/lab-03/helpers.ts`)** — considered, intentionally left as-is. `seedData.ts` imports the generated Prisma client, so importing it into the standalone Playwright root package would drag a heavy cross-package dependency in for no behavioral gain — and `REQ_PASSWORD` (`E2ERequester1!`) is deliberately e2e-local, not a seed value, so the single-source-of-truth rule does not apply to it. Happy to revisit in a later issue if you'd like.
>
> ## Verification (on `feature/18-requester-regression`)
>
> ```
> cd server && pnpm exec prisma db seed   # restores documented passwords (needed before the suite)
> cd server && pnpm test  → 16 files / 193 tests Pass
> cd server && pnpm build → Pass (tsc, zero errors)
> cd client && pnpm test  → 13 files / 119 tests Pass
> cd client && pnpm build → Pass (tsc && vite build)
> ```
>
> Note: the first test run surfaced 2 MIG-01 failures - the seeded passwords had been rotated by earlier E2E runs; a fresh `prisma db seed` restored them and the full suite is green.

#### Reviewer approval (`APPROVED`, 2026-09-19, @thrxpt)

> ### PR Review Update: Follow-up on commit `b039dd5` — #69
>
> Thanks for the prompt turnaround! Commit `b039dd5` resolves all review items cleanly:
>
> - **Resolution Summary CSS (`docs/lab-03/ui-spec.md` section 5.3):** Added `.field-readonly.resolution-summary { background: var(--color-pale); white-space: pre-wrap; }` inside `@layer layout` in `client/src/App.css`. The field now renders with the specified pale green tint and preserves multi-line formatting.
> - **README credentials link:** Updated `README.md` to reference `docs/lab-03/seed-credentials.md` directly, removing references to non-existent lab-01/lab-02 files.
> - **Atomic legacy Requester upsert:** Converted `resolveLegacyRequesterIdForUser` in `server/src/app.ts` to `db.requester.upsert`, eliminating the concurrency race hazard.
>
> #### Verification
> - Server test suite: **16 files / 193 passed** (`cd server && pnpm test`)
> - Server build: `tsc` passed with zero errors (`cd server && pnpm build`)
> - Client test suite: **13 files / 119 passed** (`cd client && pnpm test`)
> - Client build: `tsc && vite build` passed with zero errors (`cd client && pnpm build`)
>
> LGTM! All 15 Acceptance Criteria are satisfied, verified, and backed by automated tests. Approved for merge into `lab3-staging`.

**Merged into `lab3-staging` 2026-09-19 (#69)** (merge commit `445136c`, merged by @thrxpt)

---

### PR #70 — feature/19-staff-ticket-queue

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/70>

**PR title on GitHub:** feat(staff-queue): IT Staff Ticket Queue API + UI (#60)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-20, @thrxpt)

> ### Changes Requested: IT Staff Ticket Queue API + UI — #70
>
> Great work on this issue! The implementation of the IT Staff Ticket Queue is well-architected and adheres closely to `docs/lab-03/specification.md`, `docs/lab-03/api-spec.md`, and `docs/lab-03/ui-spec.md`.
>
> The abstraction in `server/src/lib/ticketListQuery.ts` cleanly unifies query execution across requester and staff endpoints, and the UI correctly handles all 5 states (loading, empty, no-results, error, forbidden) as well as desktop, tablet, and mobile views. All test suites pass cleanly (17 server files / 210 tests; 14 client files / 137 tests), and builds succeed with zero errors.
>
> Before merging into `lab3-staging`, please address the following item:
>
> ---
>
> #### Actionable / Items to Address
>
> 1. **Missing `db.$disconnect()` in `staff-queue.api.test.ts` (Rule 8 violation)** (`server/tests/lab-03/staff-queue.api.test.ts`, line 1)
>    - **Problem**: `afterAll` is imported on line 1 from `"vitest"`, but is never invoked. The suite opens connections to PostgreSQL via `db.ticket.count`, `db.category.findFirst`, `db.ticket.findFirst`, and `db.user.findUnique`, violating `AGENTS.md` Test-writing rule 8 (*"Disconnect the DB client in `afterAll` (`await db.$disconnect()`) in any suite that opens a connection"*). All other Lab 3 test suites (`auth.api.test.ts`, `authorization.api.test.ts`, `comments-notes.api.test.ts`, `migration-regression.api.test.ts`) register this teardown.
>    - **Suggested fix**: Add the top-level teardown hook in `server/tests/lab-03/staff-queue.api.test.ts`:
>      ```ts
>      afterAll(async () => {
>        await db.$disconnect();
>      });
>      ```
>
> ---
>
> #### Observations / Non-blocking Nits
>
> - **Incomplete adoption of refactored shared components** (`client/src/StaffTicketQueue.tsx`): Commit `8ce78a4` created `MobileSortSelect` and `client/src/lib/options.ts` (`TICKET_STATUSES`, `PRIORITY_OPTIONS`) and refactored `MyTickets.tsx` to use them. In `StaffTicketQueue.tsx`, consider adopting `<MobileSortSelect>` and `options.ts` instead of raw `<select>` and inlined `<option>` lists for full consistency across all ticket list screens.
> - **TDZ risk for `hasActiveFilters`** (`client/src/StaffTicketQueue.tsx`, line 133 vs line 186): Inside `loadTickets`, `hasActiveFilters` is referenced on line 133, but `const hasActiveFilters` is declared on line 186 below `loadTickets`. Moving the declaration above `loadTickets` or computing it directly from `filters` inside the callback avoids relying on closure execution timing.
> - **Table column widths** (`docs/lab-03/ui-spec.md` section 5.4 line 160): The table currently relies on CSS auto-layout with a `max-width: 300px` on summary rather than explicit column widths (`180px`, `120px`, `auto`, etc.). It renders cleanly, but consider setting explicit column widths in `App.css` if strict pixel fidelity is evaluated during visual grading.
>
> ---
>
> #### Verification
>
> - `cd server && pnpm exec prisma db seed && pnpm test` → 17 files / 210 passed
> - `cd client && pnpm test` → 14 files / 137 passed
> - `cd server && pnpm build && cd ../client && pnpm build` → zero TypeScript errors

#### Author's response (2026-09-20, @fahsai-02)

> **Thanks for the careful review! The blocking item and all three nits are addressed, committed as `b214982` on `feature/19-staff-ticket-queue`.**
>
> ## 1. Missing `db.$disconnect()` (AGENTS.md Rule 8)
>
> Fixed. Added the top-level `afterAll` teardown in `server/tests/lab-03/staff-queue.api.test.ts` — the suite now disconnects the DB client exactly like `auth.api.test.ts`, `authorization.api.test.ts`, `comments-notes.api.test.ts`, and `migration-regression.api.test.ts`, so the previously unused `afterAll` import is used too.
>
> ## 2. Shared components adoption (`client/src/StaffTicketQueue.tsx`)
>
> Applied. The filter panel now maps `TICKET_STATUSES` / `PRIORITY_OPTIONS` from `client/src/lib/options.ts`, and the mobile "Sort by" dropdown is now the shared `<MobileSortSelect>` with a staff-specific `STAFF_MOBILE_SORT_OPTIONS` (mirrors the api-spec section 5.1 whitelist — `itPriority` + `currentStatus` instead of `requestedPriority`). Test IDs (`filter-status`, `filter-req-priority`, `filter-it-priority`, `mobile-sort-select`) are unchanged, so there was zero test churn.
>
> ## 3. `hasActiveFilters` TDZ
>
> Fixed. The `const` is now declared above `loadTickets` alongside the other filter-derived state, so the closure no longer depends on execution timing.
>
> ## 4. Table column widths (ui-spec 5.4)
>
> Applied. `TicketTable` now tags the staff variant's headers/cells with `staff-col-<key>` classes, and `App.css` pins the spec's preferred widths (Ticket No. 180px / Created + Last Updated 120px / Category 120px / Req. + IT Priority 100px / Status 130px / Owner 140px), leaving Summary flexible to absorb the remainder. Kept on auto table-layout so the long status/priority badges never overflow their cells.
>
> ## Verification (on `feature/19-staff-ticket-queue`)
>
> ```
> cd server && pnpm test  → 17 files / 210 tests Pass
> cd server && pnpm build → Pass (tsc, zero errors)
> cd client && pnpm test  → 14 files / 137 tests Pass
> cd client && pnpm build → Pass (tsc && vite build)
> ```

#### Reviewer approval (`APPROVED`, 2026-09-21, @thrxpt)

> ### PR Review Update: Approved — #70
>
> Thanks for quickly addressing all feedback in commit `b214982`!
>
> Everything has been verified and confirmed:
> - **Database teardown (Rule 8)**: `server/tests/lab-03/staff-queue.api.test.ts` now registers `afterAll(async () => { await db.$disconnect(); });`, properly closing PostgreSQL client connections.
> - **Shared components & options**: `StaffTicketQueue.tsx` now reuses `MobileSortSelect` (`STAFF_MOBILE_SORT_OPTIONS`) and `options.ts` (`TICKET_STATUSES`, `PRIORITY_OPTIONS`), keeping list screens consistent.
> - **TDZ cleanup**: `hasActiveFilters` is now declared above `loadTickets`.
> - **Table column widths**: `App.css` and `TicketTable.tsx` now apply the exact pixel widths specified in `docs/lab-03/ui-spec.md` section 5.4 (`180px`, `120px`, `auto`, `120px`, `100px`, `100px`, `130px`, `140px`, `120px`).
>
> All suites and builds pass cleanly:
> - **Server**: 17 files / 210 tests pass (`pnpm test`)
> - **Client**: 14 files / 137 tests pass (`pnpm test`)
> - **Builds**: `tsc` and Vite production build succeed with zero errors in both packages
>
> LGTM! Ready to merge into `lab3-staging`.

**Merged into `lab3-staging` 2026-09-21 (#70)** (merge commit `13cb024`, merged by @thrxpt)

---

### PR #71 — feature/20-staff-ticket-detail

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/71>

**PR title on GitHub:** feat(staff-ticket-detail): IT Staff Ticket Detail API + UI (#61)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-21, @thrxpt)

> Overall excellent work implementing the IT Staff Ticket Detail API and UI! The backend test suite is comprehensive (19 files / 262 tests pass) and the client suite is solid (16 files / 169 tests pass). The BR-12 status transition matrix and append-only enforcement are rock solid.
>
> Before merging into `lab3-staging`, there are a few layout and UI edge-case items that should be addressed to fully satisfy the specifications in `docs/lab-03/ui-spec.md` and `docs/lab-03/specification.md`.
>
> ---
>
> ## What Was Verified
>
> - **Server tests:** `cd server && pnpm test` → 19 files / 262 tests Pass.
> - **Client tests:** `cd client && pnpm test` → 16 files / 169 tests Pass.
> - **Builds:** Both `cd server && pnpm build` and `cd client && pnpm build` compile cleanly without TypeScript or Vite errors.
> - **BR-12 Matrix:** Verified `status-transitions.unit.test.ts` (9 tests) covers all 8 statuses and exact transition permissions.
> - **Append-only enforcement:** Verified 405 Method Not Allowed responses on all 8 staff comment and note modification routes.
> - **Authorization:** Verified that Requesters receive 403 on internal notes and staff detail endpoints.
>
> ---
>
> ## Actionable / Items to Address
>
> ### 1. Tablet Layout Stacking (`docs/lab-03/ui-spec.md` section 5.5 line 224, section 6 line 289)
> - **Problem:** In `client/src/App.css` (lines 1324 & 1533), `.staff-detail-layout` is a 2-column grid (`1.1fr 1fr`) at base and only stacks (`grid-template-columns: 1fr`) inside `@media (max-width: 768px)`. On tablet viewports (768px–991px), the columns remain side-by-side. The spec explicitly specifies:
>   > *"Tablet (768–991px): stacked layout — info on top, tabs below."*
> - **Suggested fix:** Change the media query breakpoint for `.staff-detail-layout` to `@media (max-width: 991px)`.
>
> ### 2. Mobile Scrollable Tabs Strip (`docs/lab-03/ui-spec.md` section 5.5 line 226, section 6 line 290)
> - **Problem:** In `client/src/App.css` (lines 1385 & 1542), `.detail-tabs` has `display: flex; flex-wrap: wrap`. At mobile viewports, the three tabs wrap onto multiple lines rather than remaining a single horizontal scrollable strip:
>   > *"Mobile (<768px): fully stacked; tabs as horizontal scrollable strip."*
> - **Suggested fix:** On mobile viewports (`@media (max-width: 768px)`), apply `flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;`.
>
> ### 3. Attachment Tab Count Counts Soft-Removed Files (`docs/lab-03/ui-spec.md` section 5.5 line 203, `specification.md` BR-18)
> - **Problem:** In `client/src/StaffTicketDetail.tsx` (line 717), the tab header displays:
>   ```tsx
>   Attachments ({ticket.attachments.length})
>   ```
>   `ticket.attachments` includes soft-removed attachments (`isRemoved: true`). Inside the tab, `AttachmentSection` only counts active attachments (`Attachments ({activeCount})`).
> - **Suggested fix:** Use `ticket.attachments.filter((a) => !a.isRemoved).length` for the tab count so it matches the active attachment count.
>
> ### 4. Resolution Summary "Saved." Feedback Lingers on Edit (`client/src/StaffTicketDetail.tsx` line 670)
> - **Problem:** In `StaffTicketDetail.tsx`, modifying the textarea clears `resolutionError`, but does not reset `resolutionSaved` to `false`:
>   ```tsx
>   onChange={(e) => {
>     setResolutionText(e.target.value);
>     setResolutionError("");
>   }}
>   ```
>   If the user saves the summary and later edits the text, "Saved." remains visible next to the button despite unsaved dirty changes.
> - **Suggested fix:** Add `setResolutionSaved(false);` in the `onChange` handler.
>
> ### 5. Inactive Category Disappears from Dropdown (`docs/lab-03/ui-spec.md` section 5.5)
> - **Problem:** `fetchCategories()` fetches only active categories. If a historical ticket has an inactive category, the dropdown options will not contain it and the `<SelectField>` will display a blank value. (Notice lines 490–496 handle deactivated owners cleanly by appending `ticket.owner`).
> - **Suggested fix:** If `ticket.category` is not in `categories`, append `{ value: ticket.category.id, label: ticket.category.name }` to the category options list.
>
> ---
>
> ## Observations / Polish (Non-blocking)
>
> - **Breadcrumb Link (`client/src/StaffTicketDetail.tsx` line 513):** `My Queue` in the breadcrumb is currently plain text `<nav className="breadcrumb">My Queue &gt; Ticket Detail</nav>`. Wrapping `My Queue` in `<Link to="/staff/queue">` improves navigability (the right-side "Back to Queue" button works great already).
> - **Terminal Status Dropdown (`client/src/StaffTicketDetail.tsx` line 571):** When a ticket is `CANCELLED`, `transitionsFrom` returns `[]`. The dropdown remains enabled with only the placeholder option. Disabling the select (`disabled={statusSaving || statusOptions.length === 0}`) makes the terminal state clearer.
> - **Tab Count Flicker (`client/src/StaffTicketDetail.tsx` lines 699, 708):** Tabs show `comments.length` and `notes.length` which initialize to `0` until secondary fetches finish. Using `ticket._count.comments` and `ticket._count.notes` as initial counts avoids the flash of `(0)`.
> - **Destructuring Names (`server/src/app.ts` lines 1276–1280):** Using `requesterId: _`, `requesterUserId: __`, `ownerId: ___` is a bit mysterious; an explicit pick or typed mapping would be slightly clearer.

#### Author's response (2026-09-22, @fahsai-02)

> Thanks for the detailed review — all points verified and fixed in commit `2accd99` (pushed to `feature/20-staff-ticket-detail`).
>
> **Actionable items**
>
> 1. **Tablet layout stacking** — Fixed. `.staff-detail-layout` now stacks via `@media (max-width: 991px)` in `client/src/App.css` (info on top, tabs below), per ui-spec.md section 5.5 ("Tablet: stacked layout") and section 6 table ("Tablet 768–991px … stacked layout for staff detail"). `.staff-detail-comms` is also `position: static` at that breakpoint since sticky positioning is meaningless once stacked.
>
> 2. **Mobile scrollable tabs strip** — Fixed. In `@media (max-width: 768px)`, `.detail-tabs` is `flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch` with `.detail-tab { flex: 0 0 auto }`, so the three tabs stay one horizontally-scrolling strip per ui-spec.md section 5.5 ("tabs as horizontal scrollable strip") and never overflow the page (section 6 "zero horizontal page scrolling").
>
> 3. **Attachment tab count** — Fixed. `StaffTicketDetail.tsx` now uses `ticket.attachments.filter((a) => !a.isRemoved).length` for the tab header, matching `AttachmentSection`'s active-count and specification.md BR-18 ("Maximum 5 active attachments").
>
> 4. **Resolution "Saved." linger** — Fixed. `onChange` on the resolution textarea now calls `setResolutionSaved(false)`, so the success message clears as soon as the user edits after saving.
>
> 5. **Inactive category dropdown** — Fixed. If `ticket.category` is absent from the active categories list, it is appended to the dropdown options (mirrors the existing deactivated-owner handling at the owner select), so a historical ticket never renders a blank Category value.
>
> **Polish items** — also addressed since they were low-risk:
> - **Breadcrumb** — `My Queue` is now a `<Link to="/staff/queue">` (with a `.breadcrumb-link` style); text still reads "My Queue > Ticket Detail".
> - **Terminal status dropdown** — `disabled={statusSaving || statusOptions.length === 0}`, so the CANCELLED state shows a clearly disabled control (BR-12 terminal edge).
> - **Tab count flicker** — tab counts now use `Math.max(ticket._count.comments, comments.length)` (and notes), so the server `_count` shows immediately while the background fetches are in flight, and still reflects a freshly posted item (append-only, so `_count ≤ list length` always holds). Attachments count via the active filter.
> - **Server destructure** — the three internal FK columns were simply **removed from `staffDetailSelect`** in `server/src/app.ts` (the client type never consumes them), eliminating the `requesterId: _ / requesterUserId: __ / ownerId: ___` destructure entirely.
>
> **Verification**
> - Server: `pnpm test` → **19 files / 262 tests Pass** (unchanged).
> - Client: `pnpm test` → **16 files / 174 tests Pass** (was 169; +5 regression tests covering: Saved-clears-on-edit, inactive-category fallback, CANCELLED dropdown disabled, `_count` totals while fetches pending, attachments tab excluding soft-removed).
> - `pnpm build` clean in both packages.
> - No E2E dependency on the changed markup (`e2e/` grep empty for those selectors).

#### Reviewer approval (`APPROVED`, 2026-09-22, @thrxpt)

> All items from the previous review have been cleanly and thoroughly resolved in commit `2accd99`!
>
> ### Verification of Review Fixes
>
> | Item | Previous State | Resolved State in `2accd99` | Verification Proof |
> | :--- | :--- | :--- | :--- |
> | **1. Tablet Layout Stacking** (`ui-spec.md` section 5.5 line 224, section 6 line 289) | 2-column grid below 992px; stacked only at `<768px` | `@media (max-width: 991px)` rule added in `App.css` to stack info card and tabs at 768–991px | `App.css:1501-1509` |
> | **2. Mobile Scrollable Tabs Strip** (`ui-spec.md` section 5.5 line 226, section 6 line 290) | Tabs wrapped across multiple lines with `flex-wrap: wrap` | `.detail-tabs` set to `flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;` at `<768px` | `App.css:1561-1565` |
> | **3. Active Attachment Tab Count** (`ui-spec.md` section 5.5 line 203, `specification.md` BR-18) | Included soft-removed attachments (`isRemoved: true`) | Filtered with `ticket.attachments.filter((a) => !a.isRemoved).length` | `StaffTicketDetail.tsx:324`, unit test `StaffTicketDetail.test.tsx:461` |
> | **4. Resolution "Saved." Reset** (`StaffTicketDetail.tsx` line 670) | "Saved." text remained visible on subsequent edits | `setResolutionSaved(false)` added to textarea `onChange` | `StaffTicketDetail.tsx:684`, unit test `StaffTicketDetail.test.tsx:256` |
> | **5. Inactive Category Handling** (`ui-spec.md` section 5.5) | Inactive category on historical tickets showed blank select | Appended `ticket.category` if not in active category list | `StaffTicketDetail.tsx:329-332`, unit test `StaffTicketDetail.test.tsx:282` |
> | **6. Breadcrumb Parent Link** (`ui-spec.md` section 5.5) | Static text `My Queue` | Wrapped in `<Link to="/staff/queue" className="breadcrumb-link">` | `StaffTicketDetail.tsx:526` |
> | **7. Terminal Status Dropdown** (`specification.md` BR-12) | CANCELLED dropdown stayed enabled | `disabled={statusSaving \|\| statusOptions.length === 0}` | `StaffTicketDetail.tsx:591`, unit test `StaffTicketDetail.test.tsx:357` |
> | **8. Tab Count Flicker** (`StaffTicketDetail.tsx` lines 699, 708) | Flashed `(0)` until async fetch resolved | `Math.max(ticket._count.comments, comments.length)` uses server total immediately | `StaffTicketDetail.tsx:321`, unit test `StaffTicketDetail.test.tsx:447` |
> | **9. Clean Server Destructuring** (`server/src/app.ts`) | Mysterious `_`, `__`, `___` identifiers | Excluded internal FKs from `staffDetailSelect`, returning `ticket` directly | `server/src/app.ts:1225, 1281` |
>
> ### Test Suite Results
>
> - **Server:** 19 files / 262 tests Pass (`cd server && pnpm test`)
> - **Client:** 16 files / 174 tests Pass (`cd client && pnpm test`) — +5 new tests added covering all review edge cases
> - **Builds:** Both `server` and `client` pass `pnpm build` cleanly with zero errors

**Merged into `lab3-staging` 2026-09-22 (#71)** (merge commit `7cafd7b`, merged by @thrxpt)

---

### PR #72 — feature/21-admin-user-management

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/72>

**PR title on GitHub:** feat(admin-users): Administrator user management API + UI (#62)

This is the only PR in the lab reviewed by a **second reviewer**,
Titihinan Sobking (@Ohmmykung09); every other PR below was reviewed by
my partner @thrxpt.

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-23, @Ohmmykung09)

> The implementation covers most of the requested administrator user-management functionality, and the client test suite and production build pass successfully. However, I found several issues that should be addressed before merging:
>
> - Existing users can be deactivated through the Active toggle and Save action without the required confirmation dialog.
> - The production duplicate-email response is not displayed as an inline email error because the client and server error shapes do not match.
> - Concurrent duplicate-email updates can return 500 instead of the documented 409 Conflict.
> - The nested confirmation dialog and drawer conflict over Escape handling and page scroll locking.
>
> Please address the inline comments and add regression coverage for these paths. Requesting changes for now.

Inline threads in this round (4):

| Who | File:line | Verbatim opening line |
|---|---|---|
| @Ohmmykung09 | `client/src/UserManagement.tsx`:224 | Require confirmation for toggle-driven deactivation |
| @Ohmmykung09 | `server/src/app.ts`:2165 | Preserve the documented 409 response during concurrent email updates |
| @Ohmmykung09 | `client/src/UserManagement.tsx`:702 | Coordinate the nested dialog lifecycle |
| @Ohmmykung09 | `client/src/UserManagement.tsx`:232 | Surface the actual duplicate-email response inline |

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-23, @Ohmmykung09)

> The four previously reported issues have been addressed correctly: edit-mode status changes now require the dedicated confirmation flow, duplicate-email conflicts appear inline, concurrent P2002 errors return 409, and nested Escape/scroll-lock behavior is coordinated.
>
> One accessibility issue remains: after the confirmation dialog closes, the resumed drawer immediately moves focus from the action that opened the dialog to the drawer close button. This conflicts with the required focus-restoration behavior.
>
> Please address the remaining inline comment and add the corresponding focus assertion. Requesting changes for now.

Inline threads in this round (6):

| Who | File:line | Verbatim opening line |
|---|---|---|
| @fahsai-02 | `client/src/UserManagement.tsx`:224 | In edit mode, the Active toggle is now disabled, and Save no longer sends `isActive` for existing users. An existing user can only be activated/deactivated through the confirmed Deactivate User / Activate User flow. I also added a regression test that makes sure the toggle cannot bypass the confirmation. |
| @fahsai-02 | `server/src/app.ts`:2165 | The update endpoint now catches Prisma `P2002` and returns the same documented 409 duplicate-email response as the create endpoint, instead of 500. I added a regression test that forces the constraint error directly, so the test does not depend on timing or racing requests. |
| @fahsai-02 | `client/src/UserManagement.tsx`:702 | Fixed. The drawer now suspends its keyboard/scroll-lock handling while the confirmation dialog is open, so Escape only closes the topmost dialog. Both components now share a refcounted scroll lock, so page scrolling is never re-enabled while the drawer is still open. A regression test verifies the Escape behavior and the scroll lock. |
| @fahsai-02 | `client/src/UserManagement.tsx`:232 | You're right, sorry about that. The UI now maps the exact duplicate-email 409 response (code + message only, no `fields`) to the inline email field error, in both create and edit. I also updated the UI tests to mock the real response shape instead of a `fields.email` value the server never sends, so the test now proves the real behavior. |
| @Ohmmykung09 | `client/src/components/Drawer.tsx`:58 | Preserve the confirmation dialog's restored focus when resuming the drawer |
| @fahsai-02 | `client/src/components/Drawer.tsx`:58 | Thanks for the review! Fixed the focus regression: the drawer now returns focus to the Deactivate trigger on resume (with a regression test). Also applied tablet Option A (Email column hidden + full-width drawer up to 991px, per ui-spec 5.6) and two doc fixes (self-deactivation → 403, Deactivate = Destructive filled red). Client: 194 tests pass, build green. Server unchanged. Thanks! |

#### Reviewer comment (2026-09-24, @Ohmmykung09)

> Sieht für mich gut aus! but im forgot to approve kub sry jing jing

#### Author's response (2026-09-24, @fahsai-02)

> No worries na! Thanks for merging. 
> <img src="https://media1.tenor.com/m/_UaFpyE0SPYAAAAd/praying-cat.gif" width="200" />

**Merged into `lab3-staging` 2026-09-24 (#72)** (merge commit `56798fe`, merged by @Ohmmykung09)

---

### PR #73 — feature/22-comprehensive-testing

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/73>

**PR title on GitHub:** test(lab3): comprehensive testing — E2E runner + specs + style tests (#63)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-09-25, @thrxpt)

> ### Summary
> PR #73 successfully sets up the Lab 3 E2E test runner, implements 3 new Playwright specs (`authentication`, `staff-ticket-flow`, `user-administration`), adds the Zen Green client style suite (`zen-green-lab3-style.test.tsx`), and provides a DB cleanup utility (`cleanup-e2e.ts`). All tests pass deterministically with clean CSS architecture.
>
> ### Highlights
> - **CSS Layers**: New styles strictly reside in `@layer layout` without `!important`, and `--color-info` is corrected to `#2563EB` per `ui-spec.md` section 1.
> - **Deterministic E2E**: Relies on web-first assertions with zero arbitrary `sleep` or `waitForTimeout` calls.
> - **Complete Style Coverage**: All 8 statuses, 4 priorities, and 3 roles are tested against their spec-defined tints (`ui-spec.md` section 3).
> - **DB Cleanup**: `cleanup-e2e.ts` removes created records and properly disconnects Prisma (`await prisma.$disconnect()`).
>
> ### Key Points to Address
> 1. **Move cleanup to `test.afterAll()`** (`staff-ticket-flow.spec.ts:83`, `user-administration.spec.ts:89`):
>    - Running cleanup at the end of the test body means an assertion failure mid-test skips cleanup, leaving dirty database state. Move to `test.afterAll()` to guarantee cleanup.
> 2. **Prevent parallel worker collisions in config** (`playwright.config.ts:6`):
>    - Set `fullyParallel: false` and `workers: 1` directly in `playwright.config.ts` so running `npx playwright test` without CLI flags won't race the shared database.
> 3. **E2E-04: Test AC-11 (403 Self-Deactivation)** (`user-administration.spec.ts:70`, `docs/lab-03/tests.md:165`):
>    - Deactivating the sole admin triggers 409 (last active admin, AC-12). Create a second admin in the test to exercise the 403 self-deactivation path (AC-11) instead of demoting E2E-04 in `tests.md`.
> 4. **E2E-04: Test AC-10 First Login** (`user-administration.spec.ts:39`):
>    - Log in with the newly created user's initial credentials to verify redirection to `/change-password` before deactivating them.
> 5. **Deduplicate Seed Data** (`e2e/lab-03/helpers.ts:12`, `authentication.spec.ts:88`):
>    - Import passwords from `server/src/lib/seedCredentials.ts` rather than inlining string literals, and avoid hardcoded `"robert.brown@toktickit.dev"`.
>
> ### Minor Nits
> - **E2E-03 Transition Coverage**: Exercise `OPEN -> IN_PROGRESS` and reject `OPEN -> RESOLVED` to fully cover AC-09.
> - **Shared DB helpers**: Extract repeated `execSync` seed and cleanup commands into helper functions.
> - **Scope Creep**: Pagination select arrow, breadcrumb styling (`App.css`, `StaffTicketDetail.tsx`), and `INVENTORY.md` rewrite were unrequested by Issue 22.
>
> ### Verification
> ```bash
> cd server && pnpm test && pnpm build
> cd client && pnpm test && pnpm build
> pnpm test:e2e:lab3
> ```

#### Author's response (2026-09-26, @fahsai-02)

> Thanks for the review. I fixed all 5 points and the minor ones. Here is what I did.
>
> **1. Move the cleanup to `test.afterAll()`** — Done.
> All four lab-03 tests now reset the database in `beforeAll` / `afterAll` instead of at the end of the test body. I also tested the case you were worried about: I made E2E-04 fail on purpose in the middle (after it created both test accounts), and `afterAll` still cleaned everything up — 0 leftover test users, 0 leftover comments, and the seeded admin was untouched.
>
> One thing I learned while doing this: a `beforeAll` / `afterAll` hook does NOT get the timeout set inside the test. It gets the project timeout (60s). The seed hashes 11 passwords with bcrypt, which is slow, so the hook needed its own bigger timeout. Without that, the hook could time out and skip the cleanup we are trying to guarantee.
>
> **2. Set the workers in the config, not only in the npm scripts** — Done.
> `fullyParallel: false` and `workers: 1` are now in `playwright.config.ts`. I ran Playwright with no extra flags to confirm it still uses 1 worker.
>
> **3. Cover AC-11 (403 self-deactivation)** — Done.
> You were right that the test could never reach 403. The server checks the "last active admin" rule first, so with only one admin in the seed it always returns 409. So now the test creates a second Administrator (a throwaway account), logs in **as that second account**, and checks the 403 message. The seeded admin is never modified, and the throwaway account is deleted automatically because its email starts with `e2e.`. The 409 check is still there for AC-12.
>
> **4. Cover AC-10 first login** — Done.
> The test now logs in as the newly created user with the initial password, checks that it is forced to `/change-password`, completes the password change, and checks that the user lands on `/my-tickets`.
>
> **5. Remove the duplicated seed data** — Done.
> The helper now reads the passwords from the same seed file that the server's own seed script uses (`server/src/lib/seedData.ts`), and it finds the inactive account by asking the seed for it instead of hard-coding `robert.brown@toktickit.dev`. If a seed account is ever renamed, the test now stops with a clear message telling me which file to update.
>
> **Minor points**
> - `OPEN → IN_PROGRESS` is now tested, and the test also checks that `RESOLVED` is **not** in the status dropdown. One note here: the dropdown only shows the allowed next statuses (it uses the same rule table as the server), so the browser cannot even try `OPEN → RESOLVED`. That is the only way this rule is visible in the UI — the 400 error itself is already covered by the API test.
> - The repeated database reset code is now one shared function used by all four tests, instead of being copied into each one.
> - About the extra UI changes (breadcrumb spacing and the dropdown arrow): the "Back to Queue" button is required by ui-spec section 5.5, and the arrow makes that dropdown look the same as the other dropdowns in the app. Both are in a separate commit, so they are easy to drop if you prefer this PR to be tests only.
>
> **One extra bug I found while re-running**
> The test failed once in a while and I could not reproduce it on demand, so I dug into it instead of retrying. The cause was in the cleanup script, not a timing problem: it deleted the E2E tickets and their comments/notes all at the same time, so sometimes the ticket was deleted before its comments, and the database refused with a foreign key error. I changed the cleanup to delete the children first, one step at a time. After that it passed 3 times in a row with no failure, and the suite also got faster (2.9 min → 1.1 min) because the skipped tablet/mobile tests no longer re-seed the database.
>
> **How I checked everything**
> - `cd server && pnpm test` → 20 files / 286 tests pass
> - `cd server && pnpm build` → pass
> - `cd client && pnpm test` → 18 files / 201 tests pass
> - `cd client && pnpm build` → pass
> - `pnpm test:e2e:lab3` → 5 passed / 10 skipped, three runs in a row
> - Database is clean after each run (no leftover test users or comments)

#### Reviewer approval (`APPROVED`, 2026-09-26, @thrxpt)

> ### Summary
> All items from the previous review round have been thoroughly and accurately addressed in commits `6153147` and `f0be241`. The E2E test harness now guarantees database teardown via lifecycle hooks, configures single-worker execution directly in `playwright.config.ts`, completes AC-09/10/11 coverage, and eliminates seed data duplication.
>
> ### Key Fixes Verified
> 1. **Guaranteed DB Teardown & FK Fix**:
>    - Lifecycle cleanup moved to `useLab3DbHooks()` (`beforeAll`/`afterAll` with 180s timeouts) across all Lab 3 specs, ensuring cleanup even on assertion failure.
>    - Sequential child-first deletes in `cleanup-e2e.ts` eliminate the intermittent `P2003` foreign key race.
>    - Hooks are restricted to the desktop project, preventing redundant re-seeds on skipped viewports.
> 2. **Serial Execution in Config**:
>    - `playwright.config.ts` now specifies `fullyParallel: false` and `workers: 1`, preventing parallel collisions when run without CLI flags.
> 3. **E2E-04 Spec Coverage (AC-10 & AC-11)**:
>    - **AC-10**: Verified first-login flow with initial credentials, forced redirect to `/change-password`, password change, and navigation to `/my-tickets`.
>    - **AC-11**: Creates a second active Administrator to verify that self-deactivation is blocked with 403 ("You cannot deactivate your own account"), restoring `AC-11 -> API-65, E2E-04` traceability in `tests.md`.
> 4. **E2E-03 Status Transitions (AC-09)**:
>    - Asserts `RESOLVED` is absent from the dropdown in `OPEN` status per BR-12, and exercises `OPEN -> IN_PROGRESS`.
> 5. **Seed Deduplication & Helpers**:
>    - Passwords and `INACTIVE_EMAIL` dynamically resolve from `server/src/lib/seedData.js` with fail-fast guards against seed drift.
>    - Repeated DB exec commands collapsed into `resetLab3Db()`.
>
> ### Verification Results
> - Server unit & API: **20 files / 286 tests Pass**; build clean (`tsc`).
> - Client components & styles: **18 files / 201 tests Pass**; build clean (`tsc && vite build`).
> - `docs/lab-03/tests.md` AC traceability and test descriptions updated to match the verified implementation.
>
> LGTM!

**Merged into `lab3-staging` 2026-09-26 (#73)** (merge commit `6376c49`, merged by @thrxpt)

---

### PR #74 — feature/23-release-polish

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/74>

**PR title on GitHub:** feat(lab3): visual evidence at AC viewports, 375px mobile, gitignore fix (#64)

#### Reviewer approval (`APPROVED`, 2026-09-29, @thrxpt)

> ### Summary
> LGTM! Approving the visual evidence and layout fixes in this PR without requiring the minor documentation nits to block merge.
>
> ### What was verified:
> - **Visual evidence & viewports**: All 72 screenshots across 10 screens and 14 states captured cleanly at the exact AC viewports (Desktop `1440×900`, Tablet `820×1180`, Mobile `375×844`). All mobile captures measure exactly 375px wide.
> - **Layout & design fixes**:
>   - Mobile header overflow fixed via `.profile-role { display: none; }` and flex shrink on mobile.
>   - Primary button focus indicator contrast fixed with `var(--color-secondary)` per `ui-spec.md` section 7.
>   - Internal Note button contrast restored to 5.17:1 resting / 8.72:1 hover (`color: #fff`).
> - **`.gitignore` fix**: Deliverables under `artifacts/` are properly tracked via `!artifacts/**/*.png`.
> - **Test suites & builds**:
>   - Server: 20 files / 286 tests Pass
>   - Client: 18 files / 201 tests Pass
>   - `tsc` and `vite build` clean in both packages.
>   - Visual specs: 105 passed (72 screenshot captures + 33 visual-audit assertions).
>
> The minor nits (e.g. updating `390×844` to `375×844` in `README.md` and screenshot count mention in `tests.md` section 4) can be addressed in the final release integration PR into `main`. Ready to merge into `lab3-staging`!

**Merged into `lab3-staging` 2026-09-29 (#74)** (merge commit `84884a1`, merged by @thrxpt)

### Note on what the #74 approval does not cover

One round, and it was an approval: `pulls/74/reviews` returns a single review,
while `pulls/74/comments` and `issues/74/comments` return nothing. So there is
no request and no response to quote, and the "How I responded" heading used by
the entries above is absent rather than filled with an invention. Three limits
are worth stating so this record is not read as more than it is:

- **The release into `main` is out of scope for #74.** Its own body says
  "Phase B (release into `main`, the Kanban move and the PDF) is deliberately a
  separate, later PR". The Kanban move and the `main` test run therefore remain
  open, so this record does not close the sprint.
- **The 375px mobile re-review is the student's own sign-off, not a review
  finding.** The reviewer confirmed the captures *measure* 375px; whether each
  one *looks* right at that width was judged by the student, which is why
  `ui-spec.md` section 9.1 records that column as a human claim.
- **The two documentation nits named in the review were closed outside this
  branch**, so #74 was merged exactly as approved: `README.md` now says
  `375×844`, and `tests.md` section 4 now says 69 of the 72 capture runs with 72
  PNGs. The merge is a true merge commit (parents `6376c49` and `17e1a62`), so
  the two reviewed commits stay visible and the review can still be read against
  the exact tree it approved.

---

## Detail — PRs I reviewed for my partner

### PR #39 — feature/14-lab3-contract

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/39>

**PR title on GitHub:** docs(lab-03): author Sprint 3 engineering contract

#### My approval (`APPROVED`, 2026-09-10, @fahsai-02)

> Overall, this is a solid and thorough contract. All 11 sections of specification.md are present, BR-01 through BR-05 match the handout verbatim, AC-01 through AC-21 are in Given-When-Then form, and the test plan has full AC traceability. The four companion docs are internally consistent, and the ADRs are well-structured.
>
> Approving with one minor cleanup: a few stale BR references (BR-43, BR-44) that don't exist in specification.md.

Inline threads left in this round (3):

| Who | File:line | Verbatim opening line |
|---|---|---|
| @fahsai-02 | `docs/lab-03/api-spec.md`:71 | nit: `BR-43` doesn't exist in specification.md (ends at BR-34). Either add a BR-35 rule for this convention or remove the stale reference. |
| @fahsai-02 | `docs/lab-03/tests.md`:77 | nit: `BR-43` doesn't exist in specification.md. This test maps to AC-21 which is sufficient — just drop the stale BR reference. |
| @fahsai-02 | `docs/lab-03/tests.md`:78 | nit: `BR-44` doesn't exist in specification.md. Same as above — the test is valid, just remove the broken BR reference. |

#### Partner's response (2026-09-10, @thrxpt)

> Addressed review feedback from @fahsai-02 in commit a951cb9:
>
> 1. Added **BR-35** to `specification.md` under *System Behavior and Data Integrity* for safe error envelopes without leaking stack traces or internal details; updated reference in `api-spec.md` and `tests.md` (API-23).
> 2. Added **BR-36** to `specification.md` for database seed idempotency; updated reference in `tests.md` (API-24) and Issue #31.
>
> All 4 contract documents and test mapping tables are now 100% verified with zero missing BR references.

#### My approval (`APPROVED`, 2026-09-10, @fahsai-02)

> Fixes confirmed clean. BR-35 and BR-36 added to specification.md §5, api-spec.md and tests.md references updated, no stale BR-43/BR-44 references remain. All 11 sections intact, BR-01 through BR-36 numbered correctly.

**Merged into `lab3-staging` 2026-09-10 (#39)** (merge commit `0d940a4`, merged by @fahsai-02).

---

### PR #40 — feature/15-auth-foundation

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/40>

**PR title on GitHub:** feat(auth): Lab 3 User model, password hashing, and authentication foundation

#### My review (`CHANGES_REQUESTED`, 2026-09-16, @fahsai-02)

> ## Verdict
>
> **Request changes** — 1 blocking finding (seed data violates the contract), plus 5 non-blocking warnings to address before or early in Issue 16.
>
> ---
>
> ## What was verified
>
> I reviewed the code against the contract (`docs/lab-03/specification.md`, `api-spec.md`, `tests.md`) and ran the suites on the test database `toktickit_test`:
>
> | Check | Result |
> | --- | --- |
> | `tsc --noEmit` (server) | ✅ clean |
> | Lab 3 API + unit tests (3 files, 29 tests) | ✅ 29/29 passed |
> | Full server suite incl. Lab 1 & Lab 2 regressions (15 files) | ✅ 127/127 passed |
> | Migration applied to a fresh `toktickit_test` | ✅ idempotent (`migrate deploy` run twice, no pending migrations) |
> | Auth endpoints match `api-spec.md` section 1 (login/logout/me/change-password payloads, status codes, error codes) | ✅ exact |
> | Error envelope `{ error: { code, message, fields? } }` | ✅ exact (BR-35) |
> | Password policy vs BR-07; bcrypt cost 10 vs BR-06 | ✅ |
> | `httpOnly`/`SameSite=Lax` cookie + Bearer fallback vs BR-08 / ADR-0007 | ✅ |
>
> ---
>
> ## Blocking finding
>
> ### B1. Seed data diverges from specification section 7 (named accounts)
>
> - Contract — `specification.md` section 7, "Idempotent Seed Data", names the Requester set exactly:
>   - **4 active:** `jennifer.anderson@example.ac.th`, `somchai.prasert@example.ac.th`, `kanya.s@example.ac.th`, `chatchai.n@example.ac.th`
>   - **1 inactive:** `retired.staff@example.ac.th`
> - Code — `server/prisma/seed-data.ts:64-96` seeds:
>   - **4 active:** `jennifer.anderson`, `somchai.prasert`, `marcus.chen`, `priya.raman`
>   - **2 inactive:** `daniel.okafor`, `retired.staff`
>
> **Impact per the contract (AGENTS.md: "if the code and the contract disagree, the contract wins"):**
>
> 1. `kanya.s` and `chatchai.n` — named in the contract — are never created.
> 2. `marcus.chen`, `priya.raman`, `daniel.okafor` (Lab 2 leftovers) are created but not named by the contract.
> 3. There is **one extra inactive Requester** (`daniel.okafor`).
> 4. `API-02` (`auth.api.test.ts:122`) depends on the non-contract account `daniel.okafor` for its "inactive Requester" case — so the test suite also encodes the divergence.
> 5. `API-24` reports idempotency against its own counts, so it does not catch the mismatch.
>
> **Fix options (pick one):**
>
> - **A (align code to contract):** trim/rename seed users so the constructed set is exactly the section 7 list; update the `API-02` test to use `retired.staff@example.ac.th`.
> - **B (align contract to code):** amend section 7 in a follow-up contract PR first (Issue 14 discipline) and rebase this PR's seed on the amendment.
>
> Per the Issue's Definition of Done ("idempotent seed verified") this must be reconciled before the PR is treated as Done.
>
> ---
>
> ## Non-blocking warnings
>
> ### W1. `requireAuth` leaks `requesterId` to every role
> `server/src/middleware/auth.ts:91` sets `req.requesterId = user.id` unconditionally. Through `requireRequesterContext` (`requester-context.ts:23-26`) an IT_STAFF/ADMINISTRATOR with a valid session can then reach `/api/tickets` and is scoped as "itself-as-requester" — empty list, or worse, can create a Ticket owned by a staff/admin account. Not reachable from the shipped UI today (client still sends `X-Requester-Id`), but it will matter the moment Issue 16 drives ticket routes through the session. Please scope `requesterId` to `role === REQUESTER` (or drop it and let role-gated routes do their own scoping).
>
> ### W2. Hard-coded JWT fallback secret
> `server/src/auth/session.ts:9-10` bakes `toktickit-dev-jwt-secret-key-for-sessions-2026` into source. ADR-0007 states secrets "are never committed to version control." With `NODE_ENV=production` and a missing `JWT_SECRET`, the server would sign tokens with a publicly-known key → session forgery. Suggest failing closed (throw / refuse to start) when `JWT_SECRET` is missing outside local development.
>
> ### W3. "Special character" rule accepts whitespace / any non-ASCII symbol
> `server/src/auth/password.ts:43` uses `[^A-Za-z0-9]`, so `Password123 ` (trailing space) or `Passwörd123` satisfy BR-07. If the intent is punctuation, restrict to an explicit punctuation class.
>
> ### W4. Login timing leaks user existence (BR-09 intent)
> `server/src/routes/auth.ts:72-81` returns `INVALID_CREDENTIALS` for unknown emails before running bcrypt, while a known email runs a full `bcrypt.compare`. Response time reveals whether an email is registered, partially defeating BR-09's no-enumeration guarantee. Recommended hardening: run a dummy `bcrypt.compare` on a fixed hash for the unknown-email path.
>
> ### W5. Migration naming residue (`Requester_*`)
> `migration.sql:17-19` renames the table and the email **index**, but the backing unique **constraint** and `Requester_id_seq` retain `Requester_*` names. Functionally proven safe (fresh deploy + full suite green), but expect cosmetic drift on a later `prisma migrate dev`. Worth a follow-up hygiene pass.
>
> ### W6. Logout clears the cookie only
> `server/src/routes/auth.ts:115-118` does not revoke the token server-side; a captured `Bearer` token stays valid for the full 24 h. This matches `api-spec.md` (cookie invalidation is all the contract asks), so it's fine now — just noting the Issue's wording "revokes authenticated access" overstates what is implemented.
>
> ---
>
> ## Minor notes (no action required)
>
> - Logout being behind `requireAuth` (401 on unauthenticated logout) is contract-compliant and covered by `API-05`.
> - `prisma.requester` backward-compat alias (`prisma.ts:13-18`) is a clean way to keep Lab 2 suites green; please remember it is a bridge to remove later, not a new pattern to copy.
> - `GET /api/requesters` now filters `role: "REQUESTER"` — good early alignment with BR-13.
>
> ---
>
> ## Blocking-items checklist before the next review round
>
> - [x] Seed data reconciled with `specification.md` section 7 (B1), and tests updated accordingly.
> - [x] (Recommended) Addressed or scheduled W1–W2 before Issue 16 depends on this foundation.

#### Partner's response (2026-09-16, @thrxpt)

> Thank you for the thorough review, @fahsai-02!
>
> We have reconciled **B1** using **Option B**, and also addressed warnings **W1**, **W2**, and **W4**:
>
> ### 1. B1 Reconciliation (Option B — `d560b91`)
> `docs/lab-03/specification.md` §7 has been amended to reflect the established Lab 2 baseline Requester accounts:
> - **4 active Requesters:** `jennifer.anderson@example.ac.th`, `somchai.prasert@example.ac.th`, `marcus.chen@example.ac.th`, `priya.raman@example.ac.th`
> - **2 inactive Requesters:** `retired.staff@example.ac.th`, `daniel.okafor@example.ac.th`
> This reconciles the contract specification with the code while ensuring Lab 2 regression test `tests/lab-02/requesters.api.test.ts` (`API-26`) continues to pass without modification.
>
> ### 2. Resolved Warnings (`4422bac` & `87cfdc8`)
> - **W1 (`requesterId` role scoping):** Scoped `req.requesterId = user.id` in `server/src/middleware/auth.ts` strictly to `user.role === Role.REQUESTER`.
> - **W2 (Hard-coded JWT secret fallback):** Updated `server/src/auth/session.ts` to fail closed with an error when `NODE_ENV === 'production'` and `JWT_SECRET` is unset.
> - **W4 (Login timing leak / BR-09):** Implemented constant-time dummy bcrypt comparison in `server/src/routes/auth.ts` for unregistered emails.
> - **Whitelist Path Bypass (Hard Finding):** Hardened `requireAuth` in `server/src/middleware/auth.ts` to strictly match parsed route pathnames rather than query strings.
> - **API-02 Test:** Added explicit coverage for `retired.staff@example.ac.th` in `server/tests/lab-03/auth.api.test.ts`.
>
> All 15 server test files (128 tests) and 18 client test files (65 tests) pass with zero regressions. Ready for re-review!

#### My approval (`APPROVED`, 2026-09-16, @fahsai-02)

> ### Verified
>
> - **B1 (Option B):** `docs/lab-03/specification.md` Section 7 reconciled with code - 4 active + 2 inactive Requesters, matching `server/prisma/seed-data.ts`. Lab 2 `API-26` regression preserved without modification.
> - **W1:** `req.requesterId` scoped strictly to `role === REQUESTER` (`server/src/middleware/auth.ts`).
> - **W2:** Fail-closed when `JWT_SECRET` is unset in production (`server/src/auth/session.ts`).
> - **W4:** Constant-time dummy bcrypt compare on unknown email (`server/src/routes/auth.ts`, BR-09).
> - Whitelist gate uses strict pathname matching (query-string bypass covered); `API-02` covers `retired.staff@example.ac.th`.
> - `tsc --noEmit` clean.
>
> ### Notes (non-blocking)
>
> - W3/W5/W6 remain open, acceptable as follow-ups.

**Merged into `lab3-staging` 2026-09-16 (#40)** (merge commit `8c13069`, merged by @fahsai-02).

---

### PR #41 — feature/16-auth-shell-regression

Note: the partner bundled their auth UI / app shell and requester regression into one PR (#41); their feature branch is `feature/16-auth-shell-regression`.

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/41>

**PR title on GitHub:** feat(auth): build authenticated app shell, role navigation, and Requester regression (#32)

#### My review (`CHANGES_REQUESTED`, 2026-09-18, @fahsai-02)

> ## Verdict
>
> **Request changes** — 4 blocking findings (3 are security issues that I reproduced), plus several warnings to fix before this PR is treated as Done.
>
> ---
>
> ## What was verified
>
> I reviewed the code against the contract (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) and ran the suites against `toktickit_test`:
>
> | Check | Result |
> | --- | --- |
> | Client lab-03 tests (Login, ChangePassword, AppShell — 3 files, 19 tests) | ✅ 19/19 passed |
> | Full client suite (21 files, 84 tests) | ✅ 84/84 passed |
> | Full server suite including Lab 1 & Lab 2 regressions (16 files, 134 tests) | ✅ 134/134 passed |
> | `pnpm build` (client `tsc -b && vite build`, server `tsc -p .`) | ✅ clean |
> | New API-06 / API-07 authorization tests | ✅ 6/6 passed |
> | `tests.md` traceability updates (UI-01..UI-04, UI-15, API-06, API-07 → Passed) | ✅ correct |
> | Password policy client vs server (BR-07), cookie flags httpOnly/SameSite=Lax (BR-08) | ✅ match |
> | **Issue scope: Development Requester removed** | ❌ **not done** |
> | **Security probes I ran manually** | ❌ **leaks reproduced** |
>
> ---
>
> ## How I tested the security findings
>
> I wrote a temporary Supertest file (deleted afterwards) that logged in as real seeded users and called the endpoints the way a normal browser would. Results:
>
> ```
> [LEAK]   IT_STAFF list (michael.brown)  -> 200  ["SECRET-LAPTOP-BATTERY"]   (Jennfier's ticket)
> [LEAK]   ADMIN list (admin@toktickit)   -> 200  ["SECRET-LAPTOP-BATTERY"]
> [SPOOF]  anonymous + X-Requester-Id header -> 201  created ticket as "Marcus Chen"
> [ANON]   no cookie, no header -> 400 REQUESTER_CONTEXT_MISSING (expected 401 UNAUTHENTICATED)
> ```
>
> ---
>
> ## Blocking findings
>
> ### B1. The Development Requester was NOT removed (main scope of the Issue)
>
> The PR summary says *"Complete removal of RequesterSelection.tsx, the /select-requester route, X-Requester-Id header transmission, and local storage requester keys."* That is **not true** — every part still exists and still works:
>
> - `client/src/App.tsx:12, 50-58` — still imports `RequesterSelection` and keeps the `/select-requester` route
> - `client/src/components/RequesterGuard.tsx:19` — still redirects unauthenticated users to `/select-requester` instead of `/login`
> - `client/src/context/RequesterContext.tsx:43, 50-61, 74-82` — still fetches `/api/requesters` and reads/writes localStorage `toktickit_requester_id`
> - `client/src/api/client.ts:10-13` — still injects the `X-Requester-Id` header from localStorage
> - `client/src/auth/AuthContext.tsx:50-57` — **skips `GET /api/auth/me`** if `toktickit_requester_id` exists in localStorage
> - `client/src/components/AppShell.tsx:109-120, 220-290` — still renders the "Development Requester is a testing mechanism" notice and the "Change Requester" menu
> - `server/src/middleware/requester-context.ts:29-65` — server still accepts the `X-Requester-Id` header
> - `server/src/app.ts:63-74` — `/api/requesters` endpoint still exists
>
> This contradicts **BR-03**, **AC-06**, and the api-spec ("In Lab 3, the temporary `X-Requester-Id` header is completely retired").
>
> **I understand the tension:** the Engineering DoD says Lab 1 & Lab 2 tests must keep passing *without modification*, and some Lab 2 tests exercise the selector (`client/tests/lab-02/RequesterSelection.test.tsx`, `AppShell.test.tsx`, `AppRoutes.test.tsx`, plus all Lab 2 API tests that send `X-Requester-Id`). So the team kept everything to stay green. **That decision is fine, but it must be made explicit** — update the contract/tests.md (or add an ADR) explaining that the server fallback stays only for Lab 2 test compatibility, so the code and the contract stop contradicting each other (AGENTS.md: *"if the code and the contract disagree, the contract wins"*).
>
> ### B2. Identity spoofing — no login required (BR-03, AC-06, FR-20)
>
> Because B1 is still in place, an anonymous client can claim any requester identity:
>
> - `GET /api/tickets` with `X-Requester-Id: <id>` → `200` (see another user's list)
> - `POST /api/tickets` with `X-Requester-Id: <id>` → `201` created as that user (I created a ticket as Marcus Chen without logging in)
>
> Combined with the still-live `/select-requester` page, users can do this from the browser without any authentication. This is exactly the attack the Issue was created to close.
>
> ### B3. Cross-role data leak: IT Staff / Admin can read ALL requesters' tickets
>
> An authenticated IT Staff or Admin session can call `GET /api/tickets` and gets **200 with every requester's tickets** (I reproduced it with `michael.brown@toktickit.com` and `admin@toktickit.com`).
>
> Root cause:
> - `server/src/middleware/auth.ts:91-93` sets `req.requesterId` **only** when `role === "REQUESTER"`.
> - `server/src/routes/tickets.ts:75` mounts `requireRequesterContext` but there is **no `requireRole("REQUESTER")`**.
> - `server/src/routes/tickets.ts:118` builds `where: { requesterId: req.requesterId! }`. For staff/admin `requesterId` is `undefined`, and Prisma ignores keys with `undefined` → the filter disappears → all tickets returned.
>
> Expected per contract: `403 FORBIDDEN` (BR-14, BR-15, FR-20). The new `authorization.api.test.ts` only tests Requester↔Requester isolation, so this leak is uncovered.
>
> **Suggested fix:** add `requireRole("REQUESTER")` on `/api/tickets` and `/api/attachments` (only for the session path), and treat a missing `requesterId` as a hard 403/401 instead of dropping the WHERE clause. Add API tests for staff/admin hitting requester endpoints.
>
> ### B4. Logout does not really log out a visitor (AC-05, BR-11)
>
> `AuthContext.logout()` (`client/src/auth/AuthContext.tsx:113-119`) only clears the React state. It leaves `toktickit_requester_id` in localStorage. After logout, a person using the same browser can still:
>
> - open `/tickets` (RequesterGuard passes because the key is still there),
> - let `apiFetch` re-add `X-Requester-Id`,
> - and the server still accepts it (B1/B2).
>
> So "log out on a shared computer" does not protect the data. Logout should also clear the requester key — or better, remove the client-side mechanism entirely (B1).
>
> ---
>
> ## Warnings (fix before or early in Issues 17/20)
>
> ### W1. `RequireAuth` is written but never used (FR-02 broken for Requesters)
>
> `client/src/routes/RequireAuth.tsx` is not imported anywhere in `App.tsx`. The requester routes still use `RequesterGuard`, so an unauthenticated visitor to `/tickets` is sent to `/select-requester`, **not** `/login` (expected by FR-02, UI-15). In practice: after a Requester logs in, visiting `/tickets` bounces them through the Development Requester picker (AC-03 "go straight to my role's default view" does not actually happen).
>
> Also `UI-02` (ChangePassword.test.tsx) is green because the test wraps the screen with `RequireAuth` **inside the test**, but that guard is not wired into the real app — the test does not prove the real routing. Please test the actual `AppRoutes` wiring.
>
> ### W2. `mustChangePassword` users are not redirected on requester screens
>
> The server correctly rejects every other API with `403 PASSWORD_CHANGE_REQUIRED` (`auth.ts:98-113`), but for `/tickets*` there is no client-side guard (RequireAuth/RequireRole are not used there), so the Requester sees a generic error instead of being taken to `/change-password` (BR-02, AC-02, FR-03).
>
> ### W3. Unauthenticated requester request answers 400, not 401
>
> Anonymous `GET /api/tickets` answers `400 REQUESTER_CONTEXT_MISSING` ("Development Requester context header is missing"). The api-spec authorization gate #1 requires `401 UNAUTHENTICATED`. The error message is also a leftover from the retired mechanism.
>
> ### W4. Attachment content blocks staff (conflicts with the contract table)
>
> `specification.md` section 8 says `GET /api/attachments/:id/content` is for `Requester / Staff`. Today a staff session gets `400 REQUESTER_CONTEXT_MISSING` because `requesterId` is only set for Requesters. This will block Issues 17/18 screens.
>
> ### W5. Attachment soft-remove path name drifted
>
> `server/src/routes/attachments.ts:308` uses `POST /api/attachments/:id/removal`, but `specification.md:320` lists `POST /api/attachments/:id/remove`. Please reconcile (the code matches Lab 2; the Lab 3 table was probably not updated).
>
> ### W6. My Tickets status filter only accepts `NEW`
>
> `server/src/routes/tickets.ts:40-44` restricts the `status` query to `NEW`, but the Lab 3 api-spec `GET /api/tickets` allows all 8 statuses. Confirm this is intentional or relax it.
>
> ---
>
> ## Polish (low priority)
>
> - `Login.tsx` does not redirect an already-authenticated user away from `/login`.
> - `AppShell.tsx` profile dropdown does not close on outside-click/Escape.
> - `ChangePassword.tsx` inputs have no `aria-invalid` / `aria-describedby` (ui-spec §3 asks for field errors linked via `aria-describedby`).
> - `ChangePassword.tsx:41-45` — `(currentPassword === "" || isDifferentFromCurrent)` is redundant given `currentPassword.length > 0` above it.
> - `oxlint` warns about fast-refresh in `AuthContext.tsx` / `RequesterContext.tsx` (only-export-components).
> - `theme.css:265-268` uses `rgba(...)` for borders instead of a `--zen-*` token (inside theme.css, so not a hex-policy violation, but cleaner as a token).
>
> ---
>
> ## What works well
>
> - Login and Change Password screens: clean, focused, correct `aria-busy`, spinner, show/hide toggle, inline alerts (UI-01 real).
> - Client password checklist matches the server policy exactly (BR-07).
> - Cookie flags `httpOnly` + `SameSite=Lax` + `Path=/` are correct (session.ts).
> - API-06/API-07 are good tests: session cookie and Bearer fallback, `requesterId` in body rejected with `400 REQUESTER_ID_IN_BODY`, cross-owner 404 identical to a missing row, attachment cross-owner 404 verified.
> - `tests.md` rows updated correctly; the "218 tests passing" claim matches what I ran.
>
> ---
>
> ## Suggested fix order
>
> 1. **B3** — add role gate on `/api/tickets` + `/api/attachments`; add staff/admin-vs-requester API tests (403/401).
> 2. **B1/B2** — decide and document the Dev-Requester retirement strategy (ADR/contract update), then remove the client-side pieces (selector, route, localStorage, header injection) and wire `RequireAuth` into the real routes.
> 3. **B4** — logout must clear client requester state (or remove the mechanism with B1/B2).
> 4. **W1–W3** — wire the guards properly and add tests against the real `AppRoutes`, not a copy of the guard.
> 5. **W4–W6** — small contract-alignment fixes; confirm with the team.

#### Partner's response (2026-09-19, @thrxpt)

> ### Updates & Fixes for Review Findings
>
> Thank you @fahsai-02 for the thorough review. All blocking findings, warnings, and polish items have been resolved:
>
> #### 1. Blocking Findings Addressed
> - **B3 (Cross-role data leak)**:
>   - Mounted role gate in `requireRequesterContext` enforcing that only authenticated users with `role === 'REQUESTER'` can access requester ticket endpoints (`GET /api/tickets`, `POST /api/tickets`, `GET /api/tickets/:id`). Non-requester roles (`IT_STAFF`, `ADMINISTRATOR`) receive strict `403 FORBIDDEN` (BR-14, BR-15, ADR-0008).
>   - Explicitly guarded Prisma queries with `if (!req.requesterId) sendError(res, 'FORBIDDEN')` to prevent undefined filter drops.
>   - Added comprehensive Supertest tests in `server/tests/lab-03/authorization.api.test.ts` verifying 403 responses for IT Staff and Administrator on all requester endpoints.
> - **B1 & B2 (Retirement Strategy & Spoofing Prevention)**:
>   - Documented the architecture decision in **[ADR-0009](docs/adr/0009-lab2-backward-compatibility-and-requester-retirement.md)**: Session-derived identity is authoritative. Server-side `X-Requester-Id` is ignored whenever an authenticated session is present, and retained strictly as a fallback for Lab 2 test compatibility.
>   - Frontend routes (`/tickets`, `/tickets/new`, `/tickets/:id`) now use `RequireRole roles={['REQUESTER']}`, preventing unauthenticated access or requester spoofing from the browser.
> - **B4 (Logout Session Invalidation)**:
>   - `AuthContext.logout()` now terminates the server session cookie, clears React state, and purges any legacy `toktickit_requester_id` from localStorage. Subsequent navigation attempts to `/tickets` redirect cleanly to `/login` (FR-02, AC-05, BR-11).
>
> #### 2. Warnings Addressed
> - **W1 & W2 (Routing & Password Change Enforcement)**:
>   - `RequireRole` and `RequireAuth` are now active on protected routes in `AppRoutes`.
>   - Unauthenticated visitors accessing `/tickets` are redirected to `/login` (FR-02).
>   - Users with `mustChangePassword: true` attempting to access `/tickets` are immediately redirected to `/change-password` (BR-02, AC-02).
>   - Added `client/tests/lab-03/AppRoutes.test.tsx` covering full end-to-end routing, redirection, and logout assertions against `App`.
> - **W3 (Unauthenticated 401)**:
>   - Anonymous requests to `GET /api/tickets` and `GET /api/attachments/:id/content` now return `401 UNAUTHENTICATED` with standard error envelope.
> - **W4 (Staff Attachment Download)**:
>   - Updated `GET /api/attachments/:id/content` to permit IT Staff and Administrators to inspect and stream active attachments across all tickets per `specification.md` §8.
> - **W5 (Attachment Soft-Remove Path)**:
>   - Aliased `POST /api/attachments/:id/removal` and `POST /api/attachments/:id/remove` to ensure compatibility with both Lab 2 tests and Lab 3 specification table.
> - **W6 (Ticket Status Filter)**:
>   - Updated `listTicketsQuerySchema` to accept all 8 TicketStatus values (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
>
> #### 3. Polish Items
> - **Login view**: Added redirect to default role view if user is already authenticated.
> - **AppShell**: Profile dropdown now closes on outside clicks and `Escape` key press.
> - **ChangePassword**: Added `aria-describedby` and `aria-invalid` attributes, removed redundant condition in `canSubmit`.
> - **Theme tokens**: Replaced `rgba()` borders on role badges with CSS custom tokens `--zen-info-border` and `--zen-admin-border`.
>
> #### Test Verification
> - Client suite: 22 test files, 89/89 tests passed (100%).
> - Server suite: 16 test files, 138/138 tests passed (100%).
> - Total: 38 test files, 227/227 tests passed cleanly.
> - Full build (`pnpm build`): Clean compilation for both client and server.

#### My follow-up comment (2026-09-19, @fahsai-02)

> ### Review verification — fixes confirmed, 2 small items remain
>
> Thanks for addressing the findings. I re-verified every item against the code and re-ran the full suites on this branch:
>
> | Check | Result |
> | --- | --- |
> | Client suite (22 files, 89 tests) | ✅ 89/89 passed |
> | Server suite (16 files, 138 tests) | ✅ 138/138 passed |
> | `pnpm build` | ✅ clean |
> | **B3** — role gate + 403 for IT_STAFF/ADMINISTRATOR on requester endpoints | ✅ `requester-context.ts:25-33`, guarded `where` at `tickets.ts:129-132`, covered by `authorization.api.test.ts:291-358` |
> | **B1/B2** — retirement strategy documented | ✅ ADR-0009 (session-first identity, header ignored when session present, fallback retained for Lab 2 compat) |
> | **B4** — logout invalidates server session, clears React state + legacy `toktickit_requester_id` | ✅ `AuthContext.tsx:118-126`, covered by `AppRoutes.test.tsx` |
> | **W1–W6** | ✅ all resolved (guards wired in `App.tsx`, unauthenticated 401s, staff attachment download, `/remove` alias, 8-status filter) |
> | Polish items | ✅ login redirect, dropdown outside-click/Escape, ChangePassword a11y, `--zen-*` border tokens |
>
> All 4 blocking findings and all 6 warnings are resolved, and the 227/227 numbers match. Two small things before I treat this as fully Done:
>
> **1. Attachment content: Administrator access is outside the contract matrix (code vs. contract).**
> - Code grants `ADMINISTRATOR` attachment download on any ticket — `attachments.ts:305`.
> - Contract authorizes **Requester / Staff** only — `specification.md:319`; ADR-0008 limits Administrators to user management plus viewing public comments/internal notes.
> - Please pick one: restrict the session path in `attachments.ts:305` to `IT_STAFF` + `REQUESTER`, **or** update `specification.md:319` to `Requester / Staff / Admin` and extend ADR-0008 accordingly, so code and contract agree (AGENTS.md: "the contract wins").
>
> **2. `tests.md` traceability.** The new `client/tests/lab-03/AppRoutes.test.tsx` and the new authorization cases (staff/admin 403, anonymous 401, staff attachment download, W6 status filter) have no rows in `docs/lab-03/tests.md`. Please land them in the same commit, per the existing convention.
>
> **Minor (non-blocking):**
> - The reply says requester spoofing is "prevented from the browser" — strictly, the `X-Requester-Id` fallback remains reachable via `/select-requester` for Lab 2 test compatibility (documented in ADR-0009). Acceptable as a documented tradeoff; worth wording it as *retained for Lab 2 test compatibility* rather than *eliminated*.
> - oxlint still reports fast-refresh `only-export-components` warnings in `AuthContext.tsx` / `RequesterContext.tsx`, and `ChangePassword.tsx:42` keeps a redundant `currentPassword.length > 0`. Cosmetic only.
>
> Once item 1 (and ideally item 2) land, I'm happy to approve.

#### Partner's response (2026-09-19, @thrxpt)

> ### Follow-up updates for items 1 & 2
>
> Thanks @fahsai-02 for the quick re-verification! Both remaining items have now landed in commit `1c2ba92`:
>
> 1. **Attachment Content — Administrator Restriction (Code & Contract Alignment)**:
>    - Updated `server/src/routes/attachments.ts` line 305 to restrict session downloads to `IT_STAFF` (any ticket) and `REQUESTER` (owned tickets).
>    - Requests from `ADMINISTRATOR` now strictly return `403 FORBIDDEN`, adhering to the contract matrix (`specification.md:319`) and role segregation rules (BR-14, ADR-0008).
>    - Updated **[ADR-0009](docs/adr/0009-lab2-backward-compatibility-and-requester-retirement.md)** §3 to reflect that Administrators receive 403 on attachment content.
>    - Added Supertest assertion in `authorization.api.test.ts` verifying Administrator receives `403 FORBIDDEN`.
>
> 2. **`docs/lab-03/tests.md` Traceability Updated**:
>    - Added rows for:
>      - `API-26` (IT Staff and Administrator 403 on requester ticket routes)
>      - `API-27` (Staff 200, Administrator 403 on attachment downloads)
>      - `API-28` (Anonymous 401 on protected routes)
>      - `API-29` (8 status query filtering beyond NEW)
>      - `UI-16` (Full App route guarding, role redirection, and logout state clearing in `AppRoutes.test.tsx`)
>    - Updated Traceability Matrix rows for AC-02, AC-03, AC-05, and AC-06.
>
> 3. **Minor Polish**:
>    - Removed redundant `currentPassword.length > 0` check in `ChangePassword.tsx:42`.
>
> #### Test Verification
> - Client suite: 22 test files, 89/89 passed (100%).
> - Server suite: 16 test files, 138/138 passed (100%).
> - Total: 38 test files, 227/227 passed cleanly without regressions or skips.
> - Build (`pnpm build`): Clean compilation across workspace.

#### My approval (`APPROVED`, 2026-09-19, @fahsai-02)

> Re-verified against the follow-up commits (65aa88c, 5d658f1, 1c2ba92). Confirmed:
>
> - B3 fixed: role gates on /api/tickets + /api/attachments; IT Staff and Administrator get 403 FORBIDDEN (API-26), no ticket leak.
> - B4 fixed: logout purges localStorage requester state (AppRoutes.test.tsx).
> - B1/B2 resolved and documented: ADR-0009 makes the Lab 2 header fallback explicit (server-only, session takes precedence; 401 when neither present), client shell runs under real session auth.
> - W1-W3: RequireAuth/RequireRole wired into real AppRoutes; unauthenticated -> /login; mustChangePassword -> /change-password; anonymous /api/tickets -> 401 UNAUTHENTICATED.
> - W4-W6: staff attachment download 200 / admin 403 (API-27); /remove alias reconciled (ADR-0009); status filter supports all 8 statuses (API-29).
> - tests.md traceability updated (API-26..29, UI-16; AC-02/03/05/06).
>
> Verified runs: client 89/89, server 138/138, clean 'pnpm build'. Approving.

**Merged into `lab3-staging` 2026-09-19 (#41)** (merge commit `5bbbe3e`, merged by @fahsai-02).

---

### PR #42 — feature/17-staff-ticket-queue

*(titled "Issue 17" in the partner's own numbering, where his issue #33 asked
for the staff ticket queue)*

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/42>

**PR title on GitHub:** feat(staff): implement IT Staff Ticket Queue with search, filters, sorting, and pagination (#33)

#### My review (`CHANGES_REQUESTED`, 2026-09-19, @fahsai-02)

> ## Peer Review — Issue **#33** (`feature/17-staff-ticket-queue`) — **Request changes**
>
> Feature is solid and tests pass, but the PR cannot be approved as-is. **Reviewer position:** the implementation's **IT_STAFF-only** queue access is **accepted** (matches BR-14 + ADR-0008). Approval gate = the pre-merge checklist below.
>
> ### What was verified (run against `toktickit_test`)
> - Server suite: **17 files / 157 tests ✅**  ·  Client suite: **24 files / 115 tests ✅**
> - New staff-queue + role-segregation tests: **29/29 ✅**  ·  `tsc --noEmit` both packages ✅
> - Response schema matches `api-spec.md:364-394`, pagination tiebreak `id desc` stable ✅
> - `sortBy=itPriority/status` uses Postgres enum order = semantic order (not alphabetical) ✅
> - Breakpoints match `ui-spec.md §5` (>=992 full / 768-991 condensed / <768 cards) ✅
> - Badge hex only in `theme.css`, no inline hex ✅  ·  Requester → 403, anon → 401 ✅
> - **PR description ≠ code** (Admin role, assignees endpoint, test counts) ❌  ·  `tests.md` traceability incomplete ⚠️
>
> ### Inline threads (below)
> 1. `staff-queue.router.ts:121` — **B1** Admin access: code = IT_STAFF-only (locked); PR text/spec table say `['IT_STAFF','ADMINISTRATOR']`. Contract contradicts itself — reconcile all three.
> 2. `app.ts:85` — **B2** PR claims `GET /api/staff/assignees` was added; it was removed by refactor commit `2c85ae9`. Decide: restore + "specific staff" Owner option, or document deferral.
> 3. `StaffTicketQueue.tsx:451` — no "specific staff" owner option, so `owner=<id>` (api-spec §, API-10) is unreachable from UI.
> 4. `staff-queue.router.ts:189` — dead fallback `req.user ? req.user.id : 0`.
> 5. Warnings: `tsx:528` fake pointer on non-sortable header · `tsx:510` sortable `<th>` no keyboard · `tsx:557/607` nested interactive in row/card · `App.tsx:108` row click → 404 until Issue 18 · `theme.css:390` pointer scoped to non-sortable column · `tests.md:64` traceability gaps.
>
> ### Pre-merge checklist
> - [ ] B1 — `specification.md:322-330`, PR description, and `router:121` all agree on one stance (IT_STAFF-only adopted).
> - [ ] B2 — assignees restored (+ specific-staff option) or deferral documented against `ui-spec.md:147`.
> - [ ] `tests.md` — RESP-01/02/03 → **Passed**; new 401/403 staff-queue tests get a row (**API-17 stays reserved** for Issue 20's "IT Staff → Admin User Management").
> - [ ] W1/W5/W6 quick fixes landed in this branch.
> - [ ] W2–W4 fixed here or tracked as acknowledged follow-ups.
>
> Reviewed in the working tree — suites run against `toktickit_test` on 2026-09-20.

Inline threads left in this round (11):

| Who | File:line | Verbatim opening line |
|---|---|---|
| @fahsai-02 | `server/src/staff/staff-queue.router.ts`:121 | **Blocking (B1) — role access mismatch.** |
| @fahsai-02 | `server/src/staff/staff-queue.router.ts`:189 | **Warning (W5) — dead fallback.** |
| @fahsai-02 | `server/src/app.ts`:86 | **Blocking (B2) — claimed endpoint does not exist.** |
| @fahsai-02 | `client/src/pages/staff/StaffTicketQueue.tsx`:490 | **Blocking (B2 mirror) — "specific staff" owner filter missing.** |
| @fahsai-02 | `client/src/pages/staff/StaffTicketQueue.tsx`:576 | **Warning (W1) — fake sort affordance.** |
| @fahsai-02 | `client/src/pages/staff/StaffTicketQueue.tsx`:510 | **Warning (W2 / a11y) — sortable headers not keyboard accessible.** |
| @fahsai-02 | `client/src/pages/staff/StaffTicketQueue.tsx`:557 | **Warning (W3 / a11y) — nested interactive elements in a row.** |
| @fahsai-02 | `client/src/pages/staff/StaffTicketQueue.tsx`:607 | **Warning (W3 / a11y) — same nesting on the mobile card.** |
| @fahsai-02 | `client/src/App.tsx`:108 | **Warning (W4) — Queue rows navigate to a 404 today.** |
| @fahsai-02 | `client/src/styles/theme.css`:393 | **Warning (mirror of W1).** |
| @fahsai-02 | `docs/lab-03/tests.md`:64 | **Warning (traceability).** |

#### Partner's response (2026-09-20, @thrxpt)

> Thanks for the thorough review @fahsai-02! All checklist items have been addressed and pushed in commit `aa0a27a`:
>
> - [x] **B1**: Reconciled adopted IT_STAFF-only stance across `specification.md:322`, `api-spec.md:342`, and PR description.
> - [x] **B2**: Restored `GET /api/staff/assignees` (+ specific staff filter options in UI), meeting `ui-spec.md:147`.
> - [x] **Traceability**: Flipped `RESP-01/02/03` to **Passed**; kept `API-17` reserved for Issue 20 and registered `API-30` for queue & assignees role segregation.
> - [x] **W1 & W5**: Eliminated fake cursor on Req. Priority (`.zen-sortable-header`) and removed dead `? req.user.id : 0` fallback.
> - [x] **W2 & W3**: Added keyboard accessibility (`tabIndex={0}`, `Enter`/`Space`) to sortable headers, and eliminated nested interactive controls on table rows and mobile cards.
> - [x] **W4**: Documented `/staff/tickets/:id` 404 until Issue 18 in the PR notes.
>
> All 24 client test files (116 tests) and 17 server test files (158 tests) are passing green.

#### My approval (`APPROVED`, 2026-09-20, @fahsai-02)

> Approved — all pre-merge checklist items verified against the working tree and test runs on 2026-09-20:
>
> - B1: IT_STAFF-only stance reconciled across `staff-queue.router.ts:121`, `specification.md` endpoint table, `api-spec.md:342`, and PR description.
> - B2: `GET /api/staff/assignees` restored (`app.ts:87`) with specific-staff Owner filter reachable in `StaffTicketQueue.tsx` (owner=<id>).
> - Traceability: RESP-01/02/03 → Passed; API-17 stays reserved for Issue 20; new role-segregation coverage registered as API-30 (Passed).
> - W1/W5/W6: fake cursor removed via `.zen-sortable-header`; dead `req.user ? req.user.id : 0` fallback eliminated.
> - W2/W3: keyboard-accessible sort headers (Enter/Space, aria-sort); nested interactive controls removed from rows and mobile cards.
> - W4: route-navigation 404 until Issue 18 documented in the PR description.
>
> Verified: client 24 files/116 tests and server 17 files/158 tests pass against `toktickit_test`.

**Merged into `lab3-staging` 2026-09-20 (#42)** (merge commit `25a4788`, merged by @fahsai-02).

---

### PR #43 — feature/18-staff-ticket-detail

*(titled "Issue 18" in the partner's own numbering, where his issue #34 asked
for the staff ticket detail)*

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/43>

**PR title on GitHub:** feat(staff): implement IT Staff Ticket Detail, ownership, IT Priority, and status transitions (#34)

#### My review (`CHANGES_REQUESTED`, 2026-09-20, @fahsai-02)

> ## Peer Review — PR #43 (`feature/18-staff-ticket-detail` → `lab3-staging`)
>
> **Type:** Implementation (Lab 3, Issue 18)
> **Depends on:** #33 (merged ✅) · **Blocks:** #35
>
> ---
>
> ## Verdict: **Request changes**
>
> Feature itself is solid and verified green; one blocking authorization stance needs deciding before merge.
>
> **Verified locally (branch checked out):**
> - `pnpm --filter server test` → 19 files / 192 tests ✅
> - `pnpm --filter client test` → 25 files / 124 tests ✅ (316 total)
> - `pnpm --filter server build` (tsc) and `pnpm --filter client build` (Vite) ✅
> - State machine, Zod schemas, error envelopes, BR-23 NEW→OPEN auto-advance, terminal `CANCELLED`, and `docs/lab-03/tests.md` traceability (UNIT-03/04, API-11/12/13, UI-07/08 = Passed) all match the contract.
>
> ---
>
> ## 🔴 Blocking — B1: Administrator access on the four detail endpoints contradicts the contract and the stance adopted in Issue 17
>
> `server/src/staff/staff-ticket-detail.router.ts:14` gates with `requireRole("IT_STAFF", "ADMINISTRATOR")`, and `client/src/App.tsx:112` routes `/staff/tickets/:id` to `["IT_STAFF", "ADMINISTRATOR"]`, citing `specification.md §8`.
>
> This conflicts with three authoritative sources plus the codebase's own settled behavior:
>
> 1. **BR-14** (`specification.md:159`): *"Administrators cannot access the IT Staff Queue or claim/modify tickets."* Three of these four endpoints are exactly "claim/modify tickets".
> 2. **api-spec.md:342**: *"Requires role `IT_STAFF`. Requesters and Administrators receive `403 Forbidden` (BR-14, ADR-0008)."* — the section covering all four endpoints.
> 3. **ADR-0008** (D-18): *"Administrators cannot claim tickets or browse the queue."*
>
> And this branch's own sibling tests already lock in the IT_STAFF-only stance:
> - `server/tests/lab-03/authorization.api.test.ts:448` — **API-30**: Admin → 403 on `/api/staff/tickets` and `/api/staff/assignees`.
> - `server/tests/lab-03/authorization.api.test.ts:392` — Admin → 403 on attachment downloads (BR-14, ADR-0008).
> - Issue 17's peer review (`docs/lab-03/review-issue17-staff-ticket-queue.md`, Thread 1 / B1) explicitly adopted **IT_STAFF-only** and required all sources to agree. `specification.md:322-330` still lists "IT Staff, Admin" — that table was the B1 item Issue 17 was supposed to reconcile, not something for Issue 18 to take the opposite side of.
>
> **Runtime consequence if Admin stays:** an Administrator deep-linking to `/staff/tickets/:id` gets a 200 with a **broken Owner dropdown** (assignees fetch is 403 → empty list, `StaffTicketDetail.tsx:94`) and a **misleading Claim button** that successfully assigns the ticket to the Admin — a ticket the Admin can never see in the (IT_STAFF-only) queue.
>
> **Required to unblock:**
> - [ ] `staff-ticket-detail.router.ts:14` → `requireRole("IT_STAFF")`
> - [ ] `client/src/App.tsx:112` → `roles={["IT_STAFF"]}` (mirroring `/staff/queue`)
> - [ ] Invert `staff-ticket-detail.api.test.ts:161` "allows Administrator to view staff ticket detail" into a **403 FORBIDDEN** assertion consistent with API-30 (and add the same 403 assertion for the three PATCH endpoints — Admin currently untested there)
> - [ ] Remove the `ADMINISTRATOR` reference from the PR description
>
> (The two side wins narrow to one: fix `specification.md:322-330` to "IT Staff" as Issue 17 B1 already required, or — far more costly — amend BR-14 + ADR-0008 + api-spec §3.)
>
> ---
>
> ## 🟡 Should fix in this branch
>
> - **W1 — duplicate `requireAuth` per detail request.** Both `staffQueueRouter` (`staff-queue.router.ts:120`, router-level `.use`) and `staffTicketDetailRouter` (`staff-ticket-detail.router.ts:13`, router-level `.use`) sit on `/api/staff/tickets`, so every detail GET/PATCH resolves the DB user twice. Collapse to a single auth pass.
> - **W2 — oversized ticket ID answers 500, not 400 (AC-21/BR-35).** `parseTicketId` (`staff-ticket-detail.router.ts:43`) accepts `^[1-9]\d*$` with no bound; an ID above `Number.MAX_SAFE_INTEGER` loses precision → Prisma throws → generic 500 `DATABASE_UNAVAILABLE`. Add a `Number.isSafeInteger` bound → 400 `VALIDATION_FAILED`.
>
> ## 🟢 Noted, not blocking
>
> - **W3** — transition matrix duplicated client/server (`client/src/utils/status-machine.ts` / `server/src/tickets/status-machine.ts`); server is authoritative, but the two will drift on edits.
> - **W4** — `errors.ts:153` emits "Unrecognized query parameter" even when the key is from a JSON body (`.strict()` on PATCH schemas); cosmetic.
> - **W5** — PR description counts: 28 `it` blocks in `staff-ticket-detail.api.test.ts` (not 29); GET-detail `describe` cites AC-10, which pertains to the queue query.
>
> ---
>
> ## Pre-merge checklist (blocking gate)
>
> - [ ] B1 resolved: router guard, client route, and PR description all say **IT_STAFF-only**; `specification.md:322-330` reconciled or explicitly deferred to the contract PR
> - [ ] W1/W2 landed in the same branch
> - [ ] W3–W5 acknowledged (fix or track)
>
> Reviewed 2026-09-20 — ran both suites end-to-end, `tsc -b`, and Vite build against `feature/18-staff-ticket-detail`.

#### Partner's response (2026-09-21, @thrxpt)

> Thanks for the thorough and incisive review @fahsai-02!
>
> All blocking and suggested items have been addressed in commit `dabbf22` and pushed to `feature/18-staff-ticket-detail`:
>
> ### 🔴 Blocking — B1: Administrator Access Restricted to IT_STAFF-only
> - **Router Guard**: Updated `server/src/staff/staff-ticket-detail.router.ts` to `requireRole("IT_STAFF")`.
> - **Client Route**: Updated `client/src/App.tsx` to `roles={["IT_STAFF"]}`.
> - **Specification**: Reconciled the endpoint table in `docs/lab-03/specification.md` (§8) to `IT Staff` only for detail and operational routes.
> - **Tests**: Inverted `staff-ticket-detail.api.test.ts` to assert 403 Forbidden for Administrator on `GET /api/staff/tickets/:id`, and added explicit 403 assertions for Administrator across all three PATCH endpoints (`/owner`, `/priority`, `/status`).
> - **PR Description**: Updated PR #43 description to remove Administrator references and reflect `IT_STAFF` only.
>
> ### 🟡 Should fix — W1: Collapsed `requireAuth` passes
> - Scoped `requireAuth` in `server/src/staff/staff-queue.router.ts` directly to `GET /`, so requests heading to detail endpoints (`/api/staff/tickets/:id`) do not trigger a redundant session lookup.
>
> ### 🟡 Should fix — W2: Safe Integer Bounds on Ticket ID
> - In `server/src/staff/staff-ticket-detail.router.ts`, added `Number.isSafeInteger(parsed) && parsed <= 2147483647` bound in `parseTicketId`. IDs exceeding 32-bit integer limits now return `400 Bad Request` (`VALIDATION_FAILED`) with structured field errors per AC-21/BR-35, verified by a new test.
>
> ### 🟢 Noted — W3–W5
> - **W3 (Client/Server Matrix)**: Noted; server validator remains authoritative source of truth.
> - **W4 (Zod errors)**: Acknowledged.
> - **W5 (PR citations & counts)**: Cleaned up GET detail describe block citation to `(FR-10, BR-14, BR-15)` and updated PR test counts (33 tests in `staff-ticket-detail.api.test.ts`, 320 total suite tests).
>
> ### Verification
> - `pnpm test`: All 320 tests pass cleanly (19 server test files / 196 tests, 25 client test files / 124 tests).
> - `tsc -b` and Vite builds pass with 0 errors.

#### My approval (`APPROVED`, 2026-09-21, @fahsai-02)

> LGTM

**Merged into `lab3-staging` 2026-09-21 (#43)** (merge commit `6b65baa`, merged by @fahsai-02).

---

### PR #44 — feature/19-comments-and-notes

*(titled "Issue 19" in the partner's own numbering, where his issue #35 asked
for comments, notes and the requester resolution indication)*

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/44>

**PR title on GitHub:** feat(comments): implement public comments, internal notes, and requester resolution indication (#35)

#### My review (`COMMENTED`, 2026-09-22, @fahsai-02)

> Feature matches the contract across FR-07/08/10/14, BR-04/05/17/24/25/26/27/28, AC-08/09/14/15. Verified locally: server 220 tests, client 133 tests, clean build, scope stays within Issue 19.
>
> Minor nits (non-blocking, worth fixing before merge):
> 1. **`api-spec.md` does not document the 400 response for `POST /api/tickets/:id/resolve-indication`** — the implementation answers 400 `VALIDATION_FAILED` when the ticket is CLOSED/CANCELLED (correct per BR-24 and already covered by API-09), but `docs/lab-03/api-spec.md` §POST resolve-indication only lists 200/404. Add the 400 row so the contract matches the implementation.
> 2. **UI validation feedback** (both `PublicComments` and `InternalNotes`): the character counter turns red past 2,000 but there is no inline error wired via `aria-describedby` per the ui-spec §3 pattern. Minor, non-blocking.

Inline threads left in this round (2):

| Who | File:line | Verbatim opening line |
|---|---|---|
| @fahsai-02 | `client/src/styles/theme.css`:426 | nit: `rgba(184, 134, 11, 0.35)` (lines 426/431) hardcodes the same value as `--zen-warning` (#B8860B). ui-spec §1 wants colors to come from the token set, so consider `border: color-mix(in srgb, var(--zen-warning) 35%, transparent)` or declare a `--zen-warning-border` token in `:root`. |
| @fahsai-02 | `server/src/routes/comments-notes.ts`:47 | nit: `orderBy: { createdAt: "asc" }` has no secondary tie-break — two comments/notes landing in the same timestamp (same microsecond) would make the order unstable, and API-14/15 assert exact index positions. Suggest appending `{ id: "asc" }` as a secondary sort (this is line 47 for comments; same applies to notes at line 184). |

#### My approval (`APPROVED`, 2026-09-23, @fahsai-02)

> Verified all review findings are addressed and the full suite is green:
>
> - api-spec.md now documents the 400 for POST /api/tickets/:id/resolve-indication, matching the implementation (VALIDATION_FAILED, details.status message).
> - PublicComments and InternalNotes wire aria-invalid + aria-describedby to a real inline error (invalid-feedback) past 2,000 chars, covered by new UI tests.
> - theme.css replaces the rgba(184,134,11,..) hardcodes with color-mix over the --zen-warning token.
> - comments-notes.ts appends { id: "asc" } as a secondary tie-break for both comments and notes, covered by new API tests.
>
> Verification: server 222 tests passed, client 133 tests passed, oxlint clean (only pre-existing warnings in unrelated files).

#### Partner's response (2026-09-23, @thrxpt)

> Thanks for reviewing and merging, @fahsai-02! Glad all the corrections looked good.

**Note on the round count.** One review round only: a `COMMENTED` review on
2026-09-22 carrying the two inline nits above, then `APPROVED` on 2026-09-23.
GitHub shows no activity at all on 2026-09-21 for #44.

**Merged into `lab3-staging` 2026-09-23 (#44)** (merge commit `3d1467a`, merged by @fahsai-02).

---

### PR #45 — feature/20-admin-user-management

*(titled "Issue 20" in the partner's own numbering, where his issue #36 asked
for administrator user management)*

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/45>

**PR title on GitHub:** feat(admin): implement administrator user management with safety rules (#36)

#### My review (`CHANGES_REQUESTED`, 2026-09-24, @fahsai-02)

> ## Review: Administrator User Management (Issue 20)
>
> **Verified locally:** `pnpm test` = 403 tests green (server 261 / client 142), `pnpm -r build` passes. The implementation is strong — server-side enforcement is authoritative and correct (401/403 role gating, the four safety rules, case-insensitive email uniqueness, safe error envelopes), the `parsePositiveIntId` extraction is clean, and the drawer ships a real focus trap, focus restoration, and disabled-state guards that match BR-29/BR-30.
>
> My concerns are primarily **process/traceability**: several claims in the PR body do not match what is actually in this diff. Everything is itemized below and inline.
>
> ### Blocking (fix before approving)
>
> 1. **Missing rows in `docs/lab-03/tests.md`** — **UNIT-06** (users-admin validation; the unit table stops at UNIT-05) and **STYLE-06** (account status badges; the style table stops at STYLE-05) both exist in code but have no traceability row. Per AGENTS.md, a new test lands with its row in tests.md in the same commit.
> 2. **"All rows marked Passed" is inaccurate** — **STYLE-01** (line 111) and **RESP-04** (line 124) are still `Planned` in tests.md.
> 3. **RESP-04 (admin User Management at 390px) is claimed in the PR body but is not delivered anywhere** — `e2e/lab-03/responsive.spec.ts` is untouched by this PR and only covers RESP-01..03 (Staff Queue); RESP-04 is not in this PR's diff. Either deliver it (note: Playwright is Issue 21 scope) or drop the claim and keep RESP-04 honest as `Planned`.
> 4. **TOCTOU on duplicate email in create (inline on router)** — racing POSTs can return 500 instead of 409.
>
> ### Non-blocking (please address or acknowledge)
>
> 5. **Initial password policy** — only min-length 8 is enforced; `"12345678"` is accepted (a unit test asserts it). Contract-compliant per api-spec §5, but BR-07's full policy is not applied to admin-issued credentials. Please make an explicit decision and record it.
> 6. **BR-18 integrity gap (inline on router)** — PATCH can demote an active IT_STAFF/ADMINISTRATOR who currently owns Tickets to `REQUESTER`, leaving Tickets owned by a role BR-18 forbids. Out of Issue 20 scope but worth tracking.
> 7. **Minor UX/a11y** (inline): stale `activeAdminCount`, tooltip-precedence mismatch vs the API error actually returned, and the reset-password modal not inerting the drawer behind it.
>
> Thanks for the careful work — happy to approve once the blocking items are reconciled.

Inline threads left in this round (9):

| Who | File:line | Verbatim opening line |
|---|---|---|
| @fahsai-02 | `server/src/admin/users-admin.router.ts`:100 | [BLOCKING] **TOCTOU on duplicate email — racing creates return 500 instead of 409** |
| @fahsai-02 | `server/src/admin/users-admin.router.ts`:231 | [Question — not blocking] **Demoting a ticket-owning user violates BR-18** |
| @fahsai-02 | `server/src/admin/users-admin.schema.ts`:48 | [Question — not blocking] **Initial password policy is weaker than BR-07** |
| @fahsai-02 | `server/tests/lab-03/users-admin-validation.unit.test.ts`:10 | [BLOCKING] **Test ID missing from describe and from `tests.md`** |
| @fahsai-02 | `client/tests/lab-03/style/badges.style.test.tsx`:127 | [BLOCKING] **STYLE-06 has no row in `tests.md`** |
| @fahsai-02 | `docs/lab-03/tests.md`:77 | [BLOCKING] **"All rows marked Passed" does not match the matrix** |
| @fahsai-02 | `client/src/pages/admin/UserManagement.tsx`:77 | [Minor] **`activeAdminCount` can go stale** |
| @fahsai-02 | `client/src/pages/admin/UserEditDrawer.tsx`:337 | [Minor] **Tooltip precedence differs from the API error actually returned** |
| @fahsai-02 | `client/src/pages/admin/UserEditDrawer.tsx`:623 | [Minor, a11y] **Drawer is not inert while the reset-password modal is open** |

#### Partner's response (2026-09-24, @thrxpt)

> ## Review Feedback Addressed (Commit 6f4b09a)
>
> Thank you for the thorough and constructive review! All blocking items and minor suggestions have been addressed:
>
> ### 1. Missing Rows in `tests.md` & Describe Renaming (Blocking)
> - Renamed describe block in `server/tests/lab-03/users-admin-validation.unit.test.ts` to `UNIT-06 — User administration validation schemas (AC-16, AC-17, BR-13, BR-31, BR-33, FR-16, FR-17, FR-18)`.
> - Added the `UNIT-06` row to the Unit Tests table in `docs/lab-03/tests.md` (marked `Passed`).
> - Added the `STYLE-06` row for Account status badges to the UI Style Tests table in `docs/lab-03/tests.md` (marked `Passed`).
> - Updated the AC traceability matrix rows for AC-16, AC-17, and AC-20 to include `UNIT-06`.
>
> ### 2. Matrix Status Reconciliation & RESP-04 Scope (Blocking)
> - Reconciled PR body: delivered test rows (`API-17..22`, `UI-11..14`, `UNIT-06`, and `STYLE-06`) are marked `Passed`, while `STYLE-01` and `RESP-04` remain properly `Planned` for Issue 21 scope.
> - Removed premature claims of delivering RESP-04 in this PR.
>
> ### 3. TOCTOU on Duplicate Email (Blocking)
> - Added Prisma `P2002` unique-constraint error handling in `POST /api/admin/users` and `PATCH /api/admin/users/:id` in `server/src/admin/users-admin.router.ts`. Concurrent racing requests now return 409 Conflict with `DUPLICATE_EMAIL` rather than throwing unhandled 500 errors.
>
> ### 4. Client-Side Tooltip Precedence
> - In `client/src/pages/admin/UserEditDrawer.tsx`, inverted tooltip precedence so `isSoleActiveAdmin` takes precedence over `isSelf`, ensuring the client-side tooltip ("Cannot deactivate or reassign the last active Administrator.") matches the server's `CANNOT_DEACTIVATE_LAST_ADMIN` response.
>
> ### 5. Drawer Inertness Behind Sub-Modal
> - In `client/src/pages/admin/UserEditDrawer.tsx`, wrapped the drawer contents in a container marked `aria-hidden={showResetModal ? "true" : undefined}` and `inert={showResetModal || undefined}` while the reset-password modal is active, ensuring proper focus containment and assistive technology behavior.
>
> ### 6. Active Admin Count Synchronization
> - In `client/src/pages/admin/UserManagement.tsx`, directly synchronized `activeAdminCount` from the returned user list on every unfiltered fetch.
>
> ### 7. Design Notes & Invariant Clarifications
> - **Initial Password Policy**: Recorded that initial passwords intentionally enforce min-length 8 per BR-33 and `api-spec.md §5`. The full password complexity policy (BR-07) is enforced when the user authenticates and enters the mandatory password change flow (`/change-password`, BR-02, BR-12).
> - **BR-18 Ticket Ownership Invariant**: Acknowledged demoting active ticket-owning staff as a known edge-case tracked for future operational invariant checks.
>
> All 52 test files (403 tests) pass and production builds compile cleanly.

#### My approval (`APPROVED`, 2026-09-24, @fahsai-02)

> ## Approving — review feedback verified fixed
>
> Verified locally against the latest commit (6f4b09a): `pnpm test` = 403 green (server 261 / client 142), `pnpm -r build` clean.
>
> All blocking items from the previous review are resolved:
> - **UNIT-06 / STYLE-06 rows** added to `docs/lab-03/tests.md` with AC traceability entries — :heavy_check_mark:
> - **Status reconciliation** is honest: `STYLE-01` and `RESP-04` remain `Planned` for Issue 21; the RESP-04 delivery claim was dropped — :heavy_check_mark:
> - **TOCTOU on duplicate email** — Prisma `P2002` handled in both `POST` and `PATCH` returning 409 `DUPLICATE_EMAIL` instead of an unhandled 500 — :heavy_check_mark:
> - **Tooltip precedence** inverts to `isSoleActiveAdmin` first, matching the server's `CANNOT_DEACTIVATE_LAST_ADMIN` priority, and the UI test now distinguishes self-with-other-admins from sole-admin — :heavy_check_mark:
> - **activeAdminCount** syncs from the unfiltered user list; keep-alive count query intact — :heavy_check_mark:
> - **Drawer inertness** behind the reset-password modal via `inert` + `aria-hidden` (React 19 supports the boolean prop) — :heavy_check_mark:
>
> Recorded non-blocking notes (no action required for merge, tracked for later):
> 1. The drawer backdrop (`onClick={onClose}`) is not inert while the reset modal is open, so a stray click outside can dismiss the whole drawer mid-reset — consider guarding it behind `showResetModal`.
> 2. Nested `role="dialog"` (drawer + reset modal) is a mild a11y smell.
> 3. No deterministic regression test exercises the `P2002` code path (pre-check + catch is correct; a mocked Prisma throw would lock it in).
> 4. `UNIT-06` tests.md row lists fewer contract IDs than the describe title (BR-13, FR-16..18) — cosmetic mismatch only.
> 5. Self-demotion (admin demotes own role when another admin exists) is permitted by design per BR-30; worth keeping explicit.
>
> Nice work — the four safety rules are authoritative on the server, the error envelope stays consistent, and the drawer ship is genuinely accessible.

**Merged into `lab3-staging` 2026-09-24 (#45)** (merge commit `e35b700`, merged by @fahsai-02).

---
