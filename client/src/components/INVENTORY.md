# Component Inventory

Reusable components ที่สร้างแล้ว นำกลับมาใช้ได้ทันที

## Created

| Component | Path | Props | Used in |
|---|---|---|---|
| `Button` | `components/Button.tsx` | `variant: "primary" \| "secondary" \| "ghost"`, `disabled`, `loading`, `children` | RequesterSelection, AppShell, Create Ticket, MyTickets |
| `SelectField` | `components/SelectField.tsx` | `label`, `required`, `options: {value, label}[]`, `placeholder`, `error?: string`, `id`, plus native select attrs | RequesterSelection, Create Ticket |
| `Spinner` | `components/Spinner.tsx` | `className?` | RequesterSelection, Button (loading state), MyTickets |
| `Navbar` | `components/Navbar.tsx` | `page: Page`, `onNavigate: (p) => void` | AppShell |
| `TextField` | `components/TextField.tsx` | `label`, `required`, `error`, `counter {value,max}`, `id`, plus native input attrs | Create Ticket |
| `TextArea` | `components/TextArea.tsx` | `label`, `required`, `error`, `counter {value,max}`, `id`, plus native textarea attrs | Create Ticket |
| `ReadOnlyField` | `components/ReadOnlyField.tsx` | `id`, `label`, `value` | Create Ticket |
| `Callout` | `components/Callout.tsx` | `variant: "error" \| "success" \| "info"`, `children` | Create Ticket |
| `Badge` | `components/Badge.tsx` | `variant: "status-new" \| "priority-low" \| "priority-medium" \| "priority-high" \| "priority-urgent" \| "it-priority" \| "neutral"`, `children` | MyTickets |
| `TicketTable` | `components/TicketTable.tsx` | `tickets`, `sort: {sortBy, sortOrder}`, `onSort`, `onRowClick` | MyTickets (desktop ≥992px) |
| `TicketCard` | `components/TicketCard.tsx` | `ticket`, `onClick` | MyTickets (mobile <768px) |
| `PaginationBar` | `components/PaginationBar.tsx` | `page`, `pageSize`, `total`, `totalPages`, `onPageChange`, `onPageSizeChange` | MyTickets |

## Planned (รอ Issue 11+)

| Component | สำหรับ Issue |
|---|---|
| `EmptyState` | 9 (built into MyTickets inline) |
| `FileChip` | 11 (Attachments) |
| `ConfirmDialog` | 11 (Attachments) |
