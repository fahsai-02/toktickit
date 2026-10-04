# Lab 4 Test Plan and Results

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 4: Actions Taken, Ticket Workflow, and Role Dashboards |
| **Version** | v1.0 — Draft 2026-10-04 (awaiting student approval; **no case has been executed yet**) |
| **Date** | 2026-10-04 |
| **Traceability source** | `specification.md` v1.0 AC-01..18 · `api-spec.md` v1.0 · `ui-spec.md` v1.0 |

---

## 1. Test Strategy

Seven test levels, matching the Lab 3 plan it extends:

1. **Unit (server):** pure logic without DB/HTTP — the resolution gate predicate, the urgent-Ticket predicate (BR-25), and dashboard count predicates. The status-transition matrix from Lab 3 is re-asserted here because Lab 4 adds the gate on top of it.
2. **API / integration (server):** Supertest against the real Express app + seeded PostgreSQL. Asserts status codes, the error envelope, session auth, role access, ownership isolation, validation, the gate, and version conflicts.
3. **UI component (client):** Vitest + Testing Library in jsdom, mocking the API layer. Asserts user-visible behavior, the states, client-side validation, field retention after a failure, and the single-flight guard.
4. **UI style (client):** automated assertions that the Zen Green tokens are applied on the new components and that the no-assignee/no-status controls are genuinely absent (FR-24, FR-25 — an absence has to be asserted, since a screenshot cannot prove one).
5. **Responsive:** Playwright at 1440×900, 820×1180, 375×844 — layout integrity, no horizontal scroll on mobile, screenshots for the visual checklist.
6. **E2E (Playwright):** full staff and requester journeys against the `docker compose` stack (API 5000 + web 5173).
7. **Migration / Regression:** verifies Lab 1–3 data survived the Lab 4 migration, that the new seed block is idempotent, and that the Lab 1–3 suites still pass unchanged.

Test files live where the handout requires and where `AGENTS.md` already establishes them:

```
server/tests/lab-04/
  resolution-gate.unit.test.ts      dashboard-queries.unit.test.ts
  actions-taken.api.test.ts         workflow-status.api.test.ts
  dashboards.api.test.ts            migration-regression.api.test.ts
client/tests/lab-04/
  ActionsTakenForm.test.tsx   ActionsTakenPanel.test.tsx   DashboardCards.test.tsx
  workflow-feedback.test.tsx  staff-dashboard.test.tsx     requester-dashboard.test.tsx
  zen-green-lab4-style.test.tsx
e2e/lab-04/
  staff-actions-taken.spec.ts  requester-actions-readonly.spec.ts
  ticket-workflow.spec.ts      dashboard-drilldown.spec.ts
  responsive.visual.spec.ts    states.visual.spec.ts       visual-audit.spec.ts
```

**Test-writing rules.** The rules in `AGENTS.md` apply unchanged and are the reason several rows below are phrased the way they are: no hard-coded seed values (seed facts come from `server/src/lib/seedData.ts` and `seedCredentials.ts`), no timing-based ordering, `fileParallelism: false` already set in `server/vitest.config.ts`, `await screen.findBy*` rather than sleeps in client tests, `await db.$disconnect()` in `afterAll`, and a traceability comment naming the spec anchor on each group.

## 2. Test Cases and Status

Every `Status` below is **`Planned`**. Nothing in this file has been executed — it is the Test DD deliverable written before implementation. Statuses become `Pass` only from a recorded run, and section 6 is where that run is written down.

### Unit (server)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | BR-11, AC-07 | Resolution-gate predicate, standalone | `false` unless a non-blank `resolutionSummary` **and** ≥1 Action Taken; whitespace-only summary counts as blank | `resolution-gate.unit.test.ts` | Planned |
| UNIT-02 | BR-11, BR-13, AC-09 | Gate is unaffected by the requester-resolved indication | A Ticket with `requesterIndicatedResolved = true` and no summary/actions still fails the gate | `resolution-gate.unit.test.ts` | Planned |
| UNIT-03 | BR-25, AC-11 | Urgent predicate | `true` for `itPriority = URGENT`; `true` for `itPriority = null` + `requestedPriority = URGENT`; **`false`** for `itPriority = HIGH` + `requestedPriority = URGENT`; `false` for `RESOLVED`/`CLOSED`/`CANCELLED` at any priority | `dashboard-queries.unit.test.ts` | Planned |
| UNIT-04 | BR-12, AC-08 | Lab 3 transition matrix unchanged | Every pair in the Lab 3 matrix still resolves to the same permitted/denied answer; `IN_PROGRESS → RESOLVED` and `OPEN → CANCELLED` are flagged confirmation-required | `workflow-status.api.test.ts` (unit block) | Planned |

> **UNIT-03 is the row that would otherwise be silently wrong.** "Urgent" reads
> naturally as *urgent by any signal*, which would make a Ticket that staff
> deliberately de-escalated to `HIGH` reappear in the urgent list forever. The
> test asserts the staff value **wins**, because that is what BR-25 says and
> because a de-escalation that does not stick is a bug users would report as
> "your fix isn't holding".

### API (server/tests/lab-04)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | FR-01, AC-01 | IT Staff creates an Action Taken | `201`; record linked to the Ticket; echoed with `id`, `version: 1`, timestamps | `actions-taken.api.test.ts` | Planned |
| API-02 | FR-02, AC-01 | Body-sent `performedById` is ignored | Send `performedById` of another user; stored `performedById` equals the **session** user | `actions-taken.api.test.ts` | Planned |
| API-03 | BR-08, AC-05 | Requester cannot create | `403` | `actions-taken.api.test.ts` | Planned |
| API-04 | BR-08, AC-05 | Requester cannot update | `403`; existing record unchanged | `actions-taken.api.test.ts` | Planned |
| API-05 | BR-09, AC-05 | Staff cannot act on an inaccessible Ticket | `404` (not `403`) so the route does not confirm another Ticket's existence | `actions-taken.api.test.ts` | Planned |
| API-06 | FR-03 | List order | `actionDate` ascending; equal `actionDate` keeps insertion order | `actions-taken.api.test.ts` | Planned |
| API-07 | FR-03, AC-05 | Requester reads own Ticket's actions read-only | `200` with the six documented fields and **no** update/delete affordance field | `actions-taken.api.test.ts` | Planned |
| API-08 | FR-04 | Update fields | `actionDate`, `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes` update; `performedById` and `ticketId` do **not** | `actions-taken.api.test.ts` | Planned |
| API-09 | FR-05, AC-02 | `followUpRequired = true` with blank note | `400` with `fields.followUpNote`; **no record created** | `actions-taken.api.test.ts` | Planned |
| API-10 | FR-05, AC-02 | `followUpRequired = false` with a note | `200`; the note is ignored or stored as given per `api-spec.md`, consistently on create and update | `actions-taken.api.test.ts` | Planned |
| API-11 | FR-01 | `description` / `result` blank or >2000 chars | `400` naming the field; nothing stored | `actions-taken.api.test.ts` | Planned |
| API-12 | FR-01, AC-04 | `actionDate` >5 min ahead | `400`; within the allowance → `201` | `actions-taken.api.test.ts` | Planned |
| API-13 | FR-07, AC-14 | `DELETE /api/actions/:id` | `405` with the error envelope; record still present | `actions-taken.api.test.ts` | Planned |
| API-14 | FR-24, BR-22, AC-13 | Body-sent `assigneeId` is ignored | No assignee column exists; send `assigneeId` and assert it appears nowhere in the response or the row | `actions-taken.api.test.ts` | Planned |
| API-15 | FR-25, BR-23, AC-14 | Body-sent `status` is ignored | The action's response carries no status field; the Ticket's `currentStatus` is unchanged | `actions-taken.api.test.ts` | Planned |
| API-16 | FR-12, AC-06 | Update with the correct `version` | `200`; `version` incremented by one | `actions-taken.api.test.ts` | Planned |
| API-17 | FR-12, AC-06 | Update with a stale `version` | `409`; `data` carries the server's latest copy; DB unchanged | `actions-taken.api.test.ts` | Planned |
| API-18 | BR-15, AC-06 | Update with a **missing** `version` | `400` — required on this endpoint (distinct from API-25) | `actions-taken.api.test.ts` | Planned |
| API-19 | BR-11, AC-07 | `IN_PROGRESS → RESOLVED` with no summary and no action | `400` naming the unmet condition; `currentStatus` unchanged | `workflow-status.api.test.ts` | Planned |
| API-20 | BR-11, AC-07 | Same, with summary but no action | `400` naming the action condition only | `workflow-status.api.test.ts` | Planned |
| API-21 | BR-11, AC-07 | Same, with an action but no summary | `400` naming the summary condition only | `workflow-status.api.test.ts` | Planned |
| API-22 | BR-11, AC-07 | Gate met | `200`; `currentStatus = RESOLVED` | `workflow-status.api.test.ts` | Planned |
| API-23 | BR-12, AC-08 | Transition outside the matrix | `400`; status unchanged | `workflow-status.api.test.ts` | Planned |
| API-24 | FR-12, AC-06 | Status with a stale `version` | `409` with the Ticket's latest copy | `workflow-status.api.test.ts` | Planned |
| API-25 | FR-12 | Status with **no** `version` | `200` — last-write-wins, documented and asserted so the escape hatch stays deliberate | `workflow-status.api.test.ts` | Planned |
| API-26 | BR-11 | Gate applies to `CLOSED` too | `→ CLOSED` without summary/actions is `400` | `workflow-status.api.test.ts` | Planned |
| API-27 | BR-11, BR-12 | Gate does **not** apply elsewhere | `→ CANCELLED` and `→ REOPENED` succeed with no summary and no actions | `workflow-status.api.test.ts` | Planned |
| API-28 | FR-11, BR-13, AC-09 | `indicate-resolved` stays advisory | Sets the flag and timestamp; does not change `currentStatus`; does not satisfy the gate | `workflow-status.api.test.ts` | Planned |
| API-29 BR-19, FR-14, AC-11 | `unassigned` counts owner-less Tickets only | Cross-checked against a direct `ownerId IS NULL` count | `dashboards.api.test.ts` | Planned |
| API-30 BR-19, FR-14, AC-11 | `myAssigned` counts the caller's own | Cross-checked against `ownerId = caller` | `dashboards.api.test.ts` | Planned |
| API-31 FR-14, AC-11 | `byItPriority` always has 5 buckets | Includes a null/not-set bucket; bucket counts sum to the queue total | `dashboards.api.test.ts` | Planned |
| API-32 FR-15, AC-11 | `userCounts` role-conditional | Present for Administrator, **absent** for IT Staff | `dashboards.api.test.ts` | Planned |
| API-33 | BR-25, AC-11 | `counts.urgentTickets` matches the predicate | Includes the itPriority-URGENT and requestedPriority-URGENT groups; excludes staff-de-escalated and terminal statuses | `dashboards.api.test.ts` | Planned |
| API-34 | BR-25 | `counts.urgentTickets === urgentTickets.length` | Invariant on a seeded DB and on an empty DB | `dashboards.api.test.ts` | Planned |
| API-35 FR-16, AC-12 | Every drill-down returns exactly the counted set | Each `drillDown` query from `api-spec.md` section 3, followed and compared to the count | `dashboards.api.test.ts` | Planned |
| API-36 BR-19, AC-10 | Requester dashboard counts own Tickets only | Each `counts` value equals a direct query over the caller's Tickets; another user's Tickets excluded | `dashboards.api.test.ts` | Planned |
| API-37 | BR-23, AC-10 | Requester with zero Tickets | All counts `0`, arrays `[]`, `200` — not an error, not `null` | `dashboards.api.test.ts` | Planned |
| API-38 BR-20, FR-17, AC-10 | Zero metrics are `0`, never `null` and never `[]` in place of a count | Asserts each numeric field's type | `dashboards.api.test.ts` | Planned |
| API-39 | FR-15, AC-11 | Administrator calling the staff dashboard | `200` including `userCounts` | `dashboards.api.test.ts` | Planned |
| API-40 BR-19 | Requester calling the staff dashboard | `403` | `dashboards.api.test.ts` | Planned |
| API-41 | BR-19 | Unauthenticated | `401` on both dashboard endpoints | `dashboards.api.test.ts` | Planned |
| API-42 | FR-16 | `statusGroup` filters the staff queue | Each documented group returns only its statuses | `workflow-status.api.test.ts` | Planned |
| API-43 | FR-23, BR-09 | Existing Lab 2/3 ticket endpoints unchanged | Spot-check the Lab 3 suite's key assertions still hold on the Lab 4 schema | `migration-regression.api.test.ts` | Planned |

### UI component (client/tests/lab-04)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | FR-01, AC-01 | Create form happy path | Correct method, URL, headers, and body incl. the loaded `version`; the new record is rendered | `ActionsTakenForm.test.tsx` | Planned |
| UI-02 | FR-05, AC-02 | Follow-Up on, note blank | Inline message under Follow-Up Note; **the API call is not made** | `ActionsTakenForm.test.tsx` | Planned |
| UI-03 | FR-01 | Toggle on reveals and requires the note in the same render | No intermediate state where the field is visible but unvalidated | `ActionsTakenForm.test.tsx` | Planned |
| UI-04 | FR-20, AC-16 | Single-flight guard | A second click while the first request is in flight produces exactly one network call; the button is disabled and busy | `ActionsTakenForm.test.tsx` | Planned |
| UI-05 | FR-21, AC-15 | Retention after a `400` | Every entered field value still present; messages shown under their own fields | `ActionsTakenForm.test.tsx` | Planned |
| UI-06 | FR-21, AC-15 | Retention after a `500` | Same, plus the safe failure callout; **no stack trace or raw error text exposed** | `ActionsTakenForm.test.tsx` | Planned |
| UI-07 | FR-12, AC-06 | `409` conflict handling | Conflict callout, a Refresh action that loads the server copy, and the user's typing is **not** silently discarded | `ActionsTakenForm.test.tsx` | Planned |
| UI-08 | FR-01 | `actionDate` >5 min ahead | Inline message naming the 5-minute limit; no request sent | `ActionsTakenForm.test.tsx` | Planned |
| UI-09 | FR-03 | Panel list order and rendering | Six columns/fields; dates rendered via the Asia/Bangkok formatter | `ActionsTakenPanel.test.tsx` | Planned |
| UI-10 | FR-08, BR-18 | Time-zone formatting | A known UTC timestamp renders as the expected Asia/Bangkok wall-clock time in both dashboards and both action views | `ActionsTakenPanel.test.tsx` | Planned |
| UI-11 | BR-03 | "Performed By" is read-only | Rendered as text; no input, no picker, no editable affordance | `ActionsTakenPanel.test.tsx` | Planned |
| UI-12 | FR-24, BR-22, AC-13 | **No assignee control exists** | Query the rendered panel and form for an assignee field: `queryByLabelText(/assign/i)` is null | `ActionsTakenPanel.test.tsx` | Planned |
| UI-13 | FR-25, BR-23, AC-14 | **No per-action status control exists** | `queryByLabelText(/status/i)` within the action area is null; `queryByLabelText(/complete/i)` and `/cancel/i` are null | `ActionsTakenPanel.test.tsx` | Planned |
| UI-14 | FR-24 | Assign control lives at Ticket level | The owner control is present **on the Ticket**, not on the action | `ActionsTakenPanel.test.tsx` | Planned |
| UI-15 | BR-08, AC-05 | Requester read-only view | No Record, Edit, or Delete control; the six fields still render | `ActionsTakenPanel.test.tsx` | Planned |
| UI-16 | FR-03 | Empty Actions Taken state | A helpful empty block, not a headers-only table | `ActionsTakenPanel.test.tsx` | Planned |
| UI-17 | BR-11, AC-07 | Gate failure feedback | The message renders **at the status control**, names the unmet condition, and the status badge does not change | `workflow-feedback.test.tsx` | Planned |
| UI-18 | BR-12, AC-08 | Only permitted targets are offered | The dropdown for `IN_PROGRESS` contains `RESOLVED` but not `CANCELLED` | `workflow-feedback.test.tsx` | Planned |
| UI-19 | BR-12 | Confirmation-required transitions | `OPEN → CANCELLED` and `IN_PROGRESS → RESOLVED` raise a dialog naming the exact transition; cancelling sends nothing | `workflow-feedback.test.tsx` | Planned |
| UI-20 | FR-11, BR-13, AC-09 | Requester-indicated-resolved badge | Rendered and visually distinct from the status badge | `workflow-feedback.test.tsx` | Planned |
| UI-21 | FR-13, AC-10 | Requester dashboard cards | All six cards render with the server's numbers; the client recomputes none of them | `requester-dashboard.test.tsx` | Planned |
| UI-22 | FR-17, AC-10 | Zero cards | A `0` card is still rendered with `0` | `requester-dashboard.test.tsx` | Planned |
| UI-23 | FR-13 | Attention card wording | Reads "Needs your attention", not the raw field name | `requester-dashboard.test.tsx` | Planned |
| UI-24 | FR-16, AC-12 | Card drill-downs | Each card renders the documented URL as a real link with its number in the accessible name | `DashboardCards.test.tsx` | Planned |
| UI-25 | FR-14, AC-11 | Staff dashboard strip | All five priority buckets render, including "Not set" | `staff-dashboard.test.tsx` | Planned |
| UI-26 | FR-14, AC-11 | Urgent header offers both links | "By IT Priority" and "By Requested Priority" both present and pointing at different queries | `staff-dashboard.test.tsx` | Planned |
| UI-27 | FR-15 | Users card is role-conditional | Renders for an Administrator payload; absent entirely when `userCounts` is missing | `staff-dashboard.test.tsx` | Planned |
| UI-28 | FR-14 | My Recent Actions | Renders the caller's five most recent, each linking to its Ticket | `staff-dashboard.test.tsx` | Planned |
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

### Responsive (Playwright)

Screens × viewports. Each screen is three consecutive IDs in the order
**desktop, tablet, mobile**, so a single failing row names the viewport:

| Test ID | Screen | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| RESP-01..03 | Requester dashboard, with data | AC-18 | Layout integrity | Six count cards in one row, two lists side by side, no clipping or overlap | `responsive.visual.spec.ts` | Planned |
| RESP-04..06 | Requester dashboard, zero data | AC-10, AC-18 | Zero-metric layout | All six cards render with `0`; both lists show the empty block; **no card collapses** | `responsive.visual.spec.ts` | Planned |
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

### E2E (Playwright)

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | AC-01, AC-02 | Staff records an action end to end | Save; row appears with the performer as the logged-in user; a `409` path is exercised on a second edit | `staff-actions-taken.spec.ts` | Planned |
| E2E-02 | AC-05 | Requester reads actions and cannot write | Six fields visible; no Record/Edit/Delete control; a direct API call from the browser session returns `403` | `requester-actions-readonly.spec.ts` | Planned |
| E2E-03 | AC-07, AC-08, AC-09 | Resolution gate journey | Blocked attempt shows the message and the badge holds; after a summary plus an action, `RESOLVED` succeeds; the confirmation dialog names the transition | `ticket-workflow.spec.ts` | Planned |
| E2E-04 | AC-10, AC-11, AC-12 | Dashboard drill-down | Every card's count equals the list it opens; the urgent card reaches both urgent groups; Administrator sees the Users card | `dashboard-drilldown.spec.ts` | Planned |
| E2E-05 | AC-13, AC-14 | Part 6 traceability in the UI | The owner control is at Ticket level; no assignee or per-action status control exists in either view; `complete`/`cancel` reach `RESOLVED`/`CLOSED`/`CANCELLED` on the Ticket | `ticket-workflow.spec.ts` | Planned |
| E2E-06 | FR-22 | Console clean | No uncaught console error across the Lab 4 journeys | all Lab 4 specs | Planned |

### Migration / Regression

| Test ID | Requirement | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| MIG-01 | FR-23, AC-17 | Lab 1–3 data survives the Lab 4 migration | Row-count floors for `Requester`, `Category`, `RelatedSystem`, `Ticket`, `Attachment`, `User`, `PublicComment`, `InternalNote`; FK integrity; the new `ActionTaken` table starts empty | `migration-regression.api.test.ts` | Planned |
| MIG-02 | BR-24 | Lab 4 seed block is collision-free | No Lab 4 ticket number collides with an existing row; the block is `TKT-2026-000903`..`TKT-2026-000917`, asserted against the actual DB rather than a literal | `migration-regression.api.test.ts` | Planned |
| MIG-03 | BR-24 | Seed idempotency | Seeding twice produces the same counts — no duplicated tickets or actions | `migration-regression.api.test.ts` | Planned |
| REG-01 | FR-23, AC-17 | Lab 3 suites pass unchanged | `cd server && pnpm test` and `cd client && pnpm test` both green with no Lab 1–3 test edited to accommodate Lab 4 | manual run, recorded in section 6 | Planned |
| REG-02 | FR-23, AC-17 | `GET /api/health` unchanged | Exactly `{"status":"ok","service":"TokTickIT API"}` — no version, timestamp, or uptime field added | `migration-regression.api.test.ts` | Planned |

> **REG-01 has a rule attached, not just a status.** "Pass unchanged" is the whole
> point: a green suite that only got green after editing a Lab 3 assertion is a
> regression, not a pass. If an implementation change forces a Lab 1–3 test edit,
> that edit needs a written justification in `ai-use.md`, and it does not get to
> be quietly folded in.

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
| AC-05 | API-03, API-04, API-05, API-07, UI-15, E2E-02 |
| AC-06 | API-16, API-17, API-18, API-24, UI-07, E2E-01 |
| AC-07 | UNIT-01, UNIT-02, API-19, API-20, API-21, API-22, UI-17, E2E-03 |
| AC-08 | UNIT-04, API-23, UI-18, UI-19, E2E-03 |
| AC-09 | UNIT-02, API-28, UI-20, E2E-03 |
| AC-10 | API-36, API-37, API-38, UI-21, UI-22, UI-23, STYLE-04, E2E-04 |
| AC-11 | UNIT-03, API-29..34, API-39, UI-25, UI-26, UI-27, E2E-04 |
| AC-12 | API-35, UI-24, E2E-04 |
| AC-13 | API-14, UI-12, UI-14, E2E-05, ui-spec 9.1 item 13 |
| AC-14 | API-13, API-15, UI-13, E2E-05, ui-spec 9.1 item 13 |
| AC-15 | UI-05, UI-06 |
| AC-16 | UI-04 |
| AC-17 | MIG-01, MIG-02, MIG-03, REG-01, REG-02 |
| AC-18 | RESP-01..30, STYLE-08, ui-spec 9.1 (all 34 rows) |

**AC-15, AC-16, and AC-17 are client-only or cross-suite by nature.** Field
retention after a failure and the single-flight guard are properties of what the
browser does with a request, so an API-level test cannot prove either; they are
tested in jsdom against a mocked network, where the in-flight window can actually
be held open. AC-17 is proven by running the **previous** suites, not by writing
a new one, which is why REG-01 is recorded as a run in section 6 rather than as a
test file.

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
cd server && pnpm test                    # unit + API suites (incl. labs 1-4)
cd ../client && pnpm test                 # component + style suites (incl. labs 1-4)
cd .. && pnpm test:e2e:lab4               # lab-04 E2E — desktop-project only, workers=1
cd .. && pnpm exec playwright test e2e/lab-04/responsive.visual.spec.ts \
  e2e/lab-04/states.visual.spec.ts e2e/lab-04/visual-audit.spec.ts
```

`pnpm exec prisma db seed` must run first: like the Lab 3 suite, these tests assert
against seeded data, and MIG-02/MIG-03 in particular are about what the seed
produced.

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
| Build | `cd server && pnpm build` and `cd client && pnpm build` | Not run |

## 7. Known Limitations / Deferred

Carried over from Lab 3 and still deferred:

- Login rate limiting / account lockout (BR-06 of Lab 3).
- No full WCAG sweep — no axe run, no screen-reader pass. `STYLE-08..10` and the
  accessibility assertions cover focus, absence, and formatting; the judgement
  stays in the student's manual checklist column.
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

**Approval:** Pending — awaiting student approval of the test plan and its
test-file layout.
