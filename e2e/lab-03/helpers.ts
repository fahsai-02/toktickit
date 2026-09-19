import { expect, type Page } from "@playwright/test";

/**
 * Lab 3 helper data. Session auth means there is no localStorage seeding; a
 * real login through the UI is required. Uses the seeded Requester account
 * (seed-credentials.md). BR-02 forces a first-login password change, so the
 * spec performs it and fixes the "real" password to E2E_REQUESTER_PASSWORD.
 * The seed is idempotent and restores the initial password on the next run
 * of `pnpm exec prisma db seed` (run it before the server test suite, which
 * asserts the documented credentials via bcrypt — MIG-01).
 */
export const REQ_EMAIL = "david.lee@toktickit.dev";
export const REQ_INITIAL_PASSWORD = "TempPass123!";
export const REQ_PASSWORD = "E2ERequester1!";

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('[data-testid="login-submit"]');
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