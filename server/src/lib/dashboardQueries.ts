import type { Prisma, TicketStatus } from '../generated/prisma/client.js';

/**
 * Status groups used for dashboard metric drill-downs (api-spec section 4.1).
 * - open: 5 active statuses (NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED)
 * - attention: statuses requiring requester or staff follow-up (WAITING_FOR_REQUESTER, REOPENED)
 * - closed: terminal resolved/closed statuses (RESOLVED, CLOSED)
 */
export const STATUS_GROUPS = {
  open: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'],
  attention: ['WAITING_FOR_REQUESTER', 'REOPENED'],
  closed: ['RESOLVED', 'CLOSED'],
} as const satisfies Record<string, readonly TicketStatus[]>;

export type StatusGroup = keyof typeof STATUS_GROUPS;

export function isStatusGroup(value: unknown): value is StatusGroup {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATUS_GROUPS, value);
}

/** BR-25: Terminal statuses excluded from urgent classification */
export const URGENT_TERMINAL_STATUSES = ['RESOLVED', 'CLOSED', 'CANCELLED'] as const;

/** Canonical bucket order for byItPriority (api-spec section 3.2) */
export const BY_IT_PRIORITY_BUCKETS = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', null] as const;

/**
 * Pure predicate for urgent ticket classification (UNIT-03, BR-25).
 * Precedence rule:
 * 1. Terminal statuses (RESOLVED, CLOSED, CANCELLED) are NEVER urgent.
 * 2. If itPriority is set (non-null), urgency is determined SOLELY by itPriority === 'URGENT'.
 * 3. If itPriority is null, urgency falls back to requestedPriority === 'URGENT'.
 */
export function isUrgentTicket(t: {
  itPriority: string | null;
  requestedPriority: string;
  currentStatus: string;
}): boolean {
  if (URGENT_TERMINAL_STATUSES.includes(t.currentStatus as (typeof URGENT_TERMINAL_STATUSES)[number])) {
    return false;
  }
  if (t.itPriority !== null) {
    return t.itPriority === 'URGENT';
  }
  return t.requestedPriority === 'URGENT';
}

/**
 * Prisma where filter matching isUrgentTicket predicate (BR-25).
 * Kept identical to the pure predicate to ensure single-source-of-truth.
 */
export function urgentTicketWhere(): Prisma.TicketWhereInput {
  return {
    AND: [
      {
        OR: [
          { itPriority: 'URGENT' },
          { itPriority: null, requestedPriority: 'URGENT' },
        ],
      },
      { currentStatus: { notIn: [...URGENT_TERMINAL_STATUSES] } },
    ],
  };
}

