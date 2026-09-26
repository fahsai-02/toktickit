import { expect, test } from "@playwright/test";
import {
  INACTIVE_EMAIL,
  SARAH_EMAIL,
  SARAH_INITIAL_PASSWORD,
  SARAH_NEW_PASSWORD,
  changePasswordViaUi,
  loginViaUi,
  logoutViaUi,
  useLab3DbHooks,
} from "./helpers.js";

useLab3DbHooks();

// Sarah Johnson is a REQUESTER with mustChangePassword=true in the seed, and is
// NOT used by the other E2E flows (E2E-05 uses david.lee), so rotating her
// password here cannot race another spec.

test.describe("E2E-01 login + forced password change (AC-01, AC-02)", () => {
  // Desktop-only per plan decision: functional flows avoid racing the shared
  // DB across viewport projects (BR-02 password rotation).
  test("login -> forced change password -> app -> logout -> protected redirect", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    test.setTimeout(120_000);

    // Login screen has no auth yet -> submit redirects to /change-password.
    await loginViaUi(page, SARAH_EMAIL, SARAH_INITIAL_PASSWORD);
    await expect(page).toHaveURL(/\/change-password/);

    // First-login password change (BR-02).
    await changePasswordViaUi(page, SARAH_INITIAL_PASSWORD, SARAH_NEW_PASSWORD);
    // After saving, the app is unlocked and a requester lands on /my-tickets.
    await expect(page).toHaveURL(/\/my-tickets/);

    // Logout from the profile menu returns to /login.
    await logoutViaUi(page);

    // A direct hit on a protected route redirects to /login.
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("E2E-02 safe login errors (BR-01)", () => {
  test("invalid credentials and inactive account show one generic message", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    test.setTimeout(90_000);

    // Unknown email + bad password -> generic message, same as any failure.
    await loginViaUi(page, "no-such-user@toktickit.dev", "WrongPass1!");
    const error = page.locator('[data-testid="login-error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText("Invalid email or password");

    // Inactive account (resolved from the seed definition) -> same message.
    await page.fill("#login-email", INACTIVE_EMAIL);
    await page.fill("#login-password", SARAH_INITIAL_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText("Invalid email or password");
  });
});
