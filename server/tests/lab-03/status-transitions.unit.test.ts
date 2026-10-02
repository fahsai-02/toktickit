import { describe, it, expect } from "vitest";
import {
  TICKET_STATUSES,
  canTransition,
  transitionsFrom,
  requiresConfirmation,
  isTicketStatus,
  transitionViolationMessage,
} from "../../src/lib/statusTransitions.js";

// UNIT-03 — Ticket status transition matrix (docs/lab-03/specification.md
// BR-12, api-spec 5.6). Pure functions, no DB, no HTTP.

const STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

// BR-12 permitted transitions (specification.md lines 140-151).
const PERMITTED: Record<string, string[]> = {
  NEW: ["OPEN"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "REOPENED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  CANCELLED: [],
};

describe("UNIT-03 — status transition matrix (BR-12)", () => {
  it("covers exactly the 8 Lab 3 statuses", () => {
    expect(TICKET_STATUSES).toEqual(STATUSES);
  });

  it("permits every BR-12 from→to row", () => {
    for (const [from, tos] of Object.entries(PERMITTED)) {
      for (const to of tos) {
        expect(canTransition(from as (typeof STATUSES)[number], to as (typeof STATUSES)[number]))
          .toBe(true);
      }
    }
  });

  it("rejects every non-listed transition in both directions", () => {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const expected = PERMITTED[from]?.includes(to) ?? false;
        if (from === to) {
          expect(canTransition(from as never, to as never)).toBe(false);
        } else {
          expect(canTransition(from as never, to as never)).toBe(expected);
        }
      }
    }
  });

  it("transitionsFrom returns exactly the permitted next states", () => {
    for (const [from, tos] of Object.entries(PERMITTED)) {
      expect(transitionsFrom(from as (typeof STATUSES)[number])).toEqual(tos);
    }
  });

  it("CANCELLED is terminal", () => {
    for (const to of STATUSES) {
      expect(canTransition("CANCELLED", to as never)).toBe(false);
    }
    expect(transitionsFrom("CANCELLED")).toEqual([]);
  });

  it("isTicketStatus validates enum membership", () => {
    for (const s of STATUSES) {
      expect(isTicketStatus(s)).toBe(true);
    }
    expect(isTicketStatus("NOT_A_STATUS")).toBe(false);
    expect(isTicketStatus("")).toBe(false);
  });
});

describe("UNIT-03 — confirmation flags (BR-12)", () => {
  it("requires confirmation only for OPEN→CANCELLED and IN_PROGRESS→RESOLVED", () => {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const expected =
          (from === "OPEN" && to === "CANCELLED") ||
          (from === "IN_PROGRESS" && to === "RESOLVED");
        expect(requiresConfirmation(from as never, to as never)).toBe(expected);
      }
    }
  });
});

describe("UNIT-03 — violation message (api-spec 5.6)", () => {
  it("lists the permitted targets for the offending from status", () => {
    const msg = transitionViolationMessage("OPEN", "RESOLVED");
    expect(msg).toBe(
      "Cannot transition from OPEN to RESOLVED. Permitted transitions: IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED."
    );
  });

  it("reports a terminal status clearly", () => {
    expect(transitionViolationMessage("CANCELLED", "OPEN")).toMatch(/terminal/);
  });
});