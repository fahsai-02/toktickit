# Lab 4 UI Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 4: Actions Taken, Ticket Workflow, and Role Dashboards |
| **Version** | v1.0 (Draft 2026-10-04 — awaiting student approval) |
| **Date** | 2026-10-04 |
| **Contract source** | `specification.md` v1.0; request and response shapes in `api-spec.md` |
| **Predecessor** | `docs/lab-03/ui-spec.md` — Lab 4 inherits its tokens, states, and accessibility rules unchanged |

---

## 1. Color Tokens (inherited from Lab 2)

No new color is introduced in Lab 4. The dashboards and the Actions Taken area
reuse the tokens already defined in `client/src/index.css`:

| Token group | Values | Used in Lab 4 for |
| :--- | :--- | :--- |
| Surfaces | `--color-background`, `--color-surface`, `--color-border` | Page and card backgrounds, dividers |
| Brand | `--color-primary`, `--color-secondary` | Header bar, primary buttons, focus rings |
| Text | `--color-text`, `--color-text-muted` | Body text, secondary labels, table headers |
| Status | the 8 `TicketStatus` badge colors | Status badges on dashboards and Actions Taken |
| Priority | `LOW` / `MEDIUM` / `HIGH` / `URGENT` badge colors | Requested and IT Priority badges |
| Feedback | success / danger / warning / info | Callouts, validation messages |

A dashboard card that needs emphasis uses an existing token — the urgent card
uses the danger or warning token already used for a `URGENT` priority badge,
rather than a new red. If a new color ever appears necessary, it is a token
addition to section 1 with a version bump, not a local choice in a component.

## 2. Typography and Spacing (inherited from Lab 2)

Unchanged. Dashboard card numbers use the existing heading scale rather than a new
size; the Actions Taken table uses the same cell typography as the Lab 3 queue
table so the two read as one system.

## 3. Control States (inherited from Lab 2)

Unchanged, with the additions Lab 4 relies on called out:

### Buttons

Primary, secondary, ghost, and destructive variants; a busy state that disables the
control and shows a spinner; a disabled state.

**[Lab 4 new]** The Action Taken **Save** button uses the busy state as its
duplicate-submission guard (FR-20, BR-16). While its request is in flight it is
disabled and shows a spinner, so a second click cannot fire a second request.
This is the whole mechanism — there is no server-side idempotency key (AD-05).

### Text inputs / selects / textarea / toggle

**[Lab 4 new]** `followUpRequired` is a `Toggle` with `role="switch"`. Toggling
it **on** makes `followUpNote` a required field — the red asterisk appears and
the field becomes enabled on the same render, with no hidden state. Toggling it
off leaves `followUpNote` present but no longer required, so a previously typed
note is not destroyed by the toggle.

### Badges

Status, priority, role, and label variants, unchanged.

**[Lab 4 new]** A `URGENT` priority badge in the urgent list keeps the same colors
as everywhere else. The urgent list is not given its own red styling, so a badge
means the same thing on every screen.

## 4. Application Shell

### 4.1 Role-Based Navigation

Lab 4 adds exactly one navigation link per role, and changes nothing else:

| Role | Existing links | Lab 4 addition |
| :--- | :--- | :--- |
| Requester | My Tickets, Create Ticket | **Dashboard** → `/dashboard` |
| IT Staff | My Queue | **Dashboard** → `/staff/dashboard` |
| Administrator | My Queue, User Management | **Dashboard** → `/staff/dashboard` |

The rules from Lab 3 still hold: a link is shown only to a role permitted to use
it, and the Dashboard link is placed **first** in the list because it is the
landing page for both dashboards. `/` continues to redirect by role.

A Requester has no link to `/staff/dashboard`, and an IT Staff member has no link
to `/admin/users`; hiding the link is presentation only, and the backend
independently refuses the route (BR-19).

### 4.2 Screen Paths

| Path | Component | Role |
| :--- | :--- | :--- |
| `/dashboard` | `RequesterDashboard` | Any authenticated user, own data only |
| `/staff/dashboard` | `StaffDashboard` | IT Staff, Administrator |
| `/staff/queue` | existing | unchanged, plus `statusGroup` |
| `/staff/tickets/:ticketId` | existing, plus an Actions Taken tab | IT Staff, Administrator |
| `/tickets/:ticketId` | existing, plus a read-only Actions Taken section | Requester, own tickets |

## 5. Screen Layouts

### 5.1 Requester Dashboard (`/dashboard`)

```
+------------------------------------------------------------------+
| TokTickIT        Dashboard  My Tickets  Create Ticket      (user) |
+------------------------------------------------------------------+
|  My Tickets                                                       |
|                                                                   |
|  +--------+ +--------+ +--------+ +--------+ +--------+          |
|  |   7    | |   2    | |   1    | |   3    | |   5    |          |
|  |  Open  | |In Progr| |Waiting | |Resolved| | Closed |          |
|  +--------+ +--------+ +--------+ +--------+ +--------+          |
|                                                                   |
|  +--------------------+  +--------------------+                   |
|  | Needs your attn.  |  |  Create Ticket     |  <- if counts 0   |
|  |         2         |  +--------------------+                   |
|  | [See tickets]     |                                           |
|  +--------------------+                                            |
|                                                                   |
|  +-----------------------------+  +-----------------------------+ |
|  | Recently Updated            |  | Recently Resolved           | |
|  | TKT-2026-000012  In Progress|  | TKT-2026-000009  Resolved   | |
|  | Laptop battery drains...    |  | VPN drops after sleep...    | |
|  | 2 hours ago                 |  | 2 days ago                  | |
|  +-----------------------------+  +-----------------------------+ |
+------------------------------------------------------------------+
```

**Cards.** Six count cards in one row at desktop. The field behind each card is
named, so a reviewer can tie a card to the response without guessing:

| Card label | Response field | Meaning |
| :--- | :--- | :--- |
| Open | `counts.open` | {`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`} |
| In Progress | `counts.inProgress` | `IN_PROGRESS` only |
| Waiting for You | `counts.waitingForRequester` | `WAITING_FOR_REQUESTER` |
| Resolved | `counts.resolved` | `RESOLVED` |
| Closed | `counts.closed` | `CLOSED` |
| Needs your attention | `counts.attentionRequired` | `WAITING_FOR_REQUESTER` plus any `REOPENED` |

Each card is a link to the drill-down in `api-spec.md` section 3.1. A card showing
`0` is still rendered — a Requester with nothing open should see that "Open: 0",
not find the card missing and wonder whether the screen broke (FR-17, BR-20).

`attentionRequired` is visually distinct from the plain count cards: it uses the
attention/warning token and carries the label **"Needs your attention"**, because
"2" next to a heading called `attentionRequired` means nothing to a Requester.
The wording is the human meaning; the underlying field name is not shown.

> **"Open" is a group, not the `OPEN` status.** The label on the first card reads
> "Open", and a Requester will reasonably take that to mean the `OPEN` status. It
> means every status where work is still outstanding. If a grader reads that card
> as "Tickets whose status is `OPEN`", the number will not match, and the screen
> will look wrong even though the API is right. The grouping is fixed by
> `specification.md` section 5 Field Definitions; the label is what carries the
> ambiguity, so it is called out here rather than left to be discovered.

**Lists.** "Recently Updated" and "Recently Resolved" side by side at desktop,
stacked below 992px. Each row shows ticket number, summary, a status badge, and
a **relative time in Asia/Bangkok** ("2 hours ago", "2 days ago"). Rows are
keyboard-focusable links to the Ticket Detail.

**States.**

| State | Presentation |
| :--- | :--- |
| Loading | Card skeletons and list placeholders; no layout shift when data lands |
| Zero activity | Cards show `0`; both lists show the shared `ListState` empty block with a "Create Ticket" call to action |
| Empty list, non-zero cards | The relevant list shows its empty block; other cards still render their numbers |
| Failure | `ListState` error block with a Retry button; no stale numbers left on screen |

### 5.2 IT Staff Dashboard (`/staff/dashboard`)

```
+------------------------------------------------------------------+
| TokTickIT     Dashboard  My Queue                          (user) |
+------------------------------------------------------------------+
|  IT Staff Dashboard                                               |
|                                                                   |
|  +--------+ +--------+ +--------+ +--------+                      |
|  |   4    | |   9    | |   6    | |   3    |                      |
|  |  New   | |  Open  | |In Progr| |Waiting |                      |
|  +--------+ +--------+ +--------+ +--------+                      |
|                                                                   |
|  +--------------------+  +--------------------+                   |
|  |  Unassigned   12   |  |  Assigned to me  5 |                   |
|  +--------------------+  +--------------------+                   |
|                                                                   |
|  By IT Priority                                                   |
|  +----------------------------------------------------------+    |
|  | URGENT 2 | HIGH 5 | MEDIUM 11 | LOW 4 | Not set 8        |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  Urgent (2)                                            [By IT][By REQ] |
|  +----------------------------------------------------------+    |
|  | TKT-2026-000031  Production VPN unreachable      URGENT     |    |
|  | OPEN · Unassigned · updated 1 hour ago                     |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +-----------------------------+  +-----------------------------+ |
|  | Recently Updated            |  | My Recent Actions           | |
|  +-----------------------------+  +-----------------------------+ |
+------------------------------------------------------------------+
```

**Cards.** Four status cards, then two ownership cards. Field names, so a card can
be tied to the response without guessing:

| Card label | Response field | Meaning |
| :--- | :--- | :--- |
| New | `counts.new` | `NEW` |
| Open | `counts.open` | `OPEN` |
| In Progress | `counts.inProgress` | `IN_PROGRESS` |
| Waiting for Requester | `counts.waitingForRequester` | `WAITING_FOR_REQUESTER` |
| Unassigned | `counts.unassigned` | `ownerId IS NULL` |
| Assigned to me | `counts.myAssigned` | `ownerId` = session user |
| Urgent | `counts.urgentTickets` | the BR-25 predicate |

All are links to their drill-down. **Unlike the Requester dashboard, the staff
"Open" card is the single `OPEN` status**, because staff triage one status at a
time — the same word on two dashboards deliberately means different things, and
both drill-downs are stated in `api-spec.md` so the difference is visible in the
contract rather than something a user has to discover.

**By IT Priority.** A single horizontal strip of five labelled counts, always
showing all five buckets including **"Not set"** for a null `itPriority`, each
with its real count and each a link to `?itPriority=<value>` (the "Not set" bucket
links to the unfiltered-by-priority queue). It is driven by the `byItPriority`
array, whose five buckets always sum to the queue total. An empty bucket shows `0`
rather than disappearing, so the strip does not reflow as data changes (FR-17,
BR-20).

**Urgent list.** The urgent Tickets themselves, capped at 10, newest-updated
first. Each row shows ticket number, summary, status badge, priority badge,
owner (or "Unassigned"), and relative time. Because the card counts two
conditions (BR-25), the header carries **two filter links, "By IT Priority" and
"By Requested Priority"**, matching the two drill-downs in `api-spec.md`
section 3.3. A single link here would show the user fewer rows than the count
above it.

**My Recent Actions.** The `myRecentActions` list — the caller's own five most
recent Action Taken records across all Tickets, and the evidence grading Part 5
asks for. Each row: ticket number, `actionDate` relative in Asia/Bangkok, and the
description. Rows link to that Ticket's Actions Taken area. This list is empty for
a staff member who has not recorded anything, and says so.

**Administrator addition.** An Administrator additionally sees a **Users** card
driven by `userCounts` (`total`, `active`, `inactive`), linking to
`/admin/users`. For IT Staff the card is **not rendered at all** — the key is
absent from the response (FR-15), so the card's absence reflects the data rather
than a client guess.

**States.** Same four states as section 5.1. The distinction that matters here:
a staff member with no assigned Tickets sees `myAssigned: 0` and an empty "My
Recent Actions" — that is data, not an error.

### 5.3 Actions Taken Area — IT Staff Ticket Detail

Rendered as a fourth tab beside Public Comments, Internal Notes, and
Attachments, with a count badge on the tab label.

**Read mode (default)**

```
| Date/Time        | Description          | Result            | Performed By | Follow-Up | Notes |
|------------------|----------------------|-------------------|--------------|-----------|-------|
| 4 Oct, 11:15     | Replaced the 65W     | Charge rate       | Michael      | Required  | See   |
| (Asia/Bangkok)   | charger              | verified          | Brown        | ✔ note    | ...png|
+------------------+----------------------+-------------------+--------------+-----------+-------|
```

Column set is Date/Time, Description, Result, Performed By, Follow-Up, Notes
(AD-16). A Ticket can accumulate many actions and they are compared across each
other, so this is a table rather than a card list. On mobile it becomes stacked
cards, one action per card, keeping all six fields.

- **Date/Time** renders `actionDate` in Asia/Bangkok with a relative hint
  ("4 days ago" alongside the absolute date when the gap is large).
- **Follow-Up** shows a `Required` badge plus the note text when
  `followUpRequired` is true, and an em dash when false.
- **Performed By** is the recorded performer — the session user at the time of
  saving. It is read-only text, never a picker (FR-02, BR-22).
- An **empty** area shows the `ListState` empty block with a "Record an action"
  call to action.

**Create mode.** A "Record Action" button opens an inline form (a drawer on
desktop, a full-screen overlay on mobile) with: Action Date/Time (defaulting to
now, with an "now" quick-set), Description\*, Result\*, Follow-Up Required
toggle, Follow-Up Note (conditionally required), and Attachment Notes.

- There is **no** assignee control and **no** per-action status control. The
  action belongs to the Ticket that is already open, and its status is the
  Ticket's status, controlled in the Ticket header area (FR-24, FR-25, AD-15).
  Their absence is the point: a grader looking for "assign" on this screen finds
  the Ticket Owner control instead, one level up.
- Required fields carry a red asterisk; messages render under their own field.
- Attachment Notes carries helper text: "Which attachment or screenshot should
  we look at? This is a note only — it does not attach a file."
- **Save** uses the busy state while in flight (FR-20).

**Edit mode.** Same form, pre-filled, opened from a row's Edit button. The record's
`version` is sent with the save. On a `409`, the form is **kept**, a conflict
callout appears above the form — "This action was updated by someone else" — with
a **Refresh** button that loads the server's copy. The user's typing is never
discarded without being told.

**Validation and failure feedback.**

| Situation | Feedback |
| :--- | :--- |
| Blank Description or Result | Inline messages under each field; no request sent |
| Follow-Up on, note blank | Inline message under Follow-Up Note |
| Over 2000 characters | Counter turns to the error color; inline message |
| Date more than 5 minutes ahead | Inline message naming the 5-minute limit |
| `403`, `404`, `409`, `500` | Callout above the form; **field values retained** (FR-21) |
| `405` from a `DELETE` attempt | Not reachable from the UI — no delete control exists |

### 5.4 Actions Taken Area — Requester Ticket Detail

The same six fields, rendered **read-only**, below the description card and above
Public Comments.

- No "Record Action" button, no Edit button, no delete control, no assignee
  control, and no per-action status control.
- The Ticket's Owner and Status, where the Requester can see them, remain
  Ticket-level read-only fields and are visually separated from the actions list.
- If the Ticket has no actions, the area shows the `ListState` empty block with
  the text "No actions have been recorded yet" — never a zero-length table with
  headers and no guidance.

### 5.5 Workflow and Resolution Feedback

The status control lives in the Ticket header area on IT Staff Ticket Detail,
beside the Owner and IT Priority controls. It is unchanged in placement from Lab 3;
what changes is what happens when a transition is attempted.

| Situation | Feedback |
| :--- | :--- |
| Legal transition | Applied immediately; the status badge updates; success is visible in the badge change |
| Transition needing confirmation (`OPEN→CANCELLED`, `IN_PROGRESS→RESOLVED`) | `ConfirmDialog` naming the exact transition, e.g. "Move this ticket to Resolved? This cannot be undone from here." Cancel does nothing |
| Transition not in the matrix | **Not offered.** The dropdown lists only permitted targets, so this state is unreachable from the UI and a raw request gets the backend's `400` |
| Gate unmet — no summary | Error callout below the status control: "Cannot resolve this ticket without a resolution summary. Save a resolution summary first." The status badge is unchanged |
| Gate unmet — no actions | "Cannot resolve this ticket without at least one recorded Action Taken." Status unchanged |
| Gate unmet — both | "Cannot resolve this ticket without a resolution summary and at least one recorded Action Taken." Status unchanged |
| `409` on version mismatch | Conflict callout with a Refresh action; **the status control is not silently reverted without telling the user** |
| Requester indicated resolved | A "Requester indicates resolved" badge, exactly as in Lab 3, visually separate from the status badge so the two are never confused for one another |

A gate failure must be visible **at the point of the attempt**, not as a
toast that disappears: the user changed the status and needs to see that it did
not change.

## 6. Responsive Rules

| Viewport | Rules |
| :--- | :--- |
| Desktop ≥992px | Six count cards in one row at desktop, three per row from 1200px down; two-column dashboard lists; Actions Taken as a six-column table; create/edit form in a right-side drawer; container max 1200px |
| Tablet 768–991px | Count cards 3 per row; dashboard lists stack full-width; Actions Taken table hides the Notes column into a second line per row; form drawer becomes a bottom sheet |
| Mobile <768px | Everything stacks vertically; cards full-width; **Actions Taken table becomes one card per action** keeping all six fields, because a six-column table cannot be read at 375px; form becomes a full-screen overlay; tap targets ≥44px; **zero horizontal page scrolling** |
| All sizes | No clipped labels, overlapping messages, hidden buttons, or truncated-unreadable text |

**Tablet is 820px, not 768px** (AD-12). `client/src/App.css` switches to the
mobile layout at `max-width: 768px`, so a capture at exactly 768px would render
the mobile layout and produce a duplicate of the mobile evidence instead of
tablet evidence. 820px sits inside the tablet band. Mobile is 375×844.

## 7. Accessibility

Inherits every Lab 3 rule: native `<select>`, `<button>`, and `<input>` elements;
tab order follows visual reading order with no positive `tabindex`; every control
has a `<label htmlFor>` and every icon-only control an `aria-label`; the 2px
focus ring with 2px offset is never removed, and switches from
`--color-secondary` on light surfaces to white on the dark header bar; errors are
linked with `aria-describedby` and invalid controls carry `aria-invalid="true"`;
dialogs trap focus, close on Escape, and return focus to their trigger.

Lab 4 additions:

- **Dashboard cards are real links.** Each card is an `<a>` to its drill-down, so
  it is reachable by keyboard, announced with a meaningful accessible name
  ("Open tickets, 7"), and openable in a new tab. A card built from a `div` with
  an `onClick` would satisfy none of that.
- **A card's accessible name includes its number**, so a screen reader user
  reaches "Open tickets, 7" without entering the card to find the count.
- **The Follow-Up toggle** has `role="switch"` and `aria-checked`, and its label
  names the consequence: "Follow-up required — a note is needed when this is on."
- **Status is never conveyed by color alone.** Every status and priority badge
  contains its text; the urgent card's emphasis is a border and a label as well
  as a color.
- **The Actions Taken table has a `<caption>`** or an accessible name identifying
  it as the Ticket's recorded actions, and each row's Edit button has an
  accessible name that includes the action's date, so a list of six identical
  "Edit" buttons is distinguishable.
- **Live regions.** A dashboard's loading→loaded transition and a save's
  success or failure are announced through an `aria-live="polite"` region, so a
  non-sighted user learns that "Save action" succeeded without hunting for the
  changed row.
- **Conflict and gate callouts** are `role="alert"`, so they interrupt rather
  than waiting to be found.

## 8. Reusable Component Inventory

No new primitive is invented in Lab 4. Everything composes existing components:
`Button` (all variants, plus busy) · `TextField` · `TextArea` (with counter) ·
`SelectField` · `ReadOnlyField` · `Toggle` · `Badge` (status / priority / role) ·
`Callout` (error / success / info / warning) · `Spinner` · `ListState` (loading /
empty / no-results / error+retry) · `ConfirmDialog` · `Drawer` · `TicketTable` /
`TicketCard` · `Navbar` (role-aware) · `AttachmentSection`.

Three Lab 4 constructs are new but stay **inline inside their owning screen**,
following the Lab 3 decision not to over-extract single-screen pieces:

| Construct | Lives in | Note |
| :--- | :--- | :--- |
| `MetricCard` | both dashboards | A link, a count, a label. Small enough that extracting it would add indirection without reuse beyond the two screens; both screens define it identically in `App.css` |
| `ActionTable` | `StaffTicketDetail`, `TicketDetail` | Read mode differs (staff gets Edit, requester does not) and is not separable without prop-heavy branching |
| `ActionForm` | `StaffTicketDetail` | Only staff have one; the requester view has no form at all |

Dashboard grids, the by-priority strip, and the card row live in `App.css` in the
`layout` layer, which wins over the `components` layer without `!important`.

## 9. Visual Inspection Checklist and Screenshot Paths

Captured by Playwright at **1440×900 (desktop)**, **820×1180 (tablet)**, and
**375×844 (mobile)** — 10 screens × 3 viewports = 30 responsive captures
(`RESP-01..30`):

```
artifacts/lab-04/screenshots/requester-dashboard/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/requester-dashboard-empty/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/staff-dashboard/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/staff-dashboard-admin/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/staff-ticket-actions/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/staff-ticket-action-form/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/requester-ticket-actions/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/staff-ticket-actions-empty/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/workflow-gate-blocked/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/workflow-confirm-dialog/{desktop,tablet,mobile}.png
```

State-evidence captures, for states a happy-path screenshot cannot show:

```
artifacts/lab-04/screenshots/states/action-save-conflict/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/states/action-validation-errors/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/states/action-form-retained-after-failure/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/states/dashboard-loading/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/states/dashboard-zero-metrics/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/states/dashboard-error-retry/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/states/action-tab-keyboard-focus/{desktop,tablet,mobile}.png
```

The responsive, state, and measured-audit specs together produce
**artifacts/lab-04/screenshots/** — that path is a committed deliverable and is
negated in `.gitignore`; no bare `*.png` rule may be added above that negation.

### 9.1 Visual Checklist

Every row starts at **`Pending`**. Issue 30 fills the last column with `Pass` or
`Fail` after a human looks at the captures and tabs through the running app; the
`Auto` column names the test that proves the mechanical part of each row so a
reviewer can re-run it instead of trusting the table.

> **Why two columns.** An automated check and a human look are different
> evidence. A script can measure a computed color or a scroll width; it cannot
> decide whether a dashboard *reads* correctly or whether a card's label makes
> sense to a person. Only the second kind of evidence is claimed in the
> `Manual pass` column, and only a person can provide it.

| # | Checklist item | Auto (test ID) | Manual pass (student sign-off) |
|---|----------------|----------------|------------------------------|
| 1 | Colors match section 1 tokens; no new color introduced in Lab 4 | STYLE-01, STYLE-02 | Pending |
| 2 | Dashboard cards are visually consistent with each other (size, padding, radius, number alignment) | STYLE-10 | Pending |
| 3 | Card numbers align and use one type scale; no card is taller than its neighbour for a different reason | STYLE-10 | Pending |
| 4 | A `0` metric renders as `0`; no card disappears when empty (FR-17) | STYLE-04, API-38, RESP-04..06 | Pending |
| 5 | "Needs your attention" card is distinguishable from plain count cards by more than color | STYLE-04 | Pending |
| 6 | By-IT-Priority strip shows all five buckets including "Not set", each a link | API-31, UI-25, STYLE-04 | Pending |
| 7 | Urgent list header offers **both** priority drill-down links, matching the count above it | UI-26, API-35 | Pending |
| 8 | `userCounts` card rendered for Administrator and absent for IT Staff | API-32, UI-27, RESP-07..12 | Pending |
| 9 | Every dashboard card is a link with an accessible name that includes its number | UI-24 | Pending |
| 10 | Actions Taken table columns: Date/Time, Description, Result, Performed By, Follow-Up, Notes | UI-09, RESP-13..15 | Pending |
| 11 | Dates and times render in Asia/Bangkok on both dashboards and both Actions Taken views | UI-10, STYLE-09 | Pending |
| 12 | "Performed By" is read-only text — no picker, no editable affordance | UI-11 | Pending |
| 13 | No assignee control and no per-action status control exist in either Actions Taken view (FR-24, FR-25) | UI-12, UI-13, API-14, API-15 | Pending |
| 14 | Requester Actions Taken view has no Record, Edit, or Delete control | UI-15, API-03, API-04, RESP-19..21 | Pending |
| 15 | Staff Actions Taken empty state is a helpful message, not a bare table with headers | UI-16, RESP-28..30 | Pending |
| 16 | Follow-Up toggle reveals and requires its note on the same render; toggling off does not destroy a typed note | UI-03 | Pending |
| 17 | Character counters turn to the error color over 2000 characters | STYLE-07 | Pending |
| 18 | Save button shows the busy state while in flight and cannot be double-clicked into a second request | UI-04, STYLE-05 | Pending |
| 19 | A failed save retains every entered field value (FR-21) | UI-05, UI-06, STATE-07..09 | Pending |
| 20 | A `409` shows a conflict callout with a Refresh action and does not discard typing | UI-07, API-17, STATE-01..03 | Pending |
| 21 | Gate failure message appears at the status control and names the unmet condition; the status badge does not change | UI-17, API-19, STATE-22..24 | Pending |
| 22 | Confirmation dialog names the exact transition it is about to apply | UI-19, STATE-25..27 | Pending |
| 23 | The status dropdown offers only permitted targets for the current status | UI-18, API-23 | Pending |
| 24 | "Requester indicates resolved" badge is visually distinct from the status badge | STYLE-03, UI-20 | Pending |
| 25 | Actions Taken table becomes one card per action at 375px, keeping all six fields | RESP-13..21 | Pending |
| 26 | No horizontal scrolling at 375px on any new or changed screen | RESP-01..30 | Pending |
| 27 | No clipped labels, overlapping callouts, or hidden buttons at any of the three viewports | RESP-01..30, STYLE-08 | Pending |
| 28 | Keyboard: every card, table row action, and form control is reachable in reading order | UI-19, STATE-19..21 | Pending |
| 29 | Visible focus ring on a card, a row Edit button, and each form field | STYLE-08, STATE-19..21 | Pending |
| 30 | Focus returns to the trigger after a dialog closes | UI-19, STATE-25..27 | Pending |
| 31 | Status and priority are legible without color (text present in every badge) | STYLE-02 | Pending |
| 32 | No uncaught error in the browser console on any new screen, happy path or failure | E2E-06, UI-29 | Pending |
| 33 | Loading, empty, no-results, and error states each have a real screenshot, not a description | STATE-01..27 | Pending |
| 34 | All Lab 3 screens still render correctly after the Lab 4 changes | REG-01, REG-02, MIG-01 | Pending |

**Completion rule.** A row is marked `Pass` only when its `Auto` test passes
**and** a human has looked at the corresponding capture or driven the keyboard.
An automated pass alone leaves the row `Pending`; a human looking alone leaves it
`Pending` if the test fails. `Fail` requires a note saying what was wrong, because
a failed visual row that is not explained gets re-run until it looks right rather
than until it is right.

---

*End of UI specification. Changes require student approval and a version bump.*