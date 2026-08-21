# Lab 2 UI Specification — Zen Green Design System

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 2: Requester Ticketing MVP |
| **Version** | v1.0 APPROVED — student-reviewed, baseline for implementation |
| **Date** | 2026-08-21 |
| **Contract source** | `specification.md` v1.0; colors fixed by the Lab 2 handout Section 7 |

---

## 1. Color Tokens

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-primary` | `#006B3C` | App header background, primary buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active nav indicator, focus outlines, links, hover on primary |
| `--color-pale` | `#EAF6EF` | Selected rows, success callouts, subtle section backgrounds, NEW badge |
| `--color-page` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, tables, modals — 1px border `#D1D5DB`, shadow `0 1px 2px rgba(28,40,38,.06)` |
| `--color-text` | `#1C2826` | All body text (never pure black) |
| `--color-text-muted` | `#5B6B66` | Secondary text, captions, timestamps |
| `--color-field-readonly` | `#F0F4F2` | Read-only field background (clearly distinct, still readable) |
| `--color-error` | `#B91C1C` | Error borders, error text, destructive buttons |
| `--color-warning` | `#D97706` | HIGH priority badge, functional warnings only — never decoration |
| `--color-success` | `#047857` | Success confirmation text/icons (paired with pale green background) |

## 2. Typography and Spacing

- **Font stack:** system sans-serif stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`). No webfont dependency.
- **Scale:** page title 20px/600 · section heading 16px/600 · body & labels 14px/400 · label weight 500 · caption/helper 12px. Line-height ≥ 1.5 for body.
- **Spacing:** 8px base grid (4/8/12/16/24/32). Card padding 24px desktop / 16px mobile. Gap between form fields 16px vertical.
- **Container:** max-width 1200px centered; side padding 24px desktop / 16px mobile.

## 3. Control States

### Buttons
| Variant | Style |
| :--- | :--- |
| Primary | bg primary green, white text, radius 6px, height 40px |
| Secondary | white bg, 1px secondary green border, secondary green text |
| Tertiary/Ghost | transparent bg, muted text (Cancel, Clear Filters) |
| Destructive | bg error red, white text (Remove attachment) |
| Disabled | opacity .45 + `cursor: not-allowed`; cannot be activated |
| Busy | spinner replaces icon area, label stays visible, button disabled during request |

Hover: primary darkens toward secondary green; secondary/ghost tint background with pale green; links underline and use secondary green. Focus ring (Section 3) applies to every variant.

### Text inputs / selects / textarea
- **Editable:** white bg, 1px `#D1D5DB` border, radius 6px, height 40px (textarea taller).
- **Focused:** 2px secondary green outline with 2px offset — always visible for keyboard users.
- **Invalid:** 1px error red border; message in error red directly beneath the field, linked via `aria-describedby`.
- **Disabled:** gray-tinted bg, muted text, not editable.
- **Read-only:** `--color-field-readonly` bg, normal text color, no border focus ring, not focusable.

### Labels and required markers
- Label above its control, 14px/500, 4px gap to control.
- Required fields show a red `*` after the label text plus `aria-required="true"`. The asterisk never replaces the validation message.
- Validation messages appear under the specific field — never only as one top-of-form error.

### Badges
Pill shape, 12px/600 text, tinted background + dark text of same hue, always paired with a text label (no color-only meaning):
| Badge | Style |
| :--- | :--- |
| Status: NEW | pale green bg, dark green text |
| Priority: LOW | neutral gray tint |
| Priority: MEDIUM | pale green tint, dark green text |
| Priority: HIGH | amber tint (`#D97706`) |
| Priority: URGENT | red tint (`#B91C1C`) |
| IT Priority | renders as muted "—" chip in Lab 2 (never set this sprint) |

## 4. Application Shell

- Header: primary green bar, height 56px. Left: brand "TokTickIT" (white, 600). Center/left: nav links **My Tickets**, **Create Ticket** — active page indicated by 3px secondary-green underline + bold text (not color alone). Right: current requester name + **Change Requester** tertiary button (white outline variant on green).
- Mobile (<768px): header keeps brand + requester name (truncated); nav collapses into a hamburger toggle revealing a vertical menu; all tap targets ≥44px.
- Footer: none required.

## 5. Screen Layouts

### 5.1 Requester Selection
- Centered card (max-width 480px) on page background: TokTickIT title, explanation paragraph using the handout wording ("…This is not a login screen. Authentication … introduced in Lab 3."), Requester dropdown (active requesters from API), Continue primary button.
- States: loading = spinner inside card; empty = "No active requesters available" message; API failure = error callout with Retry secondary button; dropdown disabled while loading.

### 5.2 Create Ticket
- **Read-only row (top):** Ticket Number ("Generated upon submission"), Ticket Date (today), Requester (selected name) — three read-only shaded fields, visually distinct from inputs.
- **Classification group:** Category select → Related System select (options reload when Category changes, FR-06) → Requested Priority select. Desktop: 3 columns; tablet: Category+System share a row, Priority below; mobile: stacked.
- **Summary:** full-width single-line input, maxLength 120 + live character counter "n/120".
- **Description:** full-width textarea, minHeight 160px, resizable vertically only, counter "n/2000".
- **Attachments:** dashed drop zone ("Drag files here or browse") accepting jpg/png/webp/pdf ≤5MB; staged files listed as chips showing name, size, remove ✕ (aria-label "Remove file"); invalid selection shows inline red chip reason and is never staged (AC-06).
- **Actions row (bottom):** Cancel (tertiary, left) · Submit Ticket (primary, right). Submitting: busy spinner + disabled (BR-11). Mobile: both full-width stacked, Submit above Cancel.
- **Success state:** replaces form with pale-green panel — check icon, "Ticket created", official Ticket Number displayed prominently, buttons "View ticket" (secondary) and "Go to My Tickets" (primary).
- **API failure state:** red callout banner above actions ("Could not save your ticket. Please try again.") — **all typed values remain in the form** (BR-12); no redirect.
- **Reference-data failure:** banner with Retry at top; selects disabled until loaded.

### 5.3 My Tickets
- **Toolbar:** primary **Create Ticket** button always visible — right-aligned in the filter-card header on desktop/tablet; full-width above the list on mobile (labsheet-required action, independent of the shell nav).
- **Filter bar (card):** search input (placeholder "Search ticket number or summary"), Category / Current Status / Requested Priority selects, Clear Filters ghost button. Desktop: one wrapping row; tablet/mobile: stacked full-width.
- **Desktop table columns (in order):** Ticket Number · Summary · Category · Requested Priority · IT Priority · Current Status · Last Updated. Row click opens detail; hover pale-green tint.
- **Sorting:** clickable column headers on sortable fields (`updatedAt`, `createdAt`, `requestedPriority`, `ticketNumber`) with ▲/▼ arrow indicating direction; default Last Updated ▼ (BR-18). Non-whitelisted headers are plain text. Mobile (<768px): table becomes cards; a "Sort by" select appears above the list.
- **Mobile card:** line 1 — Ticket Number (semibold) + Current Status badge right-aligned; line 2 — summary clamped to 2 lines; line 3 meta — Category · requested-priority badge · IT Priority chip; line 4 — Last Updated caption. Whole card tappable ≥44px.
- **Pagination bar:** "Showing X–Y of Z", rows-per-page select (10/20/50), ‹ Prev / Next + compact page numbers. Stays usable on mobile (wraps, touch-friendly).
- **States (distinct, BR-20):**
  - *Loading:* skeleton rows/spinner region.
  - *Empty* (requester owns nothing): icon + "You haven't created any tickets yet." + Create Ticket primary CTA.
  - *No-results* (filters matched nothing): icon + "No tickets match your filters." + Clear Filters secondary CTA.
  - *Error:* red banner + Retry; previous list remains visible if a refetch fails.

### 5.4 Ticket Detail (read-only)
- Top: back link "← My Tickets"; title row: Ticket Number (18px/600) + Current Status badge.
- **Info grid (read-only shaded fields):** Requester, Category, Related System, Requested Priority (badge), IT Priority ("—"), Ticket Date, Created, Last Updated. Description rendered as full-width read-only block with preserved line breaks.
- **Attachments section** (separate heading, card): 
  - *Attachment states (all five from the handout):*
    - **Active:** file-type icon, original filename, size, Download icon-button (aria-label + tooltip "Download <name>"), Remove destructive icon-button (tooltip "Remove").
    - **Uploading:** row shows inline spinner + "Uploading…", Download/Remove disabled until complete; on failure the row switches to an error state with Retry (staged-flow step 4, AD-03).
    - **Invalid:** never becomes a row — rejected at selection with an inline red chip reason at the picker (AC-06); server-side rejections (413/415/400) surface as row-level red text.
    - **Removed:** muted background, filename kept, caption "Removed <date> — <reason>"; Download disabled with tooltip "Removed attachments cannot be downloaded" (BR-10).
    - **Unavailable:** active file whose download request fails (e.g. missing on disk, network error) shows a red inline error on the row with a Retry action — the row stays Active once a retry succeeds.
  - *Upload:* "Add attachment" secondary button; hidden/disabled with hint when 5 active files exist (BR-08).
  - *Remove flow:* confirm dialog with mandatory reason textarea (3–200 chars, BR-15), Cancel + Remove (destructive; disabled until valid). Removing updates the row in place without reload.
- Muted info note at bottom: comments, internal notes, and status actions arrive in later labs (explicitly absent here).
- Unknown ticket → "not found" empty-state page; foreign ticket → "You don't have access to this ticket." (AC-18 surfaces safely).

## 6. Responsive Rules

| Viewport | Rules |
| :--- | :--- |
| Desktop ≥992px | Multi-column grids as specified; container max 1200px centered; data table view |
| Tablet 768–991px | Two-column where practical; Summary/Description always full width |
| Mobile <768px | Everything stacks vertically; full-width controls; tap targets ≥44px; **zero horizontal page scrolling**; table → cards |
| All sizes | No clipped labels, overlapping messages, hidden buttons, or truncated-unreadable attachment names (long names ellipsize with tooltip) |

## 7. Accessibility

- Native `<select>`/`<button>`/`<input>` elements preferred over custom widgets (keyboard support for free).
- Tab order follows visual reading order (top-to-bottom, left-to-right); no positive `tabindex`.
- Every control has an associated `<label htmlFor>`; every icon-only control has `aria-label` + visible tooltip.
- Focus indicators: 2px secondary green outline, 2px offset — never removed.
- Error messages linked via `aria-describedby`; invalid controls get `aria-invalid="true"`.
- Badges convey meaning through text, never color alone; success/error callouts include icons + text.
- Dialog traps focus, closes on Escape, returns focus to trigger.

## 8. Reusable Component Inventory

`Button` (all variants incl. busy) · `TextField` · `TextArea` (with counter) · `SelectField` · `ReadOnlyField` · `Badge` · `Callout` (error/success/info) · `EmptyState` (icon/title/description/action) · `Spinner` · `FileChip` · `ConfirmDialog` · `PaginationBar` · `TicketTable` / `TicketCard` · `AppShell` (header/nav/requester).

All screens compose these; no screen invents its own field styling.

## 9. Visual Inspection Checklist and Screenshot Paths

Screenshots captured by Playwright (AD-10) at **1440×900 (desktop)**, **820×1180 (tablet)**, **390×844 (mobile)**:

```
artifacts/lab-02/screenshots/create-ticket/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/my-tickets/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/ticket-detail/{desktop,tablet,mobile}.png
```

Checklist (verify per screenshot against this document, not memory):
- [ ] Colors match Section 1 tokens (header, buttons, badges, fields)
- [ ] Editable vs read-only fields clearly distinguishable
- [ ] Red asterisks present on all required fields; messages under their own field
- [ ] Button hierarchy correct (primary/secondary/ghost/destructive); busy state shown while submitting
- [ ] Badge styles consistent across screens (status, requested priority, IT priority "—")
- [ ] No clipping, no overlap, no unintended horizontal scrolling at any viewport
- [ ] Filters, sort control, pagination usable at all three viewports
- [ ] Empty vs no-results states visually distinct
- [ ] Attachment states render correctly: active, uploading (spinner), invalid rejected at picker, removed (muted + blocked download), unavailable (row-level error + retry)
- [ ] Long filenames/timestamps ellipsize gracefully; nothing unreadable

---

*Changes require student approval. Implementation must be checked against this file and screenshots, not personal memory.*

**Approval:** Reviewed and approved by the student on 2026-08-21. Priority badge palette, hamburger mobile nav, mobile sort dropdown, success-panel behavior, five attachment states, and screenshot conventions confirmed. This version is the implementation baseline.
