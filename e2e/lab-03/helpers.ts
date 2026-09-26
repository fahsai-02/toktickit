import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SEED_USERS } from "../../server/src/lib/seedData.js";

const serverDir = fileURLToPath(new URL("../../server/", import.meta.url));

/**
 * Return the shared dev DB to the documented seed state: drop E2E residue
 * first (the seed only upserts known rows, so e2e-created users, Public
 * Comments and Internal Notes would otherwise accumulate and break the
 * exact-count server suites such as API-68), then re-seed — which also
 * restores any seed password an earlier E2E run rotated, keeping the MIG-01
 * credential checks green.
 */
export function resetLab3Db() {
  execFileSync("pnpm", ["exec", "tsx", "prisma/cleanup-e2e.ts"], {
    cwd: serverDir,
    stdio: "pipe",
    timeout: 120_000,
  });
  execFileSync("pnpm", ["exec", "prisma", "db", "seed"], {
    cwd: serverDir,
    stdio: "pipe",
    timeout: 120_000,
  });
}

/**
 * Register the shared-DB lifecycle for a spec file: re-seed before it runs and
 * restore the documented seed state after it, including when a test FAILS.
 *
 * Hooks, not an in-test tail: a failed assertion aborts the test body, so an
 * in-test cleanup would never run and would leave rotated seed passwords and
 * `e2e.*` rows behind for the next run.
 *
 * Desktop project only. The functional lab-03 specs `test.skip` themselves on
 * the tablet/mobile projects, and re-seeding for a test that never executes is
 * pure cost — each hook hashes 11 accounts with bcrypt at cost 12.
 */
export function useLab3DbHooks() {
  // Typed off `test.beforeAll` itself so the signature (and Playwright's
  // "first argument must destructure" rule) stays in sync with the installed
  // version. `beforeAll` is overloaded — (hookFn) and (title, hookFn) — so the
  // hook parameter is index 1. `TestInfo` is the hook's second argument.
  type DbHook = Parameters<typeof test.beforeAll>[1];
  const hook: DbHook = ({}, testInfo: TestInfo) => {
    if (testInfo.project.name !== "desktop") return;
    // A hook gets the PROJECT timeout (60s in playwright.config.ts), not the
    // test's own `test.setTimeout`, so the seed needs a bigger budget here.
    test.setTimeout(180_000);
    resetLab3Db();
  };
  test.beforeAll(hook);
  test.afterAll(hook);
}

/**
 * Unique address for a record the test creates. The `e2e.` prefix is
 * load-bearing: `server/prisma/cleanup-e2e.ts` deletes every user whose email
 * starts with it, so a differently-prefixed throwaway account would survive
 * `resetLab3Db()` and poison the shared dev DB.
 */
export function e2eEmail(label: string) {
  return `e2e.${label}.${Date.now()}@toktickit.dev`;
}

/**
 * Look a seeded account up by email and fail loudly when the seed no longer
 * contains it. The specs deliberately address specific accounts (not "the
 * first requester") so two specs never rotate the same mandatory-change
 * password (BR-02); this guard turns seed drift into a readable error instead
 * of a confusing login timeout.
 */
function seedUser(email: string) {
  const user = SEED_USERS.find((u) => u.email === email);
  if (!user) {
    throw new Error(
      `Seed account "${email}" is missing from server/src/lib/seedData.ts — ` +
        `update e2e/lab-03/helpers.ts to match the seed.`
    );
  }
  return user;
}

// ── Seed accounts ────────────────────────────────────────────────────────
// Addresses stay literal (the specs must target a SPECIFIC account so two
// specs never rotate the same mandatory-change password, BR-02), but each one
// is validated against server/src/lib/seedData.ts and its password is read
// from that same row. seedData.ts itself imports the passwords from
// server/src/lib/seedCredentials.ts — the same modules prisma/seed.ts uses —
// so a credential change is picked up here automatically and this file can
// never disagree with the seed.

// David Lee — seeded Requester with mustChangePassword=true. E2E-05 rotates
// his password, so only that spec may use him.
export const REQ_EMAIL = "david.lee@toktickit.dev";
export const REQ_INITIAL_PASSWORD = seedUser(REQ_EMAIL).password;

// Sarah Johnson — the second seeded Requester with mustChangePassword=true.
// E2E-01/02 use her so the login spec never races E2E-05 over david.lee's
// password rotation.
export const SARAH_EMAIL = "sarah.johnson@toktickit.dev";
export const SARAH_INITIAL_PASSWORD = seedUser(SARAH_EMAIL).password;
export const SARAH_NEW_PASSWORD = "E2ESarah1!";

// Passwords an E2E run sets after the mandatory first-login change (BR-02).
// `resetLab3Db()` restores the documented initial password afterwards.
export const REQ_PASSWORD = "E2ERequester1!";

// Seed IT Staff (mustChangePassword=false, real password) — E2E-03.
export const STAFF_EMAIL = "itstaff.sara@toktickit.dev";
export const STAFF_PASSWORD = seedUser(STAFF_EMAIL).password;

// Seed Administrator (mustChangePassword=false, real password) — E2E-04.
export const ADMIN_EMAIL = "admin@toktickit.dev";
export const ADMIN_PASSWORD = seedUser(ADMIN_EMAIL).password;

// The seeded INACTIVE Requester, resolved from the seed definition instead of
// hard-coding an address (E2E-02 / AC-06). Any non-matching credential must
// produce the same generic 401 message as an unknown email (BR-01).
export const INACTIVE_EMAIL = (() => {
  const inactive = SEED_USERS.find((u) => !u.isActive && u.role === "REQUESTER");
  if (!inactive) {
    throw new Error(
      "No inactive REQUESTER in server/src/lib/seedData.ts — E2E-02 needs one."
    );
  }
  return inactive.email;
})();

// Initial password handed to accounts the specs create through the Admin UI.
// This is NOT seed data — it is a throwaway credential for the account this
// run creates, and it only has to satisfy the server's strength rules.
export const NEW_USER_INITIAL_PASSWORD = "TempE2e123!";

// ── UI flows shared by more than one spec ────────────────────────────────

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('[data-testid="login-submit"]');
}

/** Log out from the profile menu (Navbar) and wait for the /login redirect. */
export async function logoutViaUi(page: Page) {
  await page.click('button[aria-haspopup="menu"]');
  await page.click('button:has-text("Logout")');
  await expect(page).toHaveURL(/\/login/);
}

export async function changePasswordViaUi(
  page: Page,
  currentPassword: string,
  newPassword: string
) {
  await page.fill("#change-current", currentPassword);
  await page.fill("#change-new", newPassword);
  await page.fill("#change-confirm", newPassword);
  await page.click('[data-testid="change-password-submit"]');
  await expect(page).not.toHaveURL(/\/change-password/);
}
