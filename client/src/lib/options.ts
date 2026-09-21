/**
 * Shared option lists used by every ticket list / filter screen so the
 * status and priority values never drift between pages.
 * Single source of truth for the 8 TicketStatus values (specification.md
 * "Required Ticket Statuses") and the 4 RequestedPriority / IT Priority values.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export const TICKET_STATUSES: SelectOption[] = [
  { value: "NEW", label: "NEW" },
  { value: "OPEN", label: "OPEN" },
  { value: "IN_PROGRESS", label: "IN PROGRESS" },
  { value: "WAITING_FOR_REQUESTER", label: "WAITING FOR REQUESTER" },
  { value: "RESOLVED", label: "RESOLVED" },
  { value: "CLOSED", label: "CLOSED" },
  { value: "REOPENED", label: "REOPENED" },
  { value: "CANCELLED", label: "CANCELLED" },
];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const PRIORITY_OPTIONS: SelectOption[] = PRIORITIES.map((p) => ({
  value: p,
  label: p,
}));