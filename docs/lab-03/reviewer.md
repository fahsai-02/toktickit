# Lab 3 — Peer Review Record

**Author:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  
**Peer reviewer:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #65 | feature/14-sprint3-engineering-contract | approved |
| #66 | feature/15-data-foundation | approved (merged 2026-09-15) |
| #67 | feature/16-auth-api-middleware | approved (merged 2026-09-16) |
| #68 | feature/17-auth-ui-login-change-password | approved (merged 2026-09-18) |
| #69 | feature/18-requester-regression | changes requested (2026-09-19, addressing feedback) |
|  | feature/19-staff-ticket-queue |  |
|  | feature/20-staff-ticket-detail |  |
|  | feature/21-admin-user-management |  |
|  | feature/22-comprehensive-testing |  |
|  | feature/23-release-polish |  |

---

## Pull Requests I reviewed for my partner
| PR | Branch | My verdict |
|----|--------|------------|
| #39 | feature/14-lab3-contract | approved |
| #40 | feature/15-auth-foundation | approved (after changes requested) |
| #41 | feature/16-auth-shell-regression | changes requested — fixes verified, 2 small items remain (2026-09-19, awaiting re-review) |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |
|  | *(partner branch)* |  |

---

## Detail — PRs I authored

### feature/14-sprint3-engineering-contract #65

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/65>

Reviewer approved comment:

> LGTM

---

### feature/15-data-foundation #66

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/66>

#### Round 1

Reviewer comment (CHANGES_REQUESTED):

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
> 1. **Clarify Server Suite status in `docs/lab-03/tests.md` (section 6, line 214):** Marking the entire server suite as passed is premature when all Lab 3 endpoints are still `Planned` (Issues 16–21). Update the label to reflect the **Migration & Regression Baseline (MIG-01 + Lab 1/2 tests)**.
> 2. **Replace forbidden `§` symbols with the word `section`:** per `AGENTS.md` review protocol. Replace in `docs/lab-03/seed-credentials.md:6`, `server/prisma/seed.ts:22, 83, 454`, `server/tests/lab-03/migration-regression.api.test.ts:7`.
> 3. **Use type-only import in `server/prisma/seed.ts` (line 5):** `RequestedPriority` is only used as a type annotation — use `import type { RequestedPriority }` to adhere to ESM/`verbatimModuleSyntax` rules.
>
> #### Non-blocking Notes (Recommended)
>
> - Document that `PRE_MIGRATION_COUNTS` should be supplied for strict local regression checks.
> - Memoize ticket IDs to avoid N+1 `findUnique` calls in the seed.
> - Renaming `participant` in seed fixtures to `authorEmail` would align better with `author`/`authorId`.
>
> Once the three required items above are updated, I will approve the PR immediately.

How I responded:

> **Thanks for the careful review! I've fixed all 3 blocking items.**
>
> ## 1. Server suite status in tests.md (section 6)
>
> Fixed. The table now says the `Pass` result only covers the **Migration & Regression Baseline (MIG-01 + Lab 1/2 tests)**, and that the Lab 3 endpoint tests stay `Planned` until Issues 16–21.
>
> ## 2. `§` → `section`
>
> Done. Replaced every `§` reference (`seed-credentials.md`, `seed.ts`, `migration-regression.api.test.ts`, and one I found in `tests.md`).
>
> ## 3. Type-only import in seed.ts
>
> Done. `RequestedPriority` is now imported with `import type { RequestedPriority }`.
>
> `cd server && pnpm build` passed with no errors.
>
> ## Non-blocking notes. Thanks, I agree these are good ideas
>
> - `PRE_MIGRATION_COUNTS` — acknowledged. The test already documents this in the header comment.
> - N+1 `findUnique` calls — agreed, left for a future cleanup to keep this PR focused.
> - Renaming `participant` → `authorEmail` — agreed it fits the domain model better. Also left for future cleanup.
>
> The changes are committed on `feature/15-data-foundation`, ready for your re-review.

#### Round 2

Reviewer comment (CHANGES_REQUESTED):

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
> When running the full server test suite, one test consistently times out:
>
> - **Failing Test:** `stores only bcrypt hashes (prefix $2) and bcrypt.compare succeeds for seeded passwords` (line 141)
> - **Error:** `Test timed out in 5000ms.` — `bcryptjs` at cost 12 takes ~450–500ms per comparison; 11 synchronous comparisons take ~5.2–5.5s.
> - **Suggested Fix:** Pass an explicit timeout (`15000`) *or* verify 1 sample user per role (reducing 11 → 3 comparisons).
>
> Once this timeout is patched and `pnpm test` passes 135/135 tests cleanly, I will approve immediately!

How I responded:

> Thanks for the follow-up and for confirming the three earlier fixes. The remaining blocker is fixed, and I also landed a few extra fixes in the same wave. Commits after your review (`f8c38a8`, `8d1caa1`, `709e419`, `399647d`):
>
> **1. Blocker, bcrypt test timeout (fixed in `f8c38a8`)**
> - The MIG-01 test now passes an explicit `20000ms` timeout (Vitest third argument) so it never hits the default 5000ms.
> - I kept your explicit-timeout option. The follow-up `8d1caa1` goes further: `bcrypt.compare` is now verified for **every** documented seed account (all 11), with emails/roles/passwords imported from `src/lib/seedData.ts` + `src/lib/seedCredentials.ts` — the same modules `prisma/seed.ts` consumes, so seed and test can no longer drift.
>
> **2. Same-wave extras (all behind the blocker fix)**
> - **Per-user salt hashing** (`f8c38a8`): each account gets a unique hash even when shared dev passwords are used.
> - **Ownerless + null-priority contrast** (`f8c38a8`): one seed ticket now has `itPriority: null` with no owner, so the staff queue "Unassigned" filter has data to filter.
> - **Single source of truth for seed** (`8d1caa1`): all seed rows moved to `seedData.ts`, credentials to `seedCredentials.ts`.
> - **Deterministic DB assertions** (`8d1caa1`): `server/vitest.config.ts` sets `fileParallelism: false` so MIG-01's whole-table counts can never race other suites.
> - **Lab 2 regression suites made seed-independent** (`709e419`): removed hard-coded ids/names/counts; tests now query the DB or the seed module.
> - **AGENTS.md** (`399647d`): documented the test-writing rules and recorded a pending client-test stash (deferred; client-only).
>
> **Verification on the current branch:**
> `cd server && pnpm test → 12 files / 138 tests Pass` (135 before; +3 MIG-01 assertions)
> `cd server && pnpm run build → Pass`
> `pnpm exec prisma db seed → idempotent` (ran twice, same counts)

---

### feature/16-auth-api-middleware #67

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/67>

Reviewer comment (CHANGES_REQUESTED):

> Nice work on the authentication foundation! The session security setup (HTTP-only, `sameSite: "lax"`, 24-hour expiration, and production-only `secure` cookies), constant-time dummy bcrypt comparison for timing attack defense, case-insensitive email normalization, and clean throwaway test data lifecycle are well executed.
>
> All 166 tests across 13 test files are currently passing, and `pnpm build` succeeds with zero TypeScript errors.
>
> Before merging into `lab3-staging`, please take a look at the following findings:
>
> ---
>
> #### Actionable / Items to Address
>
> 1. **Missing `UNIT-02` Unit Test File (`docs/lab-03/tests.md` line 35)** — `validateNewPassword` is only exercised via API endpoints; the dedicated unit test file `server/tests/lab-03/password-validation.unit.test.ts` does not exist and remains `Planned`. Recommend adding it and flipping `UNIT-02` to `Pass`.
> 2. **Update Test Summary in `docs/lab-03/tests.md` (section 6)** — the summary still lists the old baseline `Pass — 12 files / 138 tests (2026-09-14)` even though API-01..13 were flipped to `Pass`.
> 3. **Missing Test Traceability Comments (`AGENTS.md` Rule 9)** — `describe("API — Login validation")` and `describe("Auth middleware — requireAuth / requireRole")` lack spec citations.
> 4. **Unnecessary `async` on Synchronous `requireRole` Middleware** (`server/src/middleware/auth.ts` line 52) — no `await` inside; return `(req, res, next): void` instead of wrapping in a Promise.
>
> #### Observations / Notes (Non-blocking)
>
> - **`isActive` in response payload (`POST /login` & `GET /me`)** — beyond the api-spec section 2.1/2.3 field set; harmless but strict contract tests might only expect those fields.
> - **`POST /api/auth/logout` without session** — spec section 8 lists `Session` protection; current idempotent 200 is acceptable and avoids client-cleanup errors.
> - **Session Store Decision in `api-spec.md`** — acceptance criterion #16 of Issue #57 asked to document the session store choice in `api-spec.md`; it currently lives in `specification.md` AD-02 and `server/src/app.ts`.
>
> #### Verdict
> Requesting minor updates (primarily adding `UNIT-02` to close out the planned test in `tests.md` and updating the test baseline count). The core authentication implementation and security controls look solid!

How I responded:

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
> Committed as `3689c96` on `feature/16-auth-api-middleware`, ready for your re-review.

Reviewer approved comment:

> *(awaiting re-review)*

---

### feature/17-auth-ui-login-change-password

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/68>

Reviewer comment (CHANGES_REQUESTED):

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
> 1. **Comment out `VITE_API_URL` in `client/.env.example`** — the file was not modified and still has active `VITE_API_URL="http://localhost:5000"`; if copied to `.env`, browser requests bypass the Vite dev proxy and fail credentialed CORS on login.
> 2. **Clean up dead CSS and add mobile truncation for `.profile-name` (`client/src/App.css:408-422`)** — `.btn-change-requester` / `.requester-name` were left behind inside the `@media (max-width: 768px)` block, and `.profile-name` keeps its desktop `max-width: 160px`, which can crowd narrow mobile headers.
> 3. **Update Client Suite status in `docs/lab-03/tests.md` (section 6)** — summary table still lists `Client (component + style) | *TBD at sprint close*`, even though UI-01..06 are now `Pass`.
>
> #### Observations / Notes (Non-blocking)
>
> - **Test coverage for `roleBadgeVariant`** — works as intended, but unlike status/priority badges there is no automated assertion in `zen-green-style.test.tsx` verifying the mapping; consider adding a quick check.
> - **DRY Route Guard Loading (`client/src/App.tsx`)** — the 5-line `<div className="selection-page" data-testid="app-loading"><Spinner /></div>` block is repeated across 5 route guards; an `<AuthLoading />` helper would keep `App.tsx` concise.
> - **Voluntary Change Password UX** — a voluntary visit to `/change-password` returns via browser back button; an explicit "Cancel" link back to `/` in a future polish issue would enhance usability.

How I responded:

> **Thanks for the thorough review! I've addressed all 3 actionable items plus the `roleBadgeVariant` note, committed as `7c0b7ae` on `feature/17-auth-ui`.**
>
> ## Actionable items
>
> **1. `client/.env.example`**
> Fixed — `VITE_API_URL` is now commented out (`# VITE_API_URL="http://localhost:5000"`), so a fresh copy to `.env` stays on the same-origin Vite dev proxy and never hits the credentialed-CORS failure on login.
>
> **2. Dead CSS + mobile `.profile-name` (`client/src/App.css`)**
> Fixed — removed the leftover `.btn-change-requester` / `.btn-change-requester__full` / `.requester-name` rules from the `@media (max-width: 768px)` block and added the requested mobile truncation:
> ```css
> .profile-name {
>   max-width: 80px;
>   min-width: 0;
> }
> ```
>
> **3. Client suite status in `docs/lab-03/tests.md` (section 6)**
> Fixed — the summary row records the passing baseline.
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

Reviewer approved comment (2026-09-18):

> ### PR Review Update: Follow-up on commit `7c0b7ae` — #68
>
> Thanks for the prompt turnaround! Commit `7c0b7ae` resolves all review items cleanly:
>
> - `client/.env.example` now comments out `VITE_API_URL` to protect local dev from cross-origin CORS cookie failures.
> - Obsolete Lab 2 Dev Requester styles (`.btn-change-requester`, `.requester-name`) have been removed from `client/src/App.css`, and `.profile-name` now has mobile truncation (`max-width: 80px`) preventing header overflow on small viewports.
> - `docs/lab-03/tests.md` Section 6 test summary has been updated to the current passing baseline (`11 files / 105 tests`).
> - Bonus: automated test coverage for `roleBadgeVariant` and role badge tokens added to `zen-green-style.test.tsx`, fully satisfying `ui-spec.md` section 3 / section 9.1 item 7.
>
> #### Verification
> - Client test suite: `11 files / 105 passed` (`cd client && pnpm test`)
> - Client build: `tsc && vite build` passed with zero errors
> - Server test suite: `14 files / 173 passed` (`cd server && pnpm test`)
> - Server build: `tsc` passed with zero errors
>
> LGTM! Ready to merge into `lab3-staging`.

**Merged into `lab3-staging` 2026-09-18 (#68).**

---

### feature/18-requester-regression

**Pull Requests URL:** <https://github.com/fahsai-02/toktickit/pull/69>

Reviewer comment (CHANGES_REQUESTED, 2026-09-19):

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
> #### Actionable / Items to Address
>
> 1. **Missing CSS styling for Resolution Summary (`docs/lab-03/ui-spec.md` section 5.3)** — `client/src/TicketDetail.tsx` (line 280) uses `className="field-readonly resolution-summary"` but `client/src/App.css` does not define `.resolution-summary`, so it falls back to the default neutral read-only background instead of pale green (`var(--color-pale)`). Add:
>    ```css
>    .field-readonly.resolution-summary {
>      background: var(--color-pale);
>      white-space: pre-wrap;
>    }
>    ```
> 2. **Documentation typo in `README.md` (lines 102–106)** — references `docs/lab-01/seed-credentials.md` and `docs/lab-02/seed-credentials.md` which do not exist; point to `docs/lab-03/seed-credentials.md`.
>
> ---
>
> #### Observations / Non-blocking Nits
>
> - **Test data single source of truth (AGENTS.md Test-writing Rule 2):** `e2e/lab-03/helpers.ts` (lines 12–14) hard-codes `REQ_EMAIL` / `REQ_INITIAL_PASSWORD`; consider importing from `server/src/lib/seedData.ts` and `seedCredentials.ts`.
> - **Atomic legacy Requester upsert (`server/src/app.ts:186`):** replace `findUnique` + `create` with `db.requester.upsert({...})` to avoid a potential `P2002` race.
>
> #### Verification Instructions
> ```bash
> cd server && pnpm test && pnpm build
> cd ../client && pnpm test && pnpm build
> ```

How I responded:

> *(addressing feedback — fixes in progress, awaiting re-review)*

Reviewer approved comment:

> *(awaiting re-review)*

---

### feature/19-staff-ticket-queue

**Pull Requests URL:**

Reviewer comment:

> *(paste comment text here)*

How I responded:

> *(paste response text here)*

Reviewer approved comment:

> *(paste approved text here)*

---

### feature/20-staff-ticket-detail

**Pull Requests URL:**

Reviewer comment:

> *(paste comment text here)*

How I responded:

> *(paste response text here)*

Reviewer approved comment:

> *(paste approved text here)*

---

### feature/21-admin-user-management

**Pull Requests URL:**

Reviewer comment:

> *(paste comment text here)*

How I responded:

> *(paste response text here)*

Reviewer approved comment:

> *(paste approved text here)*

---

### feature/22-comprehensive-testing

**Pull Requests URL:**

Reviewer comment:

> *(paste comment text here)*

How I responded:

> *(paste response text here)*

Reviewer approved comment:

> *(paste approved text here)*

---

### feature/23-release-polish

**Pull Requests URL:**

Reviewer comment:

> *(paste comment text here)*

How I responded:

> *(paste response text here)*

Reviewer approved comment:

> *(paste approved text here)*

---

## Detail — PRs I reviewed for my partner

### Issue 14: Sprint 3 Engineering Contract — feature/14-lab3-contract #39

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/39>

My comments (inline nits):

> nit: `BR-43` doesn't exist in specification.md (ends at BR-34). Either add a BR-35 rule for this convention or remove the stale reference. *(api-spec.md)*

> nit: `BR-43` doesn't exist in specification.md. This test maps to AC-21 which is sufficient — just drop the stale BR reference. *(tests.md)*

> nit: `BR-44` doesn't exist in specification.md. Same as above — the test is valid, just remove the broken BR reference. *(tests.md)*

Partner's responses:

> Good catch! Added BR-35 in specification.md for safe error responses without leaking stack traces/SQL, and updated this reference to BR-35 in a951cb9.

> Confirmed and updated: API-23 now cites AC-21 and the newly added BR-35 in a951cb9.

> Confirmed and updated: Added BR-36 in specification.md for seed idempotency and mapped API-24 to BR-36 in a951cb9.

Partner's summary comment:

> Addressed review feedback from @fahsai-02 in commit a951cb9:
>
> 1. Added **BR-35** to `specification.md` under *System Behavior and Data Integrity* for safe error envelopes without leaking stack traces or internal details; updated reference in `api-spec.md` and `tests.md` (API-23).
> 2. Added **BR-36** to `specification.md` for database seed idempotency; updated reference in `tests.md` (API-24) and Issue #31.
>
> All 4 contract documents and test mapping tables are now 100% verified with zero missing BR references.

My approved comment:

> Overall, this is a solid and thorough contract. All 11 sections of specification.md are present, BR-01 through BR-05 match the handout verbatim, AC-01 through AC-21 are in Given-When-Then form, and the test plan has full AC traceability. The four companion docs are internally consistent, and the ADRs are well-structured.
>
> Approving with one minor cleanup: a few stale BR references (BR-43, BR-44) that don't exist in specification.md.

My approved comment (after fixes):

> Fixes confirmed clean. BR-35 and BR-36 added to specification.md section 5, api-spec.md and tests.md references updated, no stale BR-43/BR-44 references remain. All 11 sections intact, BR-01 through BR-36 numbered correctly.

---

### Issue 15: Data Foundation & Authentication Foundation — feature/15-auth-foundation #40

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/40>

My comment (CHANGES_REQUESTED, 2026-09-16):

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
> | `tsc --noEmit` (server) | clean |
> | Lab 3 API + unit tests (3 files, 29 tests) | 29/29 passed |
> | Full server suite incl. Lab 1 & Lab 2 regressions (15 files) | 127/127 passed |
> | Migration applied to a fresh `toktickit_test` | idempotent (`migrate deploy` run twice, no pending migrations) |
> | Auth endpoints match `api-spec.md` section 1 (payloads, status codes, error codes) | exact |
> | Error envelope `{ error: { code, message, fields? } }` | exact (BR-35) |
> | Password policy vs BR-07; bcrypt cost 10 vs BR-06 | match |
> | `httpOnly`/`SameSite=Lax` cookie + Bearer fallback vs BR-08 / ADR-0007 | match |
>
> ---
>
> ## Blocking finding
>
> ### B1. Seed data diverges from specification section 7 (named accounts)
>
> - Contract — `specification.md` section 7 names 4 active Requesters (`jennifer.anderson`, `somchai.prasert`, `kanya.s`, `chatchai.n`) and 1 inactive (`retired.staff`).
> - Code — `server/prisma/seed-data.ts:64-96` seeds 4 active (`jennifer.anderson`, `somchai.prasert`, `marcus.chen`, `priya.raman`) and 2 inactive (`daniel.okafor`, `retired.staff`).
>
> Impact: `kanya.s`/`chatchai.n` are never created; `marcus.chen`/`priya.raman`/`daniel.okafor` are Lab 2 leftovers not named by the contract; `API-02` (`auth.api.test.ts:122`) depends on the non-contract `daniel.okafor` account; `API-24` reports idempotency against its own counts so it misses the mismatch.
>
> **Fix options:** A — align code to contract (trim/rename so the set matches section 7; update `API-02` to `retired.staff@example.ac.th`). B — amend section 7 in a follow-up contract PR first and rebase the seed on it.
>
> ---
>
> ## Non-blocking warnings
>
> - **W1.** `requireAuth` leaks `requesterId` to every role (`auth.ts:91`); through `requireRequesterContext` an IT_STAFF/ADMINISTRATOR can reach `/api/tickets` scoped as "itself-as-requester". Scope to `role === REQUESTER` or drop it.
> - **W2.** Hard-coded JWT fallback secret (`session.ts:9-10`) contradicts ADR-0007; fail closed when `JWT_SECRET` is missing outside local development.
> - **W3.** "Special character" rule accepts whitespace/any non-ASCII symbol (`password.ts:43`); restrict to an explicit punctuation class if intended.
> - **W4.** Login timing leaks user existence (`auth.ts:72-81`); run a dummy `bcrypt.compare` on a fixed hash for the unknown-email path (BR-09).
> - **W5.** Migration naming residue: unique constraint and `Requester_id_seq` retain `Requester_*` names; cosmetic drift risk.
> - **W6.** Logout clears the cookie only, token stays valid 24 h; matches `api-spec.md` so acceptable — note only.

Partner's response (2026-09-16):

> Thank you for the thorough review!
>
> We have reconciled **B1** using **Option B**, and also addressed warnings **W1**, **W2**, and **W4**:
>
> ### 1. B1 Reconciliation (Option B — `d560b91`)
> `docs/lab-03/specification.md` section 7 has been amended to reflect the established Lab 2 baseline Requester accounts:
> - **4 active Requesters:** `jennifer.anderson@example.ac.th`, `somchai.prasert@example.ac.th`, `marcus.chen@example.ac.th`, `priya.raman@example.ac.th`
> - **2 inactive Requesters:** `retired.staff@example.ac.th`, `daniel.okafor@example.ac.th`
>
> This reconciles the contract with the code while ensuring Lab 2 regression test `tests/lab-02/requesters.api.test.ts` (`API-26`) continues to pass without modification.
>
> ### 2. Resolved Warnings (`4422bac` & `87cfdc8`)
> - **W1:** scoped `req.requesterId = user.id` strictly to `user.role === Role.REQUESTER`.
> - **W2:** `session.ts` now fails closed when `NODE_ENV === 'production'` and `JWT_SECRET` is unset.
> - **W4:** constant-time dummy bcrypt comparison for unregistered emails (BR-09).
> - **Whitelist path bypass:** `requireAuth` now strictly matches parsed route pathnames rather than query strings.
> - **API-02:** added explicit coverage for `retired.staff@example.ac.th`.
>
> All 15 server test files (128 tests) and 18 client test files (65 tests) pass with zero regressions. Ready for re-review!

My approved comment (2026-09-16):

> ### Verified
>
> - **B1 (Option B):** `docs/lab-03/specification.md` section 7 reconciled with code — 4 active + 2 inactive Requesters, matching `server/prisma/seed-data.ts`. Lab 2 `API-26` regression preserved without modification.
> - **W1:** `req.requesterId` scoped strictly to `role === REQUESTER`.
> - **W2:** fail-closed when `JWT_SECRET` is unset in production.
> - **W4:** constant-time dummy bcrypt compare on unknown email (BR-09).
> - Whitelist gate uses strict pathname matching (query-string bypass covered); `API-02` covers `retired.staff@example.ac.th`.
> - `tsc --noEmit` clean.
>
> ### Notes (non-blocking)
> - W3/W5/W6 remain open, acceptable as follow-ups.

**Merged into `lab3-staging` 2026-09-16 (#40).**

---

### Issue 16: Auth Shell, Role Navigation & Requester Regression — feature/16-auth-shell-regression #41

> Note: the partner bundled their auth UI / app shell and requester regression into one PR (#41); their feature branch is `feature/16-auth-shell-regression`.

**Pull Requests URL:** <https://github.com/thrxpt/toktickit/pull/41>

My comment (CHANGES_REQUESTED, 2026-09-18):

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
> | Client lab-03 tests (Login, ChangePassword, AppShell — 3 files, 19 tests) | 19/19 passed |
> | Full client suite (21 files, 84 tests) | 84/84 passed |
> | Full server suite incl. Lab 1 & Lab 2 regressions (16 files, 134 tests) | 134/134 passed |
> | `pnpm build` (client `tsc -b && vite build`, server `tsc -p .`) | clean |
> | New API-06 / API-07 authorization tests | 6/6 passed |
> | `tests.md` traceability updates (UI-01..UI-04, UI-15, API-06, API-07 → Passed) | correct |
> | Password policy client vs server (BR-07), cookie flags httpOnly/SameSite=Lax (BR-08) | match |
> | **Issue scope: Development Requester removed** | not done |
> | **Security probes I ran manually** | leaks reproduced |
>
> ## How I tested the security findings
>
> I wrote a temporary Supertest file (deleted afterwards) that logged in as real seeded users and called the endpoints the way a normal browser would:
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
> ### B1. The Development Requester was NOT removed (main scope of the issue)
>
> Every part still exists and still works: `/select-requester` route and `RequesterSelection` import in `App.tsx`, `RequesterGuard` redirecting to `/select-requester` (not `/login`), `RequesterContext` reading/writing `toktickit_requester_id` in localStorage, `api/client.ts` still injecting `X-Requester-Id`, `AuthContext` skipping `GET /api/auth/me` when the key exists, the "Development Requester" notice + "Change Requester" menu in `AppShell`, and the server still accepting the header (`requester-context.ts`) plus the `/api/requesters` endpoint. This contradicts BR-03, AC-06, and the api-spec ("X-Requester-Id is completely retired"). Keeping it for Lab 2 test compatibility is fine, but it must be made explicit in the contract/tests.md (or an ADR).
>
> ### B2. Identity spoofing — no login required (BR-03, AC-06, FR-20)
>
> Because B1 is still in place, an anonymous client can claim any requester identity via `X-Requester-Id` (GET other users' lists, POST as them). Combined with the live `/select-requester` page, this is exactly the attack the issue was created to close.
>
> ### B3. Cross-role data leak: IT Staff / Admin can read ALL requesters' tickets
>
> An authenticated IT Staff or Admin session calling `GET /api/tickets` gets 200 with every requester's tickets. Root cause: `req.requesterId` is set only for `role === "REQUESTER"`, `tickets.ts:75` mounts `requireRequesterContext` but no `requireRole("REQUESTER")`, and Prisma ignores keys with `undefined` → the filter disappears. Expected per contract: 403 FORBIDDEN (BR-14, BR-15, FR-20). Fix: add `requireRole("REQUESTER")` on `/api/tickets` and `/api/attachments`, treat a missing `requesterId` as a hard 403/401, and add API tests for staff/admin hitting requester endpoints.
>
> ### B4. Logout does not really log out a visitor (AC-05, BR-11)
>
> `AuthContext.logout()` only clears React state; it leaves `toktickit_requester_id` in localStorage, so after logout on a shared computer the person can still open `/tickets`, re-inject the header, and the server accepts it. Logout should (at least) clear the requester key.
>
> ---
>
> ## Warnings
>
> - **W1.** `RequireAuth` is written but never used in `App.tsx` — requester routes still use `RequesterGuard`, so unauthenticated visitors go to `/select-requester` not `/login` (FR-02, UI-15). Also `UI-02` passes because the test wraps the screen with `RequireAuth` inside the test, not the real wiring.
> - **W2.** `mustChangePassword` users on `/tickets*` see a generic server error instead of being taken to `/change-password` (BR-02, AC-02, FR-03).
> - **W3.** Anonymous `GET /api/tickets` answers `400 REQUESTER_CONTEXT_MISSING` instead of `401 UNAUTHENTICATED`; message is a leftover from the retired mechanism.
> - **W4.** Attachment content blocks staff (`specification.md` section 8 says Requester/Staff) — staff get `400` because `requesterId` is only set for Requesters; will block Issues 17/18 screens.
> - **W5.** Soft-remove path drifted: code uses `POST /api/attachments/:id/removal`, spec lists `/remove`. Reconcile.
> - **W6.** My Tickets status filter only accepts `NEW` (`tickets.ts:40-44`) while the Lab 3 api-spec allows all 8 statuses.
>
> ---
>
> ## Polish (low priority)
>
> - `Login.tsx` does not redirect an already-authenticated user away from `/login`.
> - `AppShell` profile dropdown does not close on outside-click/Escape.
> - `ChangePassword` inputs have no `aria-invalid` / `aria-describedby` (ui-spec section 3).
> - `ChangePassword.tsx:41-45` redundant `(currentPassword === "" || isDifferentFromCurrent)` condition.
> - oxlint fast-refresh warnings in `AuthContext.tsx` / `RequesterContext.tsx`.
> - `theme.css:265-268` uses `rgba(...)` for borders instead of a `--zen-*` token.
>
> ## What works well
>
> Login/Change Password screens are clean and accessible; the client password checklist matches the server policy (BR-07); cookie flags are correct; API-06/API-07 are good tests; `tests.md` rows updated correctly; the "218 tests passing" claim matches what I ran.

Partner's response (2026-09-19):

> ### Updates & Fixes for Review Findings
>
> All blocking findings, warnings, and polish items have been resolved:
>
> #### 1. Blocking Findings Addressed
> - **B3:** role gate in `requireRequesterContext` — only `role === 'REQUESTER'` can access requester endpoints; IT_STAFF/ADMINISTRATOR get strict `403 FORBIDDEN`; Prisma queries guarded with `if (!req.requesterId) sendError(res, 'FORBIDDEN')`; Supertest tests added in `authorization.api.test.ts`.
> - **B1 & B2:** documented in **[ADR-0009](docs/adr/0009-lab2-backward-compatibility-and-requester-retirement.md)** — session-derived identity is authoritative; `X-Requester-Id` ignored whenever a session is present, retained as a fallback for Lab 2 test compatibility. Frontend routes use `RequireRole roles={['REQUESTER']}`.
> - **B4:** `AuthContext.logout()` terminates the server session cookie, clears React state, and purges legacy `toktickit_requester_id`.
>
> #### 2. Warnings Addressed
> - **W1 & W2:** `RequireRole` and `RequireAuth` active on protected routes; unauthenticated `/tickets` redirects to `/login`; `mustChangePassword` users redirected to `/change-password`; added `client/tests/lab-03/AppRoutes.test.tsx`.
> - **W3:** anonymous requests return `401 UNAUTHENTICATED` with standard error envelope.
> - **W4:** `GET /api/attachments/:id/content` permits IT Staff and Administrators per `specification.md` section 8.
> - **W5:** aliased `POST /api/attachments/:id/removal` and `/remove`.
> - **W6:** `listTicketsQuerySchema` accepts all 8 TicketStatus values.
>
> #### 3. Polish Items
> - Login redirect; dropdown outside-click/Escape; ChangePassword `aria-describedby`/`aria-invalid` + removed redundant condition; replaced `rgba()` borders with `--zen-info-border` / `--zen-admin-border` tokens.
>
> #### Test Verification
> - Client: 22 files, 89/89 passed. Server: 16 files, 138/138 passed. Total 38 files, 227/227. Builds clean.

My follow-up comment (2026-09-19 — fixes verified; 2 small items remain):

> ### Review verification — fixes confirmed, 2 small items remain
>
> I re-verified every item against the code and re-ran the full suites on this branch:
>
> | Check | Result |
> | --- | --- |
> | Client suite (22 files, 89 tests) | 89/89 passed |
> | Server suite (16 files, 138 tests) | 138/138 passed |
> | `pnpm build` | clean |
> | **B3** role gate + 403 for staff/admin | `requester-context.ts:25-33`, guarded `where` at `tickets.ts:129-132`, covered by `authorization.api.test.ts:291-358` |
> | **B1/B2** retirement strategy documented | ADR-0009 (session-first, header ignored when session present, fallback for Lab 2 compat) |
> | **B4** logout | `AuthContext.tsx:118-126`, covered by `AppRoutes.test.tsx` |
> | **W1–W6** | all resolved (guards wired in `App.tsx`, 401s, staff attachment download, `/remove` alias, 8-status filter) |
> | Polish items | login redirect, dropdown outside-click/Escape, ChangePassword a11y, `--zen-*` tokens |
>
> **1. Attachment content: Administrator access is outside the contract matrix.** Code grants `ADMINISTRATOR` download on any ticket (`attachments.ts:305`) but the contract authorizes **Requester / Staff** only (`specification.md:319`; ADR-0008). Restrict the session path to `IT_STAFF` + `REQUESTER`, or update the spec + ADR-0008 so code and contract agree.
>
> **2. `tests.md` traceability.** The new `AppRoutes.test.tsx` and the new authorization cases (staff/admin 403, anonymous 401, staff attachment download, W6 status filter) have no rows in `docs/lab-03/tests.md`. Land them in the same commit.
>
> **Minor (non-blocking):** the reply says spoofing is "prevented" — strictly the `X-Requester-Id` fallback remains reachable via `/select-requester` for Lab 2 test compat (documented in ADR-0009); worth wording it as *retained* rather than *eliminated*. oxlint fast-refresh warnings and `ChangePassword.tsx:42` redundant condition are cosmetic.
>
> Once item 1 (and ideally item 2) land, I'm happy to approve.

**Status: pending partner fixes for items 1–2 (awaiting re-review, 2026-09-19).**

---

### Issue 17: Authentication UI

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

---

### Issue 18: Requester Regression

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

---

### Issue 19: IT Staff Ticket Queue

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

---

### Issue 20: IT Staff Ticket Detail

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

---

### Issue 21: Administrator User Management

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

---

### Issue 22: Comprehensive Testing

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

---

### Issue 23: Release, Polish & Submission Prep

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*