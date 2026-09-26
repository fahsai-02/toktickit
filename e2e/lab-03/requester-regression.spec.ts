import { expect, test } from "@playwright/test";
import {
  REQ_EMAIL,
  REQ_INITIAL_PASSWORD,
  REQ_PASSWORD,
  loginViaUi,
  changePasswordViaUi,
  useLab3DbHooks,
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
 * Determinism: the seed is idempotent (seed-credentials.md), so beforeAll
 * re-seeds — this resets any password a previous run changed and restores the
 * documented initial credentials for MIG-01 — and afterAll restores them again
 * even when a test fails mid-way.
 */

useLab3DbHooks();

test.describe("E2E-05 Requester regression (AC-03, AC-07)", () => {
  // Functional E2E flows run on the desktop project only. Running the same
  // flow on tablet/mobile in parallel makes all instances log in as the same
  // seed account (david.lee) and race on his mandatory first-login password
  // change (BR-02), producing non-deterministic failures. Responsive layout is
  // covered separately by RESP-01..24 (Issue 23).
  test("create → view → comment → indicate resolved", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
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