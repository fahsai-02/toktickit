import { expect, test } from "@playwright/test";
import {
  STAFF_EMAIL, STAFF_PASSWORD, collectConsoleErrors, createTempTicket, expectedHttpError,
  loginViaUi, staffSessionCookie, useLab3DbHooks,
} from "./helpers.js";

// Lab 4 E2E — resolution gate and Ticket-level traceability.
// docs/lab-04/tests.md E2E-03, E2E-05, E2E-06. Throw-away tickets only.
useLab3DbHooks();

const GATE_REFUSAL = [expectedHttpError(400, /\/api\/staff\/tickets\/\d+\/status$/)]; // the resolution gate refusal

test.describe("Ticket resolution journeys", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "functional spec: desktop only");
  });

  // E2E-03 — AC-07, AC-08, AC-09; specification.md BR-11, BR-12, BR-13, FR-09, FR-10.
  test("E2E-03: RESOLVED is blocked until a summary and an action exist, then succeeds after a named confirmation", async ({ page, request }) => {
    test.setTimeout(150_000);
    const errors = collectConsoleErrors(page, GATE_REFUSAL);
    const staffCookie = await staffSessionCookie(request);
    const ticket = await createTempTicket(request, "resolution gate", staffCookie, ["OPEN", "IN_PROGRESS"]);

    await loginViaUi(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await page.goto(`/staff/tickets/${ticket.id}`);
    const badge = page.locator(".ticket-detail-header .badge");
    await expect(badge).toHaveText("IN_PROGRESS");

    const tryResolve = async () => {
      await page.getByTestId("staff-status-select").selectOption("RESOLVED");
      const dialog = page.getByTestId("status-confirm-dialog");
      // The dialog names the transition (ui-spec section 8).
      await expect(dialog).toContainText("IN PROGRESS");
      await expect(dialog).toContainText("RESOLVED");
      const sent = page.waitForResponse((r) => r.url().endsWith(`/api/staff/tickets/${ticket.id}/status`) && r.request().method() === "PUT");
      await page.getByTestId("status-confirm-accept").click();
      return (await sent).status();
    };

    // 1. Neither condition met: refused, badge holds, message says what is missing.
    expect(await tryResolve()).toBe(400);
    await expect(page.getByTestId("status-error")).toContainText("resolution summary and at least one recorded Action Taken");
    await expect(badge).toHaveText("IN_PROGRESS");

    // 2. Summary only: the message now names the missing action.
    await page.fill('[data-testid="resolution-input"]', "E2E resolution summary");
    await page.click('[data-testid="save-resolution-btn"]');
    await expect(page.getByTestId("resolution-saved")).toBeVisible();
    expect(await tryResolve()).toBe(400);
    await expect(page.getByTestId("status-error")).toContainText("at least one recorded Action Taken");
    await expect(badge).toHaveText("IN_PROGRESS");

    // 3. Record the action in the UI, then the gate is met.
    await page.getByTestId("tab-actions").click();
    await page.getByTestId("empty-record-action-btn").click();
    await page.getByTestId("action-description-input").fill("E2E fixed the fault");
    await page.getByTestId("action-result-input").fill("E2E verified fixed");
    await page.getByTestId("save-action-btn").click();
    await expect(page.getByTestId("actions-list")).toContainText("E2E fixed the fault");

    expect(await tryResolve()).toBe(200);
    await expect(badge).toHaveText("RESOLVED");

    // AC-08: RESOLVED -> CLOSED is a plain permitted transition and also passes the gate.
    await page.getByTestId("staff-status-select").selectOption("CLOSED");
    await expect(badge).toHaveText("CLOSED");
    errors.assertClean();
  });

  // E2E-05 — AC-13, AC-14; Part 6 traceability: assign/status/complete/cancel are Ticket-level.
  test("E2E-05: owner and status controls live on the Ticket, none on an action, and cancel reaches CANCELLED", async ({ page, request }) => {
    test.setTimeout(150_000);
    const errors = collectConsoleErrors(page);
    const staffCookie = await staffSessionCookie(request);
    const ticket = await createTempTicket(request, "traceability", staffCookie, ["OPEN"]);

    await loginViaUi(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await page.goto(`/staff/tickets/${ticket.id}`);

    // Owner + status are Ticket-card controls, outside the Actions panel and form.
    const owner = page.getByTestId("staff-owner-select");
    const status = page.getByTestId("staff-status-select");
    await expect(owner).toBeVisible();
    await expect(status).toBeVisible();
    await page.getByTestId("tab-actions").click();
    await expect(page.getByTestId("panel-actions").locator('[data-testid="staff-owner-select"], [data-testid="staff-status-select"]')).toHaveCount(0);

    // The Action form has no assignee and no status control.
    await page.getByTestId("empty-record-action-btn").click();
    const drawer = page.getByTestId("action-form-drawer");
    await expect(drawer.locator("select")).toHaveCount(0);
    await expect(drawer.getByText(/assignee|assigned to|status/i)).toHaveCount(0);
    await page.getByTestId("cancel-action-btn").click();

    // "cancel" = the Ticket's CANCELLED status (OPEN -> CANCELLED, confirmed).
    await status.selectOption("CANCELLED");
    await expect(page.getByTestId("status-confirm-dialog")).toContainText("CANCELLED");
    await page.getByTestId("status-confirm-accept").click();
    await expect(page.locator(".ticket-detail-header .badge")).toHaveText("CANCELLED");
    errors.assertClean();
  });
});
