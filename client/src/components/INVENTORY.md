# Component Inventory

Reusable components ที่สร้างแล้ว นำกลับมาใช้ได้ทันที (updated 2026-09-25 — matches the current code; the spec-level list lives in `docs/lab-03/ui-spec.md` section 8).

## In `client/src/components/`

| Component | Path | Props | Used in |
|---|---|---|---|
| `Button` | `components/Button.tsx` | `variant: "primary" \| "secondary" \| "ghost"`, `loading`, `disabled`, plus native button attrs | Login, ChangePassword, CreateTicket, MyTickets, StaffTicketQueue, StaffTicketDetail, UserManagement, AttachmentSection |
| `TextField` | `components/TextField.tsx` | `label`, `required`, `error`, `errorTestId?`, `counter {value,max}`, `id`, plus native input attrs | Login, ChangePassword, CreateTicket, MyTickets (search), UserManagement |
| `TextArea` | `components/TextArea.tsx` | `label`, `required`, `error`, `counter {value,max}`, `id`, plus native textarea attrs | CreateTicket, TicketDetail, StaffTicketDetail |
| `SelectField` | `components/SelectField.tsx` | `label`, `required`, `options {value,label}[]`, `placeholder`, `error?`, `id`, plus native select attrs | CreateTicket, MyTickets (filter), StaffTicketDetail, UserManagement |
| `ReadOnlyField` | `components/ReadOnlyField.tsx` | `id`, `label`, `value` \| `children`, `className?`, `testId?` | CreateTicket, TicketDetail, StaffTicketDetail |
| `Badge` | `components/Badge.tsx` | `variant: "status-*" \| "priority-*" \| "it-priority" \| "role-*" \| "label-*"`, `children`, `className?` | TicketTable/TicketCard/Navbar, StaffTicketDetail, TicketDetail, UserManagement |
| `Callout` | `components/Callout.tsx` | `variant: "error" \| "success" \| "info"`, `children` | Login, ChangePassword, CreateTicket, UserManagement |
| `Spinner` | `components/Spinner.tsx` | `className?` | Button (loading), ListState, App, CreateTicket, StaffTicketQueue, UserManagement |
| `ListState` | `components/ListState.tsx` | `testId`, `variant: "default" \| "error"`, `loading?`, `icon?`, `message?`, `children?` | MyTickets, TicketDetail, StaffTicketDetail |
| `ConfirmDialog` | `components/ConfirmDialog.tsx` | `open`, `title`, `children`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `loading?`, `testId?`, `onConfirm`, `onCancel` | UserManagement |
| `Drawer` | `components/Drawer.tsx` | `open`, `title`, `onClose`, `children`, `suspended?`, `testId?` | UserManagement |
| `Toggle` | `components/Toggle.tsx` | `id`, `label`, `checked`, `onChange`, `disabled?`, `testId?` | UserManagement |
| `PasswordChecklist` | `components/PasswordChecklist.tsx` | `password` (+ helpers `checkPasswordRules` / `allPasswordRulesMet`) | ChangePassword |
| `PaginationBar` | `components/PaginationBar.tsx` | `page`, `pageSize`, `total`, `totalPages`, `onPageChange`, `onPageSizeChange` | MyTickets, StaffTicketQueue |
| `TicketTable` | `components/TicketTable.tsx` | `tickets`, `sort: {sortBy, sortOrder}`, `onSort`, `onRowClick`, `variant: "requester" \| "staff"` | MyTickets, StaffTicketQueue, TicketCard |
| `TicketCard` | `components/TicketCard.tsx` | `ticket`, `onClick`, `variant?: "requester" \| "staff"` | MyTickets (mobile), StaffTicketQueue (mobile) |
| `MobileSortSelect` | `components/MobileSortSelect.tsx` | `sortBy`, `sortOrder`, `options`, `onChange`, `fieldId?` | MyTickets, StaffTicketQueue |
| `Navbar` | `components/Navbar.tsx` | (none — reads `useAuth` + router) | AppShell |
| `AttachmentSection` | `components/AttachmentSection.tsx` | `ticketId`, `attachments`, `onUpdate` | TicketDetail, StaffTicketDetail |

## App shell (not under `components/`)

| Component | Path | Notes |
|---|---|---|
| `AppShell` | `src/AppShell.tsx` | Layout + role-aware nav (`<Navbar />`) + `<Outlet />` |

## Inline (single-screen, kept in the owning screen instead of extracted)

- `.staged-chip` — staged-attachment chip inside `AttachmentSection`
- Public Comments / Internal Notes / Attachments tabs — inside `StaffTicketDetail`, `TicketDetail`
- Comment timeline (`.comment-timeline`) — inside `StaffTicketDetail`, `TicketDetail`

> `EmptyState`, `FileChip`, `Tabs`, and `CommentTimeline` from the earlier inventory are implemented inline (not extracted); `ListState` supersedes `EmptyState` as the shared empty / no-results / error block.