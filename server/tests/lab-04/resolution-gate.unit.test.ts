import { describe, it, expect } from "vitest";
import {
  resolutionGateViolation,
  GATE_NO_SUMMARY,
  GATE_NO_ACTIONS,
  GATE_NEITHER,
} from "../../src/lib/resolutionGate.js";

// UNIT-01 / UNIT-02 — Resolution gate predicate
// (docs/lab-04/specification.md BR-11, BR-13; api-spec 5.1). Pure function:
// no DB, no HTTP. The exact messages are the api-spec 5.1 strings the status
// endpoint relays verbatim.

describe("UNIT-01 — resolution gate predicate (BR-11, AC-07)", () => {
  it("passes only with a non-blank summary AND at least one action", () => {
    expect(
      resolutionGateViolation({
        resolutionSummary: "Replaced the battery.",
        actionCount: 1,
      })
    ).toBeNull();
    expect(
      resolutionGateViolation({
        resolutionSummary: "Replaced the battery.",
        actionCount: 5,
      })
    ).toBeNull();
  });

  it("reports both conditions missing when neither is present", () => {
    expect(
      resolutionGateViolation({ resolutionSummary: null, actionCount: 0 })
    ).toBe(GATE_NEITHER);
  });

  it("reports the summary condition when only the summary is missing", () => {
    expect(
      resolutionGateViolation({ resolutionSummary: null, actionCount: 3 })
    ).toBe(GATE_NO_SUMMARY);
    expect(
      resolutionGateViolation({
        resolutionSummary: undefined,
        actionCount: 1,
      })
    ).toBe(GATE_NO_SUMMARY);
  });

  it("reports the action condition when only actions are missing", () => {
    expect(
      resolutionGateViolation({
        resolutionSummary: "Replaced the battery.",
        actionCount: 0,
      })
    ).toBe(GATE_NO_ACTIONS);
  });

  it("treats a whitespace-only summary as blank (BR-11)", () => {
    for (const blank of ["", "   ", "\t", "\n", "  \t \n "]) {
      expect(
        resolutionGateViolation({ resolutionSummary: blank, actionCount: 2 })
      ).toBe(GATE_NO_SUMMARY);
    }
  });

  it("uses the exact api-spec 5.1 wording", () => {
    expect(GATE_NO_SUMMARY).toBe(
      "Cannot resolve this ticket without a resolution summary. Save a resolution summary first."
    );
    expect(GATE_NO_ACTIONS).toBe(
      "Cannot resolve this ticket without at least one recorded Action Taken."
    );
    expect(GATE_NEITHER).toBe(
      "Cannot resolve this ticket without a resolution summary and at least one recorded Action Taken."
    );
  });
});

describe("UNIT-02 — the requester indication is advisory (BR-11, BR-13, AC-09)", () => {
  it("does not satisfy the gate: the flag is not an input to the predicate", () => {
    // Build the object with the flag present. The predicate deliberately takes
    // only `resolutionSummary` + `actionCount`, so BR-13's advisory flag can
    // never let a Ticket through the gate (AC-09). The extra property is here
    // to prove passing it changes nothing.
    const advisoryOnly = {
      resolutionSummary: null,
      actionCount: 0,
      requesterIndicatedResolved: true,
    };
    expect(resolutionGateViolation(advisoryOnly)).toBe(GATE_NEITHER);

    const advisoryWithSummary = {
      resolutionSummary: "Looks fixed on my side.",
      actionCount: 0,
      requesterIndicatedResolved: true,
    };
    expect(resolutionGateViolation(advisoryWithSummary)).toBe(GATE_NO_ACTIONS);
  });
});
