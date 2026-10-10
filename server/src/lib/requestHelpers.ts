import { db } from "../db.js";

// Shared request/identity helpers used by both app.ts and the Lab 4
// actionsTaken router (extracted so the two copies cannot drift). The
// session-derived identity rule they implement is api-spec section 1
// "Identity transport" (BR-03).

/** Parse a positive integer coming from a URL param or a JSON body field.
 *  Accepts a numeric string or a number; rejects 0, negatives, fractions,
 *  and anything else. */
export function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  return null;
}

/** Effective owning User.id for a ticket. Backfills the legacy link by email
 *  when `requesterUserId` is still NULL (rows created pre-Issue 18). */
export async function ownerUserIdFor(ticket: {
  requesterUserId: number | null;
  requesterId: number;
}): Promise<number | null> {
  if (ticket.requesterUserId !== null) return ticket.requesterUserId;
  const requester = await db.requester.findUnique({
    where: { id: ticket.requesterId },
    select: { email: true },
  });
  if (!requester) return null;
  const user = await db.user.findUnique({
    where: { email: requester.email },
    select: { id: true },
  });
  return user?.id ?? null;
}
