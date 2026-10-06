# Lab 4 REST API Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 4: Actions Taken, Ticket Workflow, and Role Dashboards |
| **Version** | v1.1 (Approved 2026-10-04) |
| **Date** | 2026-10-04 |
| **Contract source** | `specification.md` v1.0 (FR/BR/AC references below trace to it) |
| **Predecessor** | `docs/lab-03/api-spec.md` v1.2 — every endpoint not listed in sections 2–5 keeps its Lab 3 shape verbatim |

---

## 1. Conventions

Everything in this section that is not marked **[Lab 4 new]** restates the Lab 3
convention unchanged, and is repeated here so this file can be read on its own.

- **Base URL:** `http://localhost:5000` in development. The port comes from the
  `PORT` environment variable of `server/.env` and defaults to `5000`. The Vite
  client runs on `http://localhost:5173` and reaches the API through the dev
  proxy (`client/vite.config.ts` forwards `/api`). When `VITE_API_URL` is set in
  `client/.env`, the client makes direct cross-origin calls.
- **Authentication:** session-based via `express-session`. After a successful
  login a `connect.sid` cookie is set. All protected endpoints require it;
  unauthenticated requests receive `401`. The two documented Lab 3 exceptions
  still hold: the append-only `405` guards answer `405` without a session, and
  `POST /api/auth/logout` is idempotent.
- **Session store:** in-memory `MemoryStore`. Acceptable for local development;
  does not survive a server restart.
- **Identity transport:** the client does **not** send `requesterId`. The server
  derives the user from the session. **[Lab 4 new]** The same rule governs
  `performedById` on Action Taken: the client never sends it and the server never
  reads it from the body (BR-03).
- **Content types:** `application/json` for all requests and responses except
  attachment upload (`multipart/form-data`) and attachment download, which
  returns a binary stream. No Lab 4 endpoint changes this.
- **IDs:** positive integers. A malformed id (non-numeric, zero, negative) is
  `400` on **every** endpoint with an `:id`. Where a section's own error list
  omits `400`, that list is not exhaustive.
- **Dates:** ISO 8601 UTC strings on the wire, for example
  `2026-10-04T10:00:00.000Z`.
- **[Lab 4 new] Display time zone:** the project time zone is **Asia/Bangkok
  (UTC+7)** (BR-18). Storage and all comparisons are UTC; **day boundaries and
  all displayed dates and times are Asia/Bangkok**. The server does not convert;
  it sends UTC and the client renders in Asia/Bangkok. No endpoint accepts an
  offset or a time zone from the client.
- **Trimming:** all string inputs are trimmed before validation and persistence,
  **except passwords**, which are compared and stored exactly as sent.
- **Enums:** `requestedPriority` / `itPriority` ∈ `LOW | MEDIUM | HIGH | URGENT`;
  `currentStatus` ∈ `NEW | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER | RESOLVED |
  CLOSED | REOPENED | CANCELLED`; `role` ∈ `REQUESTER | IT_STAFF |
  ADMINISTRATOR`.
- **Email normalization:** lowercased before storage and comparison.
- **Append-only:** Public Comments and Internal Notes remain non-editable and
  non-deletable (`405`). **[Lab 4 new]** Action Taken joins them on deletion —
  `DELETE` is `405` — but Action Taken **is** editable via `PUT` with a version
  check, which is the one deliberate difference (FR-04, BR-10, BR-15).
- **Deterministic ordering:** both ticket lists append `ticketNumber DESC` as a
  secondary sort key so rows never tie across page boundaries. **[Lab 4 new]**
  The Action Taken list orders by `actionDate ASC, createdAt ASC` (BR-06), which
  has the same purpose.
- **[Lab 4 new] Optimistic concurrency:** `ActionTaken.version` and
  `Ticket.version` are integers starting at 1. Endpoints that accept a `version`
  are marked **[versioned]** below. A stale value is `409` and the response body
  carries the server's latest copy under a top-level `data` key alongside the
  normal `error` object (BR-15, AD-03).
- **[Lab 4 new] Ignored body keys:** `assigneeId`, `status`, `performedById`,
  `ticketId`, `id`, `version` on create, `createdAt`, and `updatedAt` are **not**
  part of the Action Taken request contract. When present in a body they are
  ignored, not rejected, because they are not malformed input — they simply are
  not fields the API accepts (AD-15).
- **`mustChangePassword` is not enforced by the API.** The backend reports the
  flag; the gate to `/change-password` is client-side route guarding.

### Error envelope

All errors return one safe, uniform shape, unchanged from Lab 3:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary of what went wrong.",
    "fields": { "field": "Specific field error message." }
  }
}
```

`fields` is present only for validation errors (`400`). Error codes:

| Code | Meaning |
| :--- | :--- |
| `VALIDATION_ERROR` | Invalid/missing input (body, query, path, or form field) |
| `UNAUTHORIZED` | Not authenticated (no valid session) |
| `FORBIDDEN` | Authenticated but not permitted for this operation or resource |
| `NOT_FOUND` | Referenced resource does not exist, including a rejected inactive assignee |
| `CONFLICT` | Duplicate resource, **or a stale `version` on a `[versioned]` write** |
| `GONE` | Soft-removed attachment (download only) |
| `PAYLOAD_TOO_LARGE` | File exceeds 5 MB |
| `UNSUPPORTED_MEDIA_TYPE` | File type not permitted |
| `BUSINESS_RULE_VIOLATION` | Inactive user, attachment limit reached, status transition not allowed, **resolution gate not met** |
| `METHOD_NOT_ALLOWED` | Append-only enforcement (`PUT`/`DELETE` where not permitted) |
| `INTERNAL_ERROR` | Unexpected server failure (generic message only) |

**[Lab 4 new] Conflict body shape.** A `409` from a `[versioned]` endpoint adds
the server's current record next to the error, so the client can show the user
what changed without a second round trip:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "This Action Taken was updated by someone else. Refresh to load the latest version."
  },
  "data": { "id": 42, "version": 3, "description": "…current server value…" }
}
```

The `error` object keeps its exact Lab 3 shape, so existing client error handling
is unaffected by the addition of `data`.

---

## 2. Actions Taken Endpoints (new in Lab 4)

### 2.1 POST `/api/tickets/:id/actions`

Create an Action Taken on a Ticket (FR-01, FR-02, BR-01…BR-05, BR-07, AC-01,
AC-02, AC-04).

**Authorization:** `IT_STAFF`, `ADMINISTRATOR`. Any Ticket in the queue is
accessible (BR-09); ownership is not required.

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "actionDate": "2026-10-04T09:30:00.000Z",
  "description": "Replaced the failed 65W charger and verified charge rate.",
  "result": "Battery charges at the expected rate; voltage stable under load.",
  "followUpRequired": true,
  "followUpNote": "Order a spare charger for the front desk.",
  "attachmentNotes": "See charger-after.png in the ticket attachments."
}
```

| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `actionDate` | ISO 8601 string | No | Defaults to server now when omitted. Must parse to a valid date, and must not be later than **server now + 5 minutes** (BR-07, AD-11). |
| `description` | string | **Yes** | Non-blank after trim; 1–2000 chars (BR-05) |
| `result` | string | **Yes** | Non-blank after trim; 1–2000 chars (BR-05) |
| `followUpRequired` | boolean | No | Defaults to `false` |
| `followUpNote` | string | Conditional | Required non-blank when `followUpRequired` is `true` (BR-04); ≤2000 chars; nullable otherwise |
| `attachmentNotes` | string | No | Free text, ≤2000 chars. Does **not** create, link, or validate an `Attachment` (FR-06, AD-14) |

Any other key is ignored (see Ignored body keys above).

**201 Response**
```json
{
  "data": {
    "id": 42,
    "ticketId": 12,
    "actionDate": "2026-10-04T09:30:00.000Z",
    "description": "Replaced the failed 65W charger and verified charge rate.",
    "result": "Battery charges at the expected rate; voltage stable under load.",
    "performedById": 5,
    "performedBy": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
    "followUpRequired": true,
    "followUpNote": "Order a spare charger for the front desk.",
    "attachmentNotes": "See charger-after.png in the ticket attachments.",
    "version": 1,
    "createdAt": "2026-10-04T11:00:00.000Z",
    "updatedAt": "2026-10-04T11:00:00.000Z"
  }
}
```

`performedById` is the session user. A `performedById` in the body is ignored
(FR-02, BR-03). `ticketId` comes from the path.

**Errors**

| Status | Code | Condition |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | Missing/blank `description` or `result`; over 2000 chars; `followUpRequired: true` with blank `followUpNote`; unparseable `actionDate` |
| 400 | VALIDATION_ERROR | `fields.actionDate`: "actionDate cannot be more than 5 minutes in the future." |
| 400 | VALIDATION_ERROR | Malformed `:id` |
| 401 | UNAUTHORIZED | No session |
| 403 | FORBIDDEN | Caller is a `REQUESTER` |
| 404 | NOT_FOUND | No Ticket with that id |
| 500 | INTERNAL_ERROR | — |

**Duplicate submission:** the endpoint stores no idempotency key and performs no
dedupe (AD-05). Protection is client-side single-flight (FR-20, BR-16): the
client disables the submit control while the request is in flight. A caller that
deliberately sends the same body twice gets two records, and that is the
documented behavior rather than a defect.

---

### 2.2 GET `/api/tickets/:id/actions`

List the Action Taken records of a Ticket (FR-03, BR-06, BR-08, BR-09, AC-03,
AC-05).

**Authorization:** any authenticated caller. A `REQUESTER` may read only their
own Ticket; a foreign Ticket is `403`. `IT_STAFF` and `ADMINISTRATOR` may read
any Ticket. The response is identical for every role — a Requester's read is
read-only because there is no Requester write path, not because the payload
differs.

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": [
    {
      "id": 41,
      "ticketId": 12,
      "actionDate": "2026-10-03T04:15:00.000Z",
      "description": "Diagnosed a failing DC jack.",
      "result": "Confirmed hardware fault; replacement needed.",
      "performedById": 5,
      "performedBy": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": null,
      "version": 2,
      "createdAt": "2026-10-03T06:00:00.000Z",
      "updatedAt": "2026-10-03T08:10:00.000Z"
    }
  ],
  "meta": { "total": 1 }
}
```

**Ordering:** `actionDate` ascending, tie-broken by `createdAt` ascending
(BR-06). Two actions sharing an `actionDate` keep their insertion order. No
pagination in Lab 4: a Ticket's action history is expected to be short enough to
return whole, and handout section 8.3 asks for one place to review a
Ticket's actions.

**Errors:** `400` (malformed id), `401`, `403` (Requester, foreign Ticket),
`404` (no such Ticket), `500`.

---

### 2.3 PUT `/api/actions/:id` **[versioned]**

Update an existing Action Taken (FR-04, FR-05, BR-04, BR-05, BR-15, AC-06).

**Authorization:** `IT_STAFF`, `ADMINISTRATOR`. Any accessible Ticket.

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "version": 1,
  "actionDate": "2026-10-04T09:30:00.000Z",
  "description": "Replaced the charger and verified charge rate.",
  "result": "Battery charges at the expected rate.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": null
}
```

| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `version` | integer | **Yes** | Must equal the stored version, else `409` (BR-15) |
| `actionDate` | ISO 8601 string | No | Same rules as create, including the 5-minute future limit |
| `description` | string | **Yes** | Non-blank after trim; ≤2000 |
| `result` | string | **Yes** | Non-blank after trim; ≤2000 |
| `followUpRequired` | boolean | No | Defaults to the stored value when omitted |
| `followUpNote` | string \| null | No | Required non-blank when the resulting `followUpRequired` is `true` |
| `attachmentNotes` | string \| null | No | ≤2000 |

`ticketId`, `performedById`, `id`, `createdAt`, and `updatedAt` cannot be changed
by this endpoint; they are ignored in the body.

**200 Response**

Same shape as the create response, with `version` incremented by one.

**Errors**

| Status | Code | Condition |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | Any field rule above, including a missing or non-integer `version` |
| 400 | VALIDATION_ERROR | Malformed `:id` |
| 401 | UNAUTHORIZED | No session |
| 403 | FORBIDDEN | Caller is a `REQUESTER` |
| 404 | NOT_FOUND | No Action Taken with that id |
| 409 | CONFLICT | `version` does not match; body carries the latest record (see Conflict body shape) |
| 500 | INTERNAL_ERROR | — |

---

### 2.4 Append-only and method enforcement on Action Taken

Action Taken cannot be deleted, and has no partial-update path (FR-07, BR-10).

| Method | Path | Result |
| :--- | :--- | :--- |
| `DELETE` | `/api/actions/:id` | `405 METHOD_NOT_ALLOWED` |
| `PATCH` | `/api/actions/:id` | `405 METHOD_NOT_ALLOWED` |
| `PATCH` | `/api/tickets/:id/actions` | `405 METHOD_NOT_ALLOWED` |
| `DELETE` | `/api/tickets/:id/actions` | `405 METHOD_NOT_ALLOWED` |
| `POST` | `/api/actions/:id` | `405 METHOD_NOT_ALLOWED` |

Like the Lab 3 comment and note guards, these handlers are registered **without**
`requireAuth`, so an unauthenticated call receives `405` rather than `401`. They
read and write nothing; they exist only to reject write methods on a collection
with no such path. A mistaken entry is corrected with `PUT` (section 2.3), which
keeps the edit visible in `updatedAt` and `version`.

---

### 2.5 Body keys that are ignored, and why (FR-24, FR-25, BR-22, BR-23, AD-15)

Grading Part 6 lists "assign", "status transition", "complete", and "cancel"
among Actions Taken UI behaviors, and handout AC-01 mentions an "approved
assignee". The handout's Action Taken field list (section 4.1 and 8.3) contains
no assignee field and no status field, so this API defines neither.

| Key a client might send | What the server does | Where the concept actually lives |
| :--- | :--- | :--- |
| `assigneeId` | Ignored; not stored — the column does not exist | `assign` = assigning the Ticket's primary Owner via `PUT /api/staff/tickets/:id/assign` (Lab 3 section 5.4), which writes `Ticket.ownerId` and rejects an inactive owner with `404` (BR-14) |
| `status` | Ignored; not stored — the column does not exist | `PUT /api/staff/tickets/:id/status` (section 5.1). `complete` = `RESOLVED`/`CLOSED`; `cancel` = `CANCELLED` |
| `performedById` | Ignored on create and on update | The session user, always (BR-03) |
| `ticketId` | Ignored | The `:id` path segment (BR-01) |
| `id`, `createdAt`, `updatedAt`, `version` on create | Ignored | Server-assigned |

These keys are ignored rather than rejected with `400`. They are not malformed
input; they are simply not part of the contract, and a client that sends a
harmless extra key should not fail because of it. `tests.md` asserts this by
sending each key and showing the stored record has no such column.

---

## 3. Dashboard Endpoints (new in Lab 4)

### 3.1 GET `/api/dashboards/requester`

Requester dashboard for the authenticated user (FR-13, FR-17, FR-18, BR-17…BR-21,
AC-10).

**Authorization:** any authenticated user. The scope is the session user only.
There is no query parameter that can widen or narrow it (BR-19); a client that
appends `?userId=…` is ignored.

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": {
    "counts": {
      "open": 7,
      "inProgress": 2,
      "waitingForRequester": 1,
      "resolved": 3,
      "closed": 5,
      "attentionRequired": 2
    },
    "recentTickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "Laptop battery drains quickly",
        "currentStatus": "IN_PROGRESS",
        "itPriority": "HIGH",
        "updatedAt": "2026-10-04T09:00:00.000Z"
      }
    ],
    "recentlyResolved": [
      {
        "id": 9,
        "ticketNumber": "TKT-2026-000009",
        "summary": "VPN drops after sleep",
        "currentStatus": "RESOLVED",
        "updatedAt": "2026-10-02T11:30:00.000Z"
      }
    ]
  }
}
```

**Field definitions** — authoritative table in `specification.md` section 5 under
Field Definitions. Summary:

| Key | Meaning | List limit | Zero/empty behavior |
| :--- | :--- | :--- | :--- |
| `counts.open` | Caller's Tickets in {`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`} | — | `0` |
| `counts.inProgress` | `currentStatus = IN_PROGRESS` | — | `0` |
| `counts.waitingForRequester` | `currentStatus = WAITING_FOR_REQUESTER` | — | `0` |
| `counts.resolved` | `currentStatus = RESOLVED` | — | `0` |
| `counts.closed` | `currentStatus = CLOSED` | — | `0` |
| `counts.attentionRequired` | Status in {`WAITING_FOR_REQUESTER`, `REOPENED`} | — | `0` |
| `recentTickets` | Caller's Tickets, `updatedAt` descending | 5 | `[]` |
| `recentlyResolved` | Caller's `RESOLVED` Tickets, `updatedAt` descending | 5 | `[]` |

**`recentlyResolved` ordering:** by the Ticket's `updatedAt`, because the handout
names no separate resolution timestamp and Lab 4 does not add one (AD-09).

**Errors:** `401`, `500`. Not `403` — every authenticated role may read their own
requester dashboard, so an IT Staff member calling it sees their own (normally
empty) numbers rather than an error. `GET /api/dashboards/staff` is the one with
the role guard.

---

### 3.2 GET `/api/dashboards/staff`

IT Staff dashboard (FR-14, FR-15, FR-17, FR-18, BR-17…BR-21, AC-11, AC-12).

**Authorization:** `IT_STAFF`, `ADMINISTRATOR`. A `REQUESTER` receives `403`
(BR-19).

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": {
    "counts": {
      "new": 4,
      "open": 9,
      "inProgress": 6,
      "waitingForRequester": 3,
      "unassigned": 12,
      "myAssigned": 5,
      "urgentTickets": 2
    },
    "byItPriority": [
      { "itPriority": "URGENT", "count": 2 },
      { "itPriority": "HIGH", "count": 5 },
      { "itPriority": "MEDIUM", "count": 11 },
      { "itPriority": "LOW", "count": 4 },
      { "itPriority": null, "count": 8 }
    ],
    "recentTickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "Laptop battery drains quickly",
        "currentStatus": "IN_PROGRESS",
        "itPriority": "HIGH",
        "owner": { "id": 5, "name": "Michael Brown" },
        "updatedAt": "2026-10-04T09:00:00.000Z"
      }
    ],
    "urgentTickets": [
      {
        "id": 31,
        "ticketNumber": "TKT-2026-000031",
        "summary": "Production VPN unreachable",
        "currentStatus": "OPEN",
        "itPriority": "URGENT",
        "owner": null,
        "updatedAt": "2026-10-04T08:15:00.000Z"
      }
    ],
    "myRecentActions": [
      {
        "id": 42,
        "ticketId": 12,
        "ticketNumber": "TKT-2026-000012",
        "actionDate": "2026-10-04T09:30:00.000Z",
        "description": "Replaced the failed 65W charger.",
        "result": "Charge rate verified.",
        "performedById": 5,
        "updatedAt": "2026-10-04T11:00:00.000Z"
      }
    ]
  }
}
```

For an **Administrator**, `userCounts` is added:

```json
{
  "data": {
    "counts": { "…": 0 },
    "…": "…",
    "userCounts": { "total": 11, "active": 9, "inactive": 2 }
  }
}
```

For **IT Staff**, `userCounts` is **absent** — not `null`, not zeros — so a
client can distinguish "not applicable to this role" from "there are no users"
(FR-15).

**Field definitions**

| Key | Meaning | List limit | Zero/empty behavior |
| :--- | :--- | :--- | :--- |
| `counts.new` / `counts.open` / `counts.inProgress` / `counts.waitingForRequester` | Queue-wide count of that single status | — | `0` |
| `counts.unassigned` | `ownerId IS NULL` | — | `0` |
| `counts.myAssigned` | `ownerId` = session user | — | `0` |
| `counts.urgentTickets` | Authoritative COUNT(*) of Tickets matching the urgent rule in section 3.3 (BR-25), independent of the preview list below | — | `0` |
| `byItPriority` | Always exactly five entries, see section 3.3 | — | bucket present with `count: 0` |
| `recentTickets` | Whole queue, `updatedAt` descending | 5 | `[]` |
| `urgentTickets` | The urgent Tickets themselves, `updatedAt` descending | 10 | `[]` |
| `myRecentActions` | Caller's own Action Taken across **all** Tickets, `actionDate` descending | 5 | `[]` |
| `userCounts` | Administrator only: `total`, `active`, `inactive` | — | key absent for IT Staff |

**`counts.urgentTickets` is an authoritative aggregate count** computed by the
urgent rule in section 3.3 (BR-25), independent of the `urgentTickets` preview
array (limited to 10). The preview lists the most recently updated urgent
Tickets (up to 10); the count is `COUNT(*)` over all Tickets matching BR-25.
Tests assert the count against that predicate rather than assuming equality to
`urgentTickets.length`. When there are ≤ 10 urgent Tickets, the two values may
coincide, but they must not be assumed equal in general.

**`myRecentActions` scope:** every Action Taken whose `performedById` is the
caller, across all Tickets — not limited to Tickets they own (AD-08, BR-02). Each
row carries `ticketNumber` so the list is readable without a second lookup.

**Errors:** `400` (malformed id — none expected here), `401`, `403` (Requester),
`500`.

---

### 3.3 Dashboard calculation rules

These are the rules a test can check without reading the implementation.

**Urgent rule (BR-25).** A Ticket is urgent when:

- `itPriority = URGENT`, **or**
- `itPriority IS NULL` **and** `requestedPriority = URGENT`

and its `currentStatus` is not `RESOLVED`, `CLOSED`, or `CANCELLED`.

The two halves are a precedence, not a union. Once IT Staff sets an IT Priority,
that value alone decides urgency: a Ticket with `itPriority = LOW` and
`requestedPriority = URGENT` is **not** urgent, because staff have already
re-prioritized it. `requestedPriority` is consulted only while IT Priority has
never been set — which is the normal state for a brand-new Ticket, because Lab 3
FR-14 initializes `itPriority` from `requestedPriority` but older rows and rows
created before that rule can still be null.

`itPriority` is nullable in the schema (`server/prisma/schema.prisma`), which is
why the `IS NULL` branch exists and why the rule is written this way rather than
as "either priority is URGENT".

**`byItPriority` buckets.** The array always carries exactly five entries in this
order: `URGENT`, `HIGH`, `MEDIUM`, `LOW`, then `null`. The `null` entry is the
"not set" bucket and is always present, because `itPriority` is nullable. The
five counts sum to the total number of Tickets in the queue, so the breakdown
reconciles instead of silently dropping unset Tickets. An empty bucket is
`count: 0`, not omitted — an omitted key would make the card's layout depend on
the data (FR-17).

**Time zone (BR-18).** Day boundaries are computed in **Asia/Bangkok (UTC+7)**.
Timestamps are stored and compared in UTC; the client renders Asia/Bangkok. No
Lab 4 metric is "today"-relative, so the day boundary has no effect on the values
in section 3.2 — it is pinned here because handout section 6.2 requires the
project to state one, and because the `myRecentActions` ordering and every
displayed date depend on the same decision.

**Zero is not an error (BR-20).** A metric with no rows is `0`. A list with no
rows is `[]`. Only an unexpected failure is a `500`. A brand-new staff account
with no assigned Tickets gets `myAssigned: 0` and an empty `myRecentActions`,
not a `403` and not a `404`.

**Ownership (BR-19).** The requester dashboard's scope is applied in the query,
not by filtering the response. There is no parameter a client can send to read
another user's numbers.

---

## 4. Ticket List Filter Changes

### 4.1 `statusGroup` on GET `/api/tickets` and GET `/api/staff/tickets` **[Lab 4 new]**

One new query parameter, on both list endpoints (FR-16).

| Param | Type | Default | Rules |
| :--- | :--- | :--- | :--- |
| `statusGroup` | enum | — | Optional. One of `open`, `attention`, `closed`. Any other value is `400` |

| Value | Expands to `currentStatus IN` |
| :--- | :--- |
| `open` | `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` |
| `attention` | `WAITING_FOR_REQUESTER`, `REOPENED` |
| `closed` | `RESOLVED`, `CLOSED` |

**Why this exists.** The requester dashboard's `open` card counts five statuses
and its `attentionRequired` card counts two. The existing `currentStatus` filter
accepts one value at a time, so neither card could drill down to the list that
produced its number. `statusGroup` is that multi-status filter, named for the
drill-down destinations rather than for the statuses themselves.

**Which groups a dashboard card uses, and which do not.** `open` and `attention`
exist because a card drills into them. `closed` has **no card** — the requester's
`resolved` and `closed` cards drill into `?currentStatus=RESOLVED` and
`?currentStatus=CLOSED` individually, which are already expressible — so `closed`
is a user-selectable filter on the list screen and nothing more. It is kept
because a Requester looking at their own list wants "show me everything finished"
as one click, and it costs one array in the query. It is documented here so a
reader does not assume it is a leftover from a card that was removed.

**Combination.** `statusGroup` may be combined with `search`, `categoryId`,
`priority`, `ownerId`, `sortBy`, `sortOrder`, and pagination; all are combined
with AND, exactly as `currentStatus` already is. Passing both `statusGroup` and
`currentStatus` is allowed and narrows to the intersection.

**Response:** unchanged. The `data` array and the `meta` object
(`total`, `page`, `pageSize`, `totalPages`) are byte-for-byte what the endpoint
already returns, so pagination and search behavior cannot drift.

**Errors:** `400` with `fields.statusGroup`: "statusGroup must be one of: open,
attention, closed."

### 4.2 `requestedPriority` — no Lab 4 change

`GET /api/staff/tickets` already accepts `requestedPriority` with the same enum
validation and the same `fields.requestedPriority` message as
`GET /api/tickets`. The `urgentTickets` drill-down in section 3.3 relies on it,
and no Lab 4 work is needed. `statusGroup` in section 4.1 is the only new list
filter in this sprint.

---

## 5. Changed IT Staff Endpoint

### 5.1 PUT `/api/staff/tickets/:id/status` **[versioned]**

Permitted status transition, now with the resolution gate and a version check
(FR-09, FR-10, FR-12, BR-11, BR-12, BR-13, AC-07, AC-08, AC-09).

**Authorization:** `IT_STAFF`, `ADMINISTRATOR`.

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "currentStatus": "RESOLVED",
  "version": 3
}
```

| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `currentStatus` | enum | **Yes** | Must be a permitted transition from the Ticket's current status per BR-12 |
| `version` | integer | No | When present, must equal the Ticket's stored `version`, else `409`. When absent, the transition is applied without a concurrency check |

**Why `version` is required on an Action Taken update but optional here.** The
two writes have different contexts. Editing an Action Taken always happens on a
form built from a record the client has loaded, so `version` is always available
and the check is free — and the conflict is genuinely likely, because two staff
members can open the same action and both hit Save. The status control, by
contrast, is reachable from list contexts (the queue, a search result, a
dashboard drill-down) where the client holds a row summary that does not carry
`version`. Requiring it there would mean a refetch before every transition, and a
stale list row would raise a `409` the user cannot act on because they have
nothing to refresh from.

The consequence is stated rather than left implied: a status transition with no
`version` is **last-write-wins**. That is acceptable because `currentStatus` is a
single enum field, not prose — two staff setting different statuses on the same
Ticket is rare, and the wrong one is visible on the badge immediately. Losing a
paragraph of follow-up prose is not acceptable, which is why the Action Taken
write refuses to go without the check.

The client screens in this app always send `version` where it can; omitting it is
a documented escape hatch, not the default path.

**Order of checks.** The server evaluates these in order, and the first failure
is the response:

1. Authentication (`401`).
2. Role (`403`).
3. Path id well-formed (`400`).
4. Ticket exists (`404`).
5. `currentStatus` is a valid enum value (`400`).
6. `version` matches, when supplied (`409`).
7. The transition is permitted by BR-12 (`400`).
8. **The resolution gate, for `RESOLVED` and `CLOSED` only** (`400`).
9. Apply the transition and increment `version` (`200`).

The gate is step 8, after the matrix check, so a caller gets the same
transition-rejection message as before when the pair itself is illegal, and only
sees the gate message when the pair is legal but the work is not recorded.

**Transition enforcement.** Unchanged from Lab 3 and still the single source of
truth in `server/src/lib/statusTransitions.ts`: the permitted from→to pairs, the
confirmation-required rows, and the `CANCELLED` terminal state. The authoritative
table with roles, confirmation, and gate columns is `specification.md` BR-12. The
matrix itself is not redefined in Lab 4; only the gate column is added.

**Resolution gate (BR-11, AD-01).** When the target is `RESOLVED` or `CLOSED`,
both conditions must hold:

- `resolutionSummary` on the Ticket is non-blank after trimming, and
- the Ticket has at least one Action Taken.

The check reads the summary written by the existing
`PUT /api/staff/tickets/:id/resolution-summary` (Lab 3 section 5.7). No second
write path is introduced, and the Requester's advisory
`PUT /api/tickets/:id/indicate-resolved` neither satisfies nor bypasses the gate
(BR-13, AC-09).

**200 Response**
```json
{
  "data": { "currentStatus": "RESOLVED", "version": 4 }
}
```

**Errors**

| Status | Code | Condition |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | `fields.currentStatus`: "Invalid status value." |
| 400 | VALIDATION_ERROR | Malformed `:id`, or a non-integer `version` |
| 400 | BUSINESS_RULE_VIOLATION | Pair not in BR-12: "Cannot transition from OPEN to RESOLVED. Permitted transitions: IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED." |
| 400 | BUSINESS_RULE_VIOLATION | Terminal source: "Cannot transition from CANCELLED to OPEN. This status is terminal; no further transitions are permitted." |
| 400 | BUSINESS_RULE_VIOLATION | Gate, no summary: "Cannot resolve this ticket without a resolution summary. Save a resolution summary first." |
| 400 | BUSINESS_RULE_VIOLATION | Gate, no actions: "Cannot resolve this ticket without at least one recorded Action Taken." |
| 400 | BUSINESS_RULE_VIOLATION | Gate, neither: "Cannot resolve this ticket without a resolution summary and at least one recorded Action Taken." |
| 401 | UNAUTHORIZED | No session |
| 403 | FORBIDDEN | Caller is a `REQUESTER` |
| 404 | NOT_FOUND | No Ticket with that id |
| 409 | CONFLICT | `version` mismatch; body carries the Ticket's latest copy |
| 500 | INTERNAL_ERROR | — |

Each gate message names the unmet condition or, when both are unmet, says so, so
the user is not left guessing which one to fix (FR-16, AC-07).

---

## 6. Endpoints Unchanged in Lab 4 (regression contract)

Every endpoint below keeps its Lab 3 method, path, authorization, request and
response shape, and status codes. This list is the regression surface (FR-23,
AC-17) and is not exhaustive of Lab 3 — it names the parts a Lab 4 change is most
likely to disturb.

| Area | Endpoints | Note |
| :--- | :--- | :--- |
| Health | `GET /api/health` | Response shape is **exactly** `{"status":"ok","service":"TokTickIT API"}`. Not extended with a version, timestamp, or uptime field. |
| Authentication | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` | Including the two `401` exceptions and the idempotent logout |
| Reference | `GET /api/categories`, `GET /api/related-systems` | |
| Requester tickets | `POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id` | `GET /api/tickets` gains `statusGroup` only; see section 4.1 |
| Attachments | `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, `DELETE /api/attachments/:id` | `Attachment` model untouched (FR-06, AD-14) |
| Requester comments | `POST`/`GET /api/tickets/:id/comments`, the `405` guards | |
| Requester advisory | `PUT /api/tickets/:id/indicate-resolved`, `PUT /api/tickets/:id/resolution-summary` (always `403`) | BR-13 unchanged |
| Staff queue and detail | `GET /api/staff/tickets`, `GET /api/staff/tickets/:id` | `GET /api/staff/tickets` gains `statusGroup` only |
| Staff operations | `claim`, `assign`, `priority`, `resolution-summary`, `category` | `assign` keeps the `404` on an inactive owner (BR-14) |
| Staff comments/notes | `POST`/`GET` comments, `POST`/`GET` notes, the `405` guards | Internal Notes stay staff-only |
| Staff users | `GET /api/staff/users` | |
| Administrator | `GET`/`POST /api/admin/users`, `PUT /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password` | Self-deactivation `403`, last-admin `409` |

---

## 7. Status Code Summary

| Code | Where it appears in Lab 4 |
| :--- | :--- |
| 200 | Action Taken list, Action Taken update, both dashboards, ticket lists with `statusGroup`, successful status transition |
| 201 | Action Taken create |
| 400 | All Action Taken field validation; `actionDate` more than 5 minutes ahead; `followUpRequired` without a note; malformed `:id` or `:ticketId`; invalid `statusGroup`; disallowed transition; **resolution gate unmet** |
| 401 | Every protected endpoint without a session |
| 403 | Action Taken create/update by a `REQUESTER`; Action Taken list for a foreign Ticket; `GET /api/dashboards/staff` by a `REQUESTER` |
| 404 | Unknown Ticket or Action Taken; **inactive assignee on `PUT /api/staff/tickets/:id/assign`** (BR-14) |
| 405 | `DELETE` or `PATCH` on an Action Taken path |
| 409 | **Stale `version` on `PUT /api/actions/:id` or `PUT /api/staff/tickets/:id/status`**, with the latest copy in `data`; duplicate email on admin endpoints; last-active-Administrator guard |
| 500 | Unexpected failure, generic message only |

No new status code is introduced in Lab 4. `409` is reused for the concurrency
conflict, which is what it means; `BUSINESS_RULE_VIOLATION` under `400` is
reused for the gate, matching how a disallowed transition is already reported.

---

## 8. Acceptance Criteria Traceability

`tests.md` owns the test-ID system, so every ID below is one that actually
appears in its section 2 tables. `tests.md` section 3 carries the same mapping
from the other direction, with the AC as the key.

| AC | Endpoint / mechanism | Test IDs in `tests.md` |
| :--- | :--- | :--- |
| AC-01 | `POST /api/tickets/:id/actions` (2.1) | `API-01`, `API-02`, `UI-01`, `E2E-01` |
| AC-02 | `POST` follow-up validation (2.1) | `API-09`, `API-10`, `UI-02`, `E2E-01` |
| AC-03 | `GET /api/tickets/:id/actions` ordering (2.2) | `API-06`, `UI-09` |
| AC-04 | `actionDate` future limit (2.1) | `API-12`, `UI-08` |
| AC-05 | Requester read-only access (2.2) | `API-03`, `API-04`, `AUTH-02`, `AUTH-03`, `API-07`, `UI-15`, `E2E-02` |
| AC-06 | `PUT /api/actions/:id` `409` (2.3) | `API-16`, `API-17`, `API-18`, `API-24`, `UI-07`, `E2E-01` |
| AC-07 | Resolution gate (5.1) | `UNIT-01`, `UNIT-02`, `API-19`, `API-20`, `API-21`, `API-22`, `UI-17`, `E2E-03` |
| AC-08 | Transition matrix (5.1) | `UNIT-04`, `API-23`, `UI-18`, `UI-19`, `E2E-03` |
| AC-09 | Advisory indication (5.1, section 6) | `UNIT-02`, `API-28`, `UI-20`, `E2E-03` |
| AC-10 | `GET /api/dashboards/requester` (3.1) | `API-36`, `API-37`, `API-38`, `AUTH-04`, `UI-21`, `UI-22`, `UI-23`, `STYLE-04`, `E2E-04` |
| AC-11 | `GET /api/dashboards/staff` (3.2, 3.3) | `UNIT-03`, `API-29`, `API-30`, `API-31`, `API-32`, `API-33`, `API-34`, `API-39`, `UI-25`, `UI-26`, `UI-27`, `E2E-04` |
| AC-12 | Drill-downs (3.2, 4.1) | `API-35`, `API-42`, `UI-24`, `E2E-04` |
| AC-13 | Ignored `assigneeId`; inactive owner `404` (2.5, section 6) | `API-14`, `AUTH-01`, `UI-12`, `UI-14`, `E2E-05` |
| AC-14 | Ignored `status`; Ticket lifecycle (2.5, 5.1) | `API-13`, `API-15`, `UI-13`, `E2E-05` |
| AC-15 | Form retains values after a failure | `UI-05`, `UI-06` |
| AC-16 | Duplicate submission (2.1, AD-05) | `UI-04` |
| AC-17 | Labs 1–3 regression, health shape (section 6) | `MIG-01`, `MIG-02`, `MIG-03`, `MIG-04`, `MIG-05`, `AUTH-05`, `REG-01`, `REG-02` |
| AC-18 | Visual checklist at 3 viewports | `RESP-01..30`, `STATE-01..27`, `STYLE-08`, `STYLE-09`, `STYLE-10` |

### 8.1 Tests that are not AC-bound

Four groups answer a handout requirement rather than an acceptance criterion, so
they are not in the table above. They are still real rows in `tests.md` with a
recorded status, which is what handout section 10 asks for.

| Group | Tests | Requirement it answers |
| :--- | :--- | :--- |
| Performance smoke | `PERF-01`..`PERF-04` | Handout section 10, performance-smoke category. Section 10 states no millisecond figure, so the thresholds are project-chosen, and `tests.md` says so at the row. |
| Accessibility | `A11Y-01`..`A11Y-05` | Handout section 10, accessibility category, plus section 7's four named rules. |
| Authorization | `AUTH-01`..`AUTH-06` | Handout section 10, authorization category. `AUTH-01`..`AUTH-05` are cited in the AC table above because they land on an AC; `AUTH-06` enforces the "enforced on the backend" supporting rule in `specification.md` section 5 and belongs to no single AC. |
| Seed and rollback | `MIG-04`, `MIG-05` | Handout sections 5.2 (the rollback or recovery approach documented **and tested**) and 5.3 (zero, one, and multiple Actions Taken). |

---

## 9. Amendment Log

| Version | Date | Change | Approved by |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-10-04 | Initial Lab 4 contract. Adds Actions Taken endpoints, dashboard endpoints, the `statusGroup` filter, and the resolution gate and `409` concurrency behavior to the staff status endpoint. Records that `GET /api/health` and all other Lab 1–3 endpoints are unchanged. | Approved (student, 2026-10-04) |
| v1.1 | 2026-10-04 | Section 8's third column named 24 semantic IDs that exist nowhere in `tests.md`; it now cites the real numeric IDs, adding `AUTH-01..05` and `API-42`. Added section 8.1 for the four groups that answer a handout requirement rather than an AC. Fixed the section 2.2 citation: it pointed at a handout subsection number that does not exist — the one-place requirement is handout section 8.3. | Approved (student, 2026-10-04) |

---

*End of API specification. Changes require student approval and a version bump.*

**Approval:** v1.1 approved by the student on 2026-10-04. This approves the
contract only — no FR, BR, AC, endpoint, screen, or checklist row is verified by
it, because nothing has been built or run yet.