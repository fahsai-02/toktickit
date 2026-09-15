// Single source of truth for local-dev seed credentials.
// Shared by prisma/seed.ts and the MIG-01 regression tests so a password
// change only needs to happen in one place. See docs/lab-03/seed-credentials.md.

export const BCRYPT_ROUNDS = 12;

export const REQUESTER_PASSWORD = "TempPass123!";
export const STAFF_PASSWORD = "StaffPass1!";
export const ADMIN_PASSWORD = "AdminPass1!";

export const ROLE_TO_PASSWORD: Record<string, string> = {
  REQUESTER: REQUESTER_PASSWORD,
  IT_STAFF: STAFF_PASSWORD,
  ADMINISTRATOR: ADMIN_PASSWORD,
};