# Lab 3 REST API Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens |
| **Version** | v1.0 DRAFT — student-reviewed, baseline for implementation |
| **Date** | 2026-09-10 |
| **Contract source** | `specification.md` v1.0 (BR/FR/AC references below trace to it) |

---

## 1. Conventions

- **Base URL:** `http://localhost:5000` in development. The port comes from the `PORT` environment variable of `server/.env` and defaults to `5000` when unset. The Vite client runs on `http://localhost:5173` and reaches the API via the dev proxy (`client/vite.config.ts` forwards `/api` to the backend). When `VITE_API_URL` is set in `client/.env`, the client makes direct cross-origin calls.
- **Authentication:** Session-based via `express-session`. After successful login, a `connect.sid` cookie is set. All protected endpoints require this cookie; unauthenticated requests receive 401.
- **Identity transport:** `requesterId` is NO LONGER sent by the client on ticket/attachment endpoints. The server derives the user identity from the session (AD-04). The client-supplied `requesterId` in `POST /api/tickets` is ignored.
- **Content types:** `application/json` for all requests/responses except attachment upload (`multipart/form-data`) and download (`application/octet-stream`).
- **IDs:** positive integers. Malformed ID (non-numeric, zero, negative) → `400`.
- **Dates:** ISO 8601 UTC strings (e.g. `2026-09-10T10:00:00.000Z`).
- **Trimming:** all string inputs are trimmed before validation and persistence.
- **Enums:** `requestedPriority` / `itPriority` ∈ `LOW | MEDIUM | HIGH | URGENT`; `currentStatus` ∈ `NEW | OPEN | IN_PROGRESS | WAITING_FOR_REQUESTER | RESOLVED | CLOSED | REOPENED | CANCELLED`; `role` ∈ `REQUESTER | IT_STAFF | ADMINISTRATOR`.
- **Email normalization:** email addresses are lowercased before storage and uniqueness comparison (BR-07).
- **Append-only:** Public Comments and Internal Notes cannot be edited or deleted via the API in Lab 3; `PUT` and `DELETE` on comment/note endpoints return `405 METHOD_NOT_ALLOWED`.

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
    "mustChangePassword": false
  }
}
```

Sets `connect.sid` session cookie.

**Errors:**
| Status | Code | Message |
| :--- | :--- | :--- |
| 400 | VALIDATION_ERROR | Missing or malformed fields |
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
    "mustChangePassword": false
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
    "_count": { "publicComments": 3, "internalNotes": 1 }
  }
}
```

**Errors:** `400`, `403`, `404`, `500`

---

### 4.4 POST `/api/tickets/:id/attachments`

Upload one attachment to an owned ticket (unchanged from Lab 2, but session auth replaces `requesterId` form field).

**Request:** `multipart/form-data`

| Field | Rules |
| :--- | :--- |
| `file` | Required binary. Allowed: jpg, jpeg, png, webp, pdf. Max 5 MB |
| `requesterId` | **REMOVED** — ownership derived from session |

**201 Response:** same as Lab 2.

**Errors:** `400`, `403`, `404`, `413`, `415`, `500`

---

### 4.5 GET `/api/attachments/:id/download`

Download an active attachment's binary content (unchanged from Lab 2, session auth).

**Headers:** `Cookie: connect.sid=...`

**200 Response:** binary stream.

Behavior matrix: Active file + owner → 200; Soft-removed → 410; Foreign → 403; Unknown → 404.

**Errors:** `400`, `403`, `404`, `410`, `500`

---

### 4.6 DELETE `/api/attachments/:id`

Soft-remove an active attachment (unchanged from Lab 2, session auth replaces body `requesterId`).

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

**200 Response:** same as Lab 2.

**Errors:** `400`, `403`, `404`, `500`

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

**Errors:** `403`, `404`, `500`

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
    "requesterIndicatedResolved": true,
    "indicatedResolvedAt": "2026-09-13T12:00:00.000Z"
  }
}
```

**Errors:** `403`, `404`, `500`

---

### 4.10 PUT `/api/tickets/:id/resolution-summary` (Requester)

Requesters cannot set the resolution summary. This endpoint is reserved for IT Staff/Admin (section 5.6). A Requester calling this endpoint receives `403`.

---

### 4.11 Append-only enforcement (FR-18)

| Method | Path | Response |
| :--- | :--- | :--- |
| PUT | `/api/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |

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
    "_count": { "publicComments": 3, "internalNotes": 1 }
  }
}
```

**Errors:** `403`, `404`, `500`

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

**Errors:** `403`, `404`, `409` (already claimed by the same user), `500`

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

**Transition enforcement:** The backend checks the current status of the ticket, verifies the requested target status is in the permitted transition list for the current status, and rejects disallowed transitions.

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

**Errors:** `403`, `404`, `500`

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

**Errors:** `403` (Requester role), `404`, `500`

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

Only active users with role `IT_STAFF` or `ADMINISTRATOR` are returned.

**Errors:** `403`, `500`

---

### 5.13 Append-only enforcement (FR-34)

| Method | Path | Response |
| :--- | :--- | :--- |
| PUT | `/api/staff/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/staff/tickets/:id/comments/:commentId` | 405 METHOD_NOT_ALLOWED |
| PUT | `/api/staff/tickets/:id/notes/:noteId` | 405 METHOD_NOT_ALLOWED |
| DELETE | `/api/staff/tickets/:id/notes/:noteId` | 405 METHOD_NOT_ALLOWED |

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

**Safety rules:**
- An Administrator cannot deactivate their own account → `403 FORBIDDEN` with message "You cannot deactivate your own account."
- Deactivating the last active Administrator → `409 CONFLICT` with message "Cannot deactivate the last active Administrator."

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
| `403 Forbidden` | Authenticated but not permitted (wrong role, wrong ownership) |
| `404 Not Found` | Referenced resource does not exist |
| `405 Method Not Allowed` | Append-only enforcement (PUT/DELETE on comments/notes) |
| `409 Conflict` | Duplicate email, last-admin guard, self-deactivation, already claimed |
| `410 Gone` | Download attempted on soft-removed attachment |
| `413 Payload Too Large` | Upload exceeds 5 MB |
| `415 Unsupported Media Type` | Upload type outside allowed list |
| `500 Internal Server Error` | Unexpected failure (safe generic message) |

---

## 8. Acceptance Criteria Traceability

| Endpoint | ACs |
| :--- | :--- |
| 2.1 Login | AC-01, AC-05, AC-06 |
| 2.2 Logout | AC-01 (session invalidation) |
| 2.3 Current user | AC-01 |
| 2.4 Change password | AC-02 |
| 4.1 Create ticket | AC-03 |
| 4.2 List tickets | AC-03 |
| 4.3 Ticket detail | AC-03 |
| 4.4–4.6 Attachments | AC-03 (ownership) |
| 4.7–4.8 Requester comments | AC-03 |
| 4.9 Indicate resolved | AC-07 |
| 5.1 Staff queue | AC-08 |
| 5.2 Staff ticket detail | AC-04 (internal notes hidden from requester) |
| 5.6 Status transition | AC-09 |
| 5.10 Internal notes | AC-04 |
| 6.1 User list | AC-13 |
| 6.2 Create user | AC-10, AC-14 |
| 6.3 Edit user | AC-11, AC-12, AC-14 |
| 6.4 Reset password | AC-10 |

---

*Changes to this contract require a matching change to `specification.md` and student approval.*

**Approval:** Reviewed and approved by the student on 2026-09-10. Session-based auth, append-only enforcement, status-transition matrix, and admin safety rules confirmed. This version is the implementation baseline.
