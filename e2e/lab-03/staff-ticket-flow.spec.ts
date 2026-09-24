import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { STAFF_EMAIL, STAFF_PASSWORD } from "./helpers.js";

const serverDir = fileURLToPath(new URL("../../server/", import.meta.url));

test.describe("E2E-03 staff ticket flow (AC-08, AC-09)", () => {
  // Desktop-only per plan decision: functional flows avoid racing the shared
  // DB across viewport projects.
  test("queue -> detail -> claim -> IT priority -> status -> comment -> note -> resolution", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    test.setTimeout(150_000);

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

    // IT Staff has a real password (mustChangePassword=false) -> straight in.
    await page.goto("/login");
    await page.fill("#login-email", STAFF_EMAIL);
    await page.fill("#login-password", STAFF_PASSWORD);
    await page.click('[data-testid="login-submit"]');
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

    // Restore the documented seed and drop this run's residue (comments/notes).
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