# Lab 3 Test Plan and Results

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens |
| **Version** | v1.1 — Final. Plan approved 2026-09-10; every status below is a verified result |
| **Date** | Plan 2026-09-10 · final results 2026-09-28 |
| **Traceability source** | `specification.md` v1.0 AC-01..15 · `api-spec.md` v1.1 · `ui-spec.md` v1.0 |

---

## 1. Test Strategy

Seven test levels, matching the handout's required coverage:

1. **Unit (server):** pure logic without DB/HTTP — password validation rules, ticket-number generator (from Lab 2).
2. **API / integration (server):** Supertest against the real Express app + seeded PostgreSQL; asserts status codes, error envelopes, session auth, role-based access, ownership isolation, status transitions, persistence side effects.
3. **UI component (client):** Vitest + Testing Library in jsdom; mocks the API layer; asserts user-visible behavior, states, and client-side validation.
4. **UI style (client):** automated assertions that Zen Green tokens/classes are actually applied.
5. **Responsive:** Playwright at 1440×900, 820×1180, 375×844 — layout integrity, no horizontal scroll on mobile, screenshots for the visual checklist.
6. **E2E (Playwright):** full user journeys against `docker compose` stack (API 5000 + web 5173).
7. **Migration/Regression:** verifies Lab 2 data survives migration, FK correctness, password hashing.

Test files live where the labsheet Section 12 requires.

## 2. Test Cases and Final Status

Every case below was written before implementation and has since been executed against the real app, so the `Final Status` column is a verified result from the run recorded in section 6. Nothing is still outstanding; the deliberate exclusions are listed in section 7.

### Unit (server)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | Unit | BR-08 | Password hash verification | Stored hashes start with `$2`; bcrypt.compare succeeds for every seeded account | `migration-regression.api.test.ts` (covered by MIG-01) | Pass |
| UNIT-02 | Unit | FR-07, AC-02 | New-password validation rules | Rejects <8 chars, missing uppercase, missing lowercase, missing digit, missing special char; accepts valid password | `server/tests/lab-03/password-validation.unit.test.ts` | Pass |
| UNIT-03 | Unit | BR-12 | Status-transition matrix validation | Given a current status and target status, correctly determines if the transition is permitted | `server/tests/lab-03/status-transitions.unit.test.ts` | Pass |

### API (server/tests/lab-03)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API | AC-01, FR-01 | Valid login | 200; session cookie set; user identity returned (id, name, email, role, mustChangePassword) | `auth.api.test.ts` | Pass |
| API-02 | API | AC-05, FR-02 | Invalid credentials | 401 with generic "Invalid email or password" | `auth.api.test.ts` | Pass |
| API-03 | API | AC-06, FR-03 | Inactive account login | 401 with same generic message (does not reveal account existence) | `auth.api.test.ts` | Pass |
| API-04 | API | FR-04 | Logout | 200; subsequent protected calls return 401 | `auth.api.test.ts` | Pass |
| API-05 | API | AC-01, FR-05 | Current user | 200 with user identity when authenticated; 401 when not | `auth.api.test.ts` | Pass |
| API-06 | API | AC-02, FR-07 | Change password — valid | 200; mustChangePassword cleared; new password works for login | `auth.api.test.ts` | Pass |
| API-07 | API | FR-07 | Change password — wrong current | 400 with `fields.currentPassword` error | `auth.api.test.ts` | Pass |
| API-08 | API | FR-07 | Change password — too short | 400 with specific validation message | `auth.api.test.ts` | Pass |
| API-09 | API | FR-07 | Change password — missing uppercase | 400 with specific validation message | `auth.api.test.ts` | Pass |
| API-10 | API | FR-07 | Change password — missing lowercase | 400 with specific validation message | `auth.api.test.ts` | Pass |
| API-11 | API | FR-07 | Change password — missing digit | 400 with specific validation message | `auth.api.test.ts` | Pass |
| API-12 | API | FR-07 | Change password — missing special char | 400 with specific validation message | `auth.api.test.ts` | Pass |
| API-13 | API | FR-07 | Change password — confirmation mismatch | 400 with `fields.confirmPassword` error | `auth.api.test.ts` | Pass |
| API-14 | API | AC-03, FR-13 | Create ticket ignores client-supplied requesterId | Authenticated as user A; send `requesterId: B` in body; ticket is owned by A | `authorization.api.test.ts` | Pass |
| API-15 | API | AC-03, FR-15 | Requester ownership on list | User A sees only A's tickets; 403/empty for B's tickets | `authorization.api.test.ts` | Pass |
| API-16 | API | AC-03, FR-15 | Requester ownership on detail | User A requests B's ticket → 403 | `authorization.api.test.ts` | Pass |
| API-17 | API | AC-04, FR-35 | Requester forbidden from internal notes | Requester calls GET/POST /api/staff/tickets/:id/notes → 403 | `comments-notes.api.test.ts` | Pass |
| API-18 | API | AC-13, FR-47 | Non-admin forbidden from admin endpoints | Requester calls GET /api/admin/users → 403 | `authorization.api.test.ts` | Pass |
| API-19 | API | AC-13, FR-47 | Non-staff forbidden from staff endpoints | Requester calls GET /api/staff/tickets → 403 | `staff-queue.api.test.ts` | Pass |
| API-20 | API | FR-14 | Ticket creation initializes itPriority | Created ticket has `itPriority` = `requestedPriority` | `authorization.api.test.ts` | Pass |
| API-21 | API | AC-08, FR-22 | Staff queue — basic retrieval | 200 with paginated ticket list | `staff-queue.api.test.ts` | Pass |
| API-22 | API | AC-08, FR-22 | Staff queue — search by ticket number | Matching tickets returned | `staff-queue.api.test.ts` | Pass |
| API-23 | API | AC-08, FR-22 | Staff queue — search by summary | Matching tickets returned | `staff-queue.api.test.ts` | Pass |
| API-24 | API | AC-08, FR-22 | Staff queue — filter by status | Only matching status returned | `staff-queue.api.test.ts` | Pass |
| API-25 | API | AC-08, FR-22 | Staff queue — filter by priority | Only matching priority returned | `staff-queue.api.test.ts` | Pass |
| API-26 | API | AC-08, FR-22 | Staff queue — filter by category | Only matching category returned | `staff-queue.api.test.ts` | Pass |
| API-27 | API | AC-08, FR-22 | Staff queue — filter by owner (specific) | Only tickets owned by that user returned | `staff-queue.api.test.ts` | Pass |
| API-28 | API | AC-08, FR-22 | Staff queue — filter "Unassigned" | Only tickets with no owner returned | `staff-queue.api.test.ts` | Pass |
| API-29 | API | AC-08, FR-22 | Staff queue — filter "Assigned to me" | Only tickets owned by current user returned | `staff-queue.api.test.ts` | Pass |
| API-30 | API | AC-08, FR-23 | Staff queue — default ordering | Default is updatedAt desc | `staff-queue.api.test.ts` | Pass |
| API-31 | API | AC-08, FR-22 | Staff queue — sort by itPriority | Sorting by IT Priority works asc/desc | `staff-queue.api.test.ts` | Pass |
| API-32 | API | AC-08, FR-24 | Staff queue — invalid params | Unknown sortBy, non-numeric page, pageSize out of range → 400 | `staff-queue.api.test.ts` | Pass |
| API-33 | API | AC-08 | Staff queue — empty results | Filters matching nothing → empty data array with total=0 | `staff-queue.api.test.ts` | Pass |
| API-34 | API | FR-26 | Staff ticket detail — full payload | 200 with all fields including owner, resolutionSummary, requesterIndicatedResolved, counts | `staff-ticket-detail.api.test.ts` | Pass |
| API-35 | API | FR-27 | Claim ticket | 200; owner set to current user | `staff-ticket-detail.api.test.ts` | Pass |
| API-36 | API | FR-27 | Claim already-claimed ticket | 409 if already claimed by self | `staff-ticket-detail.api.test.ts` | Pass |
| API-37 | API | FR-28 | Assign ticket | 200; owner changed to specified user | `staff-ticket-detail.api.test.ts` | Pass |
| API-38 | API | FR-28 | Assign to non-existent user | 404 | `staff-ticket-detail.api.test.ts` | Pass |
| API-39 | API | FR-29 | Set IT Priority | 200; itPriority updated | `staff-ticket-detail.api.test.ts` | Pass |
| API-40 | API | FR-29 | Set invalid IT Priority | 400 | `staff-ticket-detail.api.test.ts` | Pass |
| API-41 | API | AC-09, FR-30 | Valid status transition (NEW→OPEN) | 200; currentStatus updated | `staff-ticket-detail.api.test.ts` | Pass |
| API-42 | API | AC-09, FR-30 | Invalid status transition (OPEN→RESOLVED) | 400 with BUSINESS_RULE_VIOLATION | `staff-ticket-detail.api.test.ts` | Pass |
| API-43 | API | AC-09, FR-30 | Invalid status transition (NEW→CANCELLED) | 400 (not permitted from NEW) | `staff-ticket-detail.api.test.ts` | Pass |
| API-73 | API | AC-09, FR-30, BR-12 | Valid status transition (CLOSED→REOPENED) | 200; currentStatus updated to REOPENED | `staff-ticket-detail.api.test.ts` | Pass |
| API-44 | API | FR-31 | Save resolution summary — valid | 200; resolutionSummary stored | `staff-ticket-detail.api.test.ts` | Pass |
| API-45 | API | FR-31, BR-19 | Save resolution summary — empty/whitespace | 400 | `staff-ticket-detail.api.test.ts` | Pass |
| API-46 | API | FR-31, BR-19 | Save resolution summary — over length | 400 | `staff-ticket-detail.api.test.ts` | Pass |
| API-74 | API | FR-37 | Change ticket category | 200; category updated to another active category; 400/404 for invalid/unknown id | `staff-ticket-detail.api.test.ts` | Pass |
| API-75 | API | FR-39 | Staff user list for owner dropdown | 200 with active IT_STAFF + ADMINISTRATOR (name-asc); Requester forbidden | `staff-ticket-detail.api.test.ts` | Pass |
| API-47 | API | FR-32 | Post Public Comment (staff) | 201 with author and timestamp | `comments-notes.api.test.ts` | Pass |
| API-48 | API | FR-32 | List Public Comments (staff) | 200, newest-first | `comments-notes.api.test.ts` | Pass |
| API-49 | API | FR-33 | Create Internal Note (staff) | 201 with author and timestamp | `comments-notes.api.test.ts` | Pass |
| API-50 | API | FR-33 | List Internal Notes (staff) | 200, newest-first | `comments-notes.api.test.ts` | Pass |
| API-51 | API | AC-04, FR-35 | Internal Notes — Requester forbidden | 403 | `comments-notes.api.test.ts` | Pass |
| API-52 | API | FR-18, FR-34 | Append-only: PUT on comments | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Pass |
| API-53 | API | FR-18, FR-34 | Append-only: DELETE on comments | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Pass |
| API-54 | API | FR-34 | Append-only: PUT on notes | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Pass |
| API-55 | API | FR-34 | Append-only: DELETE on notes | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Pass |
| API-56 | API | FR-16, BR-15 | Comment content — empty/whitespace | 400 | `comments-notes.api.test.ts` | Pass |
| API-57 | API | FR-16, BR-15 | Comment content — over 2000 chars | 400 | `comments-notes.api.test.ts` | Pass |
| API-58 | API | AC-07, FR-19 | Indicate resolved — toggle set | Sets `requesterIndicatedResolved = true` with timestamp; `currentStatus` unchanged | `comments-notes.api.test.ts` | Pass |
| API-59 | API | AC-07, FR-19 | Indicate resolved — toggle clear | Clears `requesterIndicatedResolved` to false; `currentStatus` unchanged | `comments-notes.api.test.ts` | Pass |
| API-60 | API | AC-10, FR-41 | Admin create user — valid | 201; password hashed; mustChangePassword=true | `users-admin.api.test.ts` | Pass |
| API-61 | API | AC-14, FR-42 | Admin create user — duplicate email | 409 CONFLICT | `users-admin.api.test.ts` | Pass |
| API-62 | API | FR-41 | Admin create user — invalid role | 400 | `users-admin.api.test.ts` | Pass |
| API-72 | API | AC-14, FR-43 | Admin edit user — duplicate email | 409 CONFLICT | `users-admin.api.test.ts` | Pass |
| API-63 | API | FR-41 | Admin create user — weak initial password | 400 with specific validation message | `users-admin.api.test.ts` | Pass |
| API-64 | API | FR-43 | Admin edit user — valid | 200; fields updated | `users-admin.api.test.ts` | Pass |
| API-65 | API | AC-11, FR-45 | Admin self-deactivation | 403 | `users-admin.api.test.ts` | Pass |
| API-66 | API | AC-12, FR-46 | Last admin deactivation | 409 | `users-admin.api.test.ts` | Pass |
| API-67 | API | FR-44, AC-10 | Admin reset password | 200; mustChangePassword set; new password works for login | `users-admin.api.test.ts` | Pass |
| API-68 | API | FR-40 | Admin user list | 200 with all users | `users-admin.api.test.ts` | Pass |
| API-69 | API | FR-40 | Admin user list — search | Search by name/email filters correctly | `users-admin.api.test.ts` | Pass |
| API-70 | API | FR-40 | Admin user list — role filter | Optional role filter narrows results | `users-admin.api.test.ts` | Pass |
| API-71 | API | AC-10 | Admin-created user login round-trip | Create user → login with initial password → mustChangePassword=true → change password → access normal app | `users-admin.api.test.ts` | Pass |

### UI component (client/tests/lab-03)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | UI component | AC-05, FR-02 | Login — invalid credentials | Error banner shown; no redirect; form retains values | `Login.test.tsx` | Pass |
| UI-02 | UI component | AC-01, FR-01 | Login — valid credentials | Redirect to `/` on success; user identity in shell | `Login.test.tsx` | Pass |
| UI-03 | UI component | AC-05 | Login — busy state | Button disabled + spinner during submission | `Login.test.tsx` | Pass |
| UI-04 | UI component | FR-07, AC-02 | Change password — checklist rendering | Password strength checklist shows 3 grouped rules with live checkmarks (at least 8 chars; upper+lower case; number+special char) | `ChangePassword.test.tsx` | Pass |
| UI-05 | UI component | FR-07 | Change password — valid submission | "Continue" button enabled when all rules met; submission succeeds; redirect to `/` | `ChangePassword.test.tsx` | Pass |
| UI-06 | UI component | FR-07 | Change password — validation feedback | Specific rule failures shown in checklist; confirmation mismatch shown | `ChangePassword.test.tsx` | Pass |
| UI-07 | UI component | FR-22, AC-08 | Staff queue — table rendering | Table shows all 9 columns with correct data | `StaffTicketQueue.test.tsx` | Pass |
| UI-08 | UI component | FR-22, AC-08 | Staff queue — search and filter | Search and filter controls work; results update | `StaffTicketQueue.test.tsx` | Pass |
| UI-09 | UI component | FR-22 | Staff queue — pagination | Prev/next/page controls work | `StaffTicketQueue.test.tsx` | Pass |
| UI-10 | UI component | FR-22 | Staff queue — empty/no-results states | Distinct messages for empty vs no-results | `StaffTicketQueue.test.tsx` | Pass |
| UI-11 | UI component | FR-26, FR-37 | Staff detail — ticket info rendering | All meta fields shown with correct editability | `StaffTicketDetail.test.tsx` | Pass |
| UI-12 | UI component | FR-30, FR-38 | Staff detail — status dropdown | Only permitted next states shown in dropdown | `StaffTicketDetail.test.tsx` | Pass |
| UI-13 | UI component | FR-32, FR-33 | Staff detail — comments/notes tabs | Both tabs render; comment/note input present | `StaffTicketDetail.test.tsx` | Pass |
| UI-14 | UI component | FR-40, AC-13 | Admin — user list | Table shows Name, Email, Role, Status, Edit | `UserManagement.test.tsx` | Pass |
| UI-15 | UI component | FR-41 | Admin — create user drawer | Drawer opens; form validates; submission works | `UserManagement.test.tsx` | Pass |
| UI-16 | UI component | FR-43, FR-45, FR-46 | Admin — edit and safety | Edit loads data; self-deactivation blocked; last-admin blocked | `UserManagement.test.tsx` | Pass |
| UI-17 | UI component | AC-03, AC-07, FR-16/18/19 | Requester ticket detail — comments + resolution indicator | Public comments render newest-first with author name + role; empty state; post prepends and clears input; invalid input posts nothing; toggle set/clear calls PUT and updates UI; failure surfaces error | `RequesterTicketComments.test.tsx` | Pass |
| UI-18 | UI component | AC-03, FR-13/18/19 | Client API — authenticated identity, no `requesterId` | Detail/list/comments/indicate-resolved/attachment calls send no `requesterId`; correct method, URL, headers, body | `requester-ticket-api.test.tsx` | Pass |
| UI-19 | UI component | AC-08, AC-09 | Staff client API — all 12 `api.ts` wrappers | Claim/reassign/priority/category/status/comments/notes/resolution requests send correct method, URL, headers, body | `staff-ticket-api.test.tsx` | Pass |

### UI style (client/tests/lab-03)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| STYLE-01 | UI style | ui-spec tokens | Login button styling | Primary green button rendered | `zen-green-lab3-style.test.tsx` | Pass |
| STYLE-02 | UI style | ui-spec tokens | Status badge palette | All 8 statuses map to correct color classes | `zen-green-lab3-style.test.tsx` | Pass |
| STYLE-03 | UI style | ui-spec tokens | Priority badge palette | LOW/MEDIUM/HIGH/URGENT map to correct classes | `zen-green-lab3-style.test.tsx` | Pass |
| STYLE-04 | UI style | ui-spec tokens | Role badge palette | REQUESTER/IT_STAFF/ADMINISTRATOR map to correct classes | `zen-green-lab3-style.test.tsx` | Pass |

### Responsive (Playwright)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| RESP-01..30 | Responsive | AC-15 | 10 screens × 3 viewports (1440×900, 820×1180, 375×844) | Layout intact per breakpoints; screenshots saved; no horizontal scroll at any viewport | `e2e/lab-03/responsive.visual.spec.ts` | Pass |
| RESP-25..30 | Responsive | AC-15 | 2 added Requester screens (My Tickets, Create Ticket) × 3 viewports | Same, plus desktop table → mobile card swap proven rather than assumed | `e2e/lab-03/responsive.visual.spec.ts` | Pass |
| STATE-01..42 | State evidence | AC-15 | 14 states a happy-path shot cannot capture × 3 viewports | Login error + busy, change-password field validation, queue empty vs no-results, staff comments/notes, admin deactivate confirm + both safety errors, queue filter card open + a filter actually applied, internal-note button label contrast, queue sort applied | `e2e/lab-03/states.visual.spec.ts` | Pass |
| STYLE-05 | Visual audit | AC-15 | Focus rings on every keyboard stop (ui-spec 7, checklist 25) | Tabs through login, staff queue, staff detail and the admin list at 3 viewports; every stop must paint a ≥2px outline in the colour ui-spec 7 documents for that surface — `--color-secondary` on light surfaces, white on the dark header — or a `--color-secondary` ring shadow | `e2e/lab-03/visual-audit.spec.ts` | Pass |
| STYLE-06 | Visual audit | AC-15 | Editable vs read-only distinguishable (checklist 2) | Computed background of a read-only field ≠ an editable select; read-only holds no focusable control and is not tabbable | `e2e/lab-03/visual-audit.spec.ts` | Pass |
| STYLE-07 | Visual audit | AC-15 | Validation placement (checklist 3) | Each error message renders below its own field, shares its left edge, and required fields carry the red asterisk | `e2e/lab-03/visual-audit.spec.ts` | Pass |
| STYLE-08 | Visual audit | AC-15 | No element overlap (checklist 9) | Intersects the boxes of every visible control on 5 screens — staff queue, staff queue with the filter card open, staff ticket detail, login and change-password; the in-field Show/Hide toggle is allowed but must reserve `padding-right` so typed text cannot slide under it | `e2e/lab-03/visual-audit.spec.ts` | Pass |
| STYLE-09 | Visual audit | AC-15 | Role navigation + forbidden destination (checklist 12) | Exact nav link set per role, and each non-admin role is refused `/admin/users` by the backend role check | `e2e/lab-03/visual-audit.spec.ts` | Pass |
| STYLE-10 | Visual audit | AC-15 | Long-text clamping (checklist 24) | Queue summaries clamp to 2 lines with hidden overflow in both the table cell and the mobile card | `e2e/lab-03/visual-audit.spec.ts` | Pass |

### E2E (Playwright)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | E2E | AC-01, AC-02 | Full login flow | Login → mustChangePassword redirect → change password → access app → logout → protected route blocked | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | E2E | AC-05, AC-06 | Invalid/inactive login | Invalid credentials → error; inactive account → safe error | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-03 | E2E | AC-08, AC-09 | Staff ticket flow | Queue → detail → claim → IT priority → `NEW → OPEN` → `RESOLVED` absent from the dropdown (BR-12) → `OPEN → IN_PROGRESS` → post comment → create note → resolution summary | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-04 | E2E | AC-10, AC-11, AC-12 | User administration | Admin login → create requester → **first login with the initial password is forced to `/change-password`** → edit name → deactivate (with confirmation) → last-admin 409 → **self-deactivation 403 as a second Administrator** | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-05 | E2E | AC-03, AC-07 | Requester regression | Create ticket with auth identity → view → post comment → toggle indicate-resolved | `e2e/lab-03/requester-regression.spec.ts` | Pass |

> **Why E2E-03 can only assert the rejected half of AC-09 as a missing option.** The status
> dropdown is built from `transitionsFrom()` — the same transition table BR-12 makes the
> endpoint enforce — so a browser cannot attempt a forbidden transition at all. The 400
> itself stays API-42's job.

### Migration / Regression

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MIG-01 | Migration | specification section 7 | Lab 2 data survives migration; seed data is correct | Legacy row-count floor preserved; FK integrity (Ticket→Requester, Ticket→User, Attachment→Requester); `requesterUserId` backfilled for every ticket; all 8 `TicketStatus` values in use; workflow fields populated (resolutionSummary, requesterIndicatedResolved, ownerId, itPriority); assigned + unassigned ownership and populated + null IT Priority contrast; `requesterIndicatedResolved = true` always paired with `indicatedResolvedAt`; non-empty `resolutionSummary` when set; Public Comments on ≥2 tickets; Internal Notes (staff authors only); role distribution derived from seed definition; every documented account authenticates via bcrypt; admin `mustChangePassword = false`; IT Staff mustChangePassword split; `requesterUserId` backfilled (also covers API-14 intent: client-supplied requesterId is ignored by seed, so zero NULL `requesterUserId` rows exist post-seed); `fileParallelism: false` serializes files to avoid cross-suite row-count interference | `server/tests/lab-03/migration-regression.api.test.ts` | Pass |

> **Count baseline — why MIG-01 asserts a floor, not equality.** The specification's
> "counts are equal" check measures the **migrate-only** step (record counts before and
> after `prisma migrate deploy`, no seed), where every Lab 2 table must stay exactly the
> same. The automated suite has to run against a **seeded** database, and seeding adds
> Lab 3 ticket rows, so the suite asserts "at or above the baseline" to detect losses. The
> default baseline is the fresh-install seed floor, so `pnpm test` passes on any machine; a
> reviewer holding a pre-migration snapshot can tighten it by exporting
> `PRE_MIGRATION_COUNTS` (documented in the test file header).
>
> **Parallelization guard.** `server/vitest.config.ts` sets `test.fileParallelism: false`,
> because MIG-01 counts whole tables and any other suite creating or deleting tickets at
> the same moment would make those counts non-deterministic.
>
> **Final verified run — 2026-09-28.** Server suite 20 files / 286 tests with `pnpm build`
> clean, client suite 18 files / 201 tests with `pnpm build` clean, and
> `pnpm exec playwright test e2e/lab-03` = 110 passed / 10 skipped (the 10 skips are the
> desktop-only guards in the five functional specs). `pnpm exec prisma db seed` must run
> first, because the suite asserts against seeded data.
>
> The defects this evidence pass uncovered are listed in section 7 and written up in
> `ai-use.md` prompts 9 and 10.

## 3. Acceptance-Criterion Traceability

Every AC maps to ≥1 automated test:

| AC | Tests |
| :--- | :--- |
| AC-01 | API-01, API-05, UI-02, E2E-01 |
| AC-02 | API-06, UI-04, UI-05, E2E-01 |
| AC-03 | API-14, API-15, API-16, E2E-05 |
| AC-04 | API-17, API-51 |
| AC-05 | API-02, UI-01, E2E-02 |
| AC-06 | API-03, E2E-02 |
| AC-07 | API-58, API-59, E2E-05 |
| AC-08 | API-21..33, UI-07..10, E2E-03 |
| AC-09 | API-41..43, API-73, UI-12, E2E-03 |
| AC-10 | API-60, API-67, API-71, E2E-04 |
| AC-11 | API-65, E2E-04 |
| AC-12 | API-66, E2E-04 |
| AC-13 | API-18, API-19, UI-14 |
| AC-14 | API-61, API-72 |
| AC-15 | RESP-01..30, STATE-01..42, STYLE-05..10 |

## 4. Responsive and Visual Checklist

Covered by RESP-01..30 (screens), STATE-01..42 (states) and STYLE-05..10 (measured design rules), with the per-item test IDs recorded in the `Auto (test ID)` column of the checklist in `ui-spec.md` Section 9.1. Item 9 (no unintended horizontal scrolling) is enforced automatically in 69 of the 72 capture runs rather than eyeballed (the 3 excluded runs are the
STATE-37..39 contrast test, which measures one control's colour ratio and so
opens no full page), and STYLE-08 additionally intersects the boxes of every visible control on five screens so an overlap cannot hide between viewports.

What the automation deliberately does **not** claim: a computed check is not a design judgement. The `Manual pass (student sign-off)` column carries the student's own verdict on the 72 PNGs in `artifacts/lab-03/screenshots/`, recorded per item in `ui-spec.md` Section 9.1 — all 26 rows read `Pass`, transcribed from the student reviewing the images at all three viewports (and pressing <kbd>Tab</kbd> through the running app for the two rows no screenshot can evidence). It is a human judgement column, not an automated one, because "does this look right" is the one question a test cannot answer. The visual specs also capture and assert; they do not pixel-diff against a baseline, so a deliberate design change will not fail the run — it has to be reviewed.

## 5. Test Commands

```bash
docker compose up -d                      # repo root — PostgreSQL first
cd server && pnpm exec prisma migrate deploy && pnpm exec prisma db seed   # once per fresh DB
cd server && pnpm test                    # unit + API suites
cd ../client && pnpm test                 # component + style suites
cd .. && pnpm test:e2e:lab3               # lab-03 E2E — desktop-project only, workers=1 (both servers must be running)
```

## 6. Final Results

*Suite sizes below are the latest recorded runs and each row carries the date of the run it
reports. Intermediate runs made while the sprint was still in progress are not listed — only
the final verified result for each suite.*

| Suite | Command | Result |
|-------|---------|--------|
| Server (unit + API) | `cd server && pnpm test` | **Pass — 2026-09-28** — 20 files / 286 tests *(API-34..55 and API-73..75 staff-queue / staff-detail / comment-note coverage; API-60..72 + API-18 admin user management incl. the P2002 → 409 constraint-path regression. Run `pnpm exec prisma db seed` first, since the suite asserts against seeded data.)* |
| Client (component + style) | `cd client && pnpm test` | **Pass — 2026-09-28** — 18 files / 201 tests *(incl. UI-11..13 `StaffTicketDetail`, UI-14..16 `UserManagement`, and STYLE-01..04 `zen-green-lab3-style.test.tsx`, 7 tests — Login button primary green + 8-status / priority / role badge palettes per ui-spec section 3.)* |
| E2E (Playwright, functional) | `cd .. && pnpm test:e2e:lab3` (root `package.json`; desktop-project only, `workers: 1` from `playwright.config.ts`; needs both servers running) | **Pass — 2026-09-26** — E2E-01..05 5/5 desktop + 10 viewport skips (the 10 skips are the desktop-only guards in the five functional specs), green on 3 consecutive full runs with the DB clean after each; legacy `e2e/lab-02` specs skipped (45). Re-confirmed as part of the 2026-09-28 whole-suite run below. |
| E2E (Playwright, visual + audit) | `pnpm exec playwright test e2e/lab-03/responsive.visual.spec.ts e2e/lab-03/states.visual.spec.ts e2e/lab-03/visual-audit.spec.ts` (both servers running) | **Pass — 2026-09-28** — **105 passed** = 72 screenshot captures (10 screens + 14 states × 3 viewports) + 33 `visual-audit` assertions (11 × 3 viewports), all green. The final run is at mobile **375px** to match AC-15 verbatim, and covers the `client/src/components/Button.css` focus ring and `client/src/App.css` mobile header fixes. The whole `e2e/lab-03` directory in the same run = **110 passed / 10 skipped** (7.4m), i.e. those 105 plus the 5 functional desktop tests. |

## 7. Known Limitations / Deferred

- Login rate limiting / account lockout explicitly deferred (BR-06).
- Actions Taken / "Service Actions" tab excluded (deferred to Lab 4).
- Advanced user-list pagination, multi-column sorting, and multiple simultaneous filters excluded.
- Accessibility audit beyond the measured checks is manual: `STYLE-05..10` cover focus rings, read-only vs editable, validation placement, overlap, role navigation and clamping, but there is no full WCAG sweep (no axe run, no screen-reader pass). The remaining judgement stays in the student's manual checklist column.
- Playwright visual comparison is screenshot-capture + checklist review, not pixel-diff regression.
- **Defects this evidence pass caught** — all fixed, and each is now locked by an assertion rather than by a screenshot:
  - Mobile header overflow: the hamburger sat 2px past the edge on Requester screens and 19px past it on the Administrator account, because the profile button and role badge refused to shrink. The role badge is now hidden in the mobile header and repeated in the profile dropdown; every capture run asserts no horizontal scroll.
  - Internal Notes "Create Note" label: `variant="secondary"` set green text, which `.btn-internal` repainted onto a solid blue fill without overriding `color`, giving 1.05:1 contrast. `STATE-37..39` now reads both colours out of the live page and fails below WCAG AA 4.5:1.
  - Checklist item 18 cited screenshots that never exercised a filter, because the queue's filter card starts closed. The evidence is now stated precisely: filters `STATE-31..36`, sort `STATE-40..42`, and pagination resting on the bar being visible in `RESP-13..15` plus client unit test `UI-09` — no capture navigates to page 2.
- **Two states are only reachable with deliberate help.**
  - The IT Staff queue is global, so with seed data it can never legitimately be empty. `STATE-10..12` therefore stubs the API to return zero rows so the real empty-state markup is photographed; the adjacent no-results state (`STATE-13..15`) comes from the real API.
  - The two Administrator safety errors are mutually exclusive — AC-11 needs a second active Administrator, AC-12 needs exactly one — so `STATE-25..27` creates a throwaway Administrator for the 403 and `STATE-28..30` runs against the seeded single Administrator for the 409.

---

*This plan was written before implementation (Test DD evidence) and is now the final record: every case carries its verified result, and the supporting artifacts are the committed screenshots in `artifacts/lab-03/screenshots/`. Any later behavior change must update this file together with the specs.*

**Approval:** Reviewed and approved by the student on 2026-09-10 — seven test levels, 100+ test cases, full AC traceability, and labsheet-conformant format confirmed. **All cases verified `Pass` on 2026-09-28; the final suite results are in section 6 and the deferrals in section 7.**
