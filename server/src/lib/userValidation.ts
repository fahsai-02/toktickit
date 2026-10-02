// User-field validation shared by the Administrator user management endpoints
// (Issue 21). Contract: `docs/lab-03/api-spec.md` section 6, `docs/lab-03/
// specification.md` FR-40..FR-48, BR-07 (lowercase normalization), BR-08.
//
// Messages below match api-spec section 6 exactly so tests can assert them.

import type { UserRole } from "../generated/prisma/client.js";

export const NAME_MAX_LENGTH = 100;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VALID_ROLES: readonly UserRole[] = [
  "REQUESTER",
  "IT_STAFF",
  "ADMINISTRATOR",
];

/** Normalizes an email to lowercase (BR-07); callers must trim first. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns an error message, or null when the raw value is a valid name (1..100 chars after trim). */
export function nameError(raw: unknown): string | null {
  if (raw === undefined) return "Full name is required.";
  if (typeof raw !== "string") return "Full name is required.";
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "Full name is required.";
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Full name must be at most ${NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

/** Returns an error message, or null when the raw value is a valid email address. */
export function emailError(raw: unknown): string | null {
  if (raw === undefined) return "A valid email address is required.";
  if (typeof raw !== "string") return "A valid email address is required.";
  if (!EMAIL_RE.test(raw.trim())) return "A valid email address is required.";
  return null;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}