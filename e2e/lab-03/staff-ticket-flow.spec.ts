import { expect, test } from "@playwright/test";
import { STAFF_EMAIL, STAFF_PASSWORD, loginViaUi, useLab3DbHooks } from "./helpers.js";

useLab3DbHooks();

test.describe("E2E-03 staff ticket flow (AC-08, AC-09)", () => {
  // Desktop-only per plan decision: functional flows avoid racing the shared
  // DB across viewport projects.
  test("queue -> detail -> claim -> IT priority -> status -> comment -> note -> resolution", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    test.setTimeout(150_000);

    // IT Staff has a real password (mustChangePassword=false) -> straight in.
    await loginViaUi(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Focus the queue on a NEW, unassigned ticket.
    await page.click('[data-testid="filters-toggle"]');
    await page.selectOption('[data-testid="filter-status"]', "NEW");
    await page.selectOption('[data-testid="filter-owner"]', "unassigned");
    await page.click('[data-testid="filters-toggle"]');

    const firstRow = page.locator('[data-testid^="staff-ticket-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);

    // The seed guarantees at least one NEW + unassigned ticket (the filter
    // scoped the queue to exactly those), so Claim must be available — assert
    // it, don't skip on it.
    const claimBtn = page.locator('[data-testid="claim-btn"]');
    await expect(claimBtn).toBeVisible({ timeout: 15_000 });
    await claimBtn.click();
    await expect(page.locator('[data-testid="claimed-by-you"]')).toBeVisible({ timeout: 15_000 });

    // Set IT Priority HIGH (value asserts the live dropdown state).
    const itPriority = page.locator('[data-testid="staff-it-priority-select"]');
    await itPriority.selectOption("HIGH");
    await expect(itPriority).toHaveValue("HIGH", { timeout: 15_000 });

    // NEW -> OPEN (no confirmation dialog required for this transition).
    const statusSelect = page.locator('[data-testid="staff-status-select"]');
    await statusSelect.selectOption("OPEN");
    await expect(page.locator(".ticket-detail-header .badge")).toHaveText("OPEN", { timeout: 15_000 });

    // AC-09 (specification.md line 333), second half: from OPEN the status
    // dropdown offers ONLY the BR-12 permitted next states, so the "rejected
    // with 400" half of AC-09 surfaces in the UI as an ABSENT option —
    // RESOLVED is not selectable straight from OPEN. (The dropdown is built
    // from transitionsFrom(), the same table the status endpoint enforces, so
    // it can never offer a transition the server would reject; ui-spec 5.5
    // "only permitted next states per BR-12". The 400 itself is API-42's job.)
    const statusOptions = page.locator('[data-testid="staff-status-select"] option');
    await expect(statusOptions.filter({ hasText: /^RESOLVED$/ })).toHaveCount(0);

    // AC-09, first half: OPEN -> IN_PROGRESS succeeds.
    await statusSelect.selectOption("IN_PROGRESS");
    await expect(page.locator(".ticket-detail-header .badge")).toHaveText("IN_PROGRESS", { timeout: 15_000 });

    // Post a Public Comment (default tab is Comments).
    await page.fill('[data-testid="comment-input"]', "E2E staff public comment");
    await page.click('[data-testid="post-comment-btn"]');
    await expect(page.locator('[data-testid="comment-timeline"]')).toContainText("E2E staff public comment", { timeout: 15_000 });

    // Create an Internal Note (IT Staff only).
    await page.click('[data-testid="tab-notes"]');
    await expect(page.locator('[data-testid="panel-notes"]')).toBeVisible();
    await page.fill('[data-testid="note-input"]', "E2E internal note");
    await page.click('[data-testid="create-note-btn"]');
    await expect(page.locator('[data-testid="note-timeline"]')).toContainText("E2E internal note", { timeout: 15_000 });

    // Save a Resolution Summary (visible to the requester).
    await page.fill('[data-testid="resolution-input"]', "E2E resolution summary");
    await page.click('[data-testid="save-resolution-btn"]');
    await expect(page.locator('[data-testid="resolution-saved"]')).toBeVisible({ timeout: 15_000 });
  });
});
