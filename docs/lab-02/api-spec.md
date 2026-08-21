# Lab 2 REST API Specification

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 2: Requester Ticketing MVP |
| **Version** | v1.0 APPROVED — student-reviewed, baseline for implementation |
| **Date** | 2026-08-21 |
| **Contract source** | `specification.md` v1.0 (BR/FR/AC references below trace to it) |

---

## 1. Conventions

- **Base URL:** `http://localhost:5000` in development. The port comes from the `PORT` environment variable of `server/.env` and defaults to `5000` when unset (`PORT || 5000`). The Vite client runs on `http://localhost:5173` and targets the API through `VITE_API_URL` in `client/.env` (e.g. `VITE_API_URL=http://localhost:5000`) — no dev proxy is configured, so the full origin must be set. Because client and API are different origins, the server enables CORS for the client origin in development.
- **Identity transport (AD-02):** all **ticket and attachment endpoints (2.4–2.9)** require `requesterId` — as a **query parameter** on `GET`, as a **JSON body field** on `POST`/`DELETE`, and as a **form field** on the multipart upload. The reference endpoints (2.1–2.3) serve unauthenticated dropdown data and take **no** `requesterId`. There is no session or token in Lab 2 (BR-03); `requesterId` is a testing convenience and provides no security.
- **Content types:** `application/json` for all requests/responses except attachment upload (`multipart/form-data`) and download (`application/octet-stream`).
- **IDs:** positive integers. Malformed ID (non-numeric, zero, negative) → `400`.
- **Dates:** ISO 8601 UTC strings (e.g. `2026-08-21T10:00:00.000Z`).
- **Trimming:** all string inputs are trimmed before validation and persistence (BR-13).
- **Enums:** `requestedPriority` ∈ `LOW | MEDIUM | HIGH | URGENT`; `currentStatus` ∈ `NEW` (only value in Lab 2).
- **Unknown `requesterId`:** on endpoints 2.4–2.9, a well-formed but unknown `requesterId` → `404 NOT_FOUND`; an inactive requester is rejected with `400 BUSINESS_RULE_VIOLATION` where a ticket would be created (2.4).

### Error envelope

All errors return one safe, uniform shape (no stack traces):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary of what went wrong.",
    "fields": { "summary": "Summary is required." }
  }
}
```

`fields` is present only for validation errors (`400`). Error codes used:

| Code | Meaning |
| :--- | :--- |
| `VALIDATION_ERROR` | Invalid/missing input (body, query, path, or form field) |
| `NOT_FOUND` | Referenced resource does not exist |
| `FORBIDDEN` | Resource exists but belongs to another requester (AD-01) |
| `GONE` | Soft-removed attachment (download only) |
| `PAYLOAD_TOO_LARGE` | File exceeds 5 MB |
| `UNSUPPORTED_MEDIA_TYPE` | File type not permitted |
| `BUSINESS_RULE_VIOLATION` | e.g. inactive requester, attachment limit reached, already removed |
| `INTERNAL_ERROR` | Unexpected server failure (generic message only) |

---

## 2. Endpoints

### 2.1 GET `/api/dev/requesters`

Active Development Requesters for the Selection screen (FR-01).

**Query:** none.

**200 Response**
```json
{
  "data": [
    { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@toktickit.dev", "department": "Marketing" },
    { "id": 2, "name": "David Lee", "email": "david.lee@toktickit.dev", "department": "Finance" }
  ]
}
```
Inactive requesters are never returned (BR-04).

**Errors:** `500`.

---

### 2.2 GET `/api/categories`

Active categories (FR-05 dropdown).

**Query:** none.

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

**Errors:** `500`.

---

### 2.3 GET `/api/related-systems`

Active related systems; filtered by category when `categoryId` supplied (FR-06).

**Query:** `categoryId` (optional integer).

Filter rule: system appears when its `categoryId` equals the given value **or** when the system has no category assignment (general system).

**200 Response**
```json
{
  "data": [
    { "id": 7, "name": "Campus Wi-Fi", "categoryId": 4 },
    { "id": 3, "name": "Corporate Laptop", "categoryId": null }
  ]
}
```

**Errors:** `400` (non-numeric `categoryId`), `500`.

---

### 2.4 POST `/api/tickets`

Create one validated ticket for the selected requester (FR-07..FR-09, AC-01).

**Body**
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 3,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly",
  "description": "Battery drops from 100% to 20% within two hours even when idle."
}
```

**Validation (all enforced server-side, mirrored client-side):**

| Field | Rules |
| :--- | :--- |
| `requesterId` | Required; must exist and be active (`404` unknown, `400` inactive — BR-04) |
| `categoryId` | Required; must exist (`404`) |
| `relatedSystemId` | Required; must exist (`404`) |
| `requestedPriority` | Required; must be a valid enum value (`400`) |
| `summary` | Required; 1–120 chars after trim (`400`, BR-13/14) |
| `description` | Required; 1–2000 chars after trim (`400`, BR-13/14) |

Server generates `ticketNumber` (BR-01, AD-08), sets `currentStatus = NEW` (BR-02), `ticketDate = createdAt` (BR-21).

**Staged attachment flow (frontend workflow, AD-03 / BR-22):** this endpoint accepts JSON only — files are never part of ticket creation. The client proceeds as follows:

1. User stages files in the form; the client validates type/size/count locally and rejects invalid files immediately, before any API call (AC-06).
2. Client submits this endpoint; on success the ticket exists with its official Ticket Number.
3. Client uploads each staged file sequentially via [2.7](#27-post-apiticketsidattachments) against the new ticket id.
4. If an upload fails, the ticket is kept; the UI marks that file as failed and offers Retry (re-calls 2.7). A ticket with partial attachments is valid and visible in Ticket Detail.

**201 Response**
```json
{
  "data": {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Laptop battery drains quickly",
    "description": "Battery drops from 100% to 20% within two hours even when idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": null,
    "currentStatus": "NEW",
    "ticketDate": "2026-08-21T10:00:00.000Z",
    "requester": { "id": 1, "name": "Jennifer Anderson" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
    "createdAt": "2026-08-21T10:00:00.000Z",
    "updatedAt": "2026-08-21T10:00:00.000Z"
  }
}
```

**Errors:** `400` (validation, inactive requester), `404` (unknown requester/category/system), `500`.

---

### 2.5 GET `/api/tickets`

Paginated list of the selected requester's own tickets (FR-11..FR-15, AC-11..AC-16).

**Query parameters**

Example: `GET /api/tickets?requesterId=1&search=laptop&currentStatus=NEW&requestedPriority=MEDIUM&sortBy=updatedAt&sortOrder=desc&page=1&pageSize=10`

| Param | Type | Default | Rules |
| :--- | :--- | :--- | :--- |
| `requesterId` | int | — | Required; unknown requester → `404` |
| `search` | string | — | Optional; case-insensitive partial match on `ticketNumber` and `summary` (BR-17) |
| `categoryId` | int | — | Optional filter |
| `currentStatus` | enum | — | Optional filter on the ticket's `currentStatus` field (`NEW`) |
| `requestedPriority` | enum | — | Optional filter on the ticket's `requestedPriority` field |
| `sortBy` | enum | `updatedAt` | Whitelist: `updatedAt`, `createdAt`, `requestedPriority`, `ticketNumber`; anything else → `400` (BR-19) |
| `sortOrder` | `asc`\|`desc` | `desc` | Default Last Updated descending (BR-18) |
| `page` | int | `1` | ≥ 1 |
| `pageSize` | int | `10` | 1–50 |

Query parameter names intentionally mirror the response field names (`categoryId`, `currentStatus`, `requestedPriority`) so filtering maps 1:1 to persisted fields.

Secondary sort key `ticketNumber DESC` is always appended for stable ordering (BR-18).
Results are always scoped to `requesterId` — cross-requester leakage is impossible (BR-05, AC-11).

**200 Response**
```json
{
  "data": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-000012",
      "summary": "Laptop battery drains quickly",
      "requestedPriority": "MEDIUM",
      "itPriority": null,
      "currentStatus": "NEW",
      "category": { "id": 2, "name": "Hardware" },
      "createdAt": "2026-08-21T10:00:00.000Z",
      "updatedAt": "2026-08-21T10:00:00.000Z"
    }
  ],
  "meta": { "total": 23, "page": 1, "pageSize": 10, "totalPages": 3 }
}
```

**Errors:** `400` (invalid params), `404` (unknown requester), `500`.

List items intentionally omit `description`, `requester`, and `relatedSystem` to keep the page payload small — those fields are available per ticket via [2.6](#26-get-apiticketsid). The columns above cover every field My Tickets renders (FR-11).

---

### 2.6 GET `/api/tickets/:id`

One owned ticket, read-only, including attachment metadata (FR-16, AC-17; metadata capability satisfied here).

**Query:** `requesterId` (required).

Ownership: ticket exists but `requesterId` ≠ owner → `403`; no such ticket → `404` (AD-01, AC-18).

**200 Response** — full ticket object including all three relation objects (`requester`, `category`, `relatedSystem`) so Ticket Detail can render every read-only field, plus the attachment list:
```json
{
  "data": {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "summary": "Laptop battery drains quickly",
    "description": "Battery drops from 100% to 20% within two hours even when idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": null,
    "currentStatus": "NEW",
    "ticketDate": "2026-08-21T10:00:00.000Z",
    "requester": { "id": 1, "name": "Jennifer Anderson" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
    "createdAt": "2026-08-21T10:00:00.000Z",
    "updatedAt": "2026-08-21T10:00:00.000Z",
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
        "createdAt": "2026-08-21T10:05:00.000Z"
      },
      {
        "id": 28,
        "originalFileName": "old-photo.png",
        "fileSize": 512000,
        "mimeType": "image/png",
        "isRemoved": true,
        "removedAt": "2026-08-21T11:00:00.000Z",
        "removalReason": "Attached wrong screenshot",
        "uploadedByRequesterId": 1,
        "createdAt": "2026-08-21T10:03:00.000Z"
      }
    ]
  }
}
```
Removed attachments remain listed with full removal metadata (BR-10); ordered by `createdAt` ascending.

**Errors:** `400` (malformed id / missing requesterId), `403`, `404` (unknown ticket or unknown requester), `500`.

---

### 2.7 POST `/api/tickets/:id/attachments`

Upload one attachment to an owned ticket (FR-17, AC-19..AC-21).

**Request:** `multipart/form-data`

| Field | Rules |
| :--- | :--- |
| `file` | Required binary. Allowed MIME/ext: `image/jpeg` (.jpg/.jpeg), `image/png` (.png), `image/webp` (.webp), `application/pdf` (.pdf) — else `415` (BR-06). Max 5 MB — else `413` (BR-07) |
| `requesterId` | Required form field; must be the ticket owner — else `403` (BR-16) |

Check order: ticket existence (`404`) → ownership (`403`) → active-count limit (`400` when already 5 active, BR-08) → size (`413`) → type (`415`). Server stores the file under a UUID-based storage name; original name kept as metadata only (AD-09).

**201 Response**
```json
{
  "data": {
    "id": 31,
    "originalFileName": "battery-report.pdf",
    "fileSize": 204800,
    "mimeType": "application/pdf",
    "isRemoved": false,
    "removedAt": null,
    "removalReason": null,
    "uploadedByRequesterId": 1,
    "createdAt": "2026-08-21T10:06:00.000Z"
  }
}
```

**Errors:** `400` (missing file/requesterId, limit reached), `403`, `404` (unknown ticket or unknown requester), `413`, `415`, `500`.

---

### 2.8 GET `/api/attachments/:id/download`

Download an active attachment's binary content (FR-17, AC-22).

**Query:** `requesterId` (required).

**200 Response:** binary stream with headers
```
Content-Type: <stored mimeType>
Content-Disposition: attachment; filename="<originalFileName>"
Content-Length: <fileSize>
```

Behavior matrix (AC-24, BR-10):
| Situation | Result |
| :--- | :--- |
| Active file, owner requests | `200` binary |
| Soft-removed file | `410 Gone` — never streamed |
| File belongs to another requester's ticket | `403` |
| Unknown attachment id or unknown requester | `404` |

**Errors:** `400`, `403`, `404`, `410`, `500`.

---

### 2.9 DELETE `/api/attachments/:id`

Soft-remove an active attachment (FR-18, AC-23). Never deletes the row or the stored blob in Lab 2 (BR-09).

**Body**
```json
{
  "requesterId": 1,
  "removalReason": "Attached wrong screenshot"
}
```

| Field | Rules |
| :--- | :--- |
| `requesterId` | Required; must be the owning requester of the parent ticket — else `403` (BR-16) |
| `removalReason` | Required; 3–200 chars after trim — else `400` (BR-15) |

On success: `isRemoved = true`, `removedAt = now`, `removalReason` persisted.

**200 Response**
```json
{
  "data": {
    "id": 31,
    "originalFileName": "battery-report.pdf",
    "fileSize": 204800,
    "mimeType": "application/pdf",
    "isRemoved": true,
    "removedAt": "2026-08-21T11:00:00.000Z",
    "removalReason": "Attached wrong screenshot",
    "uploadedByRequesterId": 1,
    "createdAt": "2026-08-21T10:06:00.000Z"
  }
}
```

**Errors:** `400` (validation, already removed), `403`, `404` (unknown attachment or unknown requester), `500`.

---

## 3. Status Code Summary

| Status | Used for |
| :--- | :--- |
| `200 OK` | Successful retrieval; successful soft removal |
| `201 Created` | Ticket created; attachment uploaded |
| `400 Bad Request` | Validation failures, malformed IDs/params, business-rule violations (inactive requester, >5 active files, already removed) |
| `403 Forbidden` | Resource exists but belongs to another requester (AD-01) |
| `404 Not Found` | Referenced resource does not exist |
| `410 Gone` | Download attempted on soft-removed attachment |
| `413 Payload Too Large` | Upload exceeds 5 MB |
| `415 Unsupported Media Type` | Upload type outside allowed list |
| `500 Internal Server Error` | Unexpected failure (safe generic message) |

---

## 4. Acceptance Criteria Traceability

| Endpoint | ACs |
| :--- | :--- |
| 2.1–2.3 Reference APIs | AC-08, AC-09 |
| 2.4 Create ticket | AC-01, AC-03, AC-04, AC-05 |
| 2.5 List tickets | AC-11..AC-16 |
| 2.6 Ticket detail | AC-17, AC-18 |
| 2.7 Upload attachment | AC-19, AC-20, AC-21 |
| 2.8 Download attachment | AC-22, AC-24 |
| 2.9 Soft remove | AC-23, AC-24 |

Note: **AC-02** (missing summary blocks submission) and **AC-06** (invalid staged file rejected) are enforced client-side before any API call — they are verified by UI tests, not API tests. The server re-validates the same rules (2.4 validation table) as the authoritative layer (FR-07).

---

*Changes to this contract require a matching change to `specification.md` and student approval.*

**Approval:** Reviewed and approved by the student on 2026-08-21. Query params aligned with field names; staged attachment flow and error envelope confirmed. This version is the implementation baseline.
