# Lab 2 Test Plan and Results

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 2: Requester Ticketing MVP |
| **Version** | v1.0 APPROVED — planned tests before implementation; statuses updated to final results at sprint close |
| **Date** | 2026-08-21 |
| **Traceability source** | `specification.md` v1.0 AC-01..26 · `api-spec.md` v1.0 · `ui-spec.md` v1.0 |

---

## 1. Test Strategy

Six test levels, matching the handout's required coverage:

1. **Unit (server):** pure logic without DB/HTTP — ticket-number generator, attachment validation rules.
2. **API / integration (server):** Supertest against the real Express app + seeded PostgreSQL; asserts status codes, error envelopes, ownership isolation, persistence side effects.
3. **UI component (client):** Vitest + Testing Library in jsdom; mocks the API layer; asserts user-visible behavior, states, and client-side validation.
4. **UI style (client):** automated assertions that Zen Green tokens/classes are actually applied (colors are a graded requirement, not decoration).
5. **Responsive:** Playwright at 1440×900, 820×1180, 390×844 — layout integrity, no horizontal scroll on mobile, screenshots for the visual checklist.
6. **E2E (Playwright):** full requester journeys against `docker compose` stack (API 5000 + web 5173).

Test files live exactly where the labsheet Section 12 requires; extra unit/style files are additive.

## 2. Planned Tests

Status legend: `Planned` → written before implementation · updated to `Pass`/`Fail` with notes at sprint close.

### Unit (server)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | Unit | AC-01, BR-01 | Ticket number generator | Format `TKT-YYYY-XXXXXX`, zero-padded sequence, unique under concurrency retry | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| UNIT-02 | Unit | BR-06, BR-07 | Attachment MIME/ext validator | Allowed set accepted; mismatched/disallowed rejected with reason | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |

### API (server/tests/lab-02)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API | AC-01 | Valid creation | 201; persisted with status NEW; official ticket number returned; trimmed values stored | `create-ticket.api.test.ts` | Planned |
| API-02 | API | AC-02 | Missing required fields server-side mirror | 400 envelope lists `summary` field code | `create-ticket.api.test.ts` | Planned |
| API-03 | API | AC-03, BR-02, BR-03 | Length boundaries | Summary >120 or Description >2000 → 400; exactly-at-limit accepted | `create-ticket.api.test.ts` | Planned |
| API-04 | API | AC-18 | Unknown referenced ids on create | Unknown category/system/requester → 404 | `create-ticket.api.test.ts` | Planned |
| API-05 | API | BR-04, AC-08 | Inactive requester create attempt | 400 BUSINESS_RULE_VIOLATION (not 404) | `create-ticket.api.test.ts` | Planned |
| API-06 | API | AC-11 | Ownership isolation on list | A sees only A's tickets; B never sees A's rows even by direct query params | `my-tickets.api.test.ts` | Planned |
| API-07 | API | AC-12, BR-17 | Search | Case-insensitive match on ticket number prefix and summary substring; combined with other filters; no match → empty page not error | `my-tickets.api.test.ts` | Planned |
| API-08 | API | AC-13 | Filters | categoryId/currentStatus/requestedPriority each filter correctly and combine | `my-tickets.api.test.ts` | Planned |
| API-09 | API | AC-14, BR-18 | Sorting | Default updatedAt desc; whitelisted asc/desc works; secondary `ticketNumber DESC` tiebreak always appended; non-whitelisted sortBy → 400 | `my-tickets.api.test.ts` | Planned |
| API-10 | API | AC-15, BR-19 | Pagination | Correct subset + `{page,pageSize,total,totalPages}` metadata; invalid page/pageSize → 400; pageSize capped at 50 | `my-tickets.api.test.ts` | Planned |
| API-11 | API | AC-17 | Owned detail payload | 200 with all read-only fields + attachments including removed entries' metadata | `ticket-detail.api.test.ts` | Planned |
| API-12 | API | AC-18 | Foreign detail | 403, response body leaks nothing about the ticket | `ticket-detail.api.test.ts` | Planned |
| API-13 | API | AC-18 | Unknown detail | 404 NOT_FOUND | `ticket-detail.api.test.ts` | Planned |
| API-14 | API | AC-19 | Valid upload | 201; file stored under UUID name; appears in ticket detail metadata | `attachments.api.test.ts` | Planned |
| API-15 | API | AC-20, BR-08 | Sixth active upload | 400 LIMIT_REACHED | `attachments.api.test.ts` | Planned |
| API-16 | API | AC-21, BR-07 | Oversized file | 413 PAYLOAD_TOO_LARGE | `attachments.api.test.ts` | Planned |
| API-17 | API | AC-21 | Disallowed type | 415 UNSUPPORTED_MEDIA_TYPE | `attachments.api.test.ts` | Planned |
| API-18 | API | AC-22 | Download active file | 200 correct bytes/content-type; foreign download → 403 (BR-16) | `attachments.api.test.ts` | Planned |
| API-19 | API | AC-24 | Download removed/unavailable file | Removed → 410 GONE | `attachments.api.test.ts` | Planned |
| API-20 | API | AC-23, BR-15 | Remove validation | No reason or <3 chars (>200) → 400 field error; valid reason removes softly | `attachments.api.test.ts` | Planned |
| API-21 | API | AC-23 | Soft-remove side effects | Metadata retained with removal timestamp + reason; **disk file still present** (BR-09 retention); second remove of same id → 400 | `attachments.api.test.ts` | Planned |
| API-22 | API | BR-04, FR-05 | Requester reference list | Only active requesters; inactive absent | `requesters.test.ts` | Planned |
| API-23 | API | FR-06 | Categories & related systems | Active-only; general systems returned without categoryId filter; system list filtered by categoryId | `categories.test.ts`, `related-systems.test.ts` | Planned |
| API-24 | API | AC-15 | List param edge cases | Unknown enum values, page=0, negative pageSize → 400 with field codes | `my-tickets.api.test.ts` | Planned |

### UI component (client/tests/lab-02)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | UI component | AC-02 | Client-side required validation | Submit w/o summary shows inline message under field; **no fetch issued** | `CreateTicket.test.tsx` | Planned |
| UI-02 | UI component | AC-03 | Live counters | Counter updates; input blocked/warned past 120 / 2000 | `CreateTicket.test.tsx` | Planned |
| UI-03 | UI component | AC-04, BR-11 | Submit busy state | Button disabled + spinner during pending request | `CreateTicket.test.tsx` | Planned |
| UI-04 | UI component | AC-05, BR-12 | Create failure recovery | Error callout shown; **all typed values still present**; no navigation | `CreateTicket.test.tsx` | Planned |
| UI-05 | UI component | AC-01 | Success panel | Official ticket number displayed prominently after creation | `CreateTicket.test.tsx` | Planned |
| UI-06 | UI component | AC-06 | Invalid staged file | Rejected inline at picker with reason; never added to staged list; valid file staged with remove control | `CreateTicket.test.tsx` | Planned |
| UI-07 | UI component | FR-06 | Dependent related-system select | Options reload when category changes | `CreateTicket.test.tsx` | Planned |
| UI-08 | UI component | AC-16 | Empty vs no-results | Distinct messages/CTAs: "haven't created any tickets" vs "no tickets match your filters" | `MyTickets.test.tsx` | Planned |
| UI-09 | UI component | AC-13 | Clear filters | Resets all controls and refetches unfiltered page | `MyTickets.test.tsx` | Planned |
| UI-10 | UI component | AC-15 | Pagination wiring | Prev/next/page-size changes issue API calls with expected params | `MyTickets.test.tsx` | Planned |
| UI-11 | UI component | AC-14 | Sort control | Column click / mobile sort select requests whitelisted sort+order | `MyTickets.test.tsx` | Planned |
| UI-12 | UI component | AC-05 | List failure state | Error banner + Retry re-issues request | `MyTickets.test.tsx` | Planned |
| UI-13 | UI component | AC-17 | Read-only detail rendering | All fields visible as text/read-only fields incl. IT Priority "—"; no edit affordances anywhere | `RequesterTicketDetail.test.tsx` | Planned |
| UI-14 | UI component | AC-18 | Safe access errors | Foreign ticket → access-denied message; unknown → not-found state; neither leaks data | `RequesterTicketDetail.test.tsx` | Planned |
| UI-15 | UI component | AC-19 | Uploading state | Row spinner during upload → active row on success → row-level error with Retry on failure (5-state model) | `AttachmentSection.test.tsx` | Planned |
| UI-16 | UI component | AC-24 | Removed row presentation | Muted style, reason caption, Download disabled with tooltip | `AttachmentSection.test.tsx` | Planned |
| UI-17 | UI component | AC-23, BR-15 | Remove dialog gating | Confirm disabled until reason 3–200 chars; success updates row in place | `AttachmentSection.test.tsx` | Planned |
| UI-18 | UI component | AC-20 | Limit reached UX | Add-attachment hidden/disabled with hint at 5 active files | `AttachmentSection.test.tsx` | Planned |
| UI-19 | UI component | AC-07 | Guard redirect | Deep-linking screens without selected requester bounces to selection screen | `App.test.tsx` | Planned |
| UI-20 | UI component | AC-08 | Requester dropdown contents | Lists active requesters only; loading/empty/error states handled | `RequesterSelection.test.tsx` | Planned |
| UI-21 | UI component | AC-09 | Switch requester | Change Requester clears selection and reloads data scoped to new requester | `App.test.tsx`, `RequesterContext.test.tsx` | Planned |
| UI-22 | UI component | AC-10 | Selection persistence | Reload keeps last chosen requester via localStorage | `RequesterContext.test.tsx` | Planned |

### UI style (client/tests/lab-02)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| STYLE-01 | UI style | ui-spec Section 1 tokens | Primary button styling | Computed background `#006B3C`, white text | `zen-green-style.test.tsx` | Planned |
| STYLE-02 | UI style | ui-spec Sections 1 and 3 | Editable vs read-only distinction | Read-only field uses `#F0F4F2` shading class; editable is white with border | `zen-green-style.test.tsx` | Planned |
| STYLE-03 | UI style | ui-spec Section 3 | Badge palette mapping | Status NEW pale-green class; LOW/MEDIUM/HIGH/URGENT map to gray/green/amber/red classes | `zen-green-style.test.tsx` | Planned |
| STYLE-04 | UI style | AC-26 | Accessibility basics | Labels associated (`htmlFor`), focus outline style present, error text linked via `aria-describedby` | `zen-green-style.test.tsx` | Planned |

### Responsive (Playwright)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| RESP-01..09 | Responsive | AC-25 | 3 screens × 3 viewports (1440×900, 820×1180, 390×844) | Layout intact per breakpoints; screenshots saved to `artifacts/lab-02/screenshots/{screen}/{viewport}.png`; **no horizontal scroll at mobile**; table→card switch on My Tickets | `e2e/lab-02/responsive.visual.spec.ts` | Planned |

### E2E (Playwright)

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | E2E | AC-01, 11, 17, 19, 22, 23, 24 | Happy-path journey | Select requester → create → locate in My Tickets → open detail → attach → download → soft-remove with reason → download now blocked (410 surfaced) | `e2e/lab-02/requester-ticket-flow.spec.ts` (desktop project only) | Planned |
| E2E-02 | E2E | AC-09, AC-11 | Cross-requester isolation | Switch to another requester → previous requester's tickets invisible | `e2e/lab-02/requester-ticket-flow.spec.ts` (desktop project only) | Planned |
| E2E-03 | E2E | AC-05 | Backend-down resilience | API route aborted mid-form → error banner, values retained | `e2e/lab-02/requester-ticket-flow.spec.ts` (desktop project only) | Planned |

## 3. Acceptance-Criterion Traceability

Every AC maps to ≥1 automated test:

| AC | Tests | | AC | Tests | | AC | Tests |
| :--- | :--- | --- | :--- | :--- | --- | :--- | :--- |
| AC-01 | UNIT-01, API-01, UI-05, E2E-01 | | AC-10 | UI-22 | | AC-19 | API-14, UI-15 |
| AC-02 | API-02, UI-01 | | AC-11 | API-06, E2E-02 | | AC-20 | API-15, UI-18 |
| AC-03 | API-03, UI-02 | | AC-12 | API-07 | | AC-21 | API-16, API-17 |
| AC-04 | UI-03 | | AC-13 | API-08, UI-09 | | AC-22 | API-18, E2E-01 |
| AC-05 | UI-04, UI-12, E2E-03 | | AC-14 | API-09, UI-11 | | AC-23 | API-20, API-21, UI-17 |
| AC-06 | UI-06, API-16/17 (mirror) | | AC-15 | API-10, API-24, UI-10 | | AC-24 | API-19, UI-16, E2E-01 |
| AC-07 | UI-19 | | AC-16 | UI-08 | | AC-25 | RESP-01..09 |
| AC-08 | API-22, UI-20 | | AC-17 | API-11, UI-13, E2E-01 | | AC-26 | STYLE-04 (+ all UI keyboard assertions) |
| AC-09 | UI-21, E2E-02 | | AC-18 | API-04, API-12, API-13, UI-14 | | | |

## 4. Responsive and Visual Checklist

Covered by RESP-01..09 plus the manual checklist in `ui-spec.md` Section 9, verified against the generated screenshots at sprint close (reviewer records results there).

## 5. Test Commands

```bash
docker compose up -d                      # repo root — PostgreSQL first
cd server && pnpm exec prisma migrate deploy && pnpm exec prisma db seed   # once per fresh DB
cd server && pnpm test                    # unit + API suites
cd ../client && pnpm test                 # component + style suites
cd .. && npx playwright test e2e/lab-02   # responsive + E2E (needs both servers running; Playwright config wired up in Issue 12)
```

## 6. Final Results

_Filled at sprint close (Issue 13). Target: all rows `Pass`, zero skipped._

**Issue 12 note (E2E + responsive written):** The RESP-01..09 and E2E-01..03 specs (`e2e/lab-02/`) were authored during Issue 12 and observed passing against the running stack at the time; their rows are correctly left `Planned` here and will be set to `Pass` with run evidence at sprint close (Issue 13), consistent with the other suites.

## 7. Known Limitations / Deferred

- IT Priority is always null this sprint — asserted as "—" rendering, not value handling.
- Concurrency of ticket-number generation is covered by UNIT-01's uniqueness assertion, not a multi-process integration test.
- Playwright visual comparison is screenshot-capture + checklist review, not pixel-diff regression.

---

*This plan is written before implementation (Test DD evidence). Any behavior change during implementation must update both this file and the specs.*

**Approval:** Reviewed and approved by the student on 2026-08-21. Six test levels, 62 planned tests, full AC traceability, and labsheet-conformant table/section format confirmed. Statuses remain `Planned` until sprint close.
