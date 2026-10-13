export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Action Taken timestamps render in the service desk's local zone, not the
 * viewer's (FR-08, BR-18, ui-spec 5.3). `formatDate` above intentionally keeps
 * the browser default for Lab 2/3 screens; this one is fixed to Asia/Bangkok
 * (UTC+7) for the Lab 4 Action Taken views.
 */
const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export function formatActionDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const wallClock = date.toLocaleString("en-GB", {
    timeZone: BANGKOK_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${wallClock} (Asia/Bangkok)`;
}

/**
 * Optional relative hint shown beside the absolute date "when the gap is
 * large" (ui-spec 5.3). Returns null for recent or future timestamps so the
 * table never reads "0 days ago". The gap counts calendar days in the service
 * desk's own zone (Asia/Bangkok), not raw milliseconds, so a timestamp just
 * before midnight in Bangkok is "yesterday", not "today".
 */
function bangkokCalendarDay(date: Date): number {
  const key = date.toLocaleDateString("en-CA", { timeZone: BANGKOK_TIME_ZONE });
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
}

export function relativeDayHint(
  iso: string,
  now: Date = new Date()
): string | null {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const days = bangkokCalendarDay(now) - bangkokCalendarDay(then);
  if (days >= 2) return `${days} days ago`;
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
