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
| `--color-info` | `#2563EB` | Internal Notes visual distinction (blue-tinted background) |
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
- Subtitle: "You must change your password to continue." (14px, muted text).
- Fields: Current (temporary) password, New password, Confirm new password.
- **Password strength checklist** (14px, below the new-password field):
  - [ ] Be at least 8 characters
  - [ ] Include upper and lower case letters
  - [ ] Include a number and a special character
  - Each item shows a green checkmark ✓ when the rule is met, gray unchecked when not. Updates in real time as the user types.
  - The checklist rules MUST mirror the backend validation rules exactly (FR-07).
- Button: "Continue" (primary, full width, disabled until all rules met).
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

- Row click → navigate to `/staff/tickets/:id`.
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
    - `Deactivate User` (red outline button, edit mode only)
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
- Focus indicators: 2px secondary green outline, 2px offset — never removed.
- Error messages linked via `aria-describedby`; invalid controls get `aria-invalid="true"`.
- Badges convey meaning through text, never color alone.
- Dialogs trap focus, close on Escape, return focus to trigger.
- Toggle switches have `role="switch"` and `aria-checked`.

## 8. Reusable Component Inventory

`Button` (all variants incl. busy) · `TextField` · `TextArea` (with counter) · `SelectField` · `ReadOnlyField` · `Badge` · `Callout` (error/success/info) · `EmptyState` · `Spinner` · `FileChip` · `ConfirmDialog` · `PaginationBar` · `TicketTable` / `TicketCard` · `AppShell` (header/nav/user profile) · `Drawer` (right-side overlay, new for Lab 3) · `Toggle` (new for Lab 3) · `Tabs` (new for Lab 3) · `CommentTimeline` (new for Lab 3) · `PasswordChecklist` (new for Lab 3).

All screens compose these; no screen invents its own field styling.

## 9. Visual Inspection Checklist and Screenshot Paths

Screenshots captured by Playwright at **1440×900 (desktop)**, **820×1180 (tablet)**, **390×844 (mobile)**:

```
artifacts/lab-03/screenshots/authentication/{desktop,tablet,mobile}.png         (login screen)
artifacts/lab-03/screenshots/change-password/{desktop,tablet,mobile}.png        (change password screen)
artifacts/lab-03/screenshots/app-shell/{desktop,tablet,mobile}.png              (authenticated shell with role nav)
artifacts/lab-03/screenshots/requester-ticket-detail/{desktop,tablet,mobile}.png (requester detail with comments)
artifacts/lab-03/screenshots/staff-queue/{desktop,tablet,mobile}.png           (IT staff queue)
artifacts/lab-03/screenshots/staff-ticket-detail/{desktop,tablet,mobile}.png   (IT staff detail)
artifacts/lab-03/screenshots/user-management/{desktop,tablet,mobile}.png       (admin user list)
artifacts/lab-03/screenshots/user-management-create/{desktop,tablet,mobile}.png (admin create drawer)
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

| # | Checklist item | Auto | Manual pass |
|---|----------------|------|-------------|
| 1 | Colors match Section 1 tokens (header, buttons, badges, fields) | — | — |
| 2 | Editable vs read-only fields clearly distinguishable | — | — |
| 3 | Red asterisks on required fields; messages under their own field | — | — |
| 4 | Button hierarchy correct (primary/secondary/ghost/destructive); busy state while submitting | — | — |
| 5 | Status badges consistent across all screens (8 statuses, correct colors) | STYLE-02 | — |
| 6 | Priority badges consistent (LOW/MEDIUM/HIGH/URGENT) | STYLE-03 | — |
| 7 | Role badges consistent (REQUESTER/IT_STAFF/ADMINISTRATOR) | STYLE-04 | — |
| 8 | Active/Inactive badges consistent | — | — |
| 9 | No clipping, overlap, or unintended horizontal scrolling at any viewport | RESP-01..24 | — |
| 10 | Login screen renders correctly at all viewports | RESP-01..03 | — |
| 11 | Change Password screen renders correctly at all viewports | RESP-04..06 | — |
| 12 | App Shell shows correct role-based navigation | — | — |
| 13 | Requester Ticket Detail renders correctly with comments and resolution summary | RESP-10..12 | — |
| 14 | Staff Queue renders correctly with table/cards at all viewports | RESP-13..15 | — |
| 15 | Staff Ticket Detail renders correctly with tabs at all viewports | RESP-16..18 | — |
| 16 | User Management renders correctly with table at all viewports | RESP-19..21 | — |
| 17 | Create/Edit drawer renders correctly at all viewports | RESP-22..24 | — |
| 18 | Filters, sort, pagination usable at all viewports | — | — |
| 19 | Empty vs no-results states visually distinct | — | — |
| 20 | Public Comments and Internal Notes visually distinct (color, label, icon) | — | — |
| 21 | Password strength checklist renders correctly with live checkmarks | — | — |
| 22 | Deactivation confirmation dialog renders correctly | — | — |
| 23 | Safety error messages visible and clear (self-deactivate, last-admin, duplicate email) | — | — |
| 24 | Long text/clamp behaves gracefully; nothing unreadable | — | — |
| 25 | Focus states visible on all interactive elements | STYLE-04 | — |

---

*Changes require student approval. Implementation must be checked against this file and screenshots, not personal memory.*

**Approval:** Reviewed and approved by the student on 2026-09-10. All screen layouts, responsive rules, visual checklist items, and component inventory confirmed. This version is the implementation baseline.
