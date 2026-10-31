import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "../../src/lib/format.js";

// Lab 4 — dashboard relative time (docs/lab-04/tests.md UI-34; ui-spec
// section 5.1 "relative time in Asia/Bangkok", specification.md FR-19).
// Every case passes `now` explicitly, so nothing depends on the real clock or
// the machine's time zone. Bangkok is UTC+7.

describe("formatRelativeTime (UI-34)", () => {
  const now = new Date("2026-10-03T03:00:00.000Z"); // 10:00 on 3 Oct, Bangkok

  it("minutes and hours are elapsed time", () => {
    expect(formatRelativeTime("2026-10-03T02:59:30.000Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-10-03T02:58:00.000Z", now)).toBe("2 minutes ago");
    expect(formatRelativeTime("2026-10-03T01:00:00.000Z", now)).toBe("2 hours ago");
  });

  it("a future timestamp reads 'just now', never a negative gap", () => {
    expect(formatRelativeTime("2026-10-03T05:00:00.000Z", now)).toBe("just now");
  });

  it("24 hours apart is 1 day", () => {
    expect(formatRelativeTime("2026-10-02T03:00:00.000Z", now)).toBe("1 day ago");
  });

  // 23:00 on 1 Oct Bangkok seen at 01:00 on 3 Oct Bangkok: 26 hours elapsed,
  // but two calendar days in the service desk's zone.
  it("days count Asia/Bangkok calendar days, not 24-hour spans", () => {
    const updated = "2026-10-01T16:00:00.000Z";
    const lateNight = new Date("2026-10-02T18:00:00.000Z");
    expect(formatRelativeTime(updated, lateNight)).toBe("2 days ago");
  });

  it("a larger gap counts whole Bangkok days", () => {
    expect(formatRelativeTime("2026-09-28T03:00:00.000Z", now)).toBe("5 days ago");
  });

  it("an unparsable timestamp renders nothing", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("");
  });
});
