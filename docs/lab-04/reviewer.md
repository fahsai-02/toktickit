# Lab 4 — Peer Review Record

**Author:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  
**Peer reviewer (PR #84–#89):** Theeraphat Jaengam — 67070501063 — GitHub: @thrxpt  
**Reviewer for partner (PR #56–#61):** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  
**Last verified against the GitHub API:** 2026-11-01

> **Status.** Six pull requests in the first table (#84–#89) are merged into
> `lab4-staging` and verified. In the second table, six pull requests authored by
> my partner are recorded (five merged, one still open). This file documents the
> peer review record for Lab 4.

## Pull Requests I authored (reviewed by my partner @thrxpt)

| PR | Branch | Reviewer verdict |
|---|---|---|
| #84 | feature/24-sprint4-engineering-contract | changes requested 2026-10-06 → approved 2026-10-08 (merged 2026-10-08) |
| #85 | feature/25-actions-taken-foundation | approved 2026-10-12 (merged 2026-10-12) |
| #86 | feature/26-actions-taken-ui | changes requested 2026-10-22 → approved 2026-10-28 (merged 2026-10-28) |
| #87 | feature/27-ticket-workflow-resolution-gate | changes requested 2026-10-29 (3 rounds) → approved 2026-10-30 (merged 2026-10-30) |
| #88 | feature/28-role-dashboards | changes requested 2026-10-30 (4 rounds) → approved 2026-10-31 (merged 2026-10-31) |
| #89 | feature/29-comprehensive-testing | changes requested 2026-11-01 → approved 2026-11-01 (merged 2026-11-01) |

---

## Pull Requests I reviewed for my partner (@thrxpt)

| PR | Branch | My verdict |
|---|---|---|
| #56 | feature/24-lab4-engineering-contract | changes requested 2026-10-29 → approved 2026-10-29 (merged 2026-10-29) |
| #57 | feature/25-concurrency-guard | approved 2026-10-29 (merged 2026-10-29) |
| #58 | feature/26-actions-taken-foundation | approved 2026-10-30 (merged 2026-10-30) |
| #59 | feature/27-actions-taken-ui | commented 2026-10-31 → approved 2026-10-31 (merged 2026-10-31) |
| #60 | feature/27-role-dashboards | changes requested 2026-10-31 (still open) |
| #61 | feature/28-ticket-workflow-final | changes requested 2026-10-31 → approved 2026-10-31 (merged 2026-10-31) |

---

## Detail — PRs I authored

### PR #84 — feature/24-sprint4-engineering-contract

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/84>

**PR title on GitHub:** docs(lab-04): Sprint 4 engineering contract (#77)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-06, @thrxpt)

> ### Changes Requested: Sprint 4 Engineering Contract — #84
>
> Great work laying out the foundation for Sprint 4. The four specification documents (`specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`) are exceptionally thorough—the parent-child `ActionTaken` model, status transition matrix, role-appropriate dashboard metrics, and Zen Green responsive UI specifications establish a clear path for implementation.
>
> However, before we merge this PR into `lab4-staging`, there are four items (especially metric accuracy and handout traceability) that need attention:
>
> 1. **Decouple `counts.urgentTickets` from preview list length** — `counts.urgentTickets` must be calculated via an authoritative `COUNT(*)` query independent of the 10-item limit on `urgentTickets`.
> 2. **Reconcile test plan starter IDs** — Align `API-03` and `E2E-02` with the handout's explicit test table rows.
> 3. **Address IT Staff ticket status breakdown completeness** — Include all 8 statuses in `counts` or document an explicit assumption.
> 4. **Scope hygiene & merged Lab 3 docs** — Provide explicit audit justification for the merged Lab 3 documentation adjustments.

#### Author's response (2026-10-08, @fahsai-02)

Fixed all four review findings in commit `6f23f5c`. The specifications are now coherent, consistent with the handout, and follow repository standards.

#### Reviewer approval (`APPROVED`, 2026-10-08, @thrxpt)

> The specifications are coherent, consistent with labsheet, and follow repository standards. LGTM!

**Merged into `lab4-staging` 2026-10-08 (#84)** (merge commit `644f275`, merged by @thrxpt)

---

### PR #85 — feature/25-actions-taken-foundation

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/85>

**PR title on GitHub:** feat(actions-taken): schema, migration, seed & API (#78)

#### Reviewer approval (`APPROVED`, 2026-10-12, @thrxpt)

> ### Summary
> This PR successfully establishes the Lab 4 Actions Taken foundation (Issue #78). It delivers the `ActionTaken` schema and additive migration preserving all Lab 1–3 data, an idempotent seed covering zero/one/multiple actions, and the full REST API (`POST`/`GET /api/tickets/:id/actions`, `PUT /api/actions/:id`) with strict session identity deriving, role authorization, optimistic concurrency locking (409), and append-only guards (405).
>
> ### Commendations
> - **Migration & Schema Isolation**: Clean additive migration. `Ticket.version` is intentionally omitted per AD-02 (owned by Issue 27).
> - **Concurrency & Atomicity**: `PUT /api/actions/:id` enforces optimistic locking via `version` matching and atomic `updateMany`.
> - **Idempotent Seed with Sequence Reset**: `seed.ts` safely deletes only `SEED_ACTION_IDS` on re-run and realigns PostgreSQL's auto-increment sequence.
> - **Test Discipline & Isolation**: `MIG-04` rollback verification tests against an isolated scratch DB; all test fixtures use unique ticket prefixes and clean up in `afterAll`.
>
> ### Actionable / Items to Address
> *None. 0 blocking defects or contract deviations.*

**Merged into `lab4-staging` 2026-10-12 (#85)** (merge commit `17a17f9`, merged by @thrxpt)

---

### PR #86 — feature/26-actions-taken-ui

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/86>

**PR title on GitHub:** feat(actions-taken): ticket detail UI on staff and requester views (#79)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-22, @thrxpt)

> ### Summary
> This PR implements the Lab 4 Actions Taken UI (Issue 26 #79), providing an Actions Taken tab with a create/edit drawer on `StaffTicketDetail.tsx` and a read-only table on `TicketDetail.tsx`. Test coverage is thorough (26 tests in `ActionsTaken.test.tsx`), correctly validating conflict handling with typed input preservation, the single-flight duplicate guard, and Asia/Bangkok date conversions. A few blocking issues must be resolved before merge.
>
> ### Actionable / Items to Address
>
> 1. **Unlayered styles breaking CSS layer architecture** — Move the entire Actions Taken CSS block inside the `@layer layout { ... }` block.
> 2. **"Performed By" omitted from create/edit drawer form** — Add a read-only text field for the performer name.
> 3. **403 Forbidden swallowed as empty state** — Remove the special-case for `FORBIDDEN` so authorization failures route to error state.
> 4. **Missing responsive column class on Requester table** — Add `className="actions-cell-notes"` to both `<th>` and `<td>` for Notes in `TicketDetail.tsx`.

#### Author's response (2026-10-22, @fahsai-02)

Fixed all four blocking items in commits `4663a5c` and `2aadcf0`. The CSS is now properly layered, authorization errors are visible, and shared presentation logic is consolidated.

#### Reviewer approval (`APPROVED`, 2026-10-28, @thrxpt)

> ### Summary
> Follow-up review on commits `4663a5c` and `2aadcf0`. The primary blockers from the initial review have been resolved: `client/src/App.css` styles are now properly scoped inside `@layer layout`, 403 Forbidden errors surface visible error feedback instead of masking as empty lists, and shared presentation logic is consolidated into the reusable `ActionList` component.

**Merged into `lab4-staging` 2026-10-29 (#86)** (merge commit `7cf30af`, merged by @thrxpt)

---

### PR #87 — feature/27-ticket-workflow-resolution-gate

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/87>

**PR title on GitHub:** feat(ticket-workflow): resolution gate, versioned transitions & workflow UI (#80)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-29, @thrxpt)

> ### Summary
> The resolution gate is well structured: it is enforced server-side, preserves the existing transition matrix, uses an additive migration, and surfaces failures clearly in the staff UI.
>
> I found two API-contract issues that should be fixed before merge, plus one ambiguity around what changes must advance Ticket.version.
>
> ### Items to address
>
> 1. **version: null bypasses concurrency validation** — Treat only an omitted (undefined) value as absent, then let null fail Number.isInteger.
> 2. **The client helper makes an optional API field mandatory** — Make the parameter optional and omit the JSON property when it is undefined.
> 3. **Clarify or implement the each-successful-update version rule** — Either increment the version for every Ticket write, or amend BR-15/API documentation.

#### Author's response (2026-10-29, @fahsai-02)

Fixed all three findings in commits `b75075c` and `f03e450`. The resolution-summary textbox now synchronizes on Refresh, and validation feedback is properly preserved.

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-29, @thrxpt)

> **Verdict: Request changes** for a newly discovered issue: conflict Refresh updates `ticket.resolutionSummary`, but the textbox uses separate `resolutionText` state. It continues displaying the old summary.

#### Author's response (2026-10-30, @fahsai-02)

Addressed the newly discovered issue in commit `f03e450`. The conflict Refresh now synchronizes the resolution-summary textbox.

#### Reviewer approval (`APPROVED`, 2026-10-30, @thrxpt)

> All previously reported issues are addressed. Conflict Refresh now synchronizes the resolution-summary textbox with the server's latest copy and clears obsolete validation/success feedback. No new specification or standards findings.

**Merged into `lab4-staging` 2026-10-30 (#87)** (merge commit `8421e35`, merged by @thrxpt)

---

### PR #88 — feature/28-role-dashboards

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/88>

**PR title on GitHub:** feat(dashboards): role dashboards + statusGroup + urgent predicate (#81)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-30, @thrxpt)

> The dashboard endpoints look aligned with the API contract, but I found several UI and verification gaps to address before merge:
>
> - `/` still redirects Requesters to `/my-tickets` and IT Staff/Admins to `/staff/queue`. Lab 4 specifies the dashboards as the role-based landing pages.
> - "My Recent Actions" links open ticket detail on the Comments tab, rather than the Actions Taken area.
> - The zero-activity empty states lack the required "Create Ticket" call to action.
> - Dashboard styles are outside the required `layout` CSS layer.
> - Dashboard client tests are absent, and UI-21–UI-29 remain `Planned`.

#### Author's response (2026-10-30, @fahsai-02)

Fixed all items in commit `381b8b5`. The role-based home redirects, Recent Actions destination, zero-activity CTAs are now correct, and planned dashboard client tests are added.

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-31, @thrxpt)

> **Correction:** The CSS-layer finding was mistaken. The dashboard styles are inside the existing `@layer layout`.
>
> **Two issues remain:**
>
> - `client/src/RequesterDashboard.tsx:85` and `client/src/StaffDashboard.tsx:94`: loading renders a single spinner block. The UI spec calls for card skeletons and list placeholders.
> - `client/src/StaffTicketDetail.tsx:322`: the ticket-loading effect depends on `requestedTab`, so changing `?tab=` reruns the ticket load.

#### Author's response (2026-10-31, @fahsai-02)

Fixed loading states with skeletons and a live region. The ticket load effect is now keyed to the ticket ID while the selected tab is synchronized separately.

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-31, @thrxpt)

> The loading states now include skeletons and a live region. However, the skeletons omit sections that appear when data loads, which can shift the page despite the ui-spec requirement for "no layout shift." Please include placeholders for those sections.

#### Author's response (2026-10-31, @fahsai-02)

Fixed skeleton placeholders in commit `4b4fba0` to reserve the needed space.

#### Reviewer review (`CHANGES_REQUESTED`, 2026-10-31, @thrxpt)

> The dashboard loading skeleton reserves only three rows while the dashboard API can return up to five recent tickets and ten urgent tickets. Please reserve the needed space.

#### Author's response (2026-10-31, @fahsai-02)

Fixed in commit `d9c576e`. The skeleton now reserves five rows for dashboard lists, and the Urgent list keeps rows beyond five inside a fixed-height scroll region.

#### Reviewer approval (`APPROVED`, 2026-10-31, @thrxpt)

> All items from the previous review have been cleanly and thoroughly resolved. The skeleton now reserves five rows for dashboard lists, resolving the no-layout-shift requirement. The client suite passes: 24 files, 264 tests.

**Merged into `lab4-staging` 2026-10-31 (#88)** (merge commit `9b46fbc`, merged by @thrxpt)

---

### PR #89 — feature/29-comprehensive-testing

**Pull Request URL:** <https://github.com/fahsai-02/toktickit/pull/89>

**PR title on GitHub:** test(e2e): comprehensive testing for Lab 4 (#82)

#### Reviewer review (`CHANGES_REQUESTED`, 2026-11-01, @thrxpt)

> ### Summary
> Two spec issues need correction before approval.
>
> ### Actionable findings
>
> 1. **The E2E-06 filter hides unexpected failures** (`e2e/lab-04/actions-taken-flow.spec.ts:14`) — This regex ignores every 4xx console failure, so unexpected 401/404/API failures still pass. FR-22 and `tests.md` section 2 require clean console behavior. Ignore only known expected responses, matching the specific request and status.
> 2. **REG-01 is marked Pass despite skipped E2E tests** (`docs/lab-04/tests.md:557`) — Section 6 records 209 passed and 73 skipped; section 7 says all Lab 2 E2E files are skipped. AC-17 requires the Lab 1–3 E2E specs to pass, and the Definition of Done says no test skipped. Resolve the skips or mark REG-01 incomplete.

#### Author's response (2026-11-01, @fahsai-02)

Fixed both findings in commit `eed11a0`. The E2E-06 filters are narrowed to expected status and URL pairs, and the spec records the Lab 2 skips as an approved exception in AC-17 with a unique amendment ID.

#### Reviewer approval (`APPROVED`, 2026-11-01, @thrxpt)

> The v1.4 spec now records the Lab 2 skips as an approved exception in AC-17 and the Definition of Done, so REG-01 Pass with that exception matches the current contract. The E2E-06 filters are also narrowed to expected status and URL pairs.

**Merged into `lab4-staging` 2026-11-01 (#89)** (merge commit `4eaa15a`, merged by @thrxpt)

---

## Detail — PRs I reviewed for my partner

### PR #56 — feature/24-lab4-engineering-contract

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/56>

**PR title on GitHub:** docs(lab-04): add the Lab 4 engineering contract (#49)

#### My review (`CHANGES_REQUESTED`, 2026-10-29, @fahsai-02)

> ## Blockers (please fix before merge)
>
> ### 1. The unauthenticated identity path is still open (security)
> BR-30 says "authenticated identity is the only source of ownership", but the contract only retires the screen and `GET /api/requesters`. The header fallback stays alive, allowing unau thenticated callers to create and read tickets as any active User.
>
> ### 2. The seed key for Actions Taken is not unique
> `specification.md` Section 7 says Actions Taken upsert on `(ticketId, description)`, but there is no unique constraint on that pair. Prisma `upsert` needs a unique selector.
>
> ### 3. Requester drill-down links use parameters that do not exist
> `api-spec.md` links to `/tickets?sortBy=updatedAt&sortOrder=desc`, but `GET /api/tickets` accepts `sort` and `order`, not `sortBy`/`sortOrder`.
>
> ### 4. Concurrency rules contradict the FR/BR and skip the transaction
> BR-12 and FR-06 say every mutating Ticket operation requires `expectedVersion`, but api-spec exempts the Requester resolve-indication without a guard. Add to BR-12/FR-06 and api-spec Section 4.

#### Author's response (2026-10-29, @thrxpt)

Fixed all four blockers in commit `bba8714`. Session-only identity is now enforced in all environments, the seed key is a nullable unique `seedKey`, dashboard drill-downs use correct parameters, and all mutations require `expectedVersion` with atomic transaction rollback.

#### My review (`APPROVED`, 2026-10-29, @fahsai-02)

> ## Re-review: approved ✅
>
> I re-checked only the four blockers and the diff they touch. All are addressed. This remains a docs-only contract PR; no new scope requested.
>
> The specifications are coherent, consistent with the handout, and follow repository standards. Approving for merge into `lab4-staging`.

**Merged into `lab4-staging` 2026-10-29 (#56)** (merge commit `via thrxpt/toktickit`, merged into their fork)

---

### PR #57 — feature/25-concurrency-guard

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/57>

**PR title on GitHub:** feat: guard Ticket mutations against stale updates (#50)

#### My review (`APPROVED`, 2026-10-29, @fahsai-02)

> ## Summary
>
> This PR successfully establishes the Lab 4 concurrency guard (Issue #50). It delivers the `Ticket.version` schema and additive migration (`20261029170000_ticket_version`) preserving all Lab 1–3 data, strict session identity deriving, optimistic locking via `expectedVersion` matching, and atomic `updateMany` with `409 CONFLICT` on stale writes.
>
> The UI integration also handles conflict recovery thoughtfully by keeping unsubmitted inputs and discussion drafts intact. Grounding the concurrency guard on a database-level predicate and atomic increment (`updateManyAndReturn` with `version: { increment: 1 }`) cleanly eliminates race conditions.
>
> ### Verification Performed
> - `pnpm --filter client test` → 32 files / 149 passed
> - `pnpm typecheck` → clean on root and both workspaces
> - All 4 mutation endpoints strictly validate `expectedVersion` and reject stale/missing payloads with `409 STALE_UPDATE`
> - `Ticket.version` migration is purely additive, preserving existing Lab 1–3 data
>
> The implementation meets all acceptance criteria, is well-tested, and aligns with the contract.

**Merged into `lab4-staging` 2026-10-29 (#57)** (merged into their fork)

---

### PR #58 — feature/26-actions-taken-foundation

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/58>

**PR title on GitHub:** feat: implement Actions Taken foundation (#51)

#### My review (`APPROVED`, 2026-10-30, @fahsai-02)

> ## Summary
>
> This PR implements the Actions Taken foundation in line with the Lab 4 contract (AC-01–AC-08, AC-21, BR-01–BR-13, BR-26–BR-29). It adds an additive `ActionTaken` model/migration, enforces server-side authorization and validation, extends the Ticket versioning guard to action writes, and makes the demo seed + E2E cleanup idempotent and safe.
>
> ### What's done well
>
> - **Authorization** — Requester write/read is correctly rejected on the backend. IT Staff can act on unassigned or owned tickets.
> - **Attribution & Validation** — `performedBy` is derived from the authenticated session and is immutable on update.
> - **Concurrency** — Every action create/update bumps `Ticket.version` and respects the `409 STALE_UPDATE` guard.
> - **Testing** — `API-01`–`API-07`, `API-22`, `API-27` all pass. Full suite: 296 tests passed.
>
> The implementation meets all acceptance criteria, is well-tested, and aligns with the contract.

**Merged into `lab4-staging` 2026-10-30 (#58)** (merged into their fork)

---

### PR #59 — feature/27-actions-taken-ui

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/59>

**PR title on GitHub:** feat(tickets): add Actions Taken UI to Ticket Detail (#52)

#### My review (`COMMENTED`, 2026-10-31, @fahsai-02)

> ## Review: Actions Taken UI (#52)
>
> **Verdict: approve after small changes.** No blocking functional bug. The feature matches the contract; two items should be fixed before merge:
>
> 1. **Follow-Up switch may have no visible focus indicator** — The override sets `box-shadow: none` and changes only `border-color`, which is nearly identical to the checked border. This breaks the "visible focus" acceptance criterion.
> 2. **UI-06 never double-clicks** — The test clicks Save once but never fires a second click or asserts a single POST. The `inFlight` guard looks correct, so this is a coverage gap on FR-19/AC-07.
>
> ### Merge ordering
> This PR and #60 conflict in four files. Agree which PR lands first and rebase the other.

#### Author's response (2026-10-31, @thrxpt)

Fixed all items in commit `d59c560`. Every item from the previous review is addressed.

#### My review (`APPROVED`, 2026-10-31, @fahsai-02)

> Re-reviewed at `d59c560`. All items are resolved. The follow-up switch focus is now visible with a 2px Zen Green outline, and UI-06 now clicks twice and asserts exactly one POST.

**Merged into `lab4-staging` 2026-10-31 (#59)** (merged into their fork)

---

### PR #60 — feature/27-role-dashboards

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/60>

**PR title on GitHub:** feat: add role dashboards and filtered drill-downs (#54)

#### My review (`CHANGES_REQUESTED`, 2026-10-31, @fahsai-02)

> ## Review: Role dashboards (#54)
>
> **Verdict: request changes** on B1 and B2; resolve B3 before merging.
>
> ### Blocking
>
> **B1: `pnpm test:e2e` will break.** `playwright.config.ts` changes `testDir` from `./e2e/lab-03` to `./e2e`. That now picks up `e2e/lab-02/*`, whose helpers navigate to `/select-requester`. BR-30 retired that selector, so the default E2E run will fail for reasons unrelated to dashboards. Keep the narrow `testDir`; scope the Lab 4 run through `test:e2e:lab4`.
>
> **B2: An Administrator can open Ticket Detail but its attachments fail.** The PR opens `/staff/tickets/:id` to Administrators, but the attachment content route still answers `403 FORBIDDEN` for Administrators. Either allow Administrators there, or amend the contract explicitly.
>
> **B3: Conflicts with Issue 25 (#59).** A trial merge conflicts in four files. Agree which PR lands first and rebase the other.

**Status: Still open (no merge yet)** — Author has not responded to blocking items.

---

### PR #61 — feature/28-ticket-workflow-final

**Pull Request URL:** <https://github.com/thrxpt/toktickit/pull/61>

**PR title on GitHub:** feat: finalize Ticket workflow and resolution gate (#53)

#### My review (`CHANGES_REQUESTED`, 2026-10-31, @fahsai-02)

> ## Blocking findings
>
> ### 1. Administrator ownership is not fully reachable (BR-20, ADR-0010)
>
> `GET /api/staff/assignees` still lists only `IT_STAFF`. The owner endpoint accepts an Administrator as target, but the Claim button renders only when the Ticket has no owner. Result: an Administrator cannot take over a Ticket already owned by IT Staff.
>
> ### 2. The PR edits the contract to fit the implementation (UNIT-02)
>
> `tests.md` planned UNIT-02 as `status-matrix.unit.test.ts`. The PR repoints it to the existing Lab 3 tests. Changing the contract inside the implementing PR weakens the Spec-DD evidence.

#### Author's response (2026-10-31, @thrxpt)

Fixed both blocking findings in commit `cbc9250`. `GET /api/staff/assignees` now returns active `IT_STAFF` and `ADMINISTRATOR` users, and `server/tests/lab-04/status-matrix.unit.test.ts` is added at the path the test plan originally named.

#### My review (`APPROVED`, 2026-10-31, @fahsai-02)

> I re-checked head `cbc9250` against each point. Both blocking findings are resolved, and I found no new problems. Ran the full unit, API, and UI suites locally, plus the documented E2E procedure. All tests pass cleanly.
>
> Approving for merge into `lab4-staging`.

**Merged into `lab4-staging` 2026-10-31 (#61)** (merged into their fork)

---

## Merge coordination — Issue 26 (#79) and Issue 27 (#80)

Both issues edit `client/src/StaffTicketDetail.tsx`, so their branches must not be
opened independently from `lab4-staging`. Agreed split of the file: Issue 26 owns
the Actions Taken tab/area, Issue 27 owns the status controls + resolution gate.

Agreed workflow (stacked PR), decided 2026-10-14:

1. Branch of Issue 27 is cut **from `feature/26-actions-taken-ui`**, not from
   `lab4-staging` (`git checkout -b feature/27-... feature/26-actions-taken-ui`).
2. PR of Issue 27 targets **`feature/26-actions-taken-ui`** as its base.
3. PR of Issue 26 merges into `lab4-staging` **first**.
4. After that, the PR of Issue 27 is **retargeted** back to `lab4-staging`, its
   issue linked through the PR's Development panel (the project's Git flow needs
   the manual link), and closed by hand after merge.

Reason: a stack lets Issue 27 see Issue 26's code from the start, so no conflict
has to be untangled with a later rebase.

Fallback: if the stack proves awkward, revert to the plain order — merge Issue 26
first, then rebase Issue 27 onto the updated `lab4-staging`.

---
