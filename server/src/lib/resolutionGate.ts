// Resolution gate (docs/lab-04/specification.md BR-11, AD-01; api-spec.md 5.1).
// A Ticket may enter RESOLVED or CLOSED only when its resolutionSummary is
// non-blank AND it has at least one recorded Action Taken.
//
// Kept as a pure function (no Prisma, no HTTP) so UNIT-01/UNIT-02 can test the
// rule directly and the status route only has to count the rows.

export const GATE_NO_SUMMARY =
  "Cannot resolve this ticket without a resolution summary. Save a resolution summary first.";
export const GATE_NO_ACTIONS =
  "Cannot resolve this ticket without at least one recorded Action Taken.";
export const GATE_NEITHER =
  "Cannot resolve this ticket without a resolution summary and at least one recorded Action Taken.";

/**
 * Returns the safe `BUSINESS_RULE_VIOLATION` message when the gate is unmet,
 * or `null` when the transition may proceed. A whitespace-only summary counts
 * as blank (BR-11, api-spec 5.1).
 */
export function resolutionGateViolation(input: {
  resolutionSummary: string | null | undefined;
  actionCount: number;
}): string | null {
  const hasSummary =
    typeof input.resolutionSummary === "string" &&
    input.resolutionSummary.trim().length > 0;
  const hasAction = input.actionCount > 0;

  if (hasSummary && hasAction) return null;
  if (!hasSummary && !hasAction) return GATE_NEITHER;
  if (!hasSummary) return GATE_NO_SUMMARY;
  return GATE_NO_ACTIONS;
}
