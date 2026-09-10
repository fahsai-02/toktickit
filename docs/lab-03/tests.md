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
5. **Responsive:** Playwright at 1440×900, 820×1180, 390×844 — layout integrity, no horizontal scroll on mobile, screenshots for the visual checklist.
6. **E2E (Playwright):** full user journeys against `docker compose` stack (API 5000 + web 5173).
7. **Migration/Regression:** verifies Lab 2 data survives migration, FK correctness, password hashing.

Test files live where the labsheet Section 12 requires.

## 2. Planned Tests

Status legend: `Planned` → written before implementation · updated to `Pass`/`Fail` with notes at sprint close.

### Unit (server)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | Unit | BR-08 | Password hash verification | bcrypt.hash produces a hash starting with `$2`; bcrypt.compare succeeds against known plaintext | `server/tests/lab-03/password-hash.unit.test.ts` | Planned |
| UNIT-02 | Unit | FR-07, AC-02 | New-password validation rules | Rejects <8 chars, missing uppercase, missing lowercase, missing digit, missing special char; accepts valid password | `server/tests/lab-03/password-validation.unit.test.ts` | Planned |
| UNIT-03 | Unit | BR-12 | Status-transition matrix validation | Given a current status and target status, correctly determines if the transition is permitted | `server/tests/lab-03/status-transitions.unit.test.ts` | Planned |

### API (server/tests/lab-03)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API | AC-01, FR-01 | Valid login | 200; session cookie set; user identity returned (id, name, email, role, mustChangePassword) | `auth.api.test.ts` | Planned |
| API-02 | API | AC-05, FR-02 | Invalid credentials | 401 with generic "Invalid email or password" | `auth.api.test.ts` | Planned |
| API-03 | API | AC-06, FR-03 | Inactive account login | 401 with same generic message (does not reveal account existence) | `auth.api.test.ts` | Planned |
| API-04 | API | FR-04 | Logout | 200; subsequent protected calls return 401 | `auth.api.test.ts` | Planned |
| API-05 | API | AC-01, FR-05 | Current user | 200 with user identity when authenticated; 401 when not | `auth.api.test.ts` | Planned |
| API-06 | API | AC-02, FR-07 | Change password — valid | 200; mustChangePassword cleared; new password works for login | `auth.api.test.ts` | Planned |
| API-07 | API | FR-07 | Change password — wrong current | 400 with `fields.currentPassword` error | `auth.api.test.ts` | Planned |
| API-08 | API | FR-07 | Change password — too short | 400 with specific validation message | `auth.api.test.ts` | Planned |
| API-09 | API | FR-07 | Change password — missing uppercase | 400 with specific validation message | `auth.api.test.ts` | Planned |
| API-10 | API | FR-07 | Change password — missing lowercase | 400 with specific validation message | `auth.api.test.ts` | Planned |
| API-11 | API | FR-07 | Change password — missing digit | 400 with specific validation message | `auth.api.test.ts` | Planned |
| API-12 | API | FR-07 | Change password — missing special char | 400 with specific validation message | `auth.api.test.ts` | Planned |
| API-13 | API | FR-07 | Change password — confirmation mismatch | 400 with `fields.confirmPassword` error | `auth.api.test.ts` | Planned |
| API-14 | API | AC-03, FR-13 | Create ticket ignores client-supplied requesterId | Authenticated as user A; send `requesterId: B` in body; ticket is owned by A | `authorization.api.test.ts` | Planned |
| API-15 | API | AC-03, FR-15 | Requester ownership on list | User A sees only A's tickets; 403/empty for B's tickets | `authorization.api.test.ts` | Planned |
| API-16 | API | AC-03, FR-15 | Requester ownership on detail | User A requests B's ticket → 403 | `authorization.api.test.ts` | Planned |
| API-17 | API | AC-04, FR-35 | Requester forbidden from internal notes | Requester calls POST /api/staff/tickets/:id/notes → 403 | `authorization.api.test.ts` | Planned |
| API-18 | API | AC-13, FR-47 | Non-admin forbidden from admin endpoints | Requester calls GET /api/admin/users → 403 | `authorization.api.test.ts` | Planned |
| API-19 | API | AC-13, FR-47 | Non-staff forbidden from staff endpoints | Requester calls GET /api/staff/tickets → 403 | `authorization.api.test.ts` | Planned |
| API-20 | API | FR-14 | Ticket creation initializes itPriority | Created ticket has `itPriority` = `requestedPriority` | `authorization.api.test.ts` | Planned |
| API-21 | API | AC-08, FR-22 | Staff queue — basic retrieval | 200 with paginated ticket list | `staff-queue.api.test.ts` | Planned |
| API-22 | API | AC-08, FR-22 | Staff queue — search by ticket number | Matching tickets returned | `staff-queue.api.test.ts` | Planned |
| API-23 | API | AC-08, FR-22 | Staff queue — search by summary | Matching tickets returned | `staff-queue.api.test.ts` | Planned |
| API-24 | API | AC-08, FR-22 | Staff queue — filter by status | Only matching status returned | `staff-queue.api.test.ts` | Planned |
| API-25 | API | AC-08, FR-22 | Staff queue — filter by priority | Only matching priority returned | `staff-queue.api.test.ts` | Planned |
| API-26 | API | AC-08, FR-22 | Staff queue — filter by category | Only matching category returned | `staff-queue.api.test.ts` | Planned |
| API-27 | API | AC-08, FR-22 | Staff queue — filter by owner (specific) | Only tickets owned by that user returned | `staff-queue.api.test.ts` | Planned |
| API-28 | API | AC-08, FR-22 | Staff queue — filter "Unassigned" | Only tickets with no owner returned | `staff-queue.api.test.ts` | Planned |
| API-29 | API | AC-08, FR-22 | Staff queue — filter "Assigned to me" | Only tickets owned by current user returned | `staff-queue.api.test.ts` | Planned |
| API-30 | API | AC-08, FR-23 | Staff queue — default ordering | Default is updatedAt desc | `staff-queue.api.test.ts` | Planned |
| API-31 | API | AC-08, FR-22 | Staff queue — sort by itPriority | Sorting by IT Priority works asc/desc | `staff-queue.api.test.ts` | Planned |
| API-32 | API | AC-08, FR-24 | Staff queue — invalid params | Unknown sortBy, non-numeric page, pageSize out of range → 400 | `staff-queue.api.test.ts` | Planned |
| API-33 | API | AC-08 | Staff queue — empty results | Filters matching nothing → empty data array with total=0 | `staff-queue.api.test.ts` | Planned |
| API-34 | API | FR-26 | Staff ticket detail — full payload | 200 with all fields including owner, resolutionSummary, requesterIndicatedResolved, counts | `staff-ticket-detail.api.test.ts` | Planned |
| API-35 | API | FR-27 | Claim ticket | 200; owner set to current user | `staff-ticket-detail.api.test.ts` | Planned |
| API-36 | API | FR-27 | Claim already-claimed ticket | 409 if already claimed by self | `staff-ticket-detail.api.test.ts` | Planned |
| API-37 | API | FR-28 | Assign ticket | 200; owner changed to specified user | `staff-ticket-detail.api.test.ts` | Planned |
| API-38 | API | FR-28 | Assign to non-existent user | 404 | `staff-ticket-detail.api.test.ts` | Planned |
| API-39 | API | FR-29 | Set IT Priority | 200; itPriority updated | `staff-ticket-detail.api.test.ts` | Planned |
| API-40 | API | FR-29 | Set invalid IT Priority | 400 | `staff-ticket-detail.api.test.ts` | Planned |
| API-41 | API | AC-09, FR-30 | Valid status transition (NEW→OPEN) | 200; currentStatus updated | `staff-ticket-detail.api.test.ts` | Planned |
| API-42 | API | AC-09, FR-30 | Invalid status transition (OPEN→RESOLVED) | 400 with BUSINESS_RULE_VIOLATION | `staff-ticket-detail.api.test.ts` | Planned |
| API-43 | API | AC-09, FR-30 | Invalid status transition (NEW→CANCELLED) | 400 (not permitted from NEW) | `staff-ticket-detail.api.test.ts` | Planned |
| API-73 | API | AC-09, FR-30, BR-12 | Valid status transition (CLOSED→REOPENED) | 200; currentStatus updated to REOPENED | `staff-ticket-detail.api.test.ts` | Planned |
| API-44 | API | FR-31 | Save resolution summary — valid | 200; resolutionSummary stored | `staff-ticket-detail.api.test.ts` | Planned |
| API-45 | API | FR-31, BR-19 | Save resolution summary — empty/whitespace | 400 | `staff-ticket-detail.api.test.ts` | Planned |
| API-46 | API | FR-31, BR-19 | Save resolution summary — over length | 400 | `staff-ticket-detail.api.test.ts` | Planned |
| API-47 | API | FR-32 | Post Public Comment (staff) | 201 with author and timestamp | `comments-notes.api.test.ts` | Planned |
| API-48 | API | FR-32 | List Public Comments (staff) | 200, newest-first | `comments-notes.api.test.ts` | Planned |
| API-49 | API | FR-33 | Create Internal Note (staff) | 201 with author and timestamp | `comments-notes.api.test.ts` | Planned |
| API-50 | API | FR-33 | List Internal Notes (staff) | 200, newest-first | `comments-notes.api.test.ts` | Planned |
| API-51 | API | AC-04, FR-35 | Internal Notes — Requester forbidden | 403 | `comments-notes.api.test.ts` | Planned |
| API-52 | API | FR-18, FR-34 | Append-only: PUT on comments | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Planned |
| API-53 | API | FR-18, FR-34 | Append-only: DELETE on comments | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Planned |
| API-54 | API | FR-34 | Append-only: PUT on notes | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Planned |
| API-55 | API | FR-34 | Append-only: DELETE on notes | 405 METHOD_NOT_ALLOWED | `comments-notes.api.test.ts` | Planned |
| API-56 | API | FR-16, BR-15 | Comment content — empty/whitespace | 400 | `comments-notes.api.test.ts` | Planned |
| API-57 | API | FR-16, BR-15 | Comment content — over 2000 chars | 400 | `comments-notes.api.test.ts` | Planned |
| API-58 | API | AC-07, FR-19 | Indicate resolved — toggle set | Sets `requesterIndicatedResolved = true` with timestamp; `currentStatus` unchanged | `comments-notes.api.test.ts` | Planned |
| API-59 | API | AC-07, FR-19 | Indicate resolved — toggle clear | Clears `requesterIndicatedResolved` to false; `currentStatus` unchanged | `comments-notes.api.test.ts` | Planned |
| API-60 | API | AC-10, FR-41 | Admin create user — valid | 201; password hashed; mustChangePassword=true | `users-admin.api.test.ts` | Planned |
| API-61 | API | AC-14, FR-42 | Admin create user — duplicate email | 409 CONFLICT | `users-admin.api.test.ts` | Planned |
| API-62 | API | FR-41 | Admin create user — invalid role | 400 | `users-admin.api.test.ts` | Planned |
| API-72 | API | AC-14, FR-43 | Admin edit user — duplicate email | 409 CONFLICT | `users-admin.api.test.ts` | Planned |
| API-63 | API | FR-41 | Admin create user — weak initial password | 400 with specific validation message | `users-admin.api.test.ts` | Planned |
| API-64 | API | FR-43 | Admin edit user — valid | 200; fields updated | `users-admin.api.test.ts` | Planned |
| API-65 | API | AC-11, FR-45 | Admin self-deactivation | 403 | `users-admin.api.test.ts` | Planned |
| API-66 | API | AC-12, FR-46 | Last admin deactivation | 409 | `users-admin.api.test.ts` | Planned |
| API-67 | API | FR-44, AC-10 | Admin reset password | 200; mustChangePassword set; new password works for login | `users-admin.api.test.ts` | Planned |
| API-68 | API | FR-40 | Admin user list | 200 with all users | `users-admin.api.test.ts` | Planned |
| API-69 | API | FR-40 | Admin user list — search | Search by name/email filters correctly | `users-admin.api.test.ts` | Planned |
| API-70 | API | FR-40 | Admin user list — role filter | Optional role filter narrows results | `users-admin.api.test.ts` | Planned |
| API-71 | API | AC-10 | Admin-created user login round-trip | Create user → login with initial password → mustChangePassword=true → change password → access normal app | `users-admin.api.test.ts` | Planned |

### UI component (client/tests/lab-03)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | UI component | AC-05, FR-02 | Login — invalid credentials | Error banner shown; no redirect; form retains values | `Login.test.tsx` | Planned |
| UI-02 | UI component | AC-01, FR-01 | Login — valid credentials | Redirect to `/` on success; user identity in shell | `Login.test.tsx` | Planned |
| UI-03 | UI component | AC-05 | Login — busy state | Button disabled + spinner during submission | `Login.test.tsx` | Planned |
| UI-04 | UI component | FR-07, AC-02 | Change password — checklist rendering | Password strength checklist shows 3 grouped rules with live checkmarks (at least 8 chars; upper+lower case; number+special char) | `ChangePassword.test.tsx` | Planned |
| UI-05 | UI component | FR-07 | Change password — valid submission | "Continue" button enabled when all rules met; submission succeeds; redirect to `/` | `ChangePassword.test.tsx` | Planned |
| UI-06 | UI component | FR-07 | Change password — validation feedback | Specific rule failures shown in checklist; confirmation mismatch shown | `ChangePassword.test.tsx` | Planned |
| UI-07 | UI component | FR-22, AC-08 | Staff queue — table rendering | Table shows all 9 columns with correct data | `StaffTicketQueue.test.tsx` | Planned |
| UI-08 | UI component | FR-22, AC-08 | Staff queue — search and filter | Search and filter controls work; results update | `StaffTicketQueue.test.tsx` | Planned |
| UI-09 | UI component | FR-22 | Staff queue — pagination | Prev/next/page controls work | `StaffTicketQueue.test.tsx` | Planned |
| UI-10 | UI component | FR-22 | Staff queue — empty/no-results states | Distinct messages for empty vs no-results | `StaffTicketQueue.test.tsx` | Planned |
| UI-11 | UI component | FR-26, FR-37 | Staff detail — ticket info rendering | All meta fields shown with correct editability | `StaffTicketDetail.test.tsx` | Planned |
| UI-12 | UI component | FR-30, FR-38 | Staff detail — status dropdown | Only permitted next states shown in dropdown | `StaffTicketDetail.test.tsx` | Planned |
| UI-13 | UI component | FR-32, FR-33 | Staff detail — comments/notes tabs | Both tabs render; comment/note input present | `StaffTicketDetail.test.tsx` | Planned |
| UI-14 | UI component | FR-40, AC-13 | Admin — user list | Table shows Name, Email, Role, Status, Edit | `UserManagement.test.tsx` | Planned |
| UI-15 | UI component | FR-41 | Admin — create user drawer | Drawer opens; form validates; submission works | `UserManagement.test.tsx` | Planned |
| UI-16 | UI component | FR-43, FR-45, FR-46 | Admin — edit and safety | Edit loads data; self-deactivation blocked; last-admin blocked | `UserManagement.test.tsx` | Planned |

### UI style (client/tests/lab-03)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| STYLE-01 | UI style | ui-spec tokens | Login button styling | Primary green button rendered | `zen-green-lab3-style.test.tsx` | Planned |
| STYLE-02 | UI style | ui-spec tokens | Status badge palette | All 8 statuses map to correct color classes | `zen-green-lab3-style.test.tsx` | Planned |
| STYLE-03 | UI style | ui-spec tokens | Priority badge palette | LOW/MEDIUM/HIGH/URGENT map to correct classes | `zen-green-lab3-style.test.tsx` | Planned |
| STYLE-04 | UI style | ui-spec tokens | Role badge palette | REQUESTER/IT_STAFF/ADMINISTRATOR map to correct classes | `zen-green-lab3-style.test.tsx` | Planned |

### Responsive (Playwright)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| RESP-01..24 | Responsive | AC-15 | 8 screens × 3 viewports (1440×900, 820×1180, 390×844) | Layout intact per breakpoints; screenshots saved; no horizontal scroll at mobile | `e2e/lab-03/responsive.visual.spec.ts` | Planned |

### E2E (Playwright)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | E2E | AC-01, AC-02 | Full login flow | Login → mustChangePassword redirect → change password → access app → logout → protected route blocked | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-02 | E2E | AC-05, AC-06 | Invalid/inactive login | Invalid credentials → error; inactive account → safe error | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-03 | E2E | AC-08, AC-09 | Staff ticket flow | Queue → detail → claim → change status → post comment → create note → resolution summary | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-04 | E2E | AC-10, AC-11, AC-12 | User administration | Admin login → user list → create user → edit → deactivate (with confirmation) → safety rules | `e2e/lab-03/user-administration.spec.ts` | Planned |
| E2E-05 | E2E | AC-03, AC-07 | Requester regression | Create ticket with auth identity → view → post comment → toggle indicate-resolved | `e2e/lab-03/requester-regression.spec.ts` | Planned |

### Migration / Regression

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MIG-01 | Migration | specification §7 | Lab 2 data survives migration | Ticket/Attachment/Category counts unchanged; FK correctness; password hashes start with `$2`; bcrypt.compare succeeds | `server/tests/lab-03/migration-regression.api.test.ts` | Planned |

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
| AC-15 | RESP-01..24 |

## 4. Responsive and Visual Checklist

Covered by RESP-01..24, with results recorded in the manual checklist in `ui-spec.md` Section 9, verified against the generated screenshots at sprint close.

## 5. Test Commands

```bash
docker compose up -d                      # repo root — PostgreSQL first
cd server && pnpm exec prisma migrate deploy && pnpm exec prisma db seed   # once per fresh DB
cd server && pnpm test                    # unit + API suites
cd ../client && pnpm test                 # component + style suites
cd .. && npx playwright test e2e/lab-03   # responsive + E2E (needs both servers running)
```

## 6. Final Results

*Updated at sprint close with actual test output evidence.*

| Suite | Command | Result |
|-------|---------|--------|
| Server (unit + API) | `cd server && pnpm test` | *TBD at sprint close* |
| Client (component + style) | `cd client && pnpm test` | *TBD at sprint close* |
| E2E + Responsive (Playwright) | `pnpm test:e2e` (from repo root) | *TBD at sprint close* |

## 7. Known Limitations / Deferred

- Login rate limiting / account lockout explicitly deferred (BR-06).
- Actions Taken / "Service Actions" tab excluded (deferred to Lab 4).
- Advanced user-list pagination, multi-column sorting, and multiple simultaneous filters excluded.
- Accessibility audit beyond basic checks is manual (Issue 23 visual checklist).
- Playwright visual comparison is screenshot-capture + checklist review, not pixel-diff regression.

---

*This plan is written before implementation (Test DD evidence). Any behavior change during implementation must update both this file and the specs.*

**Approval:** Reviewed and approved by the student on 2026-09-10. Seven test levels, 100+ planned tests, full AC traceability, and labsheet-conformant format confirmed. **Statuses to be updated to final results at sprint close.**
