# Lab 3 REST API Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens |
| **Version** | v1.2 — amended 2026-10-03 on top of v1.1 (2026-09-29) and v1.0 (approved 2026-09-10); see section 9 |
| **Date** | 2026-10-03 |
| **Contract source** | `specification.md` v1.0 (BR/FR/AC references below trace to it) |

---

## 1. Conventions

- **Base URL:** `http://localhost:5000` in development. The port comes from the `PORT` environment variable of `server/.env` and defaults to `5000` when unset. The Vite client runs on `http://localhost:5173` and reaches the API via the dev proxy (`client/vite.config.ts` forwards `/api` to the backend). When `VITE_API_URL` is set in `client/.env`, the client makes direct cross-origin calls.
- **Authentication:** Session-based via `express-session`. After successful login, a `connect.sid` cookie is set. All protected endpoints require this cookie; unauthenticated requests receive `401`. There are exactly two documented exceptions, both deliberate: the append-only `405` guards answer `405` even without a session (see below), and `POST /api/auth/logout` is idempotent — it returns `200` whether or not a session exists, so a client can always clear its cookie without first having to distinguish "already logged out" from "session expired".
- **Session store:** In-memory `MemoryStore` from `express-session` (see `server/src/app.ts` and `specification.md` AD-02). Acceptable for local development; does not survive server restart. Production deployment is excluded from Lab 3 scope.
- **Identity transport:** `requesterId` is NO LONGER sent by the client on ticket/attachment endpoints. The server derives the user identity from the session (AD-04). The client-supplied `requesterId` in `POST /api/tickets` is ignored.
- **Content types:** `application/json` for all requests/responses except attachment upload (`multipart/form-data`) and attachment download, which returns a binary stream whose `Content-Type` is the attachment's **stored mime type** (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) plus `Content-Disposition: attachment; filename="<originalFileName>"`. The download is never served as `application/octet-stream`.
- **IDs:** positive integers. Malformed ID (non-numeric, zero, negative) → `400`. This rule applies to **every** endpoint with an `:id`; where a section's own error list below omits `400`, that list is not exhaustive.
- **Dates:** ISO 8601 UTC strings (e.g. `2026-09-10T10:00:00.000Z`).
- **Trimming:** all string inputs are trimmed before validation and persistence, **except passwords** (`login.password`, `currentPassword`, `newPassword`, `confirmPassword`, `initialPassword`), which are compared and stored exactly as sent — a leading or trailing space in a password is part of the password.
- **Enums:** `requestedPriority` / `itPriority` ∈ `LOW | MEDIUM | HIGH | URGENT`; `currentStatus` ∈ `NEW | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER | RESOLVED | CLOSED | REOPENED | CANCELLED`; `role` ∈ `REQUESTER | IT_STAFF | ADMINISTRATOR`.
- **Email normalization:** email addresses are lowercased before storage and uniqueness comparison (BR-07).
- **Append-only:** Public Comments and Internal Notes cannot be edited or deleted via the API in Lab 3; `PUT` and `DELETE` on comment/note endpoints return `405 METHOD_NOT_ALLOWED`.
- **Deterministic ordering:** both ticket lists (sections 4.2 and 5.1) append `ticketNumber DESC` as a secondary sort key, so rows never tie across page boundaries. This is an implementation guarantee, not a selectable `sortBy` value.
- **Append-only guards are not session-guarded:** the `PUT`/`DELETE` handlers that return `405` (sections 4.11 and 5.13) are registered without `requireAuth`, so an unauthenticated call receives `405`, not `401`. No ticket, comment, or note is read or written by them; the guard exists only to reject write methods on a collection that has no update path.
- **`mustChangePassword` is not enforced by the API (BR-02, FR-06):** the backend reports the flag in the `login` and `me` payloads but does not block requests from a user whose flag is still `true`. The gate to `/change-password` is client-side route guarding. A client that skips the gate can still call every endpoint below with that session, so BR-02 is a navigation rule, not an authorization rule.

### Error envelope

All errors return one safe, uniform shape (no stack traces):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary of what went wrong.",
    "fields": { "field": "Specific field error message." }
  }
}
```

`fields` is present only for validation errors (`400`). Error codes used:

| Code | Meaning |
| :--- | :--- |
| `VALIDATION_ERROR` | Invalid/missing input (body, query, path, or form field) |
| `UNAUTHORIZED` | Not authenticated (no valid session) |
| `FORBIDDEN` | Authenticated but not permitted for this operation or resource |
| `NOT_FOUND` | Referenced resource does not exist |
| `CONFLICT` | Duplicate resource (e.g. duplicate email) |
| `GONE` | Soft-removed attachment (download only) |
| `PAYLOAD_TOO_LARGE` | File exceeds 5 MB |
| `UNSUPPORTED_MEDIA_TYPE` | File type not permitted |
| `BUSINESS_RULE_VIOLATION` | e.g. inactive user, attachment limit reached, status transition not allowed |
| `METHOD_NOT_ALLOWED` | Append-only enforcement (PUT/DELETE on comments/notes) |
| `INTERNAL_ERROR` | Unexpected server failure (generic message only) |

---

## 2. Authentication Endpoints

### 2.1 POST `/api/auth/login`

Authenticate with email and password (FR-01, FR-02, FR-03, AC-01, AC-05, AC-06).

**Body**
```json
{
  "email": "jennifer.anderson@toktickit.dev",
  "password": "TempPass123!"
}
```

| Field | Rules |
| :--- | :--- |
| `email` | Required; valid email format; normalized to lowercase |
| `password` | Required; non-empty string |

**200 Response**
```json
{
  "data": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@toktickit.dev",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": true
  }
}
```

Sets `connect.sid` session cookie.

**Errors:**
| Status | Code | Message |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | Validation failed — `fields.email` / `fields.password` messages emitted for each invalid input |
| 401 | UNAUTHORIZED | "Invalid email or password. Please try again." (generic — never reveals email existence) |

**Note on inactive accounts (AC-06):** When the email matches an inactive account, the response is still 401 with the same generic message. The server does not distinguish between "email not found" and "inactive account" in the error response.

---

### 2.2 POST `/api/auth/logout`

Destroy the server session (FR-04).

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": { "message": "Logged out successfully" }
}
```

Subsequent protected calls with the old session cookie return 401.

**Errors:** `500`

---

### 2.3 GET `/api/auth/me`

Return the current authenticated user (FR-05, AC-01).

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@toktickit.dev",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": true
  }
}
```

**Errors:**
| Status | Code |
| :--- | :--- |
| 401 | UNAUTHORIZED |

---

### 2.4 POST `/api/auth/change-password`

Mandatory first-login password change (FR-06, FR-07, AC-02).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "currentPassword": "TempPass123!",
  "newPassword": "NewSecure123!",
  "confirmPassword": "NewSecure123!"
}
```

| Field | Rules |
| :--- | :--- |
| `currentPassword` | Required; must match the stored password hash |
| `newPassword` | Required; ≥8 characters; at least one uppercase letter; at least one lowercase letter; at least one digit; at least one special character |
| `confirmPassword` | Required; must match `newPassword` |

**200 Response**
```json
{
  "data": { "message": "Password changed successfully" }
}
```

`mustChangePassword` is cleared to `false` on the User record.

**Errors:**
| Status | Code | Message |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | `fields.currentPassword`: "Current password is incorrect." |
| 400 | VALIDATION_ERROR | `fields.newPassword`: "Password must be at least 8 characters." / "Password must include at least one uppercase letter." / "Password must include at least one lowercase letter." / "Password must include at least one digit." / "Password must include at least one special character." |
| 400 | VALIDATION_ERROR | `fields.confirmPassword`: "Passwords do not match." |
| 401 | UNAUTHORIZED | Not authenticated |

---

## 3. Reference Endpoints (public)

### 3.1 GET `/api/categories`

Active categories (unchanged from Lab 2).

**200 Response**
```json
{
  "data": [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
}
```

**Errors:** `500`

---

### 3.2 GET `/api/related-systems`

Active related systems; filtered by category when `categoryId` supplied (unchanged from Lab 2).

**Query:** `categoryId` (optional integer).

**200 Response**
```json
{
  "data": [
    { "id": 7, "name": "Campus Wi-Fi", "categoryId": 4 },
    { "id": 3, "name": "Corporate Laptop", "categoryId": null }
  ]
}
```

**Errors:** `400`, `500`

### 3.3 GET `/api/health`

Backend liveness probe carried over from Lab 1. No auth, no database access.

**200 Response**
```json
{ "status": "ok", "service": "TokTickIT API" }
```

> **Note:** this is the only endpoint in the API that is **not** wrapped in the `{ "data": … }` envelope.

**Errors:** none — the handler has no failure path.

---

## 4. Requester Ticket Endpoints (authenticated, ownership-enforced)

All endpoints in this section require a valid session. The `requesterId` is derived from the session — the client does NOT send it.

### 4.1 POST `/api/tickets`

Create one validated ticket for the authenticated Requester (FR-12, FR-13, FR-14, AC-03).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "categoryId": 2,
  "relatedSystemId": 3,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly",
  "description": "Battery drops from 100% to 20% within two hours even when idle."
}
```

**Note:** `requesterId` in the body is **ignored** if present (FR-13, BR-03).

| Field | Rules |
| :--- | :--- |
| `categoryId` | Required; must exist (`404`) |
| `relatedSystemId` | Required; must exist (`404`) |
| `requestedPriority` | Required; must be a valid enum value (`400`) |
| `summary` | Required; 1–120 chars after trim (`400`) |
| `description` | Required; 1–2000 chars after trim (`400`) |

Server generates `ticketNumber` (BR-10), sets `currentStatus = NEW` (BR-11), `itPriority = requestedPriority` (BR-11), `ticketDate = createdAt`.

**201 Response**
```json
{
  "data": {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Laptop battery drains quickly",
    "description": "Battery drops from 100% to 20% within two hours even when idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "NEW",
    "ticketDate": "2026-09-10T10:00:00.000Z",
    "requester": { "id": 1, "name": "Jennifer Anderson" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
    "createdAt": "2026-09-10T10:00:00.000Z",
    "updatedAt": "2026-09-10T10:00:00.000Z"
  }
}
```

> **Note (2026-09-24):** the 201 response is the full persisted Ticket row, so it also carries the scalar FK/workflow columns `requesterId`, `requesterUserId`, `ownerId`, `categoryId`, `relatedSystemId`, `resolutionSummary`, `requesterIndicatedResolved`, and `indicatedResolvedAt`. `requesterUserId` is present on purpose — it records the authenticated identity that owns the ticket (BR-03) and is asserted by tests.

**Errors:** `400`, `404`, `500`

---

### 4.2 GET `/api/tickets`

Paginated list of the authenticated Requester's own tickets (FR-12, AC-03).

**Headers:** `Cookie: connect.sid=...`

**Query parameters:**

| Param | Type | Default | Rules |
| :--- | :--- | :--- | :--- |
| `search` | string | — | Optional; case-insensitive partial match on `ticketNumber` and `summary` |
| `categoryId` | int | — | Optional filter |
| `currentStatus` | enum | — | Optional filter |
| `requestedPriority` | enum | — | Optional filter |
| `sortBy` | enum | `updatedAt` | Whitelist: `updatedAt`, `createdAt`, `requestedPriority`, `ticketNumber` |
| `sortOrder` | `asc`\|`desc` | `desc` | — |
| `page` | int | `1` | ≥ 1 |
| `pageSize` | int | `10` | 1–50 |

**200 Response**
```json
{
  "data": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains quickly",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "category": { "id": 2, "name": "Hardware" },
      "createdAt": "2026-09-10T10:00:00.000Z",
      "updatedAt": "2026-09-10T10:00:00.000Z"
    }
  ],
  "meta": { "total": 23, "page": 1, "pageSize": 10, "totalPages": 3 }
}
```

Ordering is deterministic — see the `ticketNumber DESC` tie-break in section 1.

**Errors:** `400`, `500`

---

### 4.3 GET `/api/tickets/:id`

One owned ticket, read-only, including attachment metadata (FR-15).

**Headers:** `Cookie: connect.sid=...`

Ownership: ticket belongs to another user → `403`; no such ticket → `404`.

**200 Response** — full ticket object with attachments:
```json
{
  "data": {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Laptop battery drains quickly",
    "description": "Battery drops from 100% to 20% within two hours even when idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "IN_PROGRESS",
    "ticketDate": "2026-09-10T10:00:00.000Z",
    "requester": { "id": 1, "name": "Jennifer Anderson" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
    "resolutionSummary": "We are investigating the issue.",
    "requesterIndicatedResolved": false,
    "indicatedResolvedAt": null,
    "owner": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
    "createdAt": "2026-09-10T10:00:00.000Z",
    "updatedAt": "2026-09-10T14:30:00.000Z",
    "attachments": [
      {
        "id": 30,
        "originalFileName": "battery-report.pdf",
        "fileSize": 204800,
        "mimeType": "application/pdf",
        "isRemoved": false,
        "removedAt": null,
        "removalReason": null,
        "uploadedByRequesterId": 1,
        "createdAt": "2026-09-10T10:05:00.000Z"
      }
    ],
    "_count": { "attachments": 1, "comments": 3, "notes": 1 }
  }
}
```

**Errors:** `400`, `403`, `404`, `500`

---

### 4.4 POST `/api/tickets/:id/attachments`

Upload one attachment. A Requester may upload only to a ticket they own; IT Staff and Administrators may upload to **any** ticket (section 4.12). Otherwise unchanged from Lab 2, except that the session replaces the `requesterId` form field.

**Request:** `multipart/form-data`

| Field | Rules |
| :--- | :--- |
| `file` | Required binary. Allowed MIME/ext: `image/jpeg` (.jpg/.jpeg), `image/png` (.png), `image/webp` (.webp), `application/pdf` (.pdf) — else `415` (BR-18). Max 5 MB — else `413` (BR-18) |
| `requesterId` | **REMOVED** — ownership derived from session |

**Business rules:** a ticket may hold at most **5 active** (i.e. not soft-removed) attachments; a further upload returns `400 BUSINESS_RULE_VIOLATION` ("Ticket already has the maximum of 5 active attachments."). **Check order:** authentication (`401`) → file type and size, rejected by the upload middleware before the handler runs (`415` / `413`) → malformed `:id` (`400`) → missing `file` (`400`) → ticket existence (`404`) → access (`403`) → active-attachment limit (`400`) → type re-validated before persisting (`415`).

**201 Response:** the attachment row — same shape as Lab 2 section 2.7 (`id`, `originalFileName`, `fileSize`, `mimeType`, `isRemoved`, `removedAt`, `removalReason`, `uploadedByRequesterId`, `createdAt`).

**Errors:** `400` (malformed id, missing file, attachment limit reached), `403`, `404`, `413`, `415`, `500`

---

### 4.5 GET `/api/attachments/:id/download`

Download an active attachment's binary content. Access rules are in section 4.12.

**Headers:** `Cookie: connect.sid=...`

**Query:** the Lab 2 `requesterId` query parameter is **REMOVED** — the session is the only identity.

**200 Response:** binary stream with `Content-Type: <stored mimeType>`, `Content-Length: <fileSize>`, and `Content-Disposition: attachment; filename="<originalFileName>"; filename*=UTF-8''<percent-encoded originalFileName>` — the second parameter is the RFC 5987 form, sent so non-ASCII file names survive; CR/LF and `"` are stripped from the first parameter.

Behavior matrix: unknown id → `404`; soft-removed (`isRemoved = true`) → `410`; active file on a foreign ticket → `403` **for a Requester** (IT Staff/Administrator receive `200`, section 4.12); active file on a permitted ticket whose stored file is missing from disk → `404`.

**Errors:** `400` (malformed id), `403`, `404`, `410`, `500`

---

### 4.6 DELETE `/api/attachments/:id`

Soft-remove an active attachment. Access rules are in section 4.12.

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "removalReason": "Attached wrong screenshot"
}
```

| Field | Rules |
| :--- | :--- |
| `removalReason` | Required; 3–200 chars after trim |

Removal is a soft delete: the row and its removal metadata are retained and the binary is no longer downloadable (4.5 → `410`). Removing an attachment that is already soft-removed returns `400 BUSINESS_RULE_VIOLATION` ("This attachment has already been removed."). There is no hard-delete endpoint in Lab 3.

**200 Response:** the attachment row with `isRemoved: true`, `removedAt`, and `removalReason` populated — same shape as Lab 2 section 2.9.

**Errors:** `400` (malformed id, invalid `removalReason`, already removed), `403`, `404`, `500`

---

### 4.7 POST `/api/tickets/:id/comments`

Post a Public Comment on an own ticket (FR-16, AC-03).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "content": "Thank you for the update. Please let me know if you need any additional information."
}
```

| Field | Rules |
| :--- | :--- |
| `content` | Required; 1–2000 chars after trim |

Author and `createdAt` are recorded from the backend.

**201 Response**
```json
{
  "data": {
    "id": 1,
    "ticketId": 12,
    "authorId": 1,
    "author": { "id": 1, "name": "Jennifer Anderson", "role": "REQUESTER" },
    "content": "Thank you for the update. Please let me know if you need any additional information.",
    "createdAt": "2026-09-13T11:45:00.000Z"
  }
}
```

**Errors:** `400`, `403`, `404`, `500`

---

### 4.8 GET `/api/tickets/:id/comments`

List Public Comments for an own ticket (FR-17), ordered newest-first.

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": [
    {
      "id": 1,
      "ticketId": 12,
      "authorId": 1,
      "author": { "id": 1, "name": "Jennifer Anderson", "role": "REQUESTER" },
      "content": "Thank you for the update.",
      "createdAt": "2026-09-13T11:45:00.000Z"
    },
    {
      "id": 2,
      "ticketId": 12,
      "authorId": 5,
      "author": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
      "content": "We are investigating the issue.",
      "createdAt": "2026-09-13T10:30:00.000Z"
    }
  ]
}
```

**Errors:** `400` (malformed id), `403`, `404`, `500`

---

### 4.9 PUT `/api/tickets/:id/indicate-resolved`

Toggle the "Problem Appears Resolved" indicator (FR-19, AC-07, BR-05, BR-20).

**Headers:** `Cookie: connect.sid=...`

**Body:** `{}` (empty — toggle behavior, no body params needed)

**Behavior:**
- If `requesterIndicatedResolved` is currently `false` → sets to `true` and records `indicatedResolvedAt = now`.
- If `requesterIndicatedResolved` is currently `true` → sets to `false` and clears `indicatedResolvedAt`.
- `currentStatus` is NEVER changed.

**200 Response**
```json
{
  "data": {
    "id": 12,
    "requesterIndicatedResolved": true,
    "indicatedResolvedAt": "2026-09-13T12:00:00.000Z"
  }
}
```

**Errors:** `400` (malformed id), `403`, `404`, `500`

---

### 4.10 PUT `/api/tickets/:id/resolution-summary` (Requester)

The resolution summary is written **only** through the IT Staff endpoint in **section 5.7**. This Requester path is kept so the read-only intent is explicit, and it always answers:

| Status | Code | Message |
| :--- | :--- | :--- |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | "The resolution summary can only be set by IT Staff." |

The `403` is returned to **every** caller, IT Staff and Administrator included — it is not a role check. It marks this path as permanently read-only; use section 5.7 to save a summary.

---

### 4.11 Append-only enforcement (FR-18)

| Method | Path | Response |
| :--- | :--- | :--- |
| PUT | `/api/tickets/:id/comments` | 405 METHOD_NOT_ALLOWED |
| PUT | `/api/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/tickets/:id/comments` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |

These handlers are registered without `requireAuth`, so an unauthenticated call also receives `405` rather than `401` (section 1).

---

### 4.12 Attachment access by role (BR-03, BR-04, AD-06)

The three attachment endpoints (4.4, 4.5, 4.6) are the only Requester endpoints that IT Staff and Administrators may also use, because the IT Staff Ticket Detail reuses the same attachment UI (`ui-spec.md` section 5.5, "Attachments tab").

| Caller | `POST /api/tickets/:id/attachments` | `GET /api/attachments/:id/download` | `DELETE /api/attachments/:id` |
| :--- | :--- | :--- | :--- |
| Requester, own ticket | `201` | `200` | `200` |
| Requester, foreign ticket | `403` | `403` | `403` |
| IT Staff / Administrator, any ticket | `201` | `200` | `200` |

For a staff/admin upload, `uploadedByRequesterId` is set to the **ticket's own** legacy `Requester` row, because that FK column is unchanged from Lab 2 and must reference a `Requester`; it is never fabricated from the staff member's identity. A Requester's own upload is tagged with the legacy `Requester` row matching their session email, which is created on demand if the account predates it.

---

## 5. IT Staff Endpoints (IT_STAFF + ADMINISTRATOR)

All endpoints in this section require a valid session with role `IT_STAFF` or `ADMINISTRATOR`.

### 5.1 GET `/api/staff/tickets`

IT Staff Ticket Queue with search, filters, sorting, and pagination (FR-22, FR-23, FR-24, AC-08).

**Headers:** `Cookie: connect.sid=...`

**Query parameters:**

| Param | Type | Default | Rules |
| :--- | :--- | :--- | :--- |
| `search` | string | — | Optional; case-insensitive partial match on `ticketNumber` and `summary` |
| `currentStatus` | enum | — | Optional filter |
| `requestedPriority` | enum | — | Optional filter |
| `itPriority` | enum | — | Optional filter |
| `categoryId` | int | — | Optional filter |
| `ownerId` | string | — | Optional. Integer = filter by owner ID. `"unassigned"` = tickets with no owner. `"me"` = tickets owned by the current user |
| `sortBy` | enum | `updatedAt` | Whitelist: `updatedAt`, `createdAt`, `itPriority`, `currentStatus`, `ticketNumber` |
| `sortOrder` | `asc`\|`desc` | `desc` | — |
| `page` | int | `1` | ≥ 1 |
| `pageSize` | int | `10` | 1–50 |

Invalid parameters → `400 VALIDATION_ERROR` with descriptive `fields`.

**Scope:** the queue is **global** — it returns every ticket in the system with no requester scoping. The `ownerId` axis (an integer id, `unassigned`, or `me`) is the only ownership-related filter; there is no "my tickets" variant of this endpoint, because a staff member's own tickets are reachable through the same queue with `ownerId=me`.

**200 Response**
```json
{
  "data": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains quickly",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "IN_PROGRESS",
      "category": { "id": 2, "name": "Hardware" },
      "owner": { "id": 5, "name": "Michael Brown" },
      "requester": { "id": 1, "name": "Jennifer Anderson" },
      "createdAt": "2026-09-10T10:00:00.000Z",
      "updatedAt": "2026-09-10T14:30:00.000Z"
    }
  ],
  "meta": { "total": 87, "page": 1, "pageSize": 10, "totalPages": 9 }
}
```

Ordering is deterministic — see the `ticketNumber DESC` tie-break in section 1.

**Errors:** `400`, `403`, `500`

---

### 5.2 GET `/api/staff/tickets/:id`

Full ticket detail for staff operations (FR-26).

**Headers:** `Cookie: connect.sid=...`

**200 Response** — same shape as 4.3 but includes all fields (no ownership restriction beyond role):
```json
{
  "data": {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Laptop battery drains quickly",
    "description": "Battery drops from 100% to 20% within two hours even when idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "IN_PROGRESS",
    "ticketDate": "2026-09-10T10:00:00.000Z",
    "requester": { "id": 1, "name": "Jennifer Anderson" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
    "resolutionSummary": "We are investigating the issue.",
    "requesterIndicatedResolved": false,
    "indicatedResolvedAt": null,
    "owner": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
    "createdAt": "2026-09-10T10:00:00.000Z",
    "updatedAt": "2026-09-10T14:30:00.000Z",
    "attachments": [ ... ],
    "_count": { "attachments": 1, "comments": 3, "notes": 1 }
  }
}
```

**Errors:** `400` (malformed id), `403`, `404`, `500`

---

### 5.3 PUT `/api/staff/tickets/:id/claim`

Set the current user as ticket owner (FR-27). Ticket must be unassigned or owned by another staff/admin.

**Headers:** `Cookie: connect.sid=...`
**Body:** `{}` (empty)

**200 Response**
```json
{
  "data": {
    "owner": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" }
  }
}
```

**Errors:** `400` (malformed id), `403`, `404`, `409` (`CONFLICT`, "You already own this ticket."), `500`

---

### 5.4 PUT `/api/staff/tickets/:id/assign`

Reassign ticket to another active IT Staff or Administrator user (FR-28).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "ownerId": 6
}
```

| Field | Rules |
| :--- | :--- |
| `ownerId` | Required; must be a positive integer; must reference an active IT Staff or Administrator user (`400` if invalid, `404` if not found) |

**200 Response**
```json
{
  "data": {
    "owner": { "id": 6, "name": "Sarah Johnson", "role": "IT_STAFF" }
  }
}
```

**Errors:** `400`, `403`, `404`, `500`

---

### 5.5 PUT `/api/staff/tickets/:id/priority`

Set IT Priority (FR-29).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "itPriority": "HIGH"
}
```

| Field | Rules |
| :--- | :--- |
| `itPriority` | Required; must be a valid enum value (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) |

**200 Response**
```json
{
  "data": { "itPriority": "HIGH" }
}
```

**Errors:** `400`, `403`, `404`, `500`

---

### 5.6 PUT `/api/staff/tickets/:id/status`

Permitted status transition (FR-30, AC-09, BR-12).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "currentStatus": "IN_PROGRESS"
}
```

| Field | Rules |
| :--- | :--- |
| `currentStatus` | Required; must be a valid enum value; must be a permitted transition from the current status per the matrix in `specification.md` BR-12 |

**Transition enforcement:** The backend checks the current status of the ticket, verifies the requested target status is in the permitted transition list for the current status, and rejects disallowed transitions. The authoritative matrix — permitted from→to pairs, allowed roles, and confirmation requirements — is `specification.md` BR-12; the server and the client dropdown both read it from `server/src/lib/statusTransitions.ts`, so the enforced rules and the offered options cannot drift.

**Confirmation requirement (BR-12):** two transitions require an explicit confirmation step in the UI *before* the client sends the request — `OPEN → CANCELLED` and `IN_PROGRESS → RESOLVED`. The endpoint does not treat them differently: it applies exactly the same permission check, so a client that skipped the confirmation would still receive `200`. The confirmation is therefore a client obligation, not a server-enforced one.

**200 Response**
```json
{
  "data": { "currentStatus": "IN_PROGRESS" }
}
```

**Errors:**
| Status | Code | Message |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | `fields.currentStatus`: "Invalid status value." |
| 400 | BUSINESS_RULE_VIOLATION | "Cannot transition from OPEN to RESOLVED. Permitted transitions: IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED." |
| 400 | BUSINESS_RULE_VIOLATION | Terminal current status (`CANCELLED` has no onward transitions): "Cannot transition from CANCELLED to OPEN. This status is terminal; no further transitions are permitted." |
| 403 | FORBIDDEN | — |
| 404 | NOT_FOUND | — |
| 500 | INTERNAL_ERROR | — |

---

### 5.7 PUT `/api/staff/tickets/:id/resolution-summary`

Save the resolution summary visible to the Requester (FR-31, BR-19).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "resolutionSummary": "We have identified the root cause and applied a fix."
}
```

| Field | Rules |
| :--- | :--- |
| `resolutionSummary` | Required; non-empty after trim; 1–2000 chars |

**200 Response**
```json
{
  "data": { "resolutionSummary": "We have identified the root cause and applied a fix." }
}
```

**Errors:** `400` (empty/whitespace-only, over-length), `403`, `404`, `500`

---

### 5.8 POST `/api/staff/tickets/:id/comments`

Post a Public Comment (FR-32).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "content": "We are investigating the issue on your device."
}
```

| Field | Rules |
| :--- | :--- |
| `content` | Required; 1–2000 chars after trim |

**201 Response:** same shape as 4.7.

**Errors:** `400`, `403`, `404`, `500`

---

### 5.9 GET `/api/staff/tickets/:id/comments`

List Public Comments (FR-32), ordered newest-first.

**Headers:** `Cookie: connect.sid=...`

**200 Response:** same shape as 4.8.

**Errors:** `400` (malformed id), `403`, `404`, `500`

---

### 5.10 POST `/api/staff/tickets/:id/notes`

Create an Internal Note (FR-33, FR-35, AC-04).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "content": "Checked event logs — the issue started after the latest Windows update."
}
```

| Field | Rules |
| :--- | :--- |
| `content` | Required; 1–2000 chars after trim |

**201 Response**
```json
{
  "data": {
    "id": 1,
    "ticketId": 12,
    "authorId": 5,
    "author": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
    "content": "Checked event logs — the issue started after the latest Windows update.",
    "createdAt": "2026-09-13T10:30:00.000Z"
  }
}
```

**Errors:** `400`, `403` (Requester role), `404`, `500`

---

### 5.11 GET `/api/staff/tickets/:id/notes`

List Internal Notes (FR-33), ordered newest-first. Visible only to IT Staff and Administrator (BR-04).

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": [
    {
      "id": 1,
      "ticketId": 12,
      "authorId": 5,
      "author": { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
      "content": "Checked event logs — the issue started after the latest Windows update.",
      "createdAt": "2026-09-13T10:30:00.000Z"
    }
  ]
}
```

**Errors:** `400` (malformed id), `403` (Requester role), `404`, `500`

---

### 5.12 GET `/api/staff/users`

List active IT Staff and Administrator users for the owner assignment dropdown (FR-39).

**Headers:** `Cookie: connect.sid=...`

**200 Response**
```json
{
  "data": [
    { "id": 5, "name": "Michael Brown", "role": "IT_STAFF" },
    { "id": 6, "name": "Sarah Johnson", "role": "IT_STAFF" },
    { "id": 10, "name": "John Smith", "role": "ADMINISTRATOR" }
  ]
}
```

Only active users with role `IT_STAFF` or `ADMINISTRATOR` are returned, ordered by `name` ascending.

**Errors:** `403`, `500`

---

### 5.13 Append-only enforcement (FR-34)

| Method | Path | Response |
| :--- | :--- | :--- |
| PUT | `/api/staff/tickets/:id/comments` | 405 METHOD_NOT_ALLOWED |
| PUT | `/api/staff/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/staff/tickets/:id/comments` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/staff/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |
| PUT | `/api/staff/tickets/:id/notes` | 405 METHOD_NOT_ALLOWED |
| PUT | `/api/staff/tickets/:id/notes/:noteId` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/staff/tickets/:id/notes` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/staff/tickets/:id/notes/:noteId` | 405 METHOD_NOT_ALLOWED |

These handlers are registered without `requireAuth`, so an unauthenticated call also receives `405` rather than `401` (section 1). A Requester calling `GET` or `POST` on the note endpoints still receives `403` (FR-35) — the append-only guard applies to the write methods, the role check to the two supported ones.

---

### 5.14 PUT `/api/staff/tickets/:id/category`

Change the ticket's category (ui-spec 5.5, FR-37).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "categoryId": 3
}
```

| Field | Rules |
| :--- | :--- |
| `categoryId` | Required; must be a positive integer; must reference an active category (`400` if invalid/missing, `404` if not found) |

**200 Response**
```json
{
  "data": {
    "category": { "id": 3, "name": "Software" }
  }
}
```

**Errors:** `400` (missing/invalid categoryId), `403`, `404` (ticket or category not found), `500`

---

## 6. Administrator Endpoints (ADMINISTRATOR only)

All endpoints in this section require a valid session with role `ADMINISTRATOR`.

### 6.1 GET `/api/admin/users`

List users with optional search and role filter (FR-40).

**Headers:** `Cookie: connect.sid=...`

**Query parameters:**

| Param | Type | Default | Rules |
| :--- | :--- | :--- | :--- |
| `search` | string | — | Optional; case-insensitive partial match on `name` and `email` |
| `role` | enum | — | Optional filter: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR` |

**200 Response**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@toktickit.dev",
      "role": "REQUESTER",
      "isActive": true
    },
    {
      "id": 2,
      "name": "David Lee",
      "email": "david.lee@toktickit.dev",
      "role": "REQUESTER",
      "isActive": true
    }
  ]
}
```

Users are ordered by `name` ascending. An unsupported `role` value → `400` with `fields.role`; a `search` that is not a string → `400` with `fields.search`.

**Errors:** `400`, `403`, `500`

---

### 6.2 POST `/api/admin/users`

Create a user with one role and an initial password (FR-41, FR-42, AC-10, AC-14).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "TempPass123!"
}
```

| Field | Rules |
| :--- | :--- |
| `name` | Required; 1–100 chars after trim |
| `email` | Required; valid email format; normalized to lowercase; must be unique (`409` if duplicate) |
| `role` | Required; must be `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR` (`400` if invalid) |
| `isActive` | Optional; boolean; defaults to `true` |
| `initialPassword` | Required; ≥8 characters; same password rules as `change-password` (`400` if invalid) |

Password is bcrypt-hashed. `mustChangePassword` is set to `true`.

**201 Response**
```json
{
  "data": {
    "id": 15,
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-09-10T10:00:00.000Z"
  }
}
```

**Note:** The response does NOT include the password hash.

**Errors:**
| Status | Code | Message |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | Missing/invalid fields |
| 400 | VALIDATION_ERROR | `initialPassword`: "Password must be at least 8 characters." (etc.) |
| 403 | FORBIDDEN | Not an Administrator |
| 409 | CONFLICT | "A user with this email already exists." |
| 500 | INTERNAL_ERROR | — |

---

### 6.3 PUT `/api/admin/users/:id`

Edit a user's name, email, role, and activation state (FR-43, AC-14).

**Headers:** `Cookie: connect.sid=...`

**Body** (all fields optional — only provided fields are updated):
```json
{
  "name": "Alex T.",
  "email": "alex.t@toktickit.com",
  "role": "REQUESTER",
  "isActive": false
}
```

| Field | Rules |
| :--- | :--- |
| `name` | Optional; 1–100 chars after trim |
| `email` | Optional; valid email format; normalized to lowercase; must be unique (`409` if duplicate) |
| `role` | Optional; must be a valid role value (`400` if invalid) |
| `isActive` | Optional; boolean |

**Safety rules** — evaluated in this order, so the response is deterministic:

| Order | Condition | Status | Code | Message |
| :--- | :--- | :--- | :--- | :--- |
| 1 | The target is an active Administrator and the change removes that status (deactivate **or** demote away from `ADMINISTRATOR`) while it is the **last** active Administrator | `409` | `CONFLICT` | "Cannot deactivate the last active Administrator." (FR-46, AC-12) |
| 2 | The same removal targets the **authenticated Administrator's own** account | `403` | `FORBIDDEN` | "You cannot deactivate your own account." (FR-45, AC-11) |
| 3 | The new email is already used by another user (case-insensitive) | `409` | `CONFLICT` | "A user with this email already exists." (FR-42, AC-14) |

> **Why the order matters (AC-11 vs AC-12):** with exactly one active Administrator — the seeded state — a self-deactivation also satisfies rule 1, so the response is `409`, never `403`. The `403` is only observable once a second active Administrator exists. Both rules cover deactivation **and** role demotion away from `ADMINISTRATOR`; an Administrator may always change their own name, email, or any field that does not remove their own admin access.

**200 Response**
```json
{
  "data": {
    "id": 15,
    "name": "Alex T.",
    "email": "alex.t@toktickit.com",
    "role": "REQUESTER",
    "isActive": false,
    "mustChangePassword": true,
    "createdAt": "2026-09-10T10:00:00.000Z"
  }
}
```

**Errors:**
| Status | Code | Message |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | Invalid fields |
| 403 | FORBIDDEN | Self-deactivation or non-admin |
| 404 | NOT_FOUND | User not found |
| 409 | CONFLICT | Duplicate email or last-admin guard |
| 500 | INTERNAL_ERROR | — |

---

### 6.4 POST `/api/admin/users/:id/reset-password`

Set a new initial password that must be changed at next login (FR-44, AC-10).

**Headers:** `Cookie: connect.sid=...`

**Body**
```json
{
  "initialPassword": "NewTemp456!"
}
```

| Field | Rules |
| :--- | :--- |
| `initialPassword` | Required; ≥8 characters; same password rules as creation |

Sets `mustChangePassword = true` on the target user.

**200 Response**
```json
{
  "data": { "message": "Password reset successfully. User must change password at next login." }
}
```

**Errors:** `400` (invalid password), `403`, `404`, `500`

---

## 7. Status Code Summary

| Status | Used for |
| :--- | :--- |
| `200 OK` | Successful retrieval, update, toggle, login, logout |
| `201 Created` | Ticket created, attachment uploaded, comment/note created, user created |
| `400 Bad Request` | Validation failures, malformed IDs/params, business-rule violations |
| `401 Unauthorized` | Not authenticated (no valid session) |
| `403 Forbidden` | Authenticated but not permitted (wrong role, wrong ownership, self-deactivation) |
| `404 Not Found` | Referenced resource does not exist |
| `405 Method Not Allowed` | Append-only enforcement (PUT/DELETE on comments/notes) |
| `409 Conflict` | Duplicate email, last-admin guard, already claimed |
| `410 Gone` | Download attempted on soft-removed attachment |
| `413 Payload Too Large` | Upload exceeds 5 MB |
| `415 Unsupported Media Type` | Upload type outside allowed list |
| `500 Internal Server Error` | Unexpected failure (safe generic message) |

---

## 8. Acceptance Criteria Traceability

| Endpoint | ACs | FRs (traced here where no AC covers the endpoint) |
| :--- | :--- | :--- |
| 2.1 Login | AC-01, AC-05, AC-06 | FR-01, FR-02, FR-03 |
| 2.2 Logout | AC-01 (session invalidation) | FR-04 |
| 2.3 Current user | AC-01 | FR-05 |
| 2.4 Change password | AC-02 | FR-06, FR-07 |
| 3.1–3.3 Reference data | — | FR-12 (Lab 2 regression) |
| 4.1 Create ticket | AC-03 | FR-12, FR-13, FR-14 |
| 4.2 List tickets | AC-03 | FR-12, FR-15 |
| 4.3 Ticket detail | AC-03 | FR-15, FR-20 |
| 4.4–4.6 Attachments | AC-03 (ownership) | FR-12, FR-15, BR-18 |
| 4.7–4.8 Requester comments | AC-03 | FR-16, FR-17 |
| 4.9 Indicate resolved | AC-07 | FR-19 |
| 4.10 Resolution summary (read-only) | AC-03 | FR-31 (staff path in 5.7) |
| 4.11 / 5.13 Append-only 405 | — | FR-18, FR-34 |
| 5.1 Staff queue | AC-08 | FR-22, FR-23, FR-24 |
| 5.2 Staff ticket detail | AC-04 (internal notes hidden from requester) | FR-26 |
| 5.3 Claim | — | FR-27 |
| 5.4 Assign | — | FR-28 |
| 5.5 IT Priority | — | FR-29 |
| 5.6 Status transition | AC-09 | FR-30, FR-38 (dropdown built from the same matrix) |
| 5.7 Resolution summary | — | FR-31 |
| 5.8–5.9 Staff comments | — | FR-32 |
| 5.10–5.11 Internal notes | AC-04 | FR-33, FR-35, FR-36 |
| 5.12 Staff user list | — | FR-39 |
| 5.14 Category change | — | FR-37 |
| 6.1 User list | AC-13 | FR-40 |
| 6.2 Create user | AC-10, AC-14 | FR-41, FR-42 |
| 6.3 Edit user | AC-11, AC-12, AC-14 | FR-43, FR-45, FR-46 |
| 6.4 Reset password | AC-10 | FR-44 |

> **Coverage note:** AC-01..AC-15 in `specification.md` section 9 do not cover claim, reassign, IT Priority, resolution summary, category change, or the staff-user list, so those six endpoints are traced to their functional requirements instead. AC-15 (responsive layout) is a UI concern verified in `tests.md` (RESP-01..30, STYLE-01..10), not here.

---

## 9. Amendment Log

| Version | Date | Change | Reason |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-09-10 | Initial contract. Session-based auth, append-only enforcement, status-transition matrix, and admin safety rules approved by the student. | Lab 3 implementation baseline |
| v1.2 | 2026-10-03 | **Documentation only — no endpoint, status code, request shape, or business rule changed, and no test was touched.** Corrections: the `login` and `me` examples now show `mustChangePassword: true`, which is what the documented initial-password login actually returns; the status endpoint records the BR-12 confirmation requirement (`OPEN → CANCELLED`, `IN_PROGRESS → RESOLVED` are client-confirmed, not server-enforced) and the terminal-status variant of the `400` message; `claim` documents its `409` message; the two user lists document their `name`-ascending order and the `400` field names; the download endpoint documents the RFC 5987 `filename*` parameter it also sends; section 1 records the second authentication exception (idempotent `logout`); section 8 traces FR-38. The cross-reference comment in `server/src/lib/ticketListQuery.ts` was corrected from "4.4" to "4.2". | A second audit of this contract against `server/src/**` and `specification.md` found 9 remaining points where the document was silent or its example contradicted the shipped code. |
| v1.1 | 2026-09-29 | **Documentation only — no endpoint, status code, request shape, or business rule changed, and no test was touched.** Corrections: download `Content-Type` (section 1); trimming rule scoped to exclude passwords; added the `ticketNumber DESC` tie-break, the un-guarded `405` handlers, the client-side `mustChangePassword` gate, and the "400 on malformed id applies everywhere" rule (section 1); added `GET /api/health` (section 3.3); documented the 5-active-attachment limit and check order, the 400 for malformed ids, the removed `requesterId` query parameter, the missing-file-on-disk and already-removed cases, and the IT Staff/Administrator attachment access matrix (sections 4.4–4.6, new 4.12); fixed the section 5.6 → 5.7 cross-reference in 4.10; stated the queue's global scope (section 5.1); documented admin guard precedence and its AC-11/AC-12 consequence (section 6.3); completed the section 8 traceability table. | A line-by-line audit of this contract against `server/src/**`, `specification.md`, `ui-spec.md`, and `tests.md` found 12 points where the document was silent or contradicted the shipped code. |

---

*Changes to this contract require a matching change to `specification.md` and student approval.*

**Approval:** Reviewed and approved by the student on 2026-09-10 (v1.0). Session-based auth, append-only enforcement, status-transition matrix, and admin safety rules confirmed. **Amended 2026-09-29 (v1.1)** and **2026-10-03 (v1.2)** — documentation-only alignment with the shipped implementation, approved by the student as the correction of those audits' findings; the implementation baseline is unchanged.
