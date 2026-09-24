import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  REQ_EMAIL,
  REQ_INITIAL_PASSWORD,
  REQ_PASSWORD,
  loginViaUi,
  changePasswordViaUi,
} from "./helpers.js";

/**
 * E2E-05 — Requester regression (AC-03, AC-07).
 *
 * Full authenticated flow: login (with mandatory first-login password change,
 * BR-02) → create ticket → My Tickets → open detail → post Public Comment →
 * toggle "Problem Appears Resolved".
 *
 * Requires: Postgres up, server on :5000, client on :5173, DB migrated.
 *
 * Determinism: the seed is idempotent (seed-credentials.md), so a beforeAll
 * re-seeds — this resets any password a previous run changed and restores the
 * documented initial credentials for MIG-01.
 */

const serverDir = fileURLToPath(new URL("../../server/", import.meta.url));

test.beforeAll(() => {
  execSync("pnpm exec prisma db seed", {
    cwd: serverDir,
    stdio: "pipe",
    timeout: 120_000,
  });
});

// Restore seed state (incl. the requester password the mandatory-change step
// rotated) so the server suite's MIG-01 credential checks pass right after E2E.
test.afterAll(() => {
  execSync("pnpm exec prisma db seed", {
    cwd: serverDir,
    stdio: "pipe",
    timeout: 120_000,
  });
});

// In CI this suite is expected to be quick; 60s covers bcrypt login + first
// file download on a cold browser.
test.describe("E2E-05 Requester regression (AC-03, AC-07)", () => {
  test("create → view → comment → indicate resolved", async ({ page }) => {
    test.setTimeout(120_000);

    // ── Sign in (mandatory first-login password change, BR-02) ──────────
    await loginViaUi(page, REQ_EMAIL, REQ_INITIAL_PASSWORD);
    await expect(page).toHaveURL(/\/change-password/);
    await changePasswordViaUi(page, REQ_INITIAL_PASSWORD, REQ_PASSWORD);

    // Mandatory change completes → land on the requester default page.
    await expect(page).toHaveURL(/\/my-tickets/);

    // ── Create a ticket through the UI (auth identity, no requester picker)
    const summary = `E2E requester regression ${Date.now()}`;
    await page.click('[data-testid="create-ticket-btn"]');
    await expect(page).toHaveURL(/\/create-ticket/);

    // Pick the first real category/system (index 1 skips the placeholder).
    await page.selectOption("#category", { index: 1 });
    await page.selectOption("#relatedSystem", { index: 1 });
    await page.selectOption("#priority", "HIGH");
    await page.fill("#summary", summary);
    await page.fill("#description", "Automated E2E regression description.");
    await page.click('[data-testid="submit-ticket"]');

    await expect(
      page.locator('text=Ticket created:').first()
    ).toBeVisible();
    await page.click('[data-testid="go-to-my-tickets"]');

    // ── Locate the new ticket in My Tickets and open it ───────────────
    await page.click('[data-testid="search-input"]');
    await page.fill('[data-testid="search-input"]', summary);
    // My Tickets renders the desktop table AND the mobile cards in the DOM;
    // on small screens the table is hidden via CSS. Scope matches to the
    // VISIBLE occurrence (card on mobile, table row cell on desktop/tablet)
    // so the same locator works in all three projects.
    const ticketHit = page
      .getByText(summary)
      .and(page.locator(":visible"))
      .first();
    await expect(ticketHit).toBeVisible();
    await ticketHit.click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    // ── Public Comment (AC-03, ui-spec 5.3) ───────────────────────────
    await expect(page.locator('[data-testid="comment-input"]')).toBeVisible();
    const commentText = `E2E public comment ${Date.now()}`;
    await page.fill('[data-testid="comment-input"]', commentText);
    await page.click('[data-testid="post-comment-btn"]');
    await expect(page.locator(`text=${commentText}`)).toBeVisible();
    await expect(page.locator('[data-testid="comment-timeline"] li').first())
      .toContainText(commentText);

    // ── Problem Appears Resolved toggle (AC-07, api-spec 4.9) ─────────
    await expect(page.locator('[data-testid="indicate-resolved-btn"]')).toBeVisible();
    await page.click('[data-testid="indicate-resolved-btn"]');
    await expect(page.locator('[data-testid="resolved-confirmation"]')).toBeVisible();
    await expect(page.locator("text=You indicated this problem appears resolved.")).toBeVisible();
    await page.click('[data-testid="retract-resolved-btn"]');
    await expect(page.locator('[data-testid="indicate-resolved-btn"]')).toBeVisible();
  });
});