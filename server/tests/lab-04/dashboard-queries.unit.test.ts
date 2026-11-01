import { describe, it, expect } from "vitest";
import {
  isUrgentTicket,
  isStatusGroup,
  STATUS_GROUPS,
  BY_IT_PRIORITY_BUCKETS,
  URGENT_TERMINAL_STATUSES,
  urgentTicketWhere,
} from "../../src/lib/dashboardQueries.js";

describe("UNIT-03 — Dashboard queries & urgent predicate (specification.md section 4 BR-25, tests.md UNIT-03)", () => {
  it("treats ticket as urgent when itPriority is URGENT and status is active", () => {
    expect(
      isUrgentTicket({
        itPriority: "URGENT",
        requestedPriority: "LOW",
        currentStatus: "OPEN",
      })
    ).toBe(true);
  });

  it("falls back to requestedPriority when itPriority is null", () => {
    expect(
      isUrgentTicket({
        itPriority: null,
        requestedPriority: "URGENT",
        currentStatus: "NEW",
      })
    ).toBe(true);

    expect(
      isUrgentTicket({
        itPriority: null,
        requestedPriority: "HIGH",
        currentStatus: "NEW",
      })
    ).toBe(false);
  });

  it("prioritizes itPriority over requestedPriority (precedence, not union)", () => {
    // Staff reprioritized down to HIGH even though requester requested URGENT
    expect(
      isUrgentTicket({
        itPriority: "HIGH",
        requestedPriority: "URGENT",
        currentStatus: "OPEN",
      })
    ).toBe(false);

    // Staff reprioritized down to LOW
    expect(
      isUrgentTicket({
        itPriority: "LOW",
        requestedPriority: "URGENT",
        currentStatus: "IN_PROGRESS",
      })
    ).toBe(false);
  });

  it("never treats terminal status tickets as urgent even if priority is URGENT", () => {
    for (const terminalStatus of URGENT_TERMINAL_STATUSES) {
      expect(
        isUrgentTicket({
          itPriority: "URGENT",
          requestedPriority: "URGENT",
          currentStatus: terminalStatus,
        })
      ).toBe(false);

      expect(
        isUrgentTicket({
          itPriority: null,
          requestedPriority: "URGENT",
          currentStatus: terminalStatus,
        })
      ).toBe(false);
    }
  });

  it("maintains the canonical byItPriority bucket order", () => {
    expect(BY_IT_PRIORITY_BUCKETS).toEqual([
      "URGENT",
      "HIGH",
      "MEDIUM",
      "LOW",
      null,
    ]);
  });

  it("recognizes valid and invalid statusGroup values", () => {
    expect(isStatusGroup("open")).toBe(true);
    expect(isStatusGroup("attention")).toBe(true);
    expect(isStatusGroup("closed")).toBe(true);

    expect(isStatusGroup("")).toBe(false);
    expect(isStatusGroup("OPEN")).toBe(false);
    expect(isStatusGroup("all")).toBe(false);
    expect(isStatusGroup(null)).toBe(false);
    expect(isStatusGroup(undefined)).toBe(false);
    expect(isStatusGroup(123)).toBe(false);
  });

  it("expands status groups to the exact specification statuses", () => {
    expect(STATUS_GROUPS.open).toEqual([
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "REOPENED",
    ]);
    expect(STATUS_GROUPS.attention).toEqual([
      "WAITING_FOR_REQUESTER",
      "REOPENED",
    ]);
    expect(STATUS_GROUPS.closed).toEqual(["RESOLVED", "CLOSED"]);
  });

  it("builds a Prisma where condition matching the predicate structure", () => {
    const where = urgentTicketWhere();
    expect(where).toMatchObject({
      AND: [
        {
          OR: [
            { itPriority: "URGENT" },
            { itPriority: null, requestedPriority: "URGENT" },
          ],
        },
        {
          currentStatus: {
            notIn: ["RESOLVED", "CLOSED", "CANCELLED"],
          },
        },
      ],
    });
  });
});

