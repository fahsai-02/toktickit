import { describe, it, expect } from "vitest";
import {
  formatTicketNumber,
  extractTicketNumberSequence,
  buildNextTicketNumber,
} from "../../src/lib/ticketNumber.js";

describe("formatTicketNumber", () => {
  it("formats TKT-YYYY-XXXXXX with zero-padded sequence", () => {
    expect(formatTicketNumber(2026, 1)).toBe("TKT-2026-000001");
    expect(formatTicketNumber(2026, 12)).toBe("TKT-2026-000012");
    expect(formatTicketNumber(2026, 123456)).toBe("TKT-2026-123456");
  });

  it("zero-pads the year to four digits", () => {
    expect(formatTicketNumber(26, 1)).toBe("TKT-0026-000001");
  });

  it("rejects non-integer or negative inputs", () => {
    expect(() => formatTicketNumber(2026.5, 1)).toThrow();
    expect(() => formatTicketNumber(2026, -1)).toThrow();
    expect(() => formatTicketNumber(2026, 1.5)).toThrow();
  });
});

describe("extractTicketNumberSequence", () => {
  it("extracts the numeric sequence for a matching year", () => {
    expect(extractTicketNumberSequence("TKT-2026-000012", 2026)).toBe(12);
    expect(extractTicketNumberSequence("TKT-2026-000001", 2026)).toBe(1);
  });

  it("returns null for a different year", () => {
    expect(extractTicketNumberSequence("TKT-2025-000012", 2026)).toBeNull();
  });

  it("returns null for a malformed ticket number", () => {
    expect(extractTicketNumberSequence("TKT-2026", 2026)).toBeNull();
    expect(extractTicketNumberSequence("tkt-2026-000012", 2026)).toBeNull();
    expect(extractTicketNumberSequence("TKT-2026-0012", 2026)).toBeNull();
  });
});

describe("buildNextTicketNumber", () => {
  it("starts at 000001 when the year has no tickets", () => {
    expect(buildNextTicketNumber([], 2026)).toBe("TKT-2026-000001");
  });

  it("increments past the highest existing sequence for the year", () => {
    const existing = [
      "TKT-2026-000001",
      "TKT-2026-000005",
      "TKT-2026-000003",
    ];
    expect(buildNextTicketNumber(existing, 2026)).toBe("TKT-2026-000006");
  });

  it("ignores ticket numbers from other years", () => {
    const existing = [
      "TKT-2025-000100",
      "TKT-2026-000002",
      "TKT-1999-000999",
    ];
    expect(buildNextTicketNumber(existing, 2026)).toBe("TKT-2026-000003");
  });

  it("ignores malformed entries and returns a unique number", () => {
    const existing = ["TKT-2026", "garbage", "TKT-2026-000004"];
    expect(buildNextTicketNumber(existing, 2026)).toBe("TKT-2026-000005");
  });
});
