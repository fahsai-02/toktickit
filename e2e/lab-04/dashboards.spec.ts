import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, STAFF_EMAIL, STAFF_PASSWORD, REQ_EMAIL, REQ_INITIAL_PASSWORD,
  clickAndReadListTotal, collectConsoleErrors, loginAndUnlock, loginViaUi, useLab3DbHooks,
} from "./helpers.js";

// Lab 4 E2E — dashboard drill-down. docs/lab-04/tests.md E2E-04, E2E-06.
// Read-only: no ticket is written. Every number is read from the page.
useLab3DbHooks();

const cardNumber = async (page: Page, testId: string) =>
  Number((await page.getByTestId(testId).locator(".metric-card__value").innerText()).trim());

test.describe("Dashboard drill-down", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "functional spec: desktop only");
  });

  // E2E-04 — AC-10, AC-11, AC-12; FR-13, FR-14, FR-16.
  test("E2E-04: each requester card's number equals the length of the list it opens", async ({ page }) => {
    test.setTimeout(150_000);
    const errors = collectConsoleErrors(page);
    await loginAndUnlock(page, REQ_EMAIL, REQ_INITIAL_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.getByTestId("requester-dashboard")).toBeVisible();

    const cards: Array<[string, RegExp]> = [
      ["metric-card-open", /statusGroup=open/],
      ["metric-card-in-progress", /currentStatus=IN_PROGRESS/],
      ["metric-card-waiting", /currentStatus=WAITING_FOR_REQUESTER/],
      ["metric-card-resolved", /currentStatus=RESOLVED/],
      ["metric-card-closed", /currentStatus=CLOSED/],
      ["metric-card-attention", /statusGroup=attention/],
    ];
    for (const [testId, urlPart] of cards) {
      await page.goto("/dashboard");
      await expect(page.getByTestId("requester-dashboard")).toBeVisible();
      const shown = await cardNumber(page, testId);
      const total = await clickAndReadListTotal(page, page.getByTestId(testId), "/api/tickets");
      await expect(page).toHaveURL(urlPart);
      expect(total, testId).toBe(shown);
      if (total > 0) await expect(page.locator(".pagination-info")).toContainText(`of ${total}`);
    }
    errors.assertClean();
  });

  test("E2E-04: each staff card and priority bucket equals the queue it opens, and Urgent reaches both groups", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = collectConsoleErrors(page);
    await loginViaUi(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/dashboard/);

    const goDash = async () => {
      await page.goto("/staff/dashboard");
      await expect(page.getByTestId("staff-dashboard")).toBeVisible();
      await expect(page.getByTestId("priority-strip")).toBeVisible();
    };

    const cards: Array<[string, RegExp]> = [
      ["metric-card-new", /currentStatus=NEW/],
      ["metric-card-open", /currentStatus=OPEN/],
      ["metric-card-in-progress", /currentStatus=IN_PROGRESS/],
      ["metric-card-waiting", /currentStatus=WAITING_FOR_REQUESTER/],
      ["metric-card-unassigned", /ownerId=unassigned/],
      ["metric-card-my-assigned", /ownerId=me/],
    ];
    for (const [testId, urlPart] of cards) {
      await goDash();
      const shown = await cardNumber(page, testId);
      const total = await clickAndReadListTotal(page, page.getByTestId(testId), "/api/staff/tickets");
      await expect(page).toHaveURL(urlPart);
      expect(total, testId).toBe(shown);
    }

    // By IT Priority: every bucket's number equals its filtered queue; "Not set" opens the unfiltered queue.
    let bucketSum = 0;
    for (const key of ["urgent", "high", "medium", "low"]) {
      await goDash();
      const shown = Number((await page.getByTestId(`priority-bucket-${key}`).locator(".priority-strip__count").innerText()).trim());
      const total = await clickAndReadListTotal(page, page.getByTestId(`priority-bucket-${key}`), "/api/staff/tickets");
      await expect(page).toHaveURL(new RegExp(`itPriority=${key.toUpperCase()}`));
      expect(total, key).toBe(shown);
      bucketSum += shown;
    }
    await goDash();
    const notSet = Number((await page.getByTestId("priority-bucket-null").locator(".priority-strip__count").innerText()).trim());
    const all = await clickAndReadListTotal(page, page.getByTestId("priority-bucket-null"), "/api/staff/tickets");
    expect(all, "unfiltered queue = all five buckets").toBe(bucketSum + notSet);

    // Urgent (AC-11, BR-25): the card counts two conditions, so BOTH groups are reachable and each returns only its own rows.
    await goDash();
    const urgentRes = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/staff/tickets" && new URL(r.url()).searchParams.get("itPriority") === "URGENT");
    await page.getByTestId("urgent-link-it-priority").click();
    const byIt = (await (await urgentRes).json()) as { data: { itPriority: string }[]; meta: { total: number } };
    expect(byIt.data.every((t) => t.itPriority === "URGENT")).toBe(true);

    await goDash();
    const reqRes = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/staff/tickets" && new URL(r.url()).searchParams.get("requestedPriority") === "URGENT");
    await page.getByTestId("urgent-link-req-priority").click();
    const byReq = (await (await reqRes).json()) as { data: { requestedPriority: string }[]; meta: { total: number } };
    expect(byReq.data.every((t) => t.requestedPriority === "URGENT")).toBe(true);
    await expect(page).toHaveURL(/requestedPriority=URGENT/);

    // The Users card is Administrator-only.
    await goDash();
    await expect(page.getByTestId("metric-card-users")).toHaveCount(0);
    errors.assertClean();
  });

  test("E2E-04: an Administrator sees the Users card and it opens User Management", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    const users = page.getByTestId("metric-card-users");
    await expect(users).toBeVisible();
    await users.click();
    await expect(page).toHaveURL(/\/admin\/users/);
    errors.assertClean();
  });
});
