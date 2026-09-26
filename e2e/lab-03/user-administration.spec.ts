import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  NEW_USER_INITIAL_PASSWORD,
  e2eEmail,
  loginViaUi,
  logoutViaUi,
  useLab3DbHooks,
} from "./helpers.js";

useLab3DbHooks();

test.describe("E2E-04 user administration (AC-10, AC-11, AC-12)", () => {
  // Desktop-only per plan decision: functional flows avoid racing the shared
  // DB across viewport projects.
  test("create -> first login -> edit -> deactivate -> last-admin 409 -> self-deactivation 403", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    // Longer than the other specs: three accounts are created, two of them log
    // in and complete the mandatory first-login password change (BR-02).
    test.setTimeout(240_000);

    const success = page.locator('[data-testid="page-success"]');
    const formError = page.locator('[data-testid="form-error"]');

    // ── Sign in as the seeded Administrator (mustChangePassword=false) ─────
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Admins see "User Management" in the navbar (ui-spec 4.1).
    await page.click('a[href="/admin/users"]');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('[data-testid="user-management-page"]')).toBeVisible();

    // ── Create a new Requester (AC-10: bcrypt-hashed, mustChangePassword) ──
    const requesterEmail = e2eEmail("requester");
    const requesterName = `E2E User ${Date.now()}`;
    await page.click('[data-testid="create-user-btn"]');
    await page.fill('[data-testid="user-name"]', requesterName);
    await page.fill('[data-testid="user-email"]', requesterEmail);
    await page.selectOption('[data-testid="user-role"]', "REQUESTER");
    await page.fill('[data-testid="initial-password"]', NEW_USER_INITIAL_PASSWORD);
    await page.click('[data-testid="save-user-btn"]');
    await expect(success).toContainText("User created successfully", { timeout: 15_000 });

    // ── AC-10: the initial password logs in and forces /change-password ────
    // The Admin drawer closes on success, so re-open the list to log out from
    // the navbar.
    await logoutViaUi(page);
    await loginViaUi(page, requesterEmail, NEW_USER_INITIAL_PASSWORD);
    await expect(page).toHaveURL(/\/change-password/);
    // Complete the mandatory change so the account is left in a known state,
    // then confirm a Requester lands on the requester home (ui-spec 4.2).
    await page.fill("#change-current", NEW_USER_INITIAL_PASSWORD);
    await page.fill("#change-new", "E2ECreated1!");
    await page.fill("#change-confirm", "E2ECreated1!");
    await page.click('[data-testid="change-password-submit"]');
    await expect(page).toHaveURL(/\/my-tickets/);
    await logoutViaUi(page);

    // ── Back as Administrator: search, edit the name, deactivate ───────────
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await page.click('a[href="/admin/users"]');
    await expect(page).toHaveURL(/\/admin\/users/);

    await page.fill('[data-testid="user-search-input"]', requesterEmail);
    const row = page.locator(`tr:has-text("${requesterEmail}")`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole("button", { name: "Edit" }).click();
    await page.fill('[data-testid="user-name"]', `${requesterName} Updated`);
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

    // ── AC-12: the final active Administrator cannot be removed (409) ──────
    // Guard order (server/src/app.ts): the last-active-admin check runs BEFORE
    // the self-deactivation check, so the seeded single admin always gets the
    // 409 "last active Administrator" answer — never 403.
    await page.fill('[data-testid="user-search-input"]', ADMIN_EMAIL);
    const adminRow = page.locator(`tr:has-text("${ADMIN_EMAIL}")`);
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await adminRow.getByRole("button", { name: "Edit" }).click();
    await page.click('[data-testid="deactivate-user-btn"]');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-testid="confirm-ok-btn"]').click();
    await expect(formError).toBeVisible({ timeout: 15_000 });
    await expect(formError).toContainText("last active Administrator");
    await page.click('[data-testid="cancel-user-btn"]');

    // ── AC-11: a SECOND active admin gets 403 for deactivating itself ───────
    // The 403 path is only reachable while another active Administrator exists
    // (the 409 guard above short-circuits otherwise), so create a throwaway
    // admin, sign in AS that account, and let it try to deactivate itself. The
    // seeded admin@ is never modified, and the `e2e.` email prefix means the
    // afterAll DB reset deletes the throwaway for us.
    const secondAdminEmail = e2eEmail("admin");
    await page.click('[data-testid="create-user-btn"]');
    await page.fill('[data-testid="user-name"]', `E2E Second Admin ${Date.now()}`);
    await page.fill('[data-testid="user-email"]', secondAdminEmail);
    await page.selectOption('[data-testid="user-role"]', "ADMINISTRATOR");
    await page.fill('[data-testid="initial-password"]', NEW_USER_INITIAL_PASSWORD);
    await page.click('[data-testid="save-user-btn"]');
    await expect(success).toContainText("User created successfully", { timeout: 15_000 });

    await logoutViaUi(page);
    await loginViaUi(page, secondAdminEmail, NEW_USER_INITIAL_PASSWORD);
    // Brand-new accounts must change their password before the app unlocks.
    await expect(page).toHaveURL(/\/change-password/);
    await page.fill("#change-current", NEW_USER_INITIAL_PASSWORD);
    await page.fill("#change-new", "E2ESecondAdmin1!");
    await page.fill("#change-confirm", "E2ESecondAdmin1!");
    await page.click('[data-testid="change-password-submit"]');
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Self-deactivation is refused while the seeded admin is still active.
    await page.click('a[href="/admin/users"]');
    await expect(page).toHaveURL(/\/admin\/users/);
    await page.fill('[data-testid="user-search-input"]', secondAdminEmail);
    const selfRow = page.locator(`tr:has-text("${secondAdminEmail}")`);
    await expect(selfRow).toBeVisible({ timeout: 15_000 });
    await selfRow.getByRole("button", { name: "Edit" }).click();
    await page.click('[data-testid="deactivate-user-btn"]');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-testid="confirm-ok-btn"]').click();
    await expect(formError).toContainText("You cannot deactivate your own account", { timeout: 15_000 });
  });
});
