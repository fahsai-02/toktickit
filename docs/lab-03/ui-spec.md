# Lab 3 UI Specification — Zen Green Design System

| | |
| :--- | :--- |
| **Project** | Tok TickIT — IT Service Desk |
| **Sprint** | Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens |
| **Version** | v1.0 DRAFT — student-reviewed, baseline for implementation |
| **Date** | 2026-09-10 |
| **Contract source** | `specification.md` v1.0; `api-spec.md` v1.0 |

---

## 1. Color Tokens (inherited from Lab 2)

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-primary` | `#006B3C` | App header background, primary buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active nav indicator, focus outlines, links, hover on primary |
| `--color-pale` | `#EAF6EF` | Selected rows, success callouts, subtle section backgrounds |
| `--color-page` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, tables, modals — 1px border `#D1D5DB`, shadow `0 1px 2px rgba(28,40,38,.06)` |
| `--color-text` | `#1C2826` | All body text (never pure black) |
| `--color-text-muted` | `#5B6B66` | Secondary text, captions, timestamps |
| `--color-field-readonly` | `#F0F4F2` | Read-only field background |
| `--color-error` | `#B91C1C` | Error borders, error text, destructive buttons |
| `--color-warning` | `#D97706` | HIGH priority badge, functional warnings only |
| `--color-success` | `#047857` | Success confirmation text/icons |

### Lab 3 Additions

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--color-info` | `#2563EB` | Internal Notes / info accent text, icon, and border |
| `--color-info-bg` | `#EAF1FE` | Internal Notes background tint (blue-tinted surface) |
| `--color-inactive` | `#DC2626` | Inactive status badge |
| `--color-active` | `#047857` | Active status badge |

## 2. Typography and Spacing (inherited from Lab 2)

- **Font stack:** system sans-serif stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`).
- **Scale:** page title 20px/600 · section heading 16px/600 · body & labels 14px/400 · label weight 500 · caption/helper 12px. Line-height ≥ 1.5 for body.
- **Spacing:** 8px base grid (4/8/12/16/24/32). Card padding 24px desktop / 16px mobile. Gap between form fields 16px vertical.
- **Container:** max-width 1200px centered; side padding 24px desktop / 16px mobile.

## 3. Control States (inherited from Lab 2)

### Buttons
| Variant | Style |
| :--- | :--- |
| Primary | bg primary green, white text, radius 6px, height 40px |
| Secondary | white bg, 1px secondary green border, secondary green text |
| Tertiary/Ghost | transparent bg, muted text |
| Destructive | bg error red, white text (Deactivate User, Remove) |
| Destructive Outline | white bg, 1px error red border, error red text |
| Disabled | opacity .45 + `cursor: not-allowed` |
| Busy | spinner replaces icon area, label stays visible, button disabled |

### Text inputs / selects / textarea / toggle
- **Editable:** white bg, 1px `#D1D5DB` border, radius 6px, height 40px (textarea taller).
- **Focused:** 2px secondary green outline with 2px offset.
- **Invalid:** 1px error red border; message in error red beneath the field.
- **Disabled:** gray-tinted bg, muted text, not editable.
- **Read-only:** `--color-field-readonly` bg, normal text color, not focusable.
- **Toggle switch:** green when active, gray when inactive; pill shape with circular thumb.

### Badges
Pill shape, 12px/600 text, tinted background + dark text:

| Badge | Style |
| :--- | :--- |
| Status: NEW | pale green bg, dark green text |
| Status: OPEN | orange tint, dark orange text |
| Status: IN_PROGRESS | yellow tint, dark yellow text |
| Status: WAITING_FOR_REQUESTER | blue tint, dark blue text |
| Status: RESOLVED | green tint, dark green text |
| Status: CLOSED | gray tint, dark gray text |
| Status: REOPENED | purple tint, dark purple text |
| Status: CANCELLED | red tint, dark red text |
| Priority: LOW | neutral gray tint |
| Priority: MEDIUM | pale green tint, dark green text |
| Priority: HIGH | amber tint |
| Priority: URGENT | red tint |
| Role: REQUESTER | blue tint |
| Role: IT_STAFF | green tint |
| Role: ADMINISTRATOR | purple tint |
| Active | green text, green border/bg |
| Inactive | red text, red border/bg |

## 4. Application Shell

- Header: primary green bar, height 56px. Left: brand "TokTickIT" (white, 600). Center/left: nav links depending on role (see section 4.1). Right: **Profile dropdown** (user name + role badge) with "Change Password" and "Logout" actions.
- The Dev Requester selector and Change Requester action are **removed** (FR-21).
- Mobile (<768px): header keeps brand + user name (truncated); nav collapses into hamburger toggle; Profile dropdown accessible from hamburger.

### 4.1 Role-Based Navigation

| Role | Nav Links |
| :--- | :--- |
| REQUESTER | My Tickets, Create Ticket |
| IT_STAFF | My Queue, Create Ticket |
| ADMINISTRATOR | My Queue, Create Ticket, User Management |

- Active page: 3px secondary-green underline + bold text (not color alone).
- "User Management" link only visible to Administrator role.

## 5. Screen Layouts

### 5.1 Login

- Centered card (max-width 480px) on page background.
- Brand "TokTickIT" (24px/600, primary green).
- Title: "Sign in to your account" (20px/600).
- Fields: Email address (text input), Password (password input with eye toggle).
- Error state: light-red error banner above the form with warning icon: "Invalid email or password. Please try again."
- Button: "Sign in" (primary, full width).
- Link: "Forgot your password?" (secondary green, placeholder only — no action, password reset is excluded per section 4.2).
- States:
  - Loading: button shows spinner + "Signing in…"
  - Success: redirect to `/` (which routes to role-appropriate default)
  - Failure: error banner remains until next submission attempt
  - mustChangePassword: redirect to `/change-password`

### 5.2 Change Password

- Centered card (max-width 480px) on page background.
- Title: "Change Your Password" (20px/600).
- Subtitle: "You must change your password to continue." (14px, muted text). On a **voluntary** visit (user has already changed once), show the friendlier "Choose a new password for your account." instead.
- Fields: Current (temporary) password, New password, Confirm new password.
- **Password strength checklist** (14px, below the new-password field):
  - [ ] Be at least 8 characters
  - [ ] Include upper and lower case letters
  - [ ] Include a number and a special character
  - Each item shows a green checkmark ✓ when the rule is met, gray unchecked when not. Updates in real time as the user types.
  - The checklist rules MUST mirror the backend validation rules exactly (FR-07).
- Button: "Continue" (primary, full width, disabled until all rules met).
- Button: "Cancel" (grey ghost, full width) — ONLY on a voluntary visit (`mustChangePassword` already false); navigates back to `/` (role home). Hidden while `mustChangePassword = true` so a forced-change user cannot leave the flow (BR-02).
- States:
  - Loading: button shows spinner + "Changing password…"
  - Success: redirect to `/`
  - Error: field-level messages for wrong current password, mismatch, or specific rule failures
- All other routes are blocked while `mustChangePassword = true`.

### 5.3 Requester Ticket Detail (with Public Comments)

Extends Lab 2 Ticket Detail (read-only) with:
- **Resolution Summary** (read-only, shown when set by IT Staff): displayed in the info grid as a read-only field with pale green background. When null/not set, the field is hidden.
- **"Problem Appears Resolved" action**: a button/toggle in the ticket actions area. When the indication is active, shows a green confirmation state: "You indicated this problem appears resolved" with a retraction action.
- **Public Comments tab** (new):
  - Tab label: "Public Comments (count)"
  - Comment timeline: newest-first, each entry shows author name, role badge, timestamp, and content.
  - Comment input: textarea ("Type your comment here...") + "Post Comment" primary button.
  - Visual style: neutral/white background for comment entries.
- All other Lab 2 read-only fields, attachment management, and ownership protection remain unchanged.

### 5.4 IT Staff Ticket Queue ("My Queue")

- **Search bar:** "Search by ticket number or summary..." placeholder.
- **Filters button** with dropdown containing: Status, Requested Priority, IT Priority, Category, Owner (includes "Unassigned" option, optionally "Assigned to me").
- **Results count:** "Showing X to Y of Z tickets".
- **Table columns (9):**

| Column | Width | Notes |
| :--- | :--- | :--- |
| Ticket No. | 180px | Link to detail; `TKT-YYYY-XXXXXX` format |
| Created Date | 120px | Formatted date |
| Summary | auto (flex) | Clamp to 2 lines on overflow |
| Category | 120px | Text |
| Req. Priority | 100px | Badge |
| IT Priority | 100px | Badge |
| Status | 130px | Badge |
| Owner | 140px | Name text (or "Unassigned" in muted text) |
| Last Updated | 120px | Formatted date |

- Row click → navigate to `/staff/tickets/:id`. Until the detail screen (section 5.5) ships, this route renders a placeholder that links back to My Queue — so a row click never bounces the user back to the list.
- Hover: pale-green tint.
- **Pagination bar:** "Showing X–Y of Z", Prev / page numbers / Next. Default page size 10.
- **States:**
  - Loading: skeleton rows/spinner.
  - Empty (no tickets): "No tickets found" + illustration.
  - No-results (filters matched nothing): "No results match your search" + Clear Filters CTA.
  - Forbidden: non-IT-Staff/Admin see "You don't have access to this page."
  - Error: red banner + Retry.
- **Responsive:**
  - Desktop (≥992px): full table.
  - Tablet (768–991px): condensed table (hide Created Date and Last Updated columns).
  - Mobile (<768px): card layout — line 1: ticket number + status badge; line 2: summary (2-line clamp); line 3: category + priority badges; line 4: owner + last updated.

### 5.5 IT Staff Ticket Detail

- **Breadcrumbs:** `My Queue > Ticket Detail` with `<- Back to Queue` button on top right.
- **Operational meta (left/top area):**

| Field | Editability |
| :--- | :--- |
| Ticket No. | Read-only text |
| Category | Dropdown (editable) |
| Related System | Read-only text |
| Requester | Read-only text |
| Requested Priority | Read-only badge |
| Current Status | Dropdown (editable — only permitted next states per BR-12) |
| Ticket Owner | Dropdown (editable — lists active IT Staff/Admin from `GET /api/staff/users`) |
| IT Priority | Dropdown (editable) |
| "Requester indicates resolved" | Badge indicator (shown when `requesterIndicatedResolved = true`) |

- **Description card:**
  - Summary: read-only text.
  - Description: read-only block with preserved line breaks.
  - Resolution Summary: editable input box, placeholder "Add resolution summary (visible to requester)...". Save button or auto-save on blur.

- **Tabs segment:**
  - `Public Comments (count)` — selected by default.
  - `Internal Notes (count)`.
  - `Attachments (count)`.
  - **NO "Service Actions" tab** (Actions Taken excluded per section 4.2).

- **Public Comments tab:**
  - Comment timeline (newest-first): author name + role badge, timestamp, content.
  - Input: textarea + "Post Comment" green button.
  - Background: neutral/white.

- **Internal Notes tab:**
  - Note timeline (newest-first): author name + role badge, timestamp, content.
  - Input: textarea + "Create Note" button.
  - Background: blue-tinted background (using `--color-info` token) for note entries.
  - Label: "Internal" with lock icon to visually distinguish from public comments.
  - Different button color/style to prevent accidental public posting.

- **Attachments tab:** reuse Lab 2 attachment UI (active list, upload, download, soft-remove).

- **Responsive:**
  - Desktop: split layout — left = ticket info, right = communication tabs.
  - Tablet: stacked layout — info on top, tabs below.
  - Mobile: fully stacked; tabs as horizontal scrollable strip.

### 5.6 Administrator User Management

- **Search bar:** "Search users..." placeholder + "Filters" button (role filter dropdown).
- **"+ Create User"** primary button (right-aligned).
- **User list table:**

| Column | Width | Notes |
| :--- | :--- | :--- |
| Name | auto | — |
| Email | auto | — |
| Role | 140px | Role badge |
| Status | 100px | Active/Inactive badge |
| Edit | 80px | Edit icon/button |

- Click Edit → right-side drawer overlay opens.

- **Create/Edit Drawer (right-side overlay):**
  - Close "X" button on top right.
  - Title: "Create New User" (create mode) or "Edit User" (edit mode).
  - Fields:
    - Full Name (text input, required)
    - Email Address (text input, required)
    - Role (dropdown: Requester, IT Staff, Administrator)
    - Active (toggle switch: Yes/No)
  - **Create mode:** Initial Password section — text input field (mandatory, not a toggle). Placeholder: "Enter initial password". Description below: "User will be required to change password on first login."
  - **Edit mode:** "Set New Initial Password" button (secondary) — opens a sub-form to enter a new initial password.
  - Actions:
    - `Save User` (primary green button)
    - `Deactivate User` (Destructive button — filled red, white text — edit mode only)
    - `Cancel` (grey ghost button)
  - **Deactivate confirmation dialog:** "Are you sure you want to deactivate [name]?" + "This user will no longer be able to log in." + Cancel / Deactivate (destructive) buttons.

- **Safety feedback:**
  - Self-deactivation: red error message "You cannot deactivate your own account."
  - Last admin: red error message "Cannot deactivate the last active Administrator."
  - Duplicate email: inline field error "A user with this email already exists."
  - Invalid role: inline field error or 400 feedback.

- **States:**
  - Loading: spinner.
  - Empty: "No users found."
  - Forbidden: non-Admin users see "You don't have access to this page."
  - Error: red banner + Retry.

- **Responsive:**
  - Desktop: full table + drawer.
  - Tablet: condensed table + drawer (full width on small tablets).
  - Mobile: card layout for user list; drawer becomes full-screen overlay.

## 6. Responsive Rules

| Viewport | Rules |
| :--- | :--- |
| Desktop ≥992px | Multi-column grids as specified; container max 1200px; data table view; split layout for staff detail |
| Tablet 768–991px | Two-column where practical; condensed tables (hide less critical columns); stacked layout for staff detail |
| Mobile <768px | Everything stacks vertically; full-width controls; tap targets ≥44px; **zero horizontal page scrolling**; table → cards; drawer → full-screen overlay |
| All sizes | No clipped labels, overlapping messages, hidden buttons, or truncated-unreadable text |

## 7. Accessibility

- Native `<select>`/`<button>`/`<input>` elements preferred (keyboard support for free).
- Tab order follows visual reading order; no positive `tabindex`.
- Every control has an associated `<label htmlFor>`; every icon-only control has `aria-label`.
- Focus indicators: 2px outline, 2px offset — never removed. The ring colour follows the surface it sits on: `--color-secondary` (green) on light surfaces — page background, cards, forms — and white on the dark `--color-primary` header bar, where a green ring would be invisible against the bar.
- Error messages linked via `aria-describedby`; invalid controls get `aria-invalid="true"`.
- Badges convey meaning through text, never color alone.
- Dialogs trap focus, close on Escape, return focus to trigger.
- Toggle switches have `role="switch"` and `aria-checked`.

## 8. Reusable Component Inventory

`Button` (all variants incl. busy) · `TextField` (with counter) · `TextArea` (with counter) · `SelectField` · `ReadOnlyField` · `PasswordChecklist` · `Toggle` · `Badge` (all status / priority / role / label variants) · `Callout` (error/success/info) · `Spinner` · `ListState` (loading / empty / no-results / error+retry) · `ConfirmDialog` · `Drawer` (right-side overlay) · `PaginationBar` · `TicketTable` / `TicketCard` · `MobileSortSelect` (mobile-only "Sort by") · `Navbar` (role-aware nav + profile menu) · `AttachmentSection` (attachment list + upload, reused from Lab 2). `AppShell` (app shell with `<Outlet />`, header/nav/user profile) lives at `src/AppShell.tsx` beside `App.tsx`, not under `components/`.

All screens compose these; no screen invents its own field styling. Note: a few single-screen constructs stay inline inside their owning screen instead of being extracted — the staged-attachment chip (`.staged-chip`, inside `AttachmentSection`) and the comments/notes/attachments tabs + comment timeline (inside `StaffTicketDetail` / `TicketDetail`). `ListState` is the shared empty / no-results / error block (supersedes the earlier `EmptyState` plan).

## 9. Visual Inspection Checklist and Screenshot Paths

Screenshots captured by Playwright at **1440×900 (desktop)**, **820×1180 (tablet)** and **375×844 (mobile)** — 10 screens × 3 viewports = 30 responsive captures (`RESP-01..30`):

```
artifacts/lab-03/screenshots/authentication/{desktop,tablet,mobile}.png         (login screen)
artifacts/lab-03/screenshots/change-password/{desktop,tablet,mobile}.png        (change password screen)
artifacts/lab-03/screenshots/app-shell/{desktop,tablet,mobile}.png              (authenticated shell with role nav)
artifacts/lab-03/screenshots/requester-ticket-detail/{desktop,tablet,mobile}.png (requester detail with comments)
artifacts/lab-03/screenshots/staff-queue/{desktop,tablet,mobile}.png           (IT staff queue)
artifacts/lab-03/screenshots/staff-ticket-detail/{desktop,tablet,mobile}.png   (IT staff detail)
artifacts/lab-03/screenshots/user-management/{desktop,tablet,mobile}.png       (admin user list)
artifacts/lab-03/screenshots/user-management-create/{desktop,tablet,mobile}.png (admin create drawer)
artifacts/lab-03/screenshots/requester-my-tickets/{desktop,tablet,mobile}.png   (requester ticket list, added)
artifacts/lab-03/screenshots/requester-create-ticket/{desktop,tablet,mobile}.png (requester create form, added)
```

State-evidence screenshots (states that a static happy-path shot cannot capture):

```
artifacts/lab-03/screenshots/states/login-error/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/login-busy/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/change-password-validation/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/queue-empty/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/queue-no-results/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/staff-detail-comments/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/staff-detail-notes/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/admin-deactivate-confirm/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/admin-safety-self-deactivate/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/states/admin-safety-last-admin/{desktop,tablet,mobile}.png
```

### 9.1 Visual Checklist

The `Auto` column names the test that proves the item, so a reviewer can re-run it
instead of trusting the table. The `Manual pass` column is the student's own
sign-off after looking at the screenshots: an automated check and a human look
are different evidence, and only the student can provide the second one.

> **How this column was filled (2026-09-28).** The
> student reviewed the 72 screenshots in `artifacts/lab-03/screenshots/` and
> confirmed the ones shown were correct, then tabbed through the running app by
> keyboard. The 24 rows whose evidence is a picture are marked `Pass` on the
> strength of that image review; rows 7 and 8 were signed earlier. The marks were
> **transcribed from the student's own review, not written by a second pair of
> eyes** — no automated tool can look at a picture or drive a keyboard, and this
> column claims a human did.
>
> **The mobile viewport was then changed from 390px to 375px** to match the
> Issue 23 acceptance criteria verbatim, and all 72 images were re-captured. The
> desktop and tablet images are unchanged; the 24 mobile images are new. The
> student re-reviewed those 24 captures at 375px and found nothing to change, so
> every `Pass` in this column stands on that second review — the same person
> signing both passes is the point, since the question being answered ("does
> this look right at the narrowest supported width") cannot be delegated to a
> test. `STYLE-08` and `STYLE-09` cover the measurable part of the same rows
> automatically at all three viewports.
>
> Two further rows carry an explicit note about the strength of their evidence:
>
> - **18 — pagination.** Filters (`STATE-31..36`) and sort (`STATE-40..42`) are
>   both photographed and asserted. The pagination *bar* is visible in
>   `RESP-13..15`, but no capture clicks to a later page, so that half is
>   evidence of presence only, resting on client unit test `UI-09` for
>   behaviour.
> - **25 — focus states.** A capture has nothing focused, so no focus ring is
>   painted in any of the 72 PNGs. The student confirmed this one live by
>   pressing <kbd>Tab</kbd> through the app, which is also how the disabled
>   Active toggle in the edit drawer was spotted and confirmed to be intended
>   (`UserManagement.tsx:570` disables it because status changes must go through
>   the Deactivate/Activate buttons and their 403/409 guards). `STYLE-05` covers
>   the rule automatically at all three viewports. Unlike the other rows this one
>   is unaffected by the width change — it was never evidence from a picture.

| # | Checklist item | Auto (test ID) | Manual pass (student sign-off) |
|---|----------------|----------------|------------------------------|
| 1 | Colors match Section 1 tokens (header, buttons, badges, fields) | STYLE-01, STYLE-02 | Pass |
| 2 | Editable vs read-only fields clearly distinguishable | STYLE-06 | Pass |
| 3 | Red asterisks on required fields; messages under their own field | STYLE-07, STATE-07..09 | Pass |
| 4 | Button hierarchy correct (primary/secondary/ghost/destructive); busy state while submitting | STATE-04..06 | Pass |
| 5 | Status badges consistent across all screens (8 statuses, correct colors) | STYLE-02 | Pass |
| 6 | Priority badges consistent (LOW/MEDIUM/HIGH/URGENT) | STYLE-03 | Pass |
| 7 | Role badges consistent (REQUESTER/IT_STAFF/ADMINISTRATOR) | STYLE-04 | Pass |
| 8 | Active/Inactive badges consistent | UI-14 | Pass |
| 9 | No clipping, overlap, or unintended horizontal scrolling at any viewport | RESP-01..30, STATE-01..42, STYLE-08 | Pass |
| 10 | Login screen renders correctly at all viewports | RESP-01..03 | Pass |
| 11 | Change Password screen renders correctly at all viewports | RESP-04..06 | Pass |
| 12 | App Shell shows correct role-based navigation | RESP-07..09, STYLE-09 | Pass |
| 13 | Requester Ticket Detail renders correctly with comments and resolution summary | RESP-10..12 | Pass |
| 13b | Requester My Tickets + Create Ticket render correctly at all viewports (added) | RESP-25..30 | Pass |
| 14 | Staff Queue renders correctly with table/cards at all viewports | RESP-13..15 | Pass |
| 15 | Staff Ticket Detail renders correctly with tabs at all viewports | RESP-16..18 | Pass |
| 16 | User Management renders correctly with table at all viewports | RESP-19..21 | Pass |
| 17 | Create/Edit drawer renders correctly at all viewports | RESP-22..24 | Pass |
| 18 | Filters, sort, pagination usable at all viewports | Filters: `STATE-31..36`. Sort: `STATE-40..42`. Pagination bar visible: `RESP-13..15` | Pass |
| 19 | Empty vs no-results states visually distinct | STATE-10..15 | Pass |
| 20 | Public Comments and Internal Notes visually distinct (color, label, icon) | STATE-16..21 | Pass |
| 21 | Password strength checklist renders correctly with live checkmarks | STATE-07..09 | Pass |
| 22 | Deactivation confirmation dialog renders correctly | STATE-22..24 | Pass |
| 23 | Safety error messages visible and clear (self-deactivate, last-admin, duplicate email) | STATE-25..30 | Pass |
| 24 | Long text/clamp behaves gracefully; nothing unreadable | STYLE-10 | Pass |
| 25 | Focus states visible on all interactive elements | STYLE-05 | Pass — checked live by keyboard, not from a capture |

> **Correction on item 18 (Issue 23, after student review).** This row used to
> claim `RESP-13..15, RESP-25..27` as proof that filters, sort and pagination were
> usable. It was not. The queue's filter card sits behind `{filtersOpen && …}`
> and starts closed, so every one of those screenshots shows the *unfiltered*
> list; `states/queue-no-results` is the failure path (a search matching
> nothing), not a filter that works; and `RESP-25..27` are the **Requester's**
> My Tickets screens, which have nothing to do with the staff queue. The row also
> asserted a sort that no capture had ever applied.
>
> All three are now photographed: `STATE-31..33` for the open filter card,
> `STATE-34..36` for a filter that actually narrows the list, and `STATE-40..42`
> for a sort applied through the control a real user operates (the sortable `th`
> on desktop/tablet, the "Sort by" select on mobile). `STATE-40..42` asserts the
> resulting order is genuinely ascending, so the picture cannot pass on a
> re-render that did not reorder anything.
>
> The pagination bar is visible in `RESP-13..15` because the seeded queue spans
> many pages, but **no capture navigates to a later page** — that half of the row
> rests on the bar being present, and on client unit test `UI-09` for paging.

### How this column was filled, and how to re-check it

The `Auto (test ID)` column is machine evidence; this column is the student's own
visual sign-off, and it is **filled** — every row carries a verdict. Each
screenshot referenced by a
test ID lives at
`artifacts/lab-03/screenshots/<name>/<desktop|tablet|mobile>.png`. To re-check an
item yourself, open that PNG, compare it against the checklist wording and this
document, then read what the recorded verdict was. If a verdict no longer
matches the image, the image changed and the row must be re-reviewed, not copied
forward.

The checklist items group into the evidence below. Screens are in
`artifacts/lab-03/screenshots/<screen>/<viewport>.png`; states are in
`artifacts/lab-03/screenshots/states/<state>/<viewport>.png`. Open the `mobile`
PNG first in every group — 375px is where clipping, overlap and horizontal
scrolling show up first, and a desktop shot hides all three.

| Items | Evidence to open | What to look for |
|---|---|---|
| 1, 5, 6 | `staff-queue/desktop.png` | Header bar is `--color-primary` green; the queue table shows status badges across several of the 8 statuses and priority badges (LOW/MEDIUM/HIGH/URGENT). `STYLE-01..04` already assert the exact token values. |
| 7, 8 | `user-management/desktop.png` | Role badges for all three roles, and the Active/Inactive column styled differently per row. |
| 2 | `staff-ticket-detail/desktop.png` | IT Priority / Status / Owner selects look editable; ticket number, requester and dates look flat and greyed. |
| 3, 21 | `states/change-password-validation/desktop.png` | Red asterisks on required fields, each message directly under its own field, password checklist ticks live. |
| 4 | `states/login-busy/desktop.png` | The submitting button shows a busy state and is disabled, not just re-labelled. |
| 9 | all 20 `*/mobile.png` files | Nothing cut off at the right edge; no two controls overlapping. `STYLE-08` and `assertNoHorizontalScroll` already measure this — the screenshots are for your eye, not the test's. |
| 10 | `authentication/desktop.png` | Login screen layout. |
| 11 | `change-password/desktop.png` | Change Password screen layout. |
| 12 | `app-shell/desktop.png` | Only the links this role is allowed to see. |
| 13, 13b | `requester-ticket-detail/desktop.png`, `requester-my-tickets/desktop.png`, `requester-create-ticket/desktop.png` | Requester screens, including the desktop table → mobile card swap. |
| 14, 18 | `staff-queue/desktop.png` + `states/queue-filters-open/desktop.png` + `states/queue-filtered-results/desktop.png` + `states/queue-sort-applied/desktop.png` | Table on desktop, cards on mobile. The two filter states show the card open with all five controls, then a status filter applied with the list narrowed and Clear Filters present. The sort state shows a sort actually applied through the sortable `th`. The pagination bar is visible in the first image (the seeded queue spans many pages) but no screenshot navigates it. |
| 15 | `staff-ticket-detail/desktop.png` | Three tabs, operational controls present. |
| 16 | `user-management/desktop.png` | Admin table. |
| 17 | `user-management-create/desktop.png` | The create drawer, full width, close button reachable. |
| 19 | `states/queue-empty/desktop.png` vs `states/queue-no-results/desktop.png` | Two different messages — "no tickets at all" vs "no match for this search" — and only the second offers Clear Filters. |
| 20 | `states/staff-detail-comments/desktop.png` vs `states/staff-detail-notes/desktop.png` | Comments and notes must be tellable apart without reading: different background, label or icon. |
| 22 | `states/admin-deactivate-confirm/desktop.png` | A confirmation dialog before the account is touched. |
| 23 | `states/admin-safety-self-deactivate/desktop.png`, `states/admin-safety-last-admin/desktop.png` | 403 and 409 messages are readable and say what went wrong. |
| 24 | `staff-queue/mobile.png` | A long summary clamps to two lines instead of stretching the row. |
| 25 | **no screenshot — check live** | A capture has nothing focused, so no ring is painted in any PNG. Press <kbd>Tab</kbd> through the page yourself, or accept `STYLE-05`, which tabs all four screens at all three viewports and reads the computed ring at every stop. |

Re-running `pnpm exec playwright test e2e/lab-03/responsive.visual.spec.ts e2e/lab-03/states.visual.spec.ts` regenerates the whole set, so re-sign anything you signed after a code change.

---

*Changes require student approval. Implementation must be checked against this file and screenshots, not personal memory.*

**Approval:** Reviewed and approved by the student on 2026-09-10. All screen layouts, responsive rules, visual checklist items, and component inventory confirmed. This version is the implementation baseline.

**Amendment (Issue 23, release polish):** the screenshot set was extended with
two Requester screens — `requester-my-tickets` and `requester-create-ticket` — so
the busiest Requester list and the densest form have responsive evidence of their
own. The `Auto` column in section 9.1 now names the test ID that automates each
item where one exists, backed by `e2e/lab-03/visual-audit.spec.ts`
(`STYLE-05..10`). The three Playwright viewport projects are desktop 1440×900,
tablet 820×1180 and **mobile 375×844** — mobile was changed from 390px to
**375px** during this issue to match the acceptance criteria verbatim (AC-15
names 375px), and the whole set was re-captured at that width. Tablet stays at
820px rather than the AC's 768px because `client/src/App.css` switches to the
mobile layout at `max-width: 768px`, so a 768px run would capture the mobile
layout instead of the tablet one; see AD-12 in `specification.md`. No breakpoint,
spacing scale, or copy was changed; the token and focus-ring changes are listed
under "Release fixes" below.

**Release fixes found by this audit (Issue 23):** the focus ring on `.btn-primary` was `2px solid #fff` with a 2px offset, which drew a white ring on the white page — the primary action of every screen had no visible focus indicator. It is now `2px solid var(--color-secondary)` (`client/src/components/Button.css`), which is what section 7 and checklist item 25 require. Separately, the mobile header overflowed (first seen at 390px) because the profile name and role badge were not allowed to shrink; `client/src/App.css` now lets them truncate, which is a layout change and is why the sentence above no longer claims no layout change. `STYLE-05` now locks the focus contract in by tabbing through four screens at each of the three viewports and reading the computed ring at every stop. All three fixes were re-verified at 375px.
