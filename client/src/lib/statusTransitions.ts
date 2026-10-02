import type { TicketStatus } from "../api.js";

// Mirror of server/src/lib/statusTransitions.ts (specification.md BR-12). The
// two packages cannot share code, so both are kept in sync manually; the
// SERVER remains the enforcer — this copy only powers the "Current Status"
// dropdown options (ui-spec 5.5) so the UI never offers an illegal transition.

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

export function statusLabel(status: TicketStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "IN PROGRESS";
    case "WAITING_FOR_REQUESTER":
      return "WAITING FOR REQUESTER";
    default:
      return status;
  }
}