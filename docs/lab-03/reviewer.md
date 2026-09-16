# Lab 3 — Peer Review Record

**Author:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  
**Peer reviewer:** Theeraphat Jaingam — 67070501063 — GitHub: @thrxpt

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #65 | feature/14-sprint3-engineering-contract | approved |
| #66 | feature/15-data-foundation | approved (merged 2026-09-15) |
| #67 | feature/16-auth-api-middleware | changes requested (fixes committed, awaiting re-review) |
|  | feature/17-auth-ui-login-change-password |  |
|  | feature/18-requester-regression |  |
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

**Pull Requests URL:**

Reviewer comment:

> *(paste comment text here)*

How I responded:

> *(paste response text here)*

Reviewer approved comment:

> *(paste approved text here)*

---

### feature/18-requester-regression

**Pull Requests URL:**

Reviewer comment:

> *(paste comment text here)*

How I responded:

> *(paste response text here)*

Reviewer approved comment:

> *(paste approved text here)*

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

### Issue 15: Data Foundation

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

---

### Issue 16: Authentication API & Middleware

**Pull Requests URL:**

My comment:

> *(paste comment text here)*

Partner's response:

> *(paste response text here)*

My approved comment:

> *(paste approved text here)*

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