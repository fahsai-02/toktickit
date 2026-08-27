# Component Inventory

Reusable components ที่สร้างแล้ว นำกลับมาใช้ได้ทันที

## Created

| Component | Path | Props | Used in |
|---|---|---|---|
| `Button` | `components/Button.tsx` | `variant: "primary" \| "secondary" \| "ghost"`, `disabled`, `loading`, `children` | RequesterSelection, AppShell |
| `SelectField` | `components/SelectField.tsx` | `label`, `required`, `options: {value, label}[]`, `placeholder`, `id`, plus native select attrs | RequesterSelection |
| `Spinner` | `components/Spinner.tsx` | `className?` | RequesterSelection, Button (loading state) |
| `Navbar` | `components/Navbar.tsx` | `page: Page`, `onNavigate: (p) => void` | AppShell |
| `NavLink` | `components/NavLink.tsx` | `page: Page`, `active: boolean`, `onNavigate`, `onCloseMobile` | Navbar |

## Planned (รอ Issue 8+)

| Component | สำหรับ Issue |
|---|---|
| `TextField` | 8 (Create Ticket) |
| `TextArea` | 8 (Create Ticket) |
| `ReadOnlyField` | 8 (Create Ticket) |
| `Badge` | 9 (My Tickets) |
| `Callout` | 8 (error/success) |
| `EmptyState` | 9 (My Tickets) |
| `FileChip` | 11 (Attachments) |
| `ConfirmDialog` | 11 (Attachments) |
| `PaginationBar` | 9 (My Tickets) |
| `TicketTable` | 9 (My Tickets) |
| `TicketCard` | 9 (My Tickets mobile) |
