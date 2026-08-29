# Component Inventory

Reusable components ที่สร้างแล้ว นำกลับมาใช้ได้ทันที

## Created

| Component | Path | Props | Used in |
|---|---|---|---|
| `Button` | `components/Button.tsx` | `variant: "primary" \| "secondary" \| "ghost"`, `disabled`, `loading`, `children` | RequesterSelection, AppShell |
| `SelectField` | `components/SelectField.tsx` | `label`, `required`, `options: {value, label}[]`, `placeholder`, `id`, plus native select attrs | RequesterSelection |
| `Spinner` | `components/Spinner.tsx` | `className?` | RequesterSelection, Button (loading state) |
| `Navbar` | `components/Navbar.tsx` | `page: Page`, `onNavigate: (p) => void` | AppShell |
| `TextField` | `components/TextField.tsx` | `label`, `required`, `error`, `counter {value,max}`, `id`, plus native input attrs | Create Ticket |
| `TextArea` | `components/TextArea.tsx` | `label`, `required`, `error`, `counter {value,max}`, `id`, plus native textarea attrs | Create Ticket |
| `ReadOnlyField` | `components/ReadOnlyField.tsx` | `id`, `label`, `value` | Create Ticket |
| `Callout` | `components/Callout.tsx` | `variant: "error" \| "success" \| "info"`, `children` | Create Ticket |

## Planned (รอ Issue 8+)

| Component | สำหรับ Issue |
|---|---|
| `Badge` | 9 (My Tickets) |
| `EmptyState` | 9 (My Tickets) |
| `FileChip` | 11 (Attachments) |
| `ConfirmDialog` | 11 (Attachments) |
| `PaginationBar` | 9 (My Tickets) |
| `TicketTable` | 9 (My Tickets) |
| `TicketCard` | 9 (My Tickets mobile) |
