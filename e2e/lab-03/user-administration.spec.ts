import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers.js";

const serverDir = fileURLToPath(new URL("../../server/", import.meta.url));

test.describe("E2E-04 user administration (AC-10, AC-12)", () => {
  // Desktop-only per plan decision: functional flows avoid racing the shared
  // DB across viewport projects.
  test("admin login -> list -> create -> search -> edit -> deactivate (confirm) -> self-block", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    test.setTimeout(180_000);

    // Remove residue from earlier runs, then restore the documented seed.
    execSync("pnpm exec tsx prisma/cleanup-e2e.ts", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });
    execSync("pnpm exec prisma db seed", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });

    // Administrator logs straight in (mustChangePassword=false).
    await page.goto("/login");
    await page.fill("#login-email", ADMIN_EMAIL);
    await page.fill("#login-password", ADMIN_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Admins see "User Management" in the navbar (ui-spec 4.1).
    await page.click('a[href="/admin/users"]');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('[data-testid="user-management-page"]')).toBeVisible();

    // Create a new Requester user.
    const uniq = Date.now();
    const email = `e2e.${uniq}@toktickit.dev`;
    const name = `E2E User ${uniq}`;
    await page.click('[data-testid="create-user-btn"]');
    await page.fill('[data-testid="user-name"]', name);
    await page.fill('[data-testid="user-email"]', email);
    await page.selectOption('[data-testid="user-role"]', "REQUESTER");
    await page.fill('[data-testid="initial-password"]', "TempE2e123!");
    await page.click('[data-testid="save-user-btn"]');
    const success = page.locator('[data-testid="page-success"]');
    await expect(success).toContainText("User created successfully", { timeout: 15_000 });

    // Search for the new user and edit their name.
    await page.fill('[data-testid="user-search-input"]', email);
    const row = page.locator(`tr:has-text("${email}")`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole("button", { name: "Edit" }).click();
    await page.fill('[data-testid="user-name"]', `${name} Updated`);
    await page.click('[data-testid="save-user-btn"]');
    await expect(success).toContainText("User updated successfully", { timeout: 15_000 });

    // Deactivate with confirmation (ui-spec 5.6).
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole("button", { name: "Edit" }).click();
    await page.click('[data-testid="deactivate-user-btn"]');
    const dialog = page.locator('[data-testid="deactivate-confirm-dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-testid="confirm-ok-btn"]').click();
    await expect(success).toContainText("User updated successfully", { timeout: 15_000 });

    // AC-12 (FR-46): the final active Administrator can never remove itself.
    // The seed has exactly one admin, so this self-deactivation always hits the
    // LAST-ADMIN 409 guard (app.ts checks it before the AC-11 self-guard) and
    // the server message surfaces in the drawer. The 403 self-deactivation path
    // (AC-11) is covered server-side by API-65; it is unreachable via E2E with
    // a single-admin seed (see privacy/guard-order note in tests.md E2E-04).
    await page.fill('[data-testid="user-search-input"]', ADMIN_EMAIL);
    const adminRow = page.locator(`tr:has-text("${ADMIN_EMAIL}")`);
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await adminRow.getByRole("button", { name: "Edit" }).click();
    await page.click('[data-testid="deactivate-user-btn"]');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-testid="confirm-ok-btn"]').click();
    await expect(page.locator('[data-testid="form-error"]')).toBeVisible({ timeout: 15_000 });
    await page.click('[data-testid="cancel-user-btn"]');

    // Restore the documented seed and drop this run's created user.
    execSync("pnpm exec prisma db seed", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });
    execSync("pnpm exec tsx prisma/cleanup-e2e.ts", {
      cwd: serverDir,
      stdio: "pipe",
      timeout: 120_000,
    });
  });
});