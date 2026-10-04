# Lab 4 Sprint Engineering Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 4: Actions Taken, Ticket Workflow, and Role Dashboards |
| **Version** | v1.1 (Approved 2026-10-04) |
| **Date** | 2026-10-04 |
| **Sources** | Derived from the CPE 334 Lab 4 labsheet (course-provided handout), the Lab 3 approved increment, and the completed Lab 1–2 increments |
| **Related docs** | `api-spec.md`, `ui-spec.md`, `tests.md` |
| **Contract role** | This file is the single source of truth for Issues 25–30. Every FR, BR, and AC below is traceable from code and tests back to this document. |

---

## 1. Sprint Goal

Give IT Staff a durable record of the work performed on a Ticket, so that a
Ticket's history is more than its status field. Deliver an Actions Taken
capability where staff record what they did, what the result was, and whether
follow-up is needed, and where the Requester can read that record but cannot
write it. Make the Ticket lifecycle trustworthy by enforcing the status
transition matrix and a resolution gate on the backend, so a Ticket cannot be
declared Resolved on the strength of a hidden button but no actual work.
Deliver a Requester dashboard and an IT Staff dashboard whose every number is
computed on the backend from authoritative data and whose every card drills
down to the list that produced it. Preserve every Lab 1–3 behavior, including
the exact `GET /api/health` response shape.

## 2. Stakeholder Request Interpretation

The IT department's problem is that a resolved Ticket currently carries no
evidence of the work behind it. Staff fix a machine, type nothing down, and two
months later nobody can say whether the fix was verified or whether the same
fault will return. Leadership's problem is that nobody can answer "how many
Tickets are waiting on the Requester?" or "what is urgent right now?" without
exporting the database by hand. The Requester's problem is that the IT Staff
Queue is a full-screen table of every Ticket in the system, with no indication of
which ones actually concern them.

We are asked for three things. First, an Actions Taken record attached to a
Ticket: date and time, description, result, who performed it, whether follow-up
is required, a follow-up note when it is, and a free-text note about which
attachment or screenshot is relevant. The performer is never typed by hand — it
is whoever is logged in. Second, a workflow that cannot be talked past: the
status transition matrix must be enforced server-side, and a Ticket may only
reach Resolved or Closed when there is a resolution summary and at least one
recorded Action Taken, checked on the server so that bypassing the screen does
not help. Third, dashboards — one for Requesters showing their own Tickets, one
for IT Staff showing the whole queue — where each card explains its own
calculation and links to the filtered list behind it.

Two words in the grading rubric need pinning because the handout never defines
them as Action Taken fields. "Assign" means assigning the Ticket's primary Owner,
not assigning an action to somebody; and "complete" and "cancel" mean the
Ticket's own lifecycle, because an Action Taken has no status. These are stated
as FR-24 and FR-25 so a reviewer tracing either word lands on a real control.

## 3. Scope

### Included

- Actions Taken on a Ticket: create, update, and list, with the performer taken
  from the authenticated session.
- Action Description, Result, Follow-Up Required flag, Follow-Up Note
  (required when the flag is set), and Attachment Notes.
- Action Taken performed-on date and time, kept distinct from the record's
  creation timestamp.
- Read-only Actions Taken visibility for the Requester on their own Tickets.
- Enforcement of the complete status transition matrix on the backend.
- Resolution gate: Resolved and Closed require a non-empty resolution summary
  and at least one Action Taken.
- Concurrency control on Action Taken and Ticket updates, with `409` and the
  server's latest copy on a stale write.
- Duplicate-submission prevention on Action Taken creation.
- Requester dashboard with per-Ticket metrics and recently-updated and
  recently-resolved lists.
- IT Staff dashboard with queue counts, unassigned and my-assigned counts,
  counts by IT Priority, an urgent list, recent Tickets, and the current user's
  recent Actions Taken.
- Administrator reuse of the IT Staff dashboard, plus optional user counts
  linking to `/admin/users`.
- Drill-down from every dashboard card to a filtered ticket list.
- A single project-wide time zone decision, Asia/Bangkok (UTC+7).
- Regression of all Lab 1–3 behavior, including the health endpoint.
- Zen Green UI extensions for all new screens.

### Explicitly Excluded

The following are excluded per handout section 4.2, all eight items:

- Automatic SLA clocks, escalation engines, on-call scheduling, and breach
  notifications.
- Email, SMS, LINE, push, or other external notification services.
- Inventory consumption, spare-parts management, purchasing, or cost accounting
  for services.
- Time-sheet billing, payroll, or detailed labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- Advanced business-intelligence tools, custom report builders, or export
  warehouses.
- Multi-tenant organizations and production-scale cloud operations.
- New product features not approved in this Sprint 4 engineering contract.

Additionally excluded, as a Lab 4 scope decision rather than a handout one:

- Deleting an Action Taken. The record is append-only in intent; a mistaken entry
  is corrected by editing it (FR-04), which keeps an audit trail.
- A per-Action-Taken status or assignee field (FR-24, FR-25).
- Day-over-day deltas on dashboard cards (AD-13).
- An `idempotencyKey` column and server-side dedupe storage (AD-05).

## 4. Functional Requirements

### Actions Taken

- **FR-01:** `POST /api/tickets/:id/actions` creates an Action Taken on a Ticket
  accessible to the caller (IT Staff or Administrator). The request body accepts
  `actionDate`, `description`, `result`, `followUpRequired`, `followUpNote`, and
  `attachmentNotes`. On success the backend returns `201` with the created
  record including its server-assigned `id`, `performedById`, `performedBy`
  summary, `version`, and timestamps.
- **FR-02:** `performedById` is taken from the authenticated session. A
  `performedById` supplied in the request body is ignored and never stored; the
  recorded performer is always the caller.
- **FR-03:** `GET /api/tickets/:id/actions` returns the Action Taken records for
  a Ticket, ordered by `actionDate` ascending with `createdAt` ascending as the
  tie-break. A Requester may call this only for their own Ticket and receives
  read-only data; IT Staff and Administrator may call it for any accessible
  Ticket.
- **FR-04:** `PUT /api/actions/:id` updates `actionDate`, `description`,
  `result`, `followUpRequired`, `followUpNote`, and `attachmentNotes` of an
  existing Action Taken. It requires the record's current `version` in the body
  and increments it on success. It never changes `ticketId` or `performedById`.
- **FR-05:** When `followUpRequired` is `true`, `followUpNote` must be present
  and non-blank; when it is `false`, `followUpNote` is stored as submitted and
  is not required.
- **FR-06:** `attachmentNotes` is a free-text field on the Action Taken that
  records which attachment or screenshot to look at. It is text only: it does
  not create, attach, link, or validate an `Attachment` record, and the Lab 2
  `Attachment` model is not modified.
- **FR-07:** Action Taken records are not deletable. `DELETE /api/actions/:id`
  and `PATCH` on any Action Taken path return `405`, consistent with the
  append-only enforcement already used for Public Comments and Internal Notes.
- **FR-08:** The Actions Taken area renders each record's date and time in
  Asia/Bangkok, while `actionDate` and `createdAt` are stored and compared in
  UTC.

### Ticket Workflow

- **FR-09:** `PUT /api/staff/tickets/:id/status` validates the requested
  transition against the transition matrix in BR-12 before writing anything. A
  transition not present in the matrix is rejected with `400` and a
  `BUSINESS_RULE_VIOLATION` code, and `currentStatus` is unchanged.
- **FR-10:** The resolution gate in BR-11 is evaluated on the server inside the
  status endpoint. A raw HTTP request that bypasses the client is rejected
  exactly as a UI-driven request would be.
- **FR-11:** `PUT /api/tickets/:id/indicate-resolved` remains advisory. It sets
  or clears `requesterIndicatedResolved` and its timestamp and never writes
  `currentStatus`, including when the Requester has indicated resolution and
  the gate would otherwise block a Resolved transition.
- **FR-12:** `PUT /api/actions/:id` **requires** the record's current `version`;
  `PUT /api/staff/tickets/:id/status` accepts it as **optional** and applies the
  transition without a concurrency check when it is absent. A supplied stale
  value is rejected with `409` and the response body carries the server's latest
  copy of the record so the client can refresh without a second round trip.
  `api-spec.md` sections 2.3 and 5.1 give the rationale for the difference: an
  edit form is always built from a loaded record and two staff can edit the same
  action, whereas the status control is also reachable from list contexts that
  never loaded a full record, where a `409` would be unactionable.
  A status transition sent without `version` is therefore last-write-wins by
  design.

### Dashboards

- **FR-13:** `GET /api/dashboards/requester` returns the Requester dashboard
  payload: a `counts` object, a `recentTickets` array, and a `recentlyResolved`
  array, with the values defined in section 5 under Field Definitions, scoped to
  the authenticated user's own Tickets only.
- **FR-14:** `GET /api/dashboards/staff` returns the IT Staff dashboard payload:
  a `counts` object, a `byItPriority` array, and `recentTickets`,
  `urgentTickets`, and `myRecentActions` arrays, computed across every Ticket.
- **FR-15:** An Administrator receives the IT Staff dashboard payload from
  `GET /api/dashboards/staff`. When the caller is an Administrator the response
  additionally carries a `userCounts` object with `total`, `active`, and
  `inactive`; for IT Staff the key is **absent entirely**, not null and not
  zero. No separate Administrator dashboard endpoint is created.
- **FR-16:** Every dashboard card is a drill-down link to the ticket list
  filtered to that card's own definition. A card whose number counts two
  conditions exposes a link for each condition. No card is decorative.
- **FR-17:** A metric with no matching rows is `0`, not an error and not `null`.
  A list with no rows returns an empty array and the screen shows an empty
  state. In the staff response `counts.urgentTickets` always equals the length of
  the `urgentTickets` array, and `byItPriority` always carries all five buckets
  with `count: 0` for an empty one. Only an unexpected server failure produces an
  error state.
- **FR-18:** Every metric is computed by the backend from database state. The
  client renders returned numbers and does not recount, re-derive, or filter
  client-side.
- **FR-19:** Day boundaries for any time-relative metric, and the displayed
  value of `actionDate`, use Asia/Bangkok (UTC+7). Timestamps are stored in UTC.

### Hardening and Regression

- **FR-20:** Submitting the Action Taken form does not create a second record.
  The create button is disabled while its request is in flight, so a double
  click or a retry after a network error cannot produce a duplicate. The
  backend requires no idempotency key (AD-05).
- **FR-21:** A create or update request that fails validation or a safe failure
  leaves the form's field values intact so the user can correct one field
  instead of retyping the record.
- **FR-22:** No uncaught error reaches the browser console on any new or changed
  screen in a normal or failure path; expected failures render as visible,
  styled feedback.
- **FR-23:** All Lab 1–3 behavior continues to work unchanged. In particular
  `GET /api/health` keeps returning exactly `{ "status": "ok", "service":
  "TokTickIT API" }`, and the Lab 3 authentication, ownership, and
  authorization rules are unaffected.

### Part 6 Terminology Traceability

- **FR-24:** **`assign` means assigning the Ticket's primary Owner.** It is
  performed with `PUT /api/staff/tickets/:id/assign`, which writes
  `Ticket.ownerId` (FR-24 is the contract for that behavior; the endpoint itself
  is the Lab 3 deliverable at Lab 3 FR-28). The `ActionTaken` model has **no**
  assignee field, because no handout field list contains one. A client that
  sends `assigneeId` in an Action Taken body has it ignored, and the stored
  record has no such column. This is what handout AC-01's "approved assignee"
  and grading Part 6's "assign" resolve to.
- **FR-25:** **"status transition", "complete", and "cancel" mean the Ticket's
  own lifecycle**, changed through `PUT /api/staff/tickets/:id/status` under
  BR-12 and the resolution gate in BR-11. `complete` corresponds to `RESOLVED`
  and `CLOSED`; `cancel` corresponds to `CANCELLED`, which is terminal. The
  `ActionTaken` model has **no** status field, and a `status` key in an Action
  Taken body is ignored.

## 5. Business Rules

### Actions Taken

- **BR-01:** An Action Taken belongs to exactly one Ticket; `ticketId` is
  required and is set from the URL path, never from the body.
- **BR-02:** The Ticket Owner coordinates the Ticket, but any IT Staff or
  Administrator may record an Action Taken on it. Performer and Owner are
  independent; recording an action never requires owning the Ticket.
- **BR-03:** `performedById` comes from the session only. A body-supplied value
  is ignored rather than rejected, because it is not a contract field.
- **BR-04:** `followUpRequired = true` requires a non-blank `followUpNote`.
- **BR-05:** `description`, `result`, `followUpNote`, and `attachmentNotes` are
  each at most 2000 characters. `description` and `result` are required and
  must be non-blank after trimming. The 2000-character limit matches the Lab 3
  Public Comment and Internal Note limit (AD-14).
- **BR-06:** List ordering is `actionDate` ascending, tie-broken by `createdAt`
  ascending, so two actions recorded for the same instant keep their insertion
  order.
- **BR-07:** `actionDate` must be a valid date and must not be later than the
  server's current time by more than 5 minutes. The allowance absorbs clock
  skew between the browser and the server without accepting a future date.
- **BR-08:** A Requester may read Action Taken on their own Ticket and nothing
  else. Create and update attempts return `403`.
- **BR-09:** An **accessible Ticket** for IT Staff and Administrator is any
  Ticket in the queue. Ownership is a precondition for *claiming* a Ticket, not
  for recording an Action Taken on it.
- **BR-10:** Action Taken records are not deletable: `DELETE` and `PATCH`
  return `405`.

### Ticket Workflow

- **BR-11 (Resolution gate):** A Ticket may enter `RESOLVED` or `CLOSED` only
  when `resolutionSummary` is non-blank **and** the Ticket has at least one
  Action Taken. A failed gate is `400` with a `BUSINESS_RULE_VIOLATION` code and
  a message naming which condition is unmet. The check is server-side and reads
  the summary written by the existing `PUT
  /api/staff/tickets/:id/resolution-summary`; no second write path is invented.
- **BR-12 (Transition matrix):** This table is the single source of truth for
  Issue 27. Every pair not listed is rejected. Roles are IT Staff and
  Administrator for every row; a Requester never transitions a Ticket.

  | From | To | Confirmation required | Gate |
  | :--- | :--- | :--- | :--- |
  | `NEW` | `OPEN` | — | — |
  | `OPEN` | `IN_PROGRESS` | — | — |
  | `OPEN` | `WAITING_FOR_REQUESTER` | — | — |
  | `OPEN` | `CANCELLED` | **Yes** | — |
  | `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | — | — |
  | `IN_PROGRESS` | `RESOLVED` | **Yes** | **Resolution gate** |
  | `WAITING_FOR_REQUESTER` | `IN_PROGRESS` | — | — |
  | `WAITING_FOR_REQUESTER` | `REOPENED` | — | — |
  | `RESOLVED` | `CLOSED` | — | **Resolution gate** |
  | `RESOLVED` | `REOPENED` | — | — |
  | `REOPENED` | `IN_PROGRESS` | — | — |
  | `CLOSED` | `REOPENED` | — | — |
  | `CANCELLED` | *(none)* | — | terminal status |

  This preserves every Lab 3 pair, unchanged, and adds the gate column. If the
  table changes, `server/src/lib/statusTransitions.ts`, the client mirror
  `client/src/lib/statusTransitions.ts`, and
  `server/tests/lab-03/status-transitions.unit.test.ts` change in the same PR,
  or the client dropdown will offer transitions the backend rejects.
- **BR-13:** The Requester's "problem appears resolved" indication is advisory.
  It records a Requester's belief and never sets, clears, or implies a formal
  status.

  > **Note:** Lab 4 BR numbering is independent of Lab 3. Where this sprint reuses
  > a number, the rule differs — Lab 4 BR-13 is this advisory indication, while
  > Lab 3 BR-13 was the inactive-assignee rejection, which is Lab 4 **BR-14**.
  > Every rule that continues a Lab 3 rule says so explicitly.
- **BR-14:** Assigning Ticket ownership to an inactive IT Staff or Administrator
  account is rejected with `404` and the message "Owner must be an active IT
  Staff or Administrator user". This is Lab 3 BR-13 behavior, pinned unchanged;
  Issue 27 adds the regression test.
- **BR-15:** `ActionTaken.version` and `Ticket.version` are integer counters
  starting at 1. A write that **presents** a version other than the stored one is
  rejected with `409`, and the response carries the server's latest copy. The
  stored version increments by one on each successful update. Presenting a
  version is **mandatory** on `PUT /api/actions/:id` and **optional** on
  `PUT /api/staff/tickets/:id/status`; on the status endpoint an absent `version`
  applies the transition as last-write-wins (FR-12, rationale in `api-spec.md`
  sections 2.3 and 5.1).
- **BR-16:** The client prevents duplicate Action Taken submission with a
  single-flight guard: the submit control is disabled for the duration of its
  request. The backend stores no idempotency key.

### Dashboards

- **BR-17:** Every dashboard metric is computed on the backend from
  authoritative database state at query time. The client renders the returned
  value and never recomputes it.
- **BR-18:** The project time zone is Asia/Bangkok (UTC+7). Timestamps are
  stored in UTC; day boundaries and displayed dates use Asia/Bangkok.
- **BR-19:** Dashboard ownership is enforced by the backend. The requester
  dashboard is scoped server-side to the session user; a client cannot widen the
  scope with a query parameter, and the staff dashboard is refused to a
  Requester with `403`.
- **BR-20:** A metric matching no rows is `0`; a list matching no rows is an
  empty array. Neither is an error.
- **BR-21:** A pre-existing Ticket with no Action Taken is normal. No Action
  Taken is backfilled for historical Tickets, and dashboard counts reflect
  actual records rather than an invented baseline.
- **BR-22:** `ActionTaken` has no assignee field. "Assign" is `Ticket.ownerId`
  (FR-24).
- **BR-23:** `ActionTaken` has no status field. "Complete" and "cancel" are
  `Ticket.currentStatus` transitions (FR-25).
- **BR-24:** Lab 4 seed data appends after the existing Ticket numbers. Lab 4
  uses `TKT-2026-000903` through `TKT-2026-000917` and must not reuse
  `TKT-2025-000001`–`TKT-2025-000012`, `TKT-2026-000344`, or
  `TKT-2026-000900`–`TKT-2026-000902`, because the seed upserts on
  `ticketNumber` and a collision would overwrite Lab 3 seed data.
- **BR-25:** A Ticket is **urgent** when `itPriority = URGENT`, or when
  `itPriority IS NULL` and `requestedPriority = URGENT`. In both cases
  `RESOLVED`, `CLOSED`, and `CANCELLED` Tickets are excluded. Once IT Staff sets
  an IT Priority, that value decides the ticket's urgency; `requestedPriority`
  is consulted only while IT Priority has never been set.

### Field Definitions

| Metric | Definition | Empty behavior | Drill-down |
| :--- | :--- | :--- | :--- |
| Requester `counts.open` | Caller's Tickets with status in {`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`} | `0` | `/my-tickets?statusGroup=open` |
| Requester `counts.inProgress` | Caller's Tickets with `currentStatus = IN_PROGRESS` | `0` | `/my-tickets?currentStatus=IN_PROGRESS` |
| Requester `counts.waitingForRequester` | Caller's Tickets with `currentStatus = WAITING_FOR_REQUESTER` | `0` | `/my-tickets?currentStatus=WAITING_FOR_REQUESTER` |
| Requester `counts.resolved` | Caller's Tickets with `currentStatus = RESOLVED` | `0` | `/my-tickets?currentStatus=RESOLVED` |
| Requester `counts.closed` | Caller's Tickets with `currentStatus = CLOSED` | `0` | `/my-tickets?currentStatus=CLOSED` |
| Requester `counts.attentionRequired` | Caller's Tickets with status in {`WAITING_FOR_REQUESTER`, `REOPENED`} | `0` | `/my-tickets?statusGroup=attention` |
| Requester `recentTickets` | Caller's 5 most recently updated Tickets, `updatedAt` descending | Empty array | Row opens `/tickets/:id` |
| Requester `recentlyResolved` | Caller's Tickets with `currentStatus = RESOLVED`, 5 most recently updated, `updatedAt` descending | Empty array | Row opens `/tickets/:id` |
| Staff `counts.new` / `counts.open` / `counts.inProgress` / `counts.waitingForRequester` | Queue-wide count for that single status | `0` | `/staff/queue?currentStatus=<value>` |
| Staff `counts.unassigned` | Queue-wide count where `ownerId IS NULL` | `0` | `/staff/queue?ownerId=unassigned` |
| Staff `counts.myAssigned` | Queue-wide count where `ownerId` is the caller | `0` | `/staff/queue?ownerId=me` |
| Staff `counts.urgentTickets` | Per BR-25 | `0` | `/staff/queue?itPriority=URGENT` **and** `/staff/queue?requestedPriority=URGENT` |
| Staff `byItPriority` | Queue-wide count grouped by `itPriority`; **always all five buckets**, each `count: 0` when empty | `0`, bucket still present | `/staff/queue?itPriority=<value>` |
| Staff `recentTickets` | Queue's 5 most recently updated Tickets, `updatedAt` descending | Empty array | Row opens `/staff/tickets/:id` |
| Staff `urgentTickets` | The urgent Tickets themselves, per BR-25, 10 most recently updated | Empty array | Row opens `/staff/tickets/:id` |
| Staff `myRecentActions` | Caller's 5 most recent Action Taken records across all Tickets, `actionDate` descending | Empty array | Row opens `/staff/tickets/:id` Actions Taken area |
| Staff `userCounts` (Administrator only) | `total`, `active`, `inactive` user counts | `0` | `/admin/users` |

**Response shape rule:** a dashboard response is
`{ "data": { "counts": { …scalars… }, "byItPriority": [ … ], "recentTickets": [ … ], … } }`.
Every scalar lives under `counts` and every list is a top-level array, so a
client never has to guess whether a key is a number or a list. `userCounts` is
present **only** for an Administrator and absent — not null, not zero — for IT
Staff (FR-15).

**Count/list invariant:** `counts.urgentTickets` always equals
`urgentTickets.length` in the same response. The card shows the count and the
list below it; a mismatch would mean the card and the list disagree.

**Staff `byItPriority` buckets:** `itPriority` is nullable, so the array always
carries exactly five entries — `LOW`, `MEDIUM`, `HIGH`, `URGENT`, and `null`
rendered as "not set" — with `count: 0` for an empty bucket. The five counts sum
to the queue total, so the breakdown reconciles with `unassigned` and
`myAssigned` instead of silently dropping unset tickets.

**`statusGroup` query parameter:** a new filter on `/my-tickets` and
`/staff/queue` with exactly three accepted values — `open` (the five statuses in
`open` above), `attention` (`WAITING_FOR_REQUESTER`, `REOPENED`), and `closed`
(`RESOLVED`, `CLOSED`). Any other value is `400`. This exists because a card
covering five statuses cannot be expressed with the existing single-value
`currentStatus` filter.

**`requestedPriority` on the staff queue:** already supported, no Lab 4 work.
Both `/api/tickets` and `/api/staff/tickets` accept `requestedPriority` with the
same enum validation and the same `fields.requestedPriority` error message, so
the `urgentTickets` drill-down resolves to an existing filter. `statusGroup` is
the only new list filter in Lab 4.

### Authorization Matrix

Per handout section 4.3, recorded here as a business rule set because every row
is enforced by the backend.

| Role | Actions Taken | Dashboard |
| :--- | :--- | :--- |
| **Requester** | Read only, and only on their own Ticket. Create and update return `403`. | `GET /api/dashboards/requester`, scoped by the backend to their own Tickets. `GET /api/dashboards/staff` returns `403`. |
| **IT Staff** | Create and update on any accessible Ticket (BR-09). Read on any accessible Ticket. | `GET /api/dashboards/staff` across the whole queue. May also read `GET /api/dashboards/requester`, but sees only their own data. |
| **Administrator** | Identical to IT Staff, so Administrators can support and test the workflow. | `GET /api/dashboards/staff`, plus `userCounts` in the same response. May also read `GET /api/dashboards/requester`, but sees only their own data. |

Supporting rules:

- Every write is enforced on the backend. A hidden or disabled control is not
  authorization.
- A Requester calling an Action Taken write endpoint receives `403` whether or
  not the Ticket is their own.
- "Accessible Ticket" is defined by BR-09, not by ownership.
- `GET /api/dashboards/requester` is **any authenticated role**, own data only. It
  returns `401` when there is no session and never `403`, because the backend
  scopes the query to the caller, so a staff member who has never raised a Ticket
  correctly sees `0` and empty lists per BR-20 rather than a permission error.
  `api-spec.md` section 3.2 and `ui-spec.md` section 4 already say this; this table
  and section 8 now agree with them.
- The inactive-owner rejection in BR-14 applies to `PUT
  /api/staff/tickets/:id/assign` and is unchanged from Lab 3.

## 6. UI Specification Summary

Full detail, wireframes, and the pass/fail visual checklist are in `ui-spec.md`.
Summary:

- **Requester Dashboard (`/dashboard`):** a row of count cards for `open`,
  `inProgress`, `waitingForRequester`, `resolved`, and `closed`; an
  `attentionRequired` card styled as needing attention; a "Recently Updated"
  list and a "Recently Resolved" list, each row opening the Ticket. Every card
  is a link; every count shows `0` rather than being hidden.
- **IT Staff Dashboard (`/staff/dashboard`):** queue count cards for `new`,
  `open`, `inProgress`, and `waitingForRequester`; ownership cards for
  `unassigned` and `myAssigned`; a counts-by-IT-Priority breakdown; an urgent
  list with ticket number, summary, status, and priority; a "Recently Updated"
  queue list; and a "My Recent Actions" list showing ticket number, date, and
  description for the caller's own recorded work. Administrators additionally
  see a user-count card linking to `/admin/users`.
- **Actions Taken area on IT Staff Ticket Detail:** a count badge on the tab,
  and a table with Date/Time, Description, Result, Performed By, Follow-Up, and
  Notes. Staff have create and edit controls; the edit form carries the record's
  `version`.
- **Actions Taken area on Requester Ticket Detail:** the same fields, read-only,
  with no create or edit control and no assignee or status control. The Ticket's
  own Owner and Status controls, where present, are Ticket-level controls and are
  visually separated from the read-only Actions Taken list.
- **Workflow feedback:** a disabled status option is never offered; a transition
  that needs confirmation asks first; a gate failure shows which condition is
  unmet; a `409` shows a conflict notice with a Refresh action rather than
  discarding what the user typed.
- **States:** every new screen has defined loading, empty, no-results, and
  safe-failure presentations.
- **Responsive:** desktop 1440×900, tablet 820×1180, mobile 375×844. Tablet is
  820 rather than 768 because `client/src/App.css` switches to the mobile
  layout at `max-width: 768px`, so a 768-wide run would capture the mobile
  layout instead of the tablet one (AD-12).
- **Accessibility:** keyboard operation for cards, tables, and forms; visible
  focus rings; semantic labels on every control; status conveyed by text or an
  icon in addition to color.
- **Zen Green continuity:** the new screens reuse Lab 2 and Lab 3 tokens, form
  conventions, cards, badges, buttons, and validation placement. No new color is
  introduced without a token.

## 7. Data Changes

### New Prisma Model

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | Int PK | autoincrement |
| `ticketId` | Int FK → `Ticket` | required; set from the URL path |
| `actionDate` | DateTime | when the work actually happened; distinct from `createdAt` |
| `description` | String | required, non-blank, ≤2000 (BR-05) |
| `result` | String | required, non-blank, ≤2000 (BR-05) |
| `performedById` | Int FK → `User` | required; from the session, never the body (BR-03) |
| `followUpRequired` | Boolean | default `false` |
| `followUpNote` | String? | nullable in the schema, but required when the flag is true (BR-04); ≤2000 |
| `attachmentNotes` | String? | nullable; free text; ≤2000; does not touch `Attachment` (FR-06) |
| `version` | Int | default 1; optimistic locking (BR-15) |
| `createdAt` / `updatedAt` | DateTime | record timestamps, server-set |

**Index:** `@@index([ticketId, actionDate])`, so reading one Ticket's timeline in
date order does not require a sort over the whole table (FR-03).

**No assignee field and no status field** on this model, by design (BR-22,
BR-23).

### Schema Changes to Existing Models

`Ticket.version` — Int, default 1 — for the same optimistic-locking purpose on
the status endpoint (FR-12). This column is added by **Issue 27** in its own
additive migration, deliberately separate from the `ActionTaken` migration.

No other existing model changes. `Attachment` is untouched (FR-06). The Lab 3
`User`, `PublicComment`, and `InternalNote` models are unchanged.

### Justified Database-Design Decisions

Handout section 5.1 requires at least two, chosen from fields, data types,
foreign keys, indexes, enums, timestamps, optimistic-concurrency or stale-update
handling, and migration strategy. Three are recorded here; a validation-location
choice would not qualify and is not counted.

1. **Optimistic concurrency via integer `version` columns on both
   `ActionTaken` and `Ticket`.** Two staff members can open the same Ticket at
   the same time. Without a version counter, the second save silently discards
   the first save's work, which is the exact failure the handout's section 6.1
   warns about. A counter detects it and lets the server return `409` with the
   authoritative copy. An `updatedAt` comparison was rejected because timestamp
   granularity and clock skew make it unreliable for this purpose, and a row
   lock was rejected because it would hold a transaction open across a
   user-facing round trip.
2. **Composite index `@@index([ticketId, actionDate])` on `ActionTaken`.** Every
   read of this table is "one Ticket's actions, in date order": the Ticket Detail
   tab, the requester read-only view, and the resolution gate's existence check.
   The composite index serves the filtered read and the ordering together. A
   single-column index on `ticketId` alone would still require a sort step for
   the ordering.
3. **`performedById` as an explicit foreign key with a stated `onDelete`
   policy.** `performedById` is required, so the database, not the application,
   guarantees an action can never exist without a performer. The policy is
   `onDelete: Restrict`: an Action Taken is an audit record and must not be
   removed as a side effect of deleting a user. Lab 4 does not implement user
   deletion, so this policy constrains future work rather than current behavior.

### Migration and Rollback

- `prisma migrate dev --name lab4_actions_taken` — purely additive: one new
  table and two nullable-then-defaulted integer columns. No existing row is
  read, rewritten, or deleted.
- `Ticket.version` ships in a **separate** migration owned by Issue 27
  (`lab4_ticket_version`), so the two tracks cannot collide and Issue 27 never
  waits for Issue 25.
- `version` is added with `DEFAULT 1 NOT NULL`, which backfills existing rows
  with 1 without a data migration.
- **Rollback:** revert the migration commit and run `prisma migrate deploy`
  against the previous migration state. Because nothing is dropped or
  transformed, rollback loses only Lab 4 Action Taken records, and Labs 1–3 data
  is untouched either way.
- **No backfill.** Historical Tickets keep zero Action Taken. See BR-21.

### Seed Data Requirements

- Lab 4 seed **appends** to the existing seed; it never replaces it (BR-24).
- Approximately 15 new Tickets numbered `TKT-2026-000903`–`TKT-2026-000917`,
  chosen so that dashboard metrics are non-zero across statuses, priorities,
  assigned and unassigned ownership, and both `itPriority` set and unset — the
  unset case is required to exercise BR-25's `IS NULL` branch.
- Action Taken records must cover all three seed shapes handout section 5.3 names:
  **zero** (a new Ticket with no actions), **exactly one** (a Ticket with a single
  action and no follow-up), and **multiple** (at least 4 of the new Tickets carry
  actions, including at least one pair sharing the same `actionDate` to exercise
  the BR-06 tie-break). At least one carries `followUpRequired = true` with a note,
  and at least one is performed by a staff member who is **not** the Ticket Owner,
  to exercise BR-02.
- At least one Ticket that has a resolution summary but no Action Taken, so the
  BR-11 gate can be observed rejecting it, and at least one that satisfies both
  gate conditions. **Exactly one** is not the same as zero: a Ticket carrying a
  single action proves the read path renders one row without inventing an empty
  block, which is the case a `0`-or-`≥2` seed cannot reach.
- `MIG-05` in `tests.md` proves all three shapes exist, counting against
  `server/src/lib/seedData.ts` rather than a literal ticket id.
- Seed stays idempotent: upsert on `ticketNumber`, and replace the Lab 4 Action
  Taken rows by their own known ids rather than a content match.
- Passwords are not part of Lab 4; no new accounts are seeded.

## 8. API Contract

Full request and response shapes, validation rules, and per-endpoint error
tables are in `api-spec.md`. Endpoint summary:

### Actions Taken (new in Lab 4)

| Method | Path | Purpose | Auth | Success | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/tickets/:id/actions` | Create an Action Taken | IT_STAFF, ADMIN | 201 | 400, 401, 403, 404, 500 |
| GET | `/api/tickets/:id/actions` | List, ordered by `actionDate` then `createdAt` | Session; owner read-only | 200 | 400, 401, 403, 404, 500 |
| PUT | `/api/actions/:id` | Update, requires current `version` | IT_STAFF, ADMIN | 200 | 400, 401, 403, 404, 409, 500 |
| DELETE | `/api/actions/:id` | Always refused | — | — | 405 |

### Dashboards (new in Lab 4)

| Method | Path | Purpose | Auth | Success | Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/dashboards/requester` | Requester metrics and lists, scoped to the caller | Session (any role; own data only) | 200 | 401, 500 |
| GET | `/api/dashboards/staff` | Queue metrics and lists; `userCounts` for Administrator | IT_STAFF, ADMIN | 200 | 401, 403, 500 |

### Changed in Lab 4

| Method | Path | Change | Errors |
| :--- | :--- | :--- | :--- |
| PUT | `/api/staff/tickets/:id/status` | Adds the BR-11 resolution gate and accepts/checks `version` (`409` on mismatch) | 400, 401, 403, 404, 409, 500 |
| GET | `/api/staff/tickets` | Adds the `statusGroup` query parameter (`requestedPriority` already exists) | 400, 401, 403, 500 |
| GET | `/api/tickets` | Adds `statusGroup` query parameter | 400, 401, 500 |

### Unchanged in Lab 4

Every other Lab 1–3 endpoint keeps its current method, path, authorization, and
response shape. `GET /api/health` continues to return exactly `{ "status": "ok",
"service": "TokTickIT API" }` (FR-23).

## 9. Acceptance Criteria

- **AC-01:** Given an authenticated IT Staff member and an accessible Ticket,
  when they save an Action Taken with a description, a result, and a date, then
  the record is stored against that Ticket with `performedById` equal to the
  session user, and a `performedById` supplied in the body is ignored.
- **AC-02:** Given an Action Taken saved with `followUpRequired = true` and a
  blank `followUpNote`, when the save is attempted, then it is rejected (`400`)
  and no record is created; with a non-blank note it succeeds.
- **AC-03:** Given a Ticket with several Action Taken records, when they are
  listed, then they are ordered by `actionDate` ascending, and two records
  sharing an `actionDate` appear in their insertion order.
- **AC-04:** Given an Action Taken with `actionDate` in the future beyond the
  5-minute allowance, when it is saved, then it is rejected (`400`); a value
  within the allowance succeeds.
- **AC-05:** Given an authenticated Requester and their own Ticket, when they
  read its Action Taken records, then the records are returned read-only; when
  they attempt to create or update one, the response is `403`.
- **AC-06:** Given an Action Taken whose `version` is stale, when an update
  presents the old value, then the response is `409` and the body carries the
  server's latest copy of the record.
- **AC-07:** Given a Ticket in `IN_PROGRESS` with no resolution summary and no
  Action Taken, when a raw request attempts `IN_PROGRESS → RESOLVED`, then the
  response is `400` naming the unmet gate condition and `currentStatus` is
  unchanged; with both conditions met, the transition succeeds.
- **AC-08:** Given a Ticket status pair not present in BR-12, when a transition
  is attempted, then it is rejected (`400`); every pair in BR-12 is accepted,
  and the confirmation-required rows ask before applying.
- **AC-09:** Given a Requester who has indicated the problem appears resolved,
  when any status transition is evaluated, then `currentStatus` reflects only
  staff transitions, and the indication does not satisfy or bypass the gate.
- **AC-10:** Given the Requester dashboard for a user with Tickets in several
  statuses, when it loads, then every value under `counts` equals the count of
  that user's own Tickets in the documented statuses, a metric with no matching
  Ticket is `0`, and a user with no Tickets receives zeros and empty arrays
  rather than an error.
- **AC-11:** Given the IT Staff dashboard, when it loads, then `counts.unassigned`
  counts Tickets with no owner, `counts.myAssigned` counts Tickets owned by the
  caller, `byItPriority` always carries five buckets including one for unset IT
  Priority whose counts sum to the queue total, `userCounts` is present for an
  Administrator and absent for IT Staff, and `counts.urgentTickets` matches
  BR-25 — a Ticket whose IT Priority was set to a non-urgent value by staff is
  not urgent even if its requested priority is `URGENT`.
- **AC-12:** Given any dashboard card, when its drill-down is followed, then the
  resulting list contains exactly the Tickets the card counted, the
  `urgentTickets` card reaches both urgent groups, and in the staff response
  `counts.urgentTickets` equals the length of the `urgentTickets` list.
- **AC-13:** Given the Actions Taken UI, `assign` refers to assigning the
  Ticket's primary Owner: `ActionTaken` has no assignee field, a body-sent
  `assigneeId` is ignored and not stored, and owner assignment happens through
  `PUT /api/staff/tickets/:id/assign`, which rejects an inactive owner with
  `404`.
- **AC-14:** Given the Actions Taken UI, "status transition", "complete", and
  "cancel" refer to the Ticket's lifecycle: `ActionTaken` has no status field, a
  body-sent `status` is ignored, `complete` corresponds to `RESOLVED` and
  `CLOSED` under the resolution gate, and `cancel` corresponds to the terminal
  `CANCELLED`.
- **AC-15:** Given a save request that fails validation or a safe failure, when
  the user returns to the form, then the entered field values are still present.
- **AC-16:** Given repeated clicks or a retry of the Action Taken save, when the
  first request is still in flight, then exactly one record exists.
- **AC-17:** Given the whole Lab 1–3 surface, when the regression suites and the
  E2E specs run, then they pass unchanged, and `GET /api/health` returns exactly
  `{ "status": "ok", "service": "TokTickIT API" }`.
- **AC-18:** Given all new and changed screens, when rendered at 1440×900,
  820×1180, and 375×844, then layouts are correct with no horizontal overflow,
  clipping, or overlap, and every checklist item in `ui-spec.md` is marked pass
  or fail with evidence.

> **Numbering note:** AC-13 and AC-14 are the two Part 6 traceability criteria
> required by the Issue 24 acceptance criteria. AC-15 through AC-18 were added
> alongside them so that every FR in section 4 has at least one criterion; the
> original plan's estimate of 14 was made before the hardening requirements were
> enumerated. `tests.md` maps all eighteen.

## 10. Definition of Done (Product)

- [ ] All Included scope implemented; no Excluded features present.
- [ ] Every AC above verified by at least one automated test traced in `tests.md`.
- [ ] All unit, API, UI, and E2E tests pass from the documented commands.
- [ ] No test skipped, disabled, or commented out.
- [ ] Backend enforces authentication and role-based authorization on every new endpoint.
- [ ] Backend enforces the resolution gate and the transition matrix; a raw request bypassing the UI is still rejected.
- [ ] Backend enforces ownership on the requester dashboard and on Action Taken reads.
- [ ] Concurrency: a stale `version` on either table returns `409` with the server's latest copy.
- [ ] Every dashboard metric is computed on the backend, and every card's drill-down returns exactly the counted rows.
- [ ] Screens conform to `ui-spec.md`; the visual checklist is completed with pass/fail and screenshot evidence.
- [ ] Implemented endpoints conform to `api-spec.md`; the Prisma schema matches section 8 with committed migrations.
- [ ] Migration applies cleanly to a database holding all Lab 1–3 data, and MIG-02 verifies it.
- [ ] Seed runs idempotently and reuses no Lab 1–3 ticket number (BR-24).
- [ ] Labs 1–3 regression suites pass, including the unchanged `GET /api/health` shape.
- [ ] Responsive screenshots captured at desktop, tablet, and mobile into `artifacts/lab-04/screenshots/`.
- [ ] Peer-review evidence recorded in `docs/lab-04/reviewer.md`.
- [ ] `docs/lab-04/ai-use.md` records the LLM used, the key prompts retained, and a short reflection.
- [ ] All work merged through reviewed PRs: feature branches → `lab4-staging` → one release PR → `main`.
- [ ] Student can explain every implementation choice and demonstrate failure cases live.

## 11. Assumptions and Decisions

- **AD-01:** The resolution gate requires **both** a non-blank
  `resolutionSummary` and at least one Action Taken. The handout says "review the
  work and formally update the Ticket", which implies both a written outcome and
  a record of the work. Requiring only one would let a Ticket be resolved on a
  summary alone with no evidence, or on an action alone with no explanation to
  the Requester.
- **AD-02:** `ActionTaken.version` is owned by Issue 25 and `Ticket.version` by
  Issue 27, each with its own additive migration. Pinning both owners here is
  what lets the two tracks run in parallel without a migration collision.
- **AD-03:** The conflict response is `409` with the server's latest copy in the
  body, rather than a bare `409` that forces the client to re-fetch.
- **AD-04:** All four free-text fields cap at 2000 characters, reusing the Lab 3
  comment and note limit so the project has one text-field limit.
- **AD-05:** Duplicate-submission prevention is client-side single-flight — the
  submit control is disabled while its request is in flight. No `idempotencyKey`
  column and no server-side dedupe store. Handout section 8.5 asks that
  duplicates be "prevented or safely handled", which the client guard satisfies,
  and skipping the column keeps the schema and the migration smaller.
- **AD-06:** The project time zone is Asia/Bangkok (UTC+7), chosen because the
  deployment is Thai. Timestamps are stored in UTC; day boundaries and displayed
  dates use Asia/Bangkok.
- **AD-07:** Dashboard endpoints are namespaced by role:
  `GET /api/dashboards/requester` and `GET /api/dashboards/staff`, so the role
  guard and the ownership scope are visible in the path.
- **AD-08:** `myRecentActions` returns the caller's own Action Taken records
  across all Tickets, not limited to Tickets they own, because grading Part 5
  asks for "current-user Actions Taken" and BR-02 makes performer and Owner
  independent.
- **AD-09:** `recentlyResolved` uses the Ticket's `updatedAt` as its time
  criterion. The handout names no separate resolution timestamp, so this uses
  data that already exists and states the choice rather than inventing a column.
- **AD-10:** The Administrator reuses `GET /api/dashboards/staff` and receives
  `userCounts` in the same response when the caller is an Administrator, rather
  than a third endpoint.
- **AD-11:** `actionDate` may exceed server time by at most 5 minutes, using the
  server's clock as the reference. The allowance absorbs browser clock skew; a
  stricter rule would reject legitimate same-day entries, and no allowance would
  reject entries from a slightly-behind client.
- **AD-12:** Tablet is captured at 820×1180 rather than the 768 named in some
  earlier criteria, because `client/src/App.css` switches to the mobile layout at
  `max-width: 768px`; a 768-wide run would capture the mobile layout instead of
  the tablet one. Mobile stays at 375×844. This continues the Lab 3 decision.
- **AD-13:** Dashboard cards carry **no** day-over-day delta such as
  "+3 from yesterday". Such deltas appear in the handout only inside the mockup
  illustrations, not in the section 4.6 metric list or in grading Part 5, and
  they cannot be computed honestly from current data without storing daily
  snapshots. They would also be the first thing to go stale.
- **AD-14:** `attachmentNotes` is a text field on `ActionTaken` only. It does not
  reference, create, or validate an `Attachment`; handout section 4.1 describes
  it as text saying which file or screenshot to look at.
- **AD-15:** `ActionTaken` has **no** assignee field and **no** status field, and
  a body-supplied `assigneeId` or `status` is ignored rather than rejected. These
  keys are not part of the contract, and rejecting them would make a client that
  sends harmless extra keys fail. This is what makes "assign" (FR-24) and
  "complete"/"cancel" (FR-25) resolve to Ticket-level controls.
- **AD-16:** The Lab 4 Actions Taken area is a **table**, not a card list:
  Date/Time, Description, Result, Performed By, Follow-Up, Notes. A Ticket can
  accumulate many actions and the comparison across them is tabular.
- **AD-17:** The dashboard screen paths are `/dashboard` for Requesters and
  `/staff/dashboard` for IT Staff and Administrators, following the existing
  `/my-tickets` and `/staff/queue` naming.
- **AD-18:** `onDelete: Restrict` on `performedById`, so an audit record cannot
  disappear as a side effect of a future user deletion. Lab 4 deletes no users.
- **AD-19:** This issue creates the four specification documents only.
  `reviewer.md`, `ai-use.md`, and any credential notes are produced at the Lab 4
  release, following the Lab 3 pattern where Issue 14 produced the four contract
  documents and the release issue produced the evidence documents.
- **AD-20:** `version` is **mandatory** on `PUT /api/actions/:id` and
  **optional** on `PUT /api/staff/tickets/:id/status`. Handout section 6.1 asks
  that stale updates be detected "so that one user does not unknowingly overwrite
  another user's recent workflow change". The Action Taken write is protected
  completely because editing always happens on a form built from a loaded record,
  so the version is free to supply and a genuine two-staff conflict is likely. The
  status control is also reachable from the queue, a search result, and a
  dashboard drill-down, where the client holds a row summary that carries no
  `version`; requiring it would force a refetch before every transition and raise
  a `409` the user cannot act on. The trade-off is accepted explicitly: a
  transition sent with no `version` is last-write-wins, which is tolerable because
  `currentStatus` is a single enum value that is immediately visible on the badge —
  unlike a paragraph of follow-up prose. Every Lab 4 client screen sends `version`
  when it holds one, and `API-25` asserts the escape hatch stays deliberate.

---

## 12. Amendment Log

| Version | Date | Change | Approved by |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-10-04 | Initial Lab 4 specification. | Approved (student, 2026-10-04) |
| v1.1 | 2026-10-04 | Section 2 no longer states a row count taken from one development database ("a full-screen table of 343 rows"); it describes the Requester's problem without a number that is only true of a particular snapshot. Section 7 seed requirements now name all three shapes handout section 5.3 requires — zero, **exactly one**, and multiple — and point at `MIG-05`, which had no "exactly one" case to assert. Section 8's `GET /api/dashboards/requester` row read `Session (REQUESTER scope)` with a `403` in its error list, which contradicted `api-spec.md` section 3.2 and `ui-spec.md` section 4; it is now any authenticated role, own data only, `401` and `500`, and the Authorization Matrix agrees. Added **AD-20** recording the meaningful choice handout section 9 asks for: `version` mandatory on `PUT /api/actions/:id`, optional on the status endpoint. Added a note under BR-13 that Lab 4 BR numbering is independent of Lab 3, so BR-13 (advisory indication) is not read as Lab 3 BR-13 (inactive-assignee, here BR-14). | Approved (student, 2026-10-04) |

---

*End of specification. Changes require student approval and a version bump.*

**Approval:** v1.1 approved by the student on 2026-10-04. This approves the
contract only — no FR, BR, AC, endpoint, screen, or checklist row is verified by
it, because nothing has been built or run yet.