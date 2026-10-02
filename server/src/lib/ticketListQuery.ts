import { db } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";

// Shared ticketing list query (api-spec sections 4.4 and 5.1). Both the
// requester "My Tickets" list and the IT Staff "My Queue" build their own
// validated `where`/`orderBy`/`select`, then hand the frag pieces to
// `runTicketListQuery` so the response envelope stays byte-for-byte identical
// (same `meta` keys: total, page, pageSize, totalPages) and pagination/search/
// sort behavior never drifts between the two screens.

export interface TicketListQueryInput {
  where: Prisma.TicketWhereInput;
  orderBy: Prisma.TicketOrderByWithRelationInput[];
  select: Prisma.TicketSelect;
  page: number;
  pageSize: number;
}

export interface TicketListQueryResult {
  data: unknown[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function runTicketListQuery({
  where,
  orderBy,
  select,
  page,
  pageSize,
}: TicketListQueryInput): Promise<TicketListQueryResult> {
  const [total, tickets] = await Promise.all([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: select as Prisma.TicketSelect,
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  return {
    data: tickets as unknown[],
    meta: { total, page, pageSize, totalPages },
  };
}

/** Sort whitelist for the IT Staff queue (api-spec 5.1). */
export const STAFF_SORT_WHITELIST = [
  "updatedAt",
  "createdAt",
  "itPriority",
  "currentStatus",
  "ticketNumber",
] as const;
