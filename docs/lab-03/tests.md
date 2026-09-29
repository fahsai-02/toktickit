# Lab 3 Test Plan and Results

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens |
| **Version** | v1.0 DRAFT — planned tests before implementation; statuses updated to final results at sprint close |
| **Date** | 2026-09-10 |
| **Traceability source** | `specification.md` v1.0 AC-01..15 · `api-spec.md` v1.0 · `ui-spec.md` v1.0 |

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

## 2. Planned Tests

Status legend: `Planned` → written before implementation · updated to `Pass`/`Fail` with notes at sprint close.

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

### Migration / Regression

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MIG-01 | Migration | specification section 7 | Lab 2 data survives migration; seed data is correct | Legacy row-count floor preserved; FK integrity (Ticket→Requester, Ticket→User, Attachment→Requester); `requesterUserId` backfilled for every ticket; all 8 `TicketStatus` values in use; workflow fields populated (resolutionSummary, requesterIndicatedResolved, ownerId, itPriority); assigned + unassigned ownership and populated + null IT Priority contrast; `requesterIndicatedResolved = true` always paired with `indicatedResolvedAt`; non-empty `resolutionSummary` when set; Public Comments on ≥2 tickets; Internal Notes (staff authors only); role distribution derived from seed definition; every documented account authenticates via bcrypt; admin `mustChangePassword = false`; IT Staff mustChangePassword split; `requesterUserId` backfilled (also covers API-14 intent: client-supplied requesterId is ignored by seed, so zero NULL `requesterUserId` rows exist post-seed); `fileParallelism: false` serializes files to avoid cross-suite row-count interference | `server/tests/lab-03/migration-regression.api.test.ts` | Pass |

> **MIG-01 hardening note (count equality vs baseline):** AC-11's "assert counts are equal" measures the **migrate-only** step (record counts before and after `prisma migrate deploy`, no seed — every Lab 2 table stays exactly the same). The automated suite must run on a **seeded** DB, and the seed adds ticket rows (dev DB: 343 → 358), so the suite asserts "at or above the snapshot" rather than equality to detect losses. The default baseline is the fresh-install seed floor so `pnpm test` runs on any machine. For a strict check against this repo's dev snapshot, run:
> `cd server && PRE_MIGRATION_COUNTS='{"ticket":343,"attachment":179,"requester":6,"category":4,"relatedSystem":7}' pnpm test`.
>
> **Parallelization guard:** `server/vitest.config.ts` sets `test.fileParallelism: false` so no other test file creates/deletes tickets while MIG-01's global count assertions run. Without this, the cross-file race with `POST /api/tickets` in `server/src/app.ts` (which skips `requesterUserId`) can cause non-deterministic MIG-01 failures.
>
> **Verified Pass 2026-09-14 (12 files / 138 tests).**
>
> **Verified Pass 2026-09-19 — Issue 18 close-out:** server 16 files / 191 tests (server suite + `pnpm build` green after review fixes; includes API-14..16, API-20, API-52/53, API-56..59), client 13 files / 119 tests (incl. new UI-17 `RequesterTicketComments.test.tsx` + UI-18 `requester-ticket-api.test.tsx`), and E2E-05 requester regression (1 spec / 1 test) passed. Run order used: `pnpm exec prisma db seed` before the server suite, and the E2E spec self-reseeds before and after (its initial-password change is undone so MIG-01 bcrypt checks stay green). Details in `ai-use.md` Issue 18 section.
>
> **Verified Pass 2026-09-21 — Issue 20 close-out:** server 19 files / 259 tests + `pnpm build` green; client 15 files / 156 tests + `pnpm build` green. New this issue: UNIT-03 (`status-transitions.unit.test.ts`, 9 tests), API-34..46 + API-73 (`staff-ticket-detail.api.test.ts`, 29 tests incl. the new category + staff-user-list endpoints as API-74/API-75), API-47..51 + API-54/55 (`comments-notes.api.test.ts` staff block), UI-11..13 (`StaffTicketDetail.test.tsx`, 20 tests incl. a claim-visible-when-owned-by-another-staff case). `pnpm exec prisma db seed` was re-run before the server suite (reseed resets the 11 seed accounts to the documented state; dev DB now 364 tickets). Details in `ai-use.md` Issue 20 section.
>
> **Post-review fixes 2026-09-22 (feature/20-staff-ticket-detail):** (1) `PUT /api/staff/tickets/:id/category` now enforces api-spec 5.14 — only active categories are accepted (inactive → 404), locked by a new test in `staff-ticket-detail.api.test.ts`; (2) staff/admin attachment uploads tag `uploadedByRequesterId` with the ticket's own requester instead of fabricating a Requester row from the staff identity (decision confirmed with the student; requester uploads unchanged) — 2 new tests; (3) added `staff-ticket-api.test.tsx` covering all 12 staff `api.ts` wrappers (method/URL/headers/body). AI-17 row corrected: the requester-notes 403 assertion lives in `comments-notes.api.test.ts` (API-51). **Server: 19 files / 262 tests; Client: 16 files / 169 tests.**
>
> **Verified Pass 2026-09-22 — Issue 21 close-out:** admin user management. Server 20 files / 285 tests + `pnpm build` green. New: `users-admin.api.test.ts` (API-60..72 — create valid/duplicate/invalid-role/weak-password, edit valid/duplicate, self-deactivation 403, last-admin 409, reset-password, list/search/role-filter, login round-trip, seed-admin survivability) + API-18 non-admin 403 in `authorization.api.test.ts`. Client 17 files / 189 tests + `pnpm build` green. New: `client/tests/lab-03/UserManagement.test.tsx` (UI-14..16, 15 tests — list table + badges, debounced search, role filter, empty/forbidden states, create drawer with client-side validation (API never called on invalid) + duplicate-email 409 field error, edit loading + update payload, deactivate confirmation surfacing server 403/409 messages, reset-password sub-form) + new `Drawer`, `Toggle`, `ConfirmDialog` components and `/admin/users` route + "User Management" nav link (ui-spec 4.1). Details in `ai-use.md` Issue 21 section.
>
> **Post-review fixes 2026-09-23 (PR #72 peer review, reviewer requests 4 changes):** (1) edit-mode `Active` toggle is now read-only and edit `Save` never sends `isActive`, so existing users can no longer be deactivated through Save (ui-spec 5.6 requires the confirmation dialog) — regression test asserts the disabled toggle + `isActive`-free payload; (2) `PUT /api/admin/users/:id` now translates a race-condition Prisma `P2002` into the documented 409 ("A user with this email already exists.", api-spec 6.3 / FR-42 / BR-07) instead of 500 — regression test forces the constraint error deterministically; (3) the page maps the real duplicate-email 409 response (which carries only `code`+`message`, never `fields`) to the inline email field error required by ui-spec 5.6, and the create + edit UI tests now use that real response shape instead of a fabricated `fields` value; (4) `Drawer` + `ConfirmDialog` share a refcounted scroll lock and the drawer suspends its Escape/focus handling while the confirmation dialog sits on top — Escape closes only the topmost dialog and the page stays scroll-locked until the drawer fully closes (regression test covers both). New `client/src/lib/scrollLock.ts`. **Server: 20 files / 286 tests; Client: 17 files / 194 tests.** (Test suite run required seeding; two stray manual-login accounts were removed from the dev DB before the verified run.)
>
> **Verified Pass 2026-09-24 — Issue 22 close-out:** comprehensive testing. E2E-01..04 are now automated (`e2e/lab-03/authentication.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`) on top of E2E-05 requester regression — `pnpm test:e2e:lab3` = **5 passed / 10 skipped** (functional specs run desktop-only; tablet/mobile viewports skip via a `test.skip(testInfo.project.name !== "desktop", ...)` guard so parallel projects cannot race BR-02 password rotation). Root scripts `test:e2e`/`test:e2e:headed`/`test:e2e:lab3` all use `--workers=1`; `testDir` is now `./e2e`. The legacy Lab 2 specs (`e2e/lab-02/*`) are skipped in the Lab 3 harness (they depend on the removed `/select-requester` + localStorage seeding; functional requester coverage lives in E2E-05). STYLE-01..04 added as `client/tests/lab-03/zen-green-lab3-style.test.tsx` (7 tests — Login button primary green, all-8 status badge palette, priority + role tints per ui-spec section 3 "Badges"). E2E-01..04 and STYLE-01..04 flipped `Planned` → `Pass`. E2E specs reseed the shared DB and run `server/prisma/cleanup-e2e.ts` (new helper) before/after, removing e2e-created users/comments/notes so exact-count suites (e.g. API-68) stay green. **Server: 20 files / 286 tests + `pnpm build` green; Client: 18 files / 201 tests + `pnpm build` green; `pnpm test:e2e` = 5 passed / 55 skipped, exit 0.** Remaining `Planned` rows (RESP-01..24 + visual) are Issue 23.

> **Verified Pass 2026-09-27 — Issue 23 (release polish), visual half:** `e2e/lab-03/responsive.visual.spec.ts` (RESP-01..30) and `e2e/lab-03/states.visual.spec.ts` (STATE-01..42) added; **72 screenshots** at `artifacts/lab-03/screenshots/` (10 screens + 14 states × desktop 1440×900 / tablet 820×1180 / mobile 375×844 — re-captured at 375px on 2026-09-28; see the note below). Every test asserts `assertNoHorizontalScroll` before capturing (23 assertions × 3 viewports = 69 runs), so "no unintended horizontal scrolling" (AC-15, ui-spec 9.1 item 9) is enforced automatically at all 69 capture runs rather than eyeballed. The one exception is STATE-37..39, which asserts a colour ratio on a single control and therefore measures no page width.
>
> **Re-verified 2026-09-28 at mobile 375px:** the viewport was changed from 390px to 375px to match AC-15 verbatim (the AC names 375px, so the narrowest supported width had been untested) and the full set was re-captured — **105 passed** (72 captures + 33 audit) against `Seeded ... 367 tickets`. Desktop and tablet images are unchanged; the 24 mobile images are new, and the student reviewed all 24 of them at 375px with nothing outstanding, so the `ui-spec.md` 9.1 `Pass` marks stand on that second review rather than on the 390px captures. All 24 mobile PNGs measure 375px wide. See section 6 for the corrected count.
>
> **Two real layout defects found and fixed** (this is what the responsive evidence was for): on the mobile viewport the header overflowed — the hamburger sat 2px past the edge on Requester screens and 19px past it with the "Administrator" account (document `scrollWidth` 409px), because the profile button and the role badge refused to shrink. Fixed in `client/src/App.css` under the existing `@media (max-width: 768px)` block per ui-spec 4.1 line 93 ("header keeps brand + user name (truncated)"): the role badge is hidden in the header at mobile width and the profile button may shrink. The role still reads from the profile dropdown header, which repeats name + role badge (ui-spec 4.1 line 91). `.profile-role` is a new hook on the existing header `Badge`. The defect was first observed at 390px; the fix is re-verified at 375px.
>
> **Three states are not reachable exactly as a naive reading suggests, and the specs say so in comments:**
> 1. **Change-password validation** — the submit button stays `disabled` until the confirmation matches (`ChangePassword.tsx` `canSubmit`), so a mismatched pair is never sent. The captured state is the reachable one: all checklist rules met, then the server rejects the **current** password (`auth.ts` returns it as a *field* error, not a banner), asserted through the input's `aria-describedby` per ui-spec 9.1 item 3.
> 2. **Queue empty** — the IT Staff queue is global (api-spec 5.1 lists no requester scope), so with seed data it can never legitimately be empty. That one test stubs `GET /api/staff/tickets` to return zero rows so the *real* empty-state markup is photographed; the adjacent no-results state is captured from the real API with an impossible ticket number.
> 3. **The two Administrator safety errors are mutually exclusive** — AC-11 (403) needs a second active Administrator, AC-12 (409) needs there to be only one. STATE-25..27 creates a throwaway Administrator through the admin API, proves the 403, then deactivates that throwaway again (Lab 3 has no delete endpoint) so STATE-28..30 sees the seeded single Administrator and gets the 409. `cleanup-e2e.ts` still removes the row.
>
> **`loginAndUnlock` helper got an option.** Unlocking a seeded Requester necessarily completes the mandatory first-login change, which rewrites that account's password — so `useLab3DbHooks({ allProjects: true })` now re-seeds for tablet and mobile too (the functional specs stay desktop-only), and each Requester screen uses a *different* seeded account. The change-password screenshot passes `{ completeMandatoryChange: false }` so it stops on the form without submitting; an earlier version submitted it, which both destroyed the evidence and burned the account for every later test in the run.
>
> **Legacy `e2e/lab-02` specs stay skipped** (`helpers.ts`, `responsive.visual.spec.ts`, `states.visual.spec.ts` all carry a top-level `test.skip`): they depend on the removed `/select-requester` route and localStorage seeding, so they cannot run against the Lab 3 app. Their functional coverage lives in E2E-05 requester regression, and their responsive/state evidence is superseded by RESP-01..30 and STATE-01..42. This is a deliberate, documented exclusion, not an oversight.
>
> **Second review round (2026-09-28) found a legibility defect and an evidence gap that the tests had been blind to.**
>
> 1. **`.btn-internal` painted an unreadable label (fixed).** The Internal Notes "Create Note" button is `variant="secondary"`, which sets `color: var(--color-secondary)` (green `#0B7A46`), and `client/src/App.css` repaints it with a solid `var(--color-info)` fill — but never overrode `color`, so the label stayed green on blue at **1.05:1** contrast (WCAG AA needs 4.5:1; it is below the 1.0 "no contrast at all" line only by rounding). Adding `color: #fff` to `.btn-internal` — the same literal `.btn-primary` already uses — brings it to **5.17:1** resting and **8.72:1** on hover. `STATE-37..39` now computes both colours out of the live page and fails below 4.5:1; the mutation check (temporarily deleting `color: #fff`) reproduces `1.05:1` and fails, so the guard is not vacuous. `STATE-19..21`'s screenshot was re-captured with the fix. `STATE-37..39` also pins the fill to `rgb(255, 255, 255)` text so the ratio cannot be met by an accidental light backdrop.
> 2. **Item 18's evidence did not exist (corrected).** "Filters, sort, pagination usable at all viewports" cited `RESP-13..15, RESP-25..27`, but the queue's filter card is behind `{filtersOpen && …}` and starts closed — every one of those screenshots shows the *unfiltered* list, and `states/queue-no-results` is the failure path rather than a working filter. `STATE-31..33` photographs the open card with all five controls, and `STATE-34..36` reads the status off a row that is on screen, filters by it, and asserts the total strictly decreased, stayed above zero, every remaining row carries that status, and Clear Filters appeared. It deliberately derives the status from the page instead of naming a seeded one, so it holds on any seed. `ui-spec.md` 9.1 item 18 now says what is actually photographed: filters (`STATE-31..36`) and sort (`STATE-40..42`), plus the pagination bar (visible in `RESP-13..15`, never navigated). `STATE-40..42` closes the one gap that was left: it drives the control a real user operates — the sortable `th` on desktop/tablet, the "Sort by" select on mobile — and asserts the resulting ticket numbers are genuinely ascending, so a capture cannot pass on a re-render that never reordered anything. It reads the visible numbers off the page rather than hard-coding a seeded order, and waits for the first row to appear instead of assuming the list is already populated. Pagination still rests on the bar being present plus client unit test `UI-09`; no capture clicks to page 2.
> 3. **Two false passes in the new tests were caught before they shipped.** The first contrast run reported `21.00:1` — white on a transparent backdrop counted as black — because `rgb(37, 99, 235)` has no alpha component and the ancestor walk skipped it as unreadable. The walk now treats a 3-component `rgb()` as opaque and asserts a non-null backdrop, so a bogus measurement fails loudly instead of scoring 21:1. The filter test also assumed `clear-filters` is always in the card; it sits behind `hasActiveFilters`, so `STATE-31..33` now asserts it is *absent* while unfiltered and `STATE-34..36` asserts it *appears* once a filter is active.
>
> **Re-verified after the CSS + Navbar change:** server **20 files / 286 tests** + `pnpm build`; client **18 files / 201 tests** + `pnpm build`; `pnpm exec playwright test e2e/lab-03` = **98 passed / 10 skipped** (the 10 skips are the pre-existing desktop-only guards in the five functional specs; 93 of the passes are the visual and audit specs — 30 responsive + 30 state + 33 measured design rules).
> **Re-run 2026-09-28 after adding `STATE-31..42` (12 states × 3 viewports = 36 new visual tests):** `pnpm exec playwright test e2e/lab-03 --workers=1` = **110 passed / 10 skipped** (7.4m), i.e. 98 + 12, with the same 10 desktop-only skips. The delta is entirely the new state groups: filters open, filter applied, internal-note contrast, sort applied. `cd client && pnpm test` = **18 files / 201 tests**, `cd server && pnpm test` = **20 files / 286 tests**, and both `pnpm build`s pass.
> **Post-review fixes 2026-09-26 (PR #73 peer review, `feature/22-comprehensive-testing`):** the reviewer raised 5 key points and 3 nits; all were addressed. (1) **Guaranteed DB cleanup** — every lab-03 spec now resets the shared DB from `test.beforeAll`/`test.afterAll` instead of from the tail of the test body, so a failed assertion can no longer skip cleanup. Verified by injecting a deliberate mid-test failure in E2E-04 (after both throwaway accounts exist): the run failed, yet `afterAll` still left 0 `e2e.%` users, 0 stray `E2E %` comments/notes, and `admin@toktickit.dev` active. (2) **Serial execution in config** — `playwright.config.ts` now sets `fullyParallel: false` + `workers: 1` (not just the npm scripts), so a bare `npx playwright test` or the VS Code extension cannot race the shared DB; confirmed by running `playwright test e2e/lab-03 --project=desktop` with no CLI flags → "1 worker". (3) **AC-11 now covered by E2E-04** — the seeded single Administrator can only ever reach the 409 last-admin guard (`server/src/app.ts` checks it before the self-guard), so the spec creates a second throwaway Administrator, signs in **as that account**, and asserts the 403 "You cannot deactivate your own account." The seeded admin is never modified; the `e2e.` email prefix means `cleanup-e2e.ts` removes the throwaway. (4) **AC-10 first login** — E2E-04 now logs in with the newly created account's initial password, asserts the forced `/change-password` redirect, completes the change, and confirms a Requester lands on `/my-tickets`. (5) **Seed data de-duplicated** — `e2e/lab-03/helpers.ts` reads passwords from the `server/src/lib/seedData.ts` rows (which `prisma/seed.ts` itself populates from `server/src/lib/seedCredentials.ts`) and resolves the inactive account via `SEED_USERS.find(u => !u.isActive …)`, replacing the hard-coded `robert.brown@toktickit.dev`; a `seedUser()` guard fails loudly if a named seed account disappears. (6) **AC-09 completed** — E2E-03 now exercises `OPEN → IN_PROGRESS` and asserts `RESOLVED` is **absent** from the status dropdown. Note the dropdown is built from `transitionsFrom()` (the same BR-12 table the endpoint enforces) and ui-spec section 5.5 says "only permitted next states", so the rejected half of AC-09 is observable in the UI only as a missing option — the 400 itself stays API-42's job. (7) **Shared DB helper** — the 8 duplicated `execSync("pnpm exec …")` blocks collapsed into `resetLab3Db()` in `helpers.ts` (now `execFileSync` with an argv array, so no shell quoting). Also removed a comment in E2E-04 that cited a guard-order note in this file which did not exist. (8) **Root-caused the intermittent E2E-05 failure** — after the `afterAll` move, one run still failed. It was not timing: `server/prisma/cleanup-e2e.ts` deleted E2E tickets with a `Promise.all` that ran `ticket.deleteMany` *in parallel* with the `publicComment`/`internalNote`/`attachment` deletes for the same ids, and since those relations have no `ON DELETE CASCADE` a ticket delete that commits first fails with `P2003 … PublicComment_ticketId_fkey`. The interleaving depends on connection-pool timing, which is why it only showed up sometimes. The deletes are now sequential, children before parents. (9) **Skipped projects no longer touch the DB** — the reset hooks are registered by one `useLab3DbHooks()` helper in `e2e/lab-03/helpers.ts` (desktop project only), replacing 10 duplicated hook lines per spec; the tablet/mobile projects used to re-seed twice per file for tests that skip themselves. Suite runtime 2.9m -> 1.1m. **Re-verified: server 20 files / 286 tests + `pnpm build`; client 18 files / 201 tests + `pnpm build`; `pnpm test:e2e:lab3` = 5 passed / 10 skipped (exit 0) on 3 consecutive full runs after the cleanup fix, DB clean after each; root `tsc --noEmit` clean.**

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

Covered by RESP-01..30 (screens), STATE-01..42 (states) and STYLE-05..10 (measured design rules), with the per-item test IDs recorded in the `Auto (test ID)` column of the checklist in `ui-spec.md` Section 9.1. Item 9 (no unintended horizontal scrolling) is enforced automatically in all 69 capture runs rather than eyeballed, and STYLE-08 additionally intersects the boxes of every visible control on five screens so an overlap cannot hide between viewports.

What the automation deliberately does **not** claim: a computed check is not a design judgement. The `Manual pass (student sign-off)` column is left blank for the student to complete against the 60 PNGs in `artifacts/lab-03/screenshots/` — `ui-spec.md` Section 9.1 carries a table mapping each group of checklist items to the screenshot directory to open — because "does this look right" is the one question a test cannot answer. The visual specs also capture and assert; they do not pixel-diff against a baseline, so a deliberate design change will not fail the run — it has to be reviewed.

## 5. Test Commands

```bash
docker compose up -d                      # repo root — PostgreSQL first
cd server && pnpm exec prisma migrate deploy && pnpm exec prisma db seed   # once per fresh DB
cd server && pnpm test                    # unit + API suites
cd ../client && pnpm test                 # component + style suites
cd .. && pnpm test:e2e:lab3               # lab-03 E2E — desktop-project only, workers=1 (both servers must be running)
```

## 6. Final Results

*Server suite recorded 2026-09-12 (follow-up after MIG-01 review); client and E2E suites updated at sprint close with actual test output evidence. Issue 19 (#60) queue suites recorded 2026-09-20.*

| Suite | Command | Result |
|-------|---------|--------|
| Server (unit + API) | `cd server && pnpm test` | **Pass** — 20 files / 286 tests (2026-09-23, after PR #72 post-review fixes) *(API-34..55, API-73..75, UNIT-03 from Issue 20; API-60..72 + API-18 from Issue 21 `feature/21-admin-user-management` incl. the P2002 → 409 constraint-path regression; reseed + remove stray manual accounts before run)* |
| Client (component + style) | `cd client && pnpm test` | **Pass** — 18 files / 201 tests (2026-09-24, Issue 22 close-out) *(incl. UI-11..13 `StaffTicketDetail` and UI-14..16 `UserManagement` suites from Issues 20/21, plus STYLE-01..04 `zen-green-lab3-style.test.tsx`, 7 tests — Login button primary green + 8-status / priority / role badge palettes per ui-spec section 3)* |
| E2E (Playwright, functional) | `cd .. && pnpm test:e2e:lab3` (root `package.json`; desktop-project only, `workers: 1` from `playwright.config.ts`; needs both servers running) | **Pass** — E2E-01..05 5/5 desktop + 10 viewport skips (2026-09-26, after the PR #73 post-review fixes; original close-out 2026-09-24); legacy `e2e/lab-02` specs skipped (45) |
| E2E (Playwright, visual + audit) | `pnpm exec playwright test e2e/lab-03/responsive.visual.spec.ts e2e/lab-03/states.visual.spec.ts e2e/lab-03/visual-audit.spec.ts` (both servers running) | **Pass** — 2026-09-28, Issue 23: **105 passed** = 72 screenshot captures (10 screens + 14 states × 3 viewports) + 33 `visual-audit` assertions (11 × 3 viewports), all green (5.7m). Re-run at mobile **375px** to match AC-15 verbatim, after the Issue 23 fixes: `client/src/components/Button.css` focus ring, `client/src/App.css` mobile header. An earlier run at 390px reported 93 passed against only 10 states; both the count and the width were corrected once `STATE-31..42` were added and the AC width was adopted. |

## 7. Known Limitations / Deferred

- Login rate limiting / account lockout explicitly deferred (BR-06).
- Actions Taken / "Service Actions" tab excluded (deferred to Lab 4).
- Advanced user-list pagination, multi-column sorting, and multiple simultaneous filters excluded.
- Accessibility audit beyond the measured checks is manual: `STYLE-05..10` cover focus rings, read-only vs editable, validation placement, overlap, role navigation and clamping, but there is no full WCAG sweep (no axe run, no screen-reader pass). The remaining judgement stays in the student's manual checklist column.
- Playwright visual comparison is screenshot-capture + checklist review, not pixel-diff regression.

---

*This plan is written before implementation (Test DD evidence). Any behavior change during implementation must update both this file and the specs.*

**Approval:** Reviewed and approved by the student on 2026-09-10. Seven test levels, 100+ planned tests, full AC traceability, and labsheet-conformant format confirmed. **MIG-01 and the full server suite recorded as Pass on 2026-09-12; remaining statuses updated to final results at sprint close.**
