import type { TicketStatus } from "../generated/prisma/client.js";

// Ticket status transition matrix (specification.md BR-12). Single source of
// truth for the permitted from→to transitions, used by BOTH the staff status
// endpoint (api-spec 5.6) and the client status dropdown (ui-spec 5.5), so the
// backend rules and the UI options can never drift apart.

export const TICKET_STATUSES: readonly TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

const TRANSITION_MAP: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "REOPENED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  CANCELLED: [],
};

// BR-12 "Confirmation: Yes" transitions — the client must ask before applying.
const CONFIRMATION_REQUIRED: ReadonlyArray<readonly [TicketStatus, TicketStatus]> = [
  ["OPEN", "CANCELLED"],
  ["IN_PROGRESS", "RESOLVED"],
];

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITION_MAP[from]?.includes(to) ?? false;
}

export function transitionsFrom(status: TicketStatus): readonly TicketStatus[] {
  return TRANSITION_MAP[status] ?? [];
}

export function requiresConfirmation(from: TicketStatus, to: TicketStatus): boolean {
  return CONFIRMATION_REQUIRED.some(([f, t]) => f === from && t === to);
}

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function transitionViolationMessage(
  from: TicketStatus,
  to: TicketStatus
): string {
  const permitted = TRANSITION_MAP[from] ?? [];
  const suffix = permitted.length
    ? `Permitted transitions: ${permitted.join(", ")}.`
    : "This status is terminal; no further transitions are permitted.";
  return `Cannot transition from ${from} to ${to}. ${suffix}`;
}