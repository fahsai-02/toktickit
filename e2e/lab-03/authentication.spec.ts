import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  SARAH_EMAIL,
  SARAH_INITIAL_PASSWORD,
  SARAH_NEW_PASSWORD,
} from "./helpers.js";

const serverDir = fileURLToPath(new URL("../../server/", import.meta.url));

// Sarah Johnson is a REQUESTER with mustChangePassword=true in the seed, and is
// NOT used by the other E2E flows (E2E-05 uses david.lee), so rotating her
// password here cannot race a parallel spec.

test.describe("E2E-01 login + forced password change (AC-01, AC-02)", () => {
  // Desktop-only per plan decision: functional flows avoid racing the shared
  // DB across viewport projects (BR-02 password rotation).
  test("login -> forced change password -> app -> logout -> protected redirect", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    test.setTimeout(120_000);

    // Restore the seed so the initial password is guaranteed (idempotent).
    execSync("pnpm exec prisma db seed", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });

    // Login screen has no auth yet -> submit redirects to /change-password.
    await page.goto("/login");
    await page.fill("#login-email", SARAH_EMAIL);
    await page.fill("#login-password", SARAH_INITIAL_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/change-password/);

    // First-login password change (BR-02).
    await page.fill("#change-current", SARAH_INITIAL_PASSWORD);
    await page.fill("#change-new", SARAH_NEW_PASSWORD);
    await page.fill("#change-confirm", SARAH_NEW_PASSWORD);
    await page.click('[data-testid="change-password-submit"]');
    // After saving, the app is unlocked and a requester lands on /my-tickets.
    await expect(page).not.toHaveURL(/\/change-password/);
    await expect(page).toHaveURL(/\/my-tickets/);

    // Logout from the profile menu returns to /login.
    await page.click('button[aria-haspopup="menu"]');
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);

    // A direct hit on a protected route redirects to /login.
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/\/login/);
  });

  // Restore the seed even on failure — Playwright guarantees afterAll runs
  // after every test in this describe — so sarah's rotated password can never
  // poison a later run in this or the next spec (BR-02 robustness).
  test.afterAll(async () => {
    execSync("pnpm exec prisma db seed", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });
  });
});

test.describe("E2E-02 safe login errors (BR-01)", () => {
  test("invalid credentials and inactive account show one generic message", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    test.setTimeout(90_000);

    execSync("pnpm exec prisma db seed", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });

    // Unknown email + bad password -> generic message, same as any failure.
    await page.goto("/login");
    await page.fill("#login-email", "no-such-user@toktickit.dev");
    await page.fill("#login-password", "WrongPass1!");
    await page.click('[data-testid="login-submit"]');
    const error = page.locator('[data-testid="login-error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText("Invalid email or password");

    // Inactive account (robert.brown is seeded inactive) -> same message.
    await page.fill("#login-email", "robert.brown@toktickit.dev");
    await page.fill("#login-password", SARAH_INITIAL_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText("Invalid email or password");

    execSync("pnpm exec prisma db seed", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });
  });
});