// UNIT-02 — docs/lab-03/specification.md FR-07, AC-02; tests.md UNIT-02.
// Direct unit tests for validateNewPassword() in src/lib/passwordValidation.ts.
// No DB required — pure in-memory function.

import { describe, it, expect } from "vitest";
import { validateNewPassword } from "../../src/lib/passwordValidation.js";

describe("UNIT-02 — validateNewPassword (FR-07, AC-02)", () => {
  it("accepts a password that satisfies all rules", () => {
    expect(validateNewPassword("Abcdef1!")).toEqual({ valid: true });
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = validateNewPassword("Ab1!xxxx".slice(0, 7));
    expect(result).toEqual({
      valid: false,
      fieldMessage: "Password must be at least 8 characters.",
    });
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(validateNewPassword("abcdef1!")).toEqual({
      valid: false,
      fieldMessage: "Password must include at least one uppercase letter.",
    });
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(validateNewPassword("ABCDEF1!")).toEqual({
      valid: false,
      fieldMessage: "Password must include at least one lowercase letter.",
    });
  });

  it("rejects a password missing a digit", () => {
    expect(validateNewPassword("Abcdefg!")).toEqual({
      valid: false,
      fieldMessage: "Password must include at least one digit.",
    });
  });

  it("rejects a password missing a special character", () => {
    expect(validateNewPassword("Abcdefg1")).toEqual({
      valid: false,
      fieldMessage: "Password must include at least one special character.",
    });
  });

  it("reports the first failing rule, not all", () => {
    // Too short AND missing uppercase — length rule fires first.
    const result = validateNewPassword("abc1!");
    expect(result.valid).toBe(false);
    expect(result).toEqual({
      valid: false,
      fieldMessage: "Password must be at least 8 characters.",
    });
  });
});
