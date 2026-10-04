# Lab 4 Test Plan and Results

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 4: Actions Taken, Ticket Workflow, and Role Dashboards |
| **Version** | v1.1 — Approved 2026-10-04 (**no test case has been executed yet**) |
| **Date** | 2026-10-04 |
| **Traceability source** | `specification.md` v1.1 AC-01..18 · `api-spec.md` v1.1 · `ui-spec.md` v1.1 |

---

## 1. Test Strategy

Twelve test levels. Ten of them are the categories handout section 10 names as
mandatory — unit, API/integration, UI component, UI style, responsive,
authorization, workflow, migration/regression, performance-smoke, end-to-end — plus
accessibility, which handout section 10 asks for alongside them, and visual state
evidence, which is where a happy-path screenshot cannot reach. Section 2 below has
exactly one heading per level, in this order.

1. **Unit (server):** pure logic without DB/HTTP — the resolution gate predicate, the urgent-Ticket predicate (BR-25), and dashboard count predicates. The status-transition matrix from Lab 3 is re-asserted here because Lab 4 adds the gate on top of it.
2. **API / integration (server):** Supertest against the real Express app + seeded PostgreSQL. Asserts status codes, the error envelope, validation, ordering, the ignored body keys, version conflicts, and the dashboard calculations.
3. **UI component (client):** Vitest + Testing Library in jsdom, mocking the API layer. Asserts user-visible behavior, the states, client-side validation, field retention after a failure, and the single-flight guard.
4. **UI style (client):** automated assertions that the Zen Green tokens are applied on the new components and that the no-assignee/no-status controls are genuinely absent (FR-24, FR-25 — an absence has to be asserted, since a screenshot cannot prove one).
5. **Authorization:** the role matrix over every new endpoint, requester ownership isolation, and the `405`-before-`401` method guards. Collected here rather than scattered because handout section 10 lists it as its own category, and a reviewer looking for "what may a Requester do" should find it in one place.
6. **Workflow:** the transition matrix and the resolution gate, at both levels — the API returns the documented status, and the screen tells the user which condition is unmet instead of only moving a badge.
7. **Accessibility:** semantic labels, keyboard operation, non-color status cues, and live-region announcements for save, conflict, and gate results.
8. **Responsive:** Playwright at 1440×900, 820×1180, 375×844 — layout integrity, no horizontal scroll on mobile, screenshots for the visual checklist.
9. **Visual state evidence (Playwright):** conflict, validation, retained-form, loading, zero-metric, and error states, which no happy-path capture can show.
10. **Performance smoke (server):** wall-clock thresholds on the new read endpoints. A smoke check, not a benchmark — the point is that a regression shows up as a failed test instead of a surprise during a demonstration.
11. **Migration / Regression:** verifies Lab 1–3 data survived the Lab 4 migration, that the documented rollback path works, that the seed covers all three action-count shapes and stays idempotent, and that the Lab 1–3 suites still pass unchanged.
12. **E2E (Playwright):** full staff and requester journeys against the `docker compose` stack (API 5000 + web 5173).

### 1.1 Test file layout

The handout section 12 block is a **minimum** structure, and the files it names are
used verbatim. Everything else here is an addition, named in the table under the
block, so a grader diffing the two lists sees the handout's structure intact plus
the extra files Lab 4's own categories need.

```
server/tests/lab-04/                       (handout section 12)
  actions-taken.api.test.ts                <- handout
  ticket-workflow.api.test.ts              <- handout
  requester-dashboard.api.test.ts          <- handout
  staff-dashboard.api.test.ts              <- handout
  resolution-gate.unit.test.ts             + unit, added
  dashboard-queries.unit.test.ts           + unit, added
  authorization.api.test.ts                + authorization category, added
  migration-regression.api.test.ts         + migration/regression category, added
  performance-smoke.api.test.ts            + performance-smoke category, added
client/tests/lab-04/                       (handout section 12)
  ActionsTaken.test.tsx                    <- handout: staff create/edit/conflict/duplicate-guard + requester read-only
  TicketWorkflow.test.tsx                  <- handout: matrix options, confirmation, gate + indication feedback
  RequesterDashboard.test.tsx              <- handout
  StaffDashboard.test.tsx                  <- handout
  DashboardCards.test.tsx                  + shared card behavior on both dashboards, added
  zen-green-lab4-style.test.tsx            + UI style category, added
e2e/lab-04/                                (handout section 12)
  actions-taken-flow.spec.ts               <- handout: staff flow (E2E-01) and requester read-only flow (E2E-02)
  ticket-resolution.spec.ts                <- handout: gate journey (E2E-03) and Part 6 traceability (E2E-05)
  dashboards.spec.ts                       <- handout: drill-down journey (E2E-04)
  responsive.visual.spec.ts                + responsive evidence, added
  states.visual.spec.ts                    + state evidence, added
  visual-audit.spec.ts                     + measured design rules, added
```

Two naming choices are worth stating because the handout's block is terse.
`ActionsTaken.test.tsx` covers both roles in one file because the read-only
Requester view is the negative half of the same component — the staff form, its
absence, and its six fields are one subject, and splitting them would put a
feature and its own regression in two files. `ticket-resolution.spec.ts` carries
E2E-05 as well as E2E-03, because E2E-05 asserts that `assign`, `status
transition`, `complete`, and `cancel` resolve to Ticket-level controls on the same
screen the resolution journey drives.

The three Playwright visual specs and `DashboardCards.test.tsx` are additions with
no handout counterpart: handout section 10 requires responsive coverage and grading
Part 9 requires completed screenshots for "all major Lab 4 screens", which cannot
come out of a single functional spec.

**Test-writing rules.** The rules in `AGENTS.md` apply unchanged and are the reason several rows below are phrased the way they are: no hard-coded seed values (seed facts come from `server/src/lib/seedData.ts` and `seedCredentials.ts`), no timing-based ordering, `fileParallelism: false` already set in `server/vitest.config.ts`, `await screen.findBy*` rather than sleeps in client tests, `await db.$disconnect()` in `afterAll`, and a traceability comment naming the spec anchor on each group.

## 2. Test Cases and Status

Every `Status` below is **`Planned`**. Nothing in this file has been executed — it is the Test DD deliverable written before implementation. Statuses become `Pass` only from a recorded run, and section 6 is where that run is written down.

### Unit (server)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | BR-11, AC-07 | Resolution-gate predicate, standalone | `false` unless a non-blank `resolutionSummary` **and** ≥1 Action Taken; whitespace-only summary counts as blank | `resolution-gate.unit.test.ts` | Planned |
| UNIT-02 | BR-11, BR-13, AC-09 | Gate is unaffected by the requester-resolved indication | A Ticket with `requesterIndicatedResolved = true` and no summary/actions still fails the gate | `resolution-gate.unit.test.ts` | Planned |
| UNIT-03 | BR-25, AC-11 | Urgent predicate | `true` for `itPriority = URGENT`; `true` for `itPriority = null` + `requestedPriority = URGENT`; **`false`** for `itPriority = HIGH` + `requestedPriority = URGENT`; `false` for `RESOLVED`/`CLOSED`/`CANCELLED` at any priority | `dashboard-queries.unit.test.ts` | Planned |
| UNIT-04 | BR-12, AC-08 | Lab 3 transition matrix unchanged | Every pair in the Lab 3 matrix still resolves to the same permitted/denied answer; `IN_PROGRESS → RESOLVED` and `OPEN → CANCELLED` are flagged confirmation-required | `ticket-workflow.api.test.ts` (unit block) | Planned |

> **UNIT-03 is the row that would otherwise be silently wrong.** "Urgent" reads
> naturally as *urgent by any signal*, which would make a Ticket that staff
> deliberately de-escalated to `HIGH` reappear in the urgent list forever. The
> test asserts the staff value **wins**, because that is what BR-25 says and
> because a de-escalation that does not stick is a bug users would report as
> "your fix isn't holding".

### API (server/tests/lab-04)

Request/response behavior, validation, and dashboard calculation. Rows that test
**who** may call an endpoint (`API-03`, `API-04`, `API-05`, `API-40`, `API-41`) are
collected under **Authorization** below rather than duplicated here, because
handout section 10 lists authorization as its own category; rows that test the
transition matrix and the gate (`API-19`..`API-28`) are under **Workflow**. Every
ID keeps its original number and its place in the section 3 traceability table.

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | FR-01, AC-01 | IT Staff creates an Action Taken | `201`; record linked to the Ticket; echoed with `id`, `version: 1`, timestamps | `actions-taken.api.test.ts` | Planned |
| API-02 | FR-02, AC-01 | Body-sent `performedById` is ignored | Send `performedById` of another user; stored `performedById` equals the **session** user | `actions-taken.api.test.ts` | Planned |
| API-06 | FR-03 | List order | `actionDate` ascending; equal `actionDate` keeps insertion order | `actions-taken.api.test.ts` | Planned |
| API-07 | FR-03, AC-05 | Requester reads own Ticket's actions read-only | `200` with the six documented fields and **no** update/delete affordance field | `actions-taken.api.test.ts` | Planned |
| API-08 | FR-04 | Update fields | `actionDate`, `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes` update; `performedById` and `ticketId` do **not** | `actions-taken.api.test.ts` | Planned |
| API-09 | FR-05, AC-02 | `followUpRequired = true` with blank note | `400` with `fields.followUpNote`; **no record created** | `actions-taken.api.test.ts` | Planned |
| API-10 | FR-05, AC-02 | `followUpRequired = false` with a note | `200`; the submitted `followUpNote` is **stored as given**, identically on create and on update — it is not silently discarded (FR-05) | `actions-taken.api.test.ts` | Planned |
| API-11 | FR-01 | `description` / `result` blank or >2000 chars | `400` naming the field; nothing stored | `actions-taken.api.test.ts` | Planned |
| API-12 | FR-01, AC-04 | `actionDate` >5 min ahead | `400`; within the allowance → `201` | `actions-taken.api.test.ts` | Planned |
| API-13 | FR-07, AC-14 | `DELETE /api/actions/:id` | `405` with the error envelope; record still present | `actions-taken.api.test.ts` | Planned |
| API-14 | FR-24, BR-22, AC-13 | Body-sent `assigneeId` is ignored | No assignee column exists; send `assigneeId` and assert it appears nowhere in the response or the row | `actions-taken.api.test.ts` | Planned |
| API-15 | FR-25, BR-23, AC-14 | Body-sent `status` is ignored | The action's response carries no status field; the Ticket's `currentStatus` is unchanged | `actions-taken.api.test.ts` | Planned |
| API-16 | FR-12, AC-06 | Update with the correct `version` | `200`; `version` incremented by one | `actions-taken.api.test.ts` | Planned |
| API-17 | FR-12, AC-06 | Update with a stale `version` | `409`; `data` carries the server's latest copy; DB unchanged | `actions-taken.api.test.ts` | Planned |
| API-18 | BR-15, AC-06 | Update with a **missing** `version` | `400` — required on this endpoint (distinct from API-25) | `actions-taken.api.test.ts` | Planned |
| API-29 | BR-19, FR-14, AC-11 | `unassigned` counts owner-less Tickets only | Cross-checked against a direct `ownerId IS NULL` count | `staff-dashboard.api.test.ts` | Planned |
| API-30 | BR-19, FR-14, AC-11 | `myAssigned` counts the caller's own | Cross-checked against `ownerId = caller` | `staff-dashboard.api.test.ts` | Planned |
| API-31 | FR-14, AC-11 | `byItPriority` always has 5 buckets | Includes a null/not-set bucket; bucket counts sum to the queue total | `staff-dashboard.api.test.ts` | Planned |
| API-32 | FR-15, AC-11 | `userCounts` role-conditional | Present for Administrator, **absent** for IT Staff | `staff-dashboard.api.test.ts` | Planned |
| API-33 | BR-25, AC-11 | `counts.urgentTickets` matches the predicate | Includes the itPriority-URGENT and requestedPriority-URGENT groups; excludes staff-de-escalated and terminal statuses | `staff-dashboard.api.test.ts` | Planned |
| API-34 | BR-25 | `counts.urgentTickets === urgentTickets.length` | Invariant on a seeded DB and on an empty DB | `staff-dashboard.api.test.ts` | Planned |
| API-35 | FR-16, AC-12 | Every drill-down returns exactly the counted set | Each `drillDown` query from `api-spec.md` section 3, followed and compared to the count | `staff-dashboard.api.test.ts` | Planned |
| API-36 | BR-19, AC-10 | Requester dashboard counts own Tickets only | Each `counts` value equals a direct query over the caller's Tickets; another user's Tickets excluded | `requester-dashboard.api.test.ts` | Planned |
| API-37 | BR-23, AC-10 | Requester with zero Tickets | All counts `0`, arrays `[]`, `200` — not an error, not `null` | `requester-dashboard.api.test.ts` | Planned |
| API-38 | BR-20, FR-17, AC-10 | Zero metrics are `0`, never `null` and never `[]` in place of a count | Asserts each numeric field's type | `requester-dashboard.api.test.ts` | Planned |
| API-39 | FR-15, AC-11 | Administrator calling the staff dashboard | `200` including `userCounts` | `staff-dashboard.api.test.ts` | Planned |
| API-42 | FR-16, AC-12 | `statusGroup` filters the staff queue | Each documented group returns only its statuses | `staff-dashboard.api.test.ts` | Planned |
| API-43 | FR-23, BR-09 | Existing Lab 2/3 ticket endpoints unchanged | Spot-check the Lab 3 suite's key assertions still hold on the Lab 4 schema | `migration-regression.api.test.ts` | Planned |

> **API-10 is pinned, not left open.** An earlier draft of this row read "the note
> is ignored **or** stored as given", which lets the row pass either way and so
> proves nothing. FR-05 is explicit — with `followUpRequired = false` the note "is
> stored as submitted and is not required" — so the row asserts storage. The
> alternative would have been to discard it, but silent data loss contradicts
> FR-21/AC-15 (a form must not lose what the user typed); if that decision were
> ever reversed, FR-05 and this row would change together.


### UI component (client/tests/lab-04)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | FR-01, AC-01 | Create form happy path | Correct method, URL, headers, and body incl. the loaded `version`; the new record is rendered | `ActionsTaken.test.tsx` | Planned |
| UI-02 | FR-05, AC-02 | Follow-Up on, note blank | Inline message under Follow-Up Note; **the API call is not made** | `ActionsTaken.test.tsx` | Planned |
| UI-03 | FR-01 | Toggle on reveals and requires the note in the same render | No intermediate state where the field is visible but unvalidated | `ActionsTaken.test.tsx` | Planned |
| UI-04 | FR-20, AC-16 | Single-flight guard | A second click while the first request is in flight produces exactly one network call; the button is disabled and busy | `ActionsTaken.test.tsx` | Planned |
| UI-05 | FR-21, AC-15 | Retention after a `400` | Every entered field value still present; messages shown under their own fields | `ActionsTaken.test.tsx` | Planned |
| UI-06 | FR-21, AC-15 | Retention after a `500` | Same, plus the safe failure callout; **no stack trace or raw error text exposed** | `ActionsTaken.test.tsx` | Planned |
| UI-07 | FR-12, AC-06 | `409` conflict handling | Conflict callout, a Refresh action that loads the server copy, and the user's typing is **not** silently discarded | `ActionsTaken.test.tsx` | Planned |
| UI-08 | FR-01 | `actionDate` >5 min ahead | Inline message naming the 5-minute limit; no request sent | `ActionsTaken.test.tsx` | Planned |
| UI-09 | FR-03 | Panel list order and rendering | Six columns/fields; dates rendered via the Asia/Bangkok formatter | `ActionsTaken.test.tsx` | Planned |
| UI-10 | FR-08, BR-18 | Time-zone formatting | A known UTC timestamp renders as the expected Asia/Bangkok wall-clock time in both dashboards and both action views | `ActionsTaken.test.tsx` | Planned |
| UI-11 | BR-03 | "Performed By" is read-only | Rendered as text; no input, no picker, no editable affordance | `ActionsTaken.test.tsx` | Planned |
| UI-12 | FR-24, BR-22, AC-13 | **No assignee control exists** | Query the rendered panel and form for an assignee field: `queryByLabelText(/assign/i)` is null | `ActionsTaken.test.tsx` | Planned |
| UI-13 | FR-25, BR-23, AC-14 | **No per-action status control exists** | `queryByLabelText(/status/i)` within the action area is null; `queryByLabelText(/complete/i)` and `/cancel/i` are null | `ActionsTaken.test.tsx` | Planned |
| UI-14 | FR-24 | Assign control lives at Ticket level | The owner control is present **on the Ticket**, not on the action | `ActionsTaken.test.tsx` | Planned |
| UI-15 | BR-08, AC-05 | Requester read-only view | No Record, Edit, or Delete control; the six fields still render | `ActionsTaken.test.tsx` | Planned |
| UI-16 | FR-03 | Empty Actions Taken state | A helpful empty block, not a headers-only table | `ActionsTaken.test.tsx` | Planned |
| UI-21 | FR-13, AC-10 | Requester dashboard cards | All six cards render with the server's numbers; the client recomputes none of them | `RequesterDashboard.test.tsx` | Planned |
| UI-22 | FR-17, AC-10 | Zero cards | A `0` card is still rendered with `0` | `RequesterDashboard.test.tsx` | Planned |
| UI-23 | FR-13 | Attention card wording | Reads "Needs your attention", not the raw field name | `RequesterDashboard.test.tsx` | Planned |
| UI-24 | FR-16, AC-12 | Card drill-downs | Each card renders the documented URL as a real link with its number in the accessible name | `DashboardCards.test.tsx` | Planned |
| UI-25 | FR-14, AC-11 | Staff dashboard strip | All five priority buckets render, including "Not set" | `StaffDashboard.test.tsx` | Planned |
| UI-26 | FR-14, AC-11 | Urgent header offers both links | "By IT Priority" and "By Requested Priority" both present and pointing at different queries | `StaffDashboard.test.tsx` | Planned |
| UI-27 | FR-15 | Users card is role-conditional | Renders for an Administrator payload; absent entirely when `userCounts` is missing | `StaffDashboard.test.tsx` | Planned |
| UI-28 | FR-14 | My Recent Actions | Renders the caller's five most recent, each linking to its Ticket | `StaffDashboard.test.tsx` | Planned |
| UI-29 | FR-22 | Console clean | `vi.spyOn(console, 'error')` records nothing unhandled on any new screen, happy path and failure | `DashboardCards.test.tsx` | Planned |

> **UI-12 and UI-13 assert an absence, which is unusual and deliberate.** The
> Part 6 traceability requirement is that `assign`, `status transition`,
> `complete`, and `cancel` mean the **Ticket's** owner and lifecycle, not something
> on an action. A screenshot cannot prove a control is missing — a screenshot
> showing a clean panel is equally consistent with a control that was merely
> cropped out. So the check queries the DOM and asserts null. These two rows are
> the mechanical half of AC-13 and AC-14; the visual half is checklist item 13 in
> `ui-spec.md` section 9.1.

### UI style (client/tests/lab-04)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| STYLE-01 | ui-spec section 1 | No new color token | Computed colors on the new components all resolve to an existing `--color-*` token | `zen-green-lab4-style.test.tsx` | Planned |
| STYLE-02 | ui-spec section 3 | Status and priority badges match the Lab 3 palettes | The same 8 status and 4 priority badge classes used in Lab 3 | `zen-green-lab4-style.test.tsx` | Planned |
| STYLE-03 | ui-spec section 5.5 | Indicated-resolved badge is distinct from the status badge | Different class and different computed color | `zen-green-lab4-style.test.tsx` | Planned |
| STYLE-04 | FR-17, AC-10 | A `0` metric and a `Not set` bucket render, not disappear | Both are present in the DOM with `0` | `zen-green-lab4-style.test.tsx` | Planned |
| STYLE-05 | ui-spec section 3 | Busy/disabled Save state | Disabled attribute plus the spinner while in flight | `zen-green-lab4-style.test.tsx` | Planned |
| STYLE-06 | FR-01 | Required-field markers | Red asterisk on Description, Result, and conditionally Follow-Up Note; messages under their own field via `aria-describedby` | `zen-green-lab4-style.test.tsx` | Planned |
| STYLE-07 | FR-01 | 2000-char counter | Counter present and switches to the error color past the limit | `zen-green-lab4-style.test.tsx` | Planned |
| STYLE-08 | ui-spec section 6 | Layout integrity | No overlap between visible controls; no clipping at all three viewports | `visual-audit.spec.ts` (Playwright) | Planned |
| STYLE-09 | FR-08, BR-18 | Asia/Bangkok rendering on screen | Read the rendered date text and compare to the expected UTC+7 wall clock | `visual-audit.spec.ts` | Planned |
| STYLE-10 | FR-17, AC-10 | Metric cards are visually uniform | Same padding, radius, and number alignment across all cards on a dashboard | `visual-audit.spec.ts` | Planned |

### Authorization

Handout section 10 lists authorization as its own category, and grading Part 6 asks
for "role restrictions" and "inactive-assignee rejection" as named evidence. Both
are therefore collected here instead of being inferred from scattered `403` rows.
`API-03`, `API-04`, `API-05`, `API-40`, and `API-41` moved here from the API
section with their numbers unchanged.

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AUTH-01 | BR-14, AC-13 | `PUT /api/staff/tickets/:id/assign` refuses an **inactive** owner | `404` carrying exactly "Owner must be an active IT Staff or Administrator user"; `ownerId` unchanged; an inactive `REQUESTER` is refused identically. Asserted against a user row read from `db`, not a literal id | `authorization.api.test.ts` | Planned |
| AUTH-02 | BR-08, BR-09, AC-05 | Role matrix over every new write endpoint | `POST /api/tickets/:id/actions`, `PUT /api/actions/:id`, and `PUT /api/staff/tickets/:id/status` each return `403` for a `REQUESTER` (their own Ticket included) and succeed for `IT_STAFF` and `ADMINISTRATOR` — all three roles exercised per endpoint, not sampled | `authorization.api.test.ts` | Planned |
| AUTH-03 | BR-08, AC-05 | Requester reading a **foreign** Ticket's actions | `403`, and the error body carries no row from that Ticket | `authorization.api.test.ts` | Planned |
| AUTH-04 | BR-19, AC-10 | Requester dashboard scope cannot be widened by the client | `?userId=<other user>` and `?requesterId=<other user>` are ignored: the response is deep-equal to the unparameterized call, and another user's Ticket count is unchanged | `authorization.api.test.ts` | Planned |
| AUTH-05 | FR-23, AC-17 | Every new endpoint refuses an unauthenticated caller | `401` on `GET /api/dashboards/requester`, `GET /api/dashboards/staff`, `POST`/`GET /api/tickets/:id/actions`, `PUT /api/actions/:id`, and `PUT /api/staff/tickets/:id/status` | `authorization.api.test.ts` | Planned |
| AUTH-06 | BR-10, api-spec section 2.4 | Method guards answer `405`, not `401`, with no session | `DELETE`, `PATCH`, and `POST /api/actions/:id` return `405` for an anonymous caller, and the stored record is untouched — proving the guard reads nothing | `authorization.api.test.ts` | Planned |
| API-03 | BR-08, AC-05 | Requester cannot create | `403` | `actions-taken.api.test.ts` | Planned |
| API-04 | BR-08, AC-05 | Requester cannot update | `403`; existing record unchanged | `actions-taken.api.test.ts` | Planned |
| API-05 | BR-09 | Staff may act on **any** Ticket in the queue | `201` on a Ticket the caller does not own **and** `201` on one they do — recording an action never requires ownership, which is what BR-09 defines an accessible Ticket to be | `actions-taken.api.test.ts` | Planned |
| API-40 | BR-19 | Requester calling the staff dashboard | `403` | `staff-dashboard.api.test.ts` | Planned |
| API-41 | BR-19 | Unauthenticated | `401` on both dashboard endpoints | `authorization.api.test.ts` | Planned |

> **API-05 used to assert a scenario that cannot happen.** It read "staff cannot
> act on an inaccessible Ticket → `404`", but BR-09 defines an accessible Ticket as
> *any* Ticket in the queue, so there is no inaccessible Ticket for staff to be
> refused. A `404` happens only for an id that does not exist, which is a
> different question from "can I see another person's Ticket". The row now
> asserts the rule as BR-09 states it — staff succeed on both an owned and an
> unowned Ticket — and the genuinely missing case, inactive-assignee `404`
> (BR-14), is AUTH-01 above. The requester-side read/write refusals that AC-05
> actually describes are AUTH-02, AUTH-03, API-03, and API-04.

### Workflow

Handout section 10 also lists workflow as its own category. These rows moved here
from the API and UI component sections with their numbers unchanged; the client
half moved into `TicketWorkflow.test.tsx`, the handout's file name for this
subject.

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| API-19 | BR-11, AC-07 | `IN_PROGRESS → RESOLVED` with no summary and no action | `400` naming the unmet condition; `currentStatus` unchanged | `ticket-workflow.api.test.ts` | Planned |
| API-20 | BR-11, AC-07 | Same, with summary but no action | `400` naming the action condition only | `ticket-workflow.api.test.ts` | Planned |
| API-21 | BR-11, AC-07 | Same, with an action but no summary | `400` naming the summary condition only | `ticket-workflow.api.test.ts` | Planned |
| API-22 | BR-11, AC-07 | Gate met | `200`; `currentStatus = RESOLVED` | `ticket-workflow.api.test.ts` | Planned |
| API-23 | BR-12, AC-08 | Transition outside the matrix | `400`; status unchanged | `ticket-workflow.api.test.ts` | Planned |
| API-24 | FR-12, AC-06 | Status with a stale `version` | `409` with the Ticket's latest copy | `ticket-workflow.api.test.ts` | Planned |
| API-25 | FR-12 | Status with **no** `version` | `200` — last-write-wins, documented and asserted so the escape hatch stays deliberate | `ticket-workflow.api.test.ts` | Planned |
| API-26 | BR-11 | Gate applies to `CLOSED` too | `→ CLOSED` without summary/actions is `400` | `ticket-workflow.api.test.ts` | Planned |
| API-27 | BR-11, BR-12 | Gate does **not** apply elsewhere | `→ CANCELLED` and `→ REOPENED` succeed with no summary and no actions | `ticket-workflow.api.test.ts` | Planned |
| API-28 | FR-11, BR-13, AC-09 | `indicate-resolved` stays advisory | Sets the flag and timestamp; does not change `currentStatus`; does not satisfy the gate | `ticket-workflow.api.test.ts` | Planned |
| UI-17 | BR-11, AC-07 | Gate failure feedback | The message renders **at the status control**, names the unmet condition, and the status badge does not change | `TicketWorkflow.test.tsx` | Planned |
| UI-18 | BR-12, AC-08 | Only permitted targets are offered | The dropdown for `IN_PROGRESS` contains `RESOLVED` but not `CANCELLED` | `TicketWorkflow.test.tsx` | Planned |
| UI-19 | BR-12 | Confirmation-required transitions | `OPEN → CANCELLED` and `IN_PROGRESS → RESOLVED` raise a dialog naming the exact transition; cancelling sends nothing | `TicketWorkflow.test.tsx` | Planned |
| UI-20 | FR-11, BR-13, AC-09 | Requester-indicated-resolved badge | Rendered and visually distinct from the status badge | `TicketWorkflow.test.tsx` | Planned |

> **The gate is tested at both levels on purpose.** API-19..API-22 prove the
> backend refuses the transition no matter what sent the request, which is the
> handout section 4.5 requirement. UI-17 proves the user finds out: the message
> appears where they acted, names which condition is missing, and the badge does
> not move. Either half alone would let the other regress unnoticed.

### Accessibility

Handout section 10 asks the plan to identify the remaining **accessibility**
tests alongside the ten categories, and grading Part 9 asks for a completed
accessibility checklist. Scope note: these rows and the `ui-spec.md` section 9.1
checklist are **not** a full WCAG sweep — there is no axe run and no
screen-reader pass (see section 7). They cover the four things handout section 7
names for this project: keyboard operation, visible focus, semantic labels, and
non-color status cues.

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A11Y-01 | ui-spec section 7 | Semantic labels on every Action Taken form control | `getByLabelText` resolves Action Date/Time, Description, Result, Follow-Up Required, Follow-Up Note, and Attachment Notes; no control is identifiable only by placeholder, and the conditionally required note is labelled as required | `ActionsTaken.test.tsx` | Planned |
| A11Y-02 | ui-spec section 7 | Dashboard cards are real links carrying their number | Each card renders an anchor whose accessible name includes both its label and its count (e.g. "Open tickets, 7"); a `div` with `onClick` fails the query | `DashboardCards.test.tsx` | Planned |
| A11Y-03 | ui-spec section 7 | Status and priority are never conveyed by color alone | Every rendered status and priority badge has non-empty text content equal to its value, in the Actions Taken table, both dashboards, and the urgent list | `zen-green-lab4-style.test.tsx` | Planned |
| A11Y-04 | ui-spec section 7 | Save outcome, conflict, and gate failure are announced | The result region is `aria-live="polite"` and a save success populates it; the `409` callout and the gate callout are `role="alert"` | `ActionsTaken.test.tsx`, `TicketWorkflow.test.tsx` | Planned |
| A11Y-05 | ui-spec section 7 | The Actions Taken table and its form are keyboard-operable | Tab reaches the Actions Taken tab, then each row's Edit button, in reading order with no positive `tabindex`; Enter opens Edit; the form dialog traps focus, closes on Escape, and returns focus to the trigger | `ActionsTaken.test.tsx` | Planned |

> **Accessibility evidence that lives outside this group.** `STYLE-08` measures
> that the 2px focus ring is present and visible at all three viewports,
> `STATE-19..21` capture that ring on a tab and a row Edit button, `UI-12`/`UI-13`
> prove the removed controls are really gone, and `ui-spec.md` section 9.1 rows
> 28–31 are the student's own keyboard pass. Those stay where they are because
> they are visual and functional evidence as much as accessibility evidence;
> duplicating them here would create two IDs for one assertion.

### Responsive (Playwright)

Screens × viewports. Each screen is three consecutive IDs in the order
**desktop, tablet, mobile**, so a single failing row names the viewport:

| Test ID | Screen | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| RESP-01..03 | Requester dashboard, with data | AC-18 | Layout integrity | Five plain count cards in one row at ≥1200px with the attention card full-width beneath, two lists side by side, no clipping or overlap | `responsive.visual.spec.ts` | Planned |
| RESP-04..06 | Requester dashboard, zero data | AC-10, AC-18 | Zero-metric layout | All six cards render with `0` in the arrangement above; both lists show the empty block; **no card collapses** | `responsive.visual.spec.ts` | Planned |
| RESP-07..09 | IT Staff dashboard (IT Staff role) | AC-11, AC-18 | Layout integrity | Four status cards, two ownership cards, the five-bucket strip, urgent list, My Recent Actions; **no `userCounts` card** | `responsive.visual.spec.ts` | Planned |
| RESP-10..12 | IT Staff dashboard (Administrator role) | AC-11, AC-18 | Role-conditional layout | Same, plus the Users card | `responsive.visual.spec.ts` | Planned |
| RESP-13..15 | Staff Ticket Actions Taken, list | AC-18 | Six-column table | All six columns legible; Notes wraps to a second line on tablet | `responsive.visual.spec.ts` | Planned |
| RESP-16..18 | Staff Ticket Action form | AC-18 | Drawer at desktop, bottom sheet on tablet, full-screen on mobile | Every field reachable; Save reachable without scrolling the form off-screen | `responsive.visual.spec.ts` | Planned |
| RESP-19..21 | Requester Ticket Actions Taken | AC-05, AC-18 | Read-only layout | Six fields render; no Record/Edit/Delete control at any width | `responsive.visual.spec.ts` | Planned |
| RESP-22..24 | Workflow gate blocked | AC-07, AC-18 | Gate message layout | The message sits at the status control and does not overlap it; the badge is visibly unchanged | `responsive.visual.spec.ts` | Planned |
| RESP-25..27 | Confirmation dialog | AC-08, AC-18 | Dialog layout | Names the exact transition; both actions reachable at 375px | `responsive.visual.spec.ts` | Planned |
| RESP-28..30 | Staff Actions Taken, empty | FR-03, AC-18 | Empty-state layout | A helpful empty block, not a headers-only table | `responsive.visual.spec.ts` | Planned |

**Every capture run asserts zero horizontal page scroll at 375px** — checked in
each of the 30 runs, not sampled, because the mobile layout is the one that
breaks.

### Visual state evidence (Playwright)

States a happy-path screenshot cannot show. Same three-viewport structure:

| Test ID | State | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| STATE-01..03 | Action save conflict | FR-12, AC-06 | The real `409` callout | Conflict callout and a Refresh action; typed values still on screen | `states.visual.spec.ts` | Planned |
| STATE-04..06 | Action form validation errors | FR-05, AC-02 | Multiple field errors at once | Each message under its own field; required asterisks visible | `states.visual.spec.ts` | Planned |
| STATE-07..09 | Form retained after a safe failure | FR-21, AC-15 | A `500` response | Every entered value still present; safe callout; no raw error text | `states.visual.spec.ts` | Planned |
| STATE-10..12 | Dashboard loading | FR-17 | Loading skeletons | Cards and lists reserve space; no layout shift when data lands | `states.visual.spec.ts` | Planned |
| STATE-13..15 | Dashboard zero metrics | FR-17, AC-10 | `0` values | Cards show `0`; the "Not set" priority bucket is still present | `states.visual.spec.ts` | Planned |
| STATE-16..18 | Dashboard error + retry | BR-20 | Failed load | Error block with a working Retry; **no stale numbers left on screen** | `states.visual.spec.ts` | Planned |
| STATE-19..21 | Actions Taken keyboard focus | ui-spec section 7 | Focus ring on the tab and a row Edit button | The 2px ring is visible on the control it sits on | `states.visual.spec.ts` | Planned |
| STATE-22..24 | Gate blocked, both conditions unmet | BR-11, AC-07 | Combined gate message | Names both conditions; status badge unchanged | `states.visual.spec.ts` | Planned |
| STATE-25..27 | Confirm dialog open | BR-12 | Dialog presentation | Focus trapped inside; exact transition named | `states.visual.spec.ts` | Planned |

### Performance smoke (server)

Handout section 10 names **performance-smoke** as a mandated category. This is a
smoke check, not a benchmark: no load profile, no concurrency sweep, no
percentile reporting. The handout states no millisecond figure anywhere, so the
thresholds below are a **project-chosen value** — their purpose is to make a
regression show up as a failing test instead of a surprise during a
demonstration. They are measured on the seeded development database (Lab 1–3 plus
the Lab 4 block, roughly 360 Tickets) on the same machine that runs the rest of
the suite, so the numbers are comparable run to run and are not a claim about
production hardware.

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PERF-01 | FR-13, FR-17, BR-17, AC-10 | `GET /api/dashboards/requester` latency | `200` in under **300 ms** | `performance-smoke.api.test.ts` | Planned |
| PERF-02 | FR-14, FR-17, BR-17, AC-11 | `GET /api/dashboards/staff` latency, computed as **one aggregate** over the whole payload | `200` in under **300 ms** | `performance-smoke.api.test.ts` | Planned |
| PERF-03 | FR-03, BR-06 | `GET /api/tickets/:id/actions` on the seeded Ticket carrying the most actions | `200` in under **200 ms** | `performance-smoke.api.test.ts` | Planned |
| PERF-04 | FR-16, AC-12 | Every drill-down query a dashboard card issues | Each `statusGroup` / `currentStatus` / `itPriority` / `requestedPriority` / `ownerId` query in `api-spec.md` section 4.1 returns `200` in under **300 ms** | `performance-smoke.api.test.ts` | Planned |

> **PERF-02 is the row that earns the category.** The staff payload carries seven
> `counts`, a five-entry `byItPriority`, and three capped lists. An
> implementation that fires one query per metric and per bucket would pass a
> functional test and still be visibly slow on the queue screen, and the only
> place that shows up is a timing assertion. PERF-02 therefore measures the whole
> response, so splitting it into twelve round trips fails.
>
> Two rules keep these rows honest. `Date.now()` around a Supertest call is a
> **measurement**, not an ordering device, so it does not conflict with the
> no-timing-ordering rule in `AGENTS.md` — no assertion depends on *which* request
> finishes first, only on how long the measured one took. And the Ticket PERF-03
> picks is found by counting `ActionTaken` rows per `ticketId` in the database
> rather than by naming one, per the no-hard-coded-seed-values rule; if the seed
> changes, the row follows it.

### E2E (Playwright)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | AC-01, AC-02 | Staff records an action end to end | Save; row appears with the performer as the logged-in user; a `409` path is exercised on a second edit | `actions-taken-flow.spec.ts` | Planned |
| E2E-02 | AC-05 | Requester reads actions and cannot write | Six fields visible; no Record/Edit/Delete control; a direct API call from the browser session returns `403` | `actions-taken-flow.spec.ts` | Planned |
| E2E-03 | AC-07, AC-08, AC-09 | Resolution gate journey | Blocked attempt shows the message and the badge holds; after a summary plus an action, `RESOLVED` succeeds; the confirmation dialog names the transition | `ticket-resolution.spec.ts` | Planned |
| E2E-04 | AC-10, AC-11, AC-12 | Dashboard drill-down | Every card's count equals the list it opens; the urgent card reaches both urgent groups; Administrator sees the Users card | `dashboards.spec.ts` | Planned |
| E2E-05 | AC-13, AC-14 | Part 6 traceability in the UI | The owner control is at Ticket level; no assignee or per-action status control exists in either view; `complete`/`cancel` reach `RESOLVED`/`CLOSED`/`CANCELLED` on the Ticket | `ticket-resolution.spec.ts` | Planned |
| E2E-06 | FR-22 | Console clean | No uncaught console error across the Lab 4 journeys | all Lab 4 specs | Planned |

### Migration / Regression

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| MIG-01 | FR-23, AC-17 | Lab 1–3 data survives the Lab 4 migration | Row-count floors for `Requester`, `Category`, `RelatedSystem`, `Ticket`, `Attachment`, `User`, `PublicComment`, `InternalNote`; FK integrity; the new `ActionTaken` table starts empty | `migration-regression.api.test.ts` | Planned |
| MIG-02 | BR-24 | Lab 4 seed block is collision-free | No Lab 4 ticket number collides with an existing row; the block is `TKT-2026-000903`..`TKT-2026-000917`, asserted against the actual DB rather than a literal | `migration-regression.api.test.ts` | Planned |
| MIG-03 | BR-24 | Seed idempotency | Seeding twice produces the same counts — no duplicated tickets or actions | `migration-regression.api.test.ts` | Planned |
| MIG-04 | FR-23, handout section 5.2 | The **documented rollback path actually works** | Against a **scratch** database, never the shared dev DB: record pre-rollback row counts → revert `lab4_actions_taken` (`prisma migrate resolve --rolled-back`, or restore from a dump) → assert the Lab 1–3 tables and their counts are byte-identical → re-apply → assert `ActionTaken` exists again and is empty | `migration-regression.api.test.ts` | Planned |
| MIG-05 | BR-21, handout section 5.3 | Seed covers **zero / exactly one / multiple** Action Taken | A Ticket with 0 actions, a Ticket with exactly 1, and a Ticket with ≥2 all exist, plus the pair sharing one `actionDate` — counted against `server/src/lib/seedData.ts`, never a literal ticket id or count | `migration-regression.api.test.ts` | Planned |
| REG-01 | FR-23, AC-17 | Lab 1–3 suites pass unchanged | `cd server && pnpm test`, `cd client && pnpm test`, **and** `pnpm test:e2e` (the Lab 2 + Lab 3 Playwright specs) all green, with no Lab 1–3 test **or spec** edited to accommodate Lab 4 | manual run, recorded in section 6 | Planned |
| REG-02 | FR-23, AC-17 | `GET /api/health` unchanged | Exactly `{"status":"ok","service":"TokTickIT API"}` — no version, timestamp, or uptime field added | `migration-regression.api.test.ts` | Planned |

> **REG-01 has a rule attached, not just a status.** "Pass unchanged" is the whole
> point: a green suite that only got green after editing a Lab 3 assertion is a
> regression, not a pass. If an implementation change forces a Lab 1–3 test edit,
> that edit needs a written justification in `ai-use.md`, and it does not get to
> be quietly folded in. It covers the **E2E** specs as well as the unit and
> component suites, because AC-17 asks for "the regression suites **and the E2E
> specs**", and a Playwright spec is just as capable of being edited to fit as a
> Vitest assertion.
>
> **MIG-04 is a scratch-database test and says so in its own comment.** Handout
> section 5.2 requires the rollback or recovery approach to be "documented **and
> tested**", and `specification.md` section 7 documents it — which satisfies half
> the sentence. The other half needs a test, and it must never roll back the
> database the rest of the suite is asserting against, so the row states the
> scratch-DB constraint as part of its expected result rather than leaving it to a
> reader's judgment. It is deliberately a **separate row** from MIG-02: handout
> `issues.md` line 186 assigns rollback verification to the Issue 25 work and
> points it at MIG-02, but MIG-02 is already spoken for by seed-number collision
> (BR-24), and folding two unrelated subjects into one row would make the row fail
> for a reason that has nothing to do with either.

## 3. Acceptance-Criterion Traceability

Every AC maps to at least one test. Where an AC has both a mechanical half and a
visual half, both are listed, because the visual half is the only evidence for
"it reads correctly" and the mechanical half is the only evidence for "it is
present at all".

| AC | Tests |
| :--- | :--- |
| AC-01 | API-01, API-02, UI-01, E2E-01 |
| AC-02 | API-09, API-10, UI-02, E2E-01 |
| AC-03 | API-06, UI-09 |
| AC-04 | API-12, UI-08 |
| AC-05 | API-03, API-04, API-07, AUTH-02, AUTH-03, UI-15, E2E-02 |
| AC-06 | API-16, API-17, API-18, API-24, UI-07, E2E-01 |
| AC-07 | UNIT-01, UNIT-02, API-19, API-20, API-21, API-22, UI-17, E2E-03 |
| AC-08 | UNIT-04, API-23, UI-18, UI-19, E2E-03 |
| AC-09 | UNIT-02, API-28, UI-20, E2E-03 |
| AC-10 | API-36, API-37, API-38, AUTH-04, UI-21, UI-22, UI-23, STYLE-04, E2E-04 |
| AC-11 | UNIT-03, API-29..34, API-39, UI-25, UI-26, UI-27, E2E-04 |
| AC-12 | API-35, API-42, UI-24, E2E-04 |
| AC-13 | API-14, AUTH-01, UI-12, UI-14, E2E-05, ui-spec 9.1 item 13 |
| AC-14 | API-13, API-15, UI-13, E2E-05, ui-spec 9.1 item 13 |
| AC-15 | UI-05, UI-06 |
| AC-16 | UI-04 |
| AC-17 | MIG-01, MIG-02, MIG-03, REG-01, REG-02, AUTH-05 |
| AC-18 | RESP-01..30, STYLE-08, STYLE-09, STYLE-10, ui-spec 9.1 (all 34 rows) |

`API-05` was in this table under AC-05 and has been removed. It asserted a staff
member being refused on an "inaccessible" Ticket, which BR-09 makes impossible,
and AC-05 is about what a **Requester** may do — see the note under the
Authorization heading. `AUTH-01` is new under AC-13, because AC-13 names the
inactive-owner `404` and until now no row asserted it. `API-42` is new under
AC-12, because AC-12 is the drill-down criterion and `statusGroup` is the filter a
five-status card cannot be expressed without.

**AC-15, AC-16, and AC-17 are client-only or cross-suite by nature.** Field
retention after a failure and the single-flight guard are properties of what the
browser does with a request, so an API-level test cannot prove either; they are
tested in jsdom against a mocked network, where the in-flight window can actually
be held open. AC-17 is proven by running the **previous** suites, not by writing a
new one, which is why REG-01 is recorded as a run in section 6 rather than as a
test file.

**Four groups are cross-cutting rather than AC-bound, and that is deliberate.**
`A11Y-01..05` answer handout section 10's accessibility requirement and section
7's four named rules; `PERF-01..04` answer handout section 10's performance-smoke
requirement; `MIG-04` and `MIG-05` answer handout sections 5.2 and 5.3. None of
them belongs to a single AC, so they are listed by requirement instead of being
forced into an AC row they do not prove. They are still executable tests with
recorded statuses, which is what handout section 10 and grading Part 3 ask for.

## 4. Responsive and Visual Checklist

Covered by RESP-01..30 (screens), the state captures, and STYLE-08..10 (measured
rules), with per-item test IDs in the `Auto (test ID)` column of
`ui-spec.md` section 9.1 — 34 rows, every one currently `Pending`.

Two rows there are **not** photographable and lean on a DOM query instead:
item 13 (no assignee / per-action status control) is backed by UI-12 and UI-13,
because a screenshot cannot distinguish "absent" from "cropped". Item 29 (focus
ring) is backed by STYLE-08 and by the student's own keyboard pass, since no
capture has anything focused.

What the automation deliberately does **not** claim: a computed check is not a
design judgement. The `Manual pass (student sign-off)` column carries the
student's own verdict on the screenshots in `artifacts/lab-04/screenshots/`,
recorded per row in `ui-spec.md` section 9.1. It is a human column, because "does
this read correctly" is the one question a test cannot answer. The visual specs
capture and assert; they do **not** pixel-diff against a baseline, so a
deliberate design change will not fail the run — it has to be reviewed.

## 5. Test Commands

```bash
docker compose up -d                      # repo root — PostgreSQL first
cd server && pnpm exec prisma migrate deploy && pnpm exec prisma db seed   # once per fresh DB

# Lab 4 suites
cd server && pnpm test                    # unit + API suites (incl. labs 1-4)
cd ../client && pnpm test                 # component + style suites (incl. labs 1-4)
cd .. && pnpm test:e2e:lab4               # lab-04 E2E — desktop-project only, workers=1
cd .. && pnpm exec playwright test e2e/lab-04/responsive.visual.spec.ts \
  e2e/lab-04/states.visual.spec.ts e2e/lab-04/visual-audit.spec.ts

# Labs 1-3 regression — REQUIRED by AC-17 / REG-01, not optional extra work
cd .. && pnpm test:e2e                    # lab-02 + lab-03 Playwright regression
cd server && pnpm test && cd ../client && pnpm test    # lab 1-3 unit + component suites
```

`pnpm exec prisma db seed` must run first: like the Lab 3 suite, these tests assert
against seeded data, and MIG-02/MIG-03/MIG-05 in particular are about what the
seed produced.

### 5.1 One script that does not exist yet

`pnpm test:e2e:lab4` is **not in the root `package.json` today** — the root scripts
are `test:e2e`, `test:e2e:headed`, and `test:e2e:lab3`, and `test:e2e` currently
covers `e2e/lab-02` and `e2e/lab-03` only. Writing the command here before the
script exists would hand a grader a command that errors on the first try.

| Script | Status | Owner |
| :--- | :--- | :--- |
| `test:e2e:lab4` → `e2e/lab-04`, desktop project, `workers=1` | **To be added** | Issue 29 (#82) Comprehensive Testing — it owns the test harness |
| `test:e2e` widened to `e2e/lab-02 e2e/lab-03 e2e/lab-04` | **To be widened** | Issue 29 (#82), same PR |

Until Issue 29 lands them, run the Lab 4 E2E specs with
`pnpm exec playwright test e2e/lab-04 --project=desktop --workers=1`, and run
`pnpm test:e2e` for the Lab 2/3 regression exactly as it is written above. Neither
gap is a reason to skip the run.

## 6. Results

*Empty until the sprint's test run happens.* This section is filled from actual
runs — suite size, pass/fail count, date, and the DB state it ran against. A row
is only written here after the run it describes.

| Suite | Command | Result |
|-------|---------|--------|
| Server (unit + API) | `cd server && pnpm test` | Not run |
| Client (component + style) | `cd client && pnpm test` | Not run |
| E2E (Playwright, functional) | `pnpm test:e2e:lab4` | Not run |
| E2E (Playwright, visual + audit) | the three `*.visual.spec.ts` files | Not run |
| E2E regression, Labs 2–3 | `pnpm test:e2e` | Not run |
| Server + client regression, Labs 1–3 | `cd server && pnpm test` and `cd client && pnpm test` | Not run |
| Build | `cd server && pnpm build` and `cd client && pnpm build` | Not run |

## 7. Known Limitations / Deferred

Carried over from Lab 3 and still deferred:

- Login rate limiting / account lockout (BR-06 of Lab 3).
- No full WCAG sweep — no axe run, no screen-reader pass. `A11Y-01..05`,
  `STYLE-08..10`, and `STATE-19..21` cover semantic labels, keyboard operation,
  focus visibility, and non-color cues; the judgement stays in the student's
  manual checklist column (`ui-spec.md` section 9.1 rows 28–31).
- No load or concurrency testing. `PERF-01..04` is a wall-clock smoke check on a
  single request against the seeded dev database; there is no percentile
  reporting, no profile under load, and no claim about production hardware.
- Playwright visual comparison is screenshot-capture + checklist review, not
  pixel-diff regression.
- Advanced user-list pagination/sorting/filtering (Lab 3 deferral, unchanged).

Deferred **within** Lab 4:

- No idempotency key for Action Taken submission (AD-05). The single-flight guard
  is client-side, so a dropped connection and an impatient retry can still
  produce two records. A real fix needs server-side dedupe storage, which was
  ruled out of scope; UI-04 proves the guard works in the browser, and says
  nothing about that case.
- No `GET` pagination for the Action Taken list. A Ticket with hundreds of actions
  returns them all. Acceptable at this lab's scale, and the six-column comparison
  view is the reason; flagged rather than silently accepted.
- No server-side reordering of actions. The order is `actionDate` then insertion
  (AC-03), so back-dating an action places it correctly without a drag handle.
- Status transition with no `version` is last-write-wins by design (FR-12,
  BR-15). Documented rather than prevented; API-25 exists so the escape hatch
  cannot grow unnoticed.
- Deep pagination on dashboards is not implemented; the lists are capped (5
  recent, 10 urgent) rather than paginated.

Two states will need **deliberate help** to photograph, the same pattern Lab 3
used, and it should be recorded here before the run rather than discovered during
it:

- **Gate-blocked.** A seeded Ticket may already satisfy the gate. The capture
  needs a Ticket that is `IN_PROGRESS` with deliberately no summary and no
  actions, which means either a throwaway Ticket or a stubbed API response.
- **Empty Actions Taken.** A seeded Ticket may already have actions. Photographing
  the real empty state means pointing the panel at a Ticket that genuinely has
  none, not one whose actions were hidden.

Whichever approach is used, the checklist row must say which — a screenshot of a
stubbed response is evidence about the markup, not about the data, and the
distinction matters to whoever reads it later.

---

*This is the Lab 4 Test DD deliverable, written before implementation. Every
status is `Planned` because nothing has been executed. As the sprint proceeds,
section 2's `Status` column and section 6's results are filled from real runs, and
any behavior change updates this file together with `specification.md`,
`api-spec.md`, and `ui-spec.md`.*

## 8. Amendment Log

| Version | Date | Change | Approved by |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-10-04 | Initial Lab 4 test plan. | Approved (student, 2026-10-04) |
| v1.1 | 2026-10-04 | Review pass against the handout and the other three Lab 4 documents. Added the three missing handout section 10 categories — **Authorization** (`AUTH-01..06`, plus `API-03/04/05/40/41` moved in with their numbers unchanged), **Workflow** (`API-19..28`, `UI-17..20` moved in), **Performance smoke** (`PERF-01..04`) — and **Accessibility** (`A11Y-01..05`). Added `MIG-04` (the documented rollback path, handout section 5.2) and `MIG-05` (seed zero/one/multiple, section 5.3). Rewrote `API-05` to match BR-09 instead of asserting an impossible refusal, pinned `API-10` to FR-05's "stored as submitted" instead of allowing either outcome, and re-homed it in the AC table. Adopted the handout section 12 file names verbatim and documented each added file. Recorded that `pnpm test:e2e:lab4` does not exist yet and named Issue 29 (#82) as its owner; extended REG-01 to the Lab 2/3 E2E specs per AC-17. Section 1 now counts twelve levels, matching the twelve headings in section 2. | Approved (student, 2026-10-04) |

---

**Approval:** Approved by the student on 2026-10-04, covering the test plan, the
twelve test levels, and the section 1.1 test-file layout. Approval is of the
**plan**, not of any result: no case has been executed, so every status in
section 2 is still `Planned` and section 6 is still empty.
