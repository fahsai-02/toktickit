import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, NEW_USER_INITIAL_PASSWORD, REQ_EMAIL, REQ_INITIAL_PASSWORD,
  adminSessionCookie, assertNoHorizontalScroll, capture, collectConsoleErrors,
  createTempTicket, createUserViaAdminApi, loginAndUnlock, newApi, recordActionViaApi,
  seedTicketWithMostActions, seedTicketWithoutActions, staffLogin, staffSessionCookie,
  ticketIdByNumber, useLab3DbHooks,
} from "./helpers.js";

/**
 * RESP-01..30 — responsive evidence for every new or changed Lab 4 screen.
 * docs/lab-04/tests.md section 2 (Responsive), ui-spec.md sections 6 and 9.
 *
 * Runs on all three projects (desktop 1440, tablet 820, mobile 375): 10 screens
 * x 3 = 30 screenshots under artifacts/lab-04/screenshots/. Every test asserts
 * "no horizontal scroll" at the current width; the PNG is evidence for a human
 * look (ui-spec section 9.1 "Manual pass"), not a pixel comparison.
 *
 * All screens use REAL data. Writes go only to "E2E lab4" throw-away tickets;
 * the seed tickets are only read.
 */
useLab3DbHooks({ allProjects: true });

const EXPECTED_4XX = [/Failed to load resource: the server responded with a status of 4\d\d/];

async function finish(page: import("@playwright/test").Page, screen: string, project: string, fullPage = true) {
  await assertNoHorizontalScroll(page);
  await capture(page, screen, project, { fullPage });
}

test.describe("RESP-01..03 requester dashboard, with data", () => {
  test("cards, attention card and both lists render", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await loginAndUnlock(page, REQ_EMAIL, REQ_INITIAL_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    for (const id of ["open", "in-progress", "waiting", "resolved", "closed", "attention"]) {
      await expect(page.getByTestId(`metric-card-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId("create-ticket-cta")).toBeVisible();
    await finish(page, "requester-dashboard", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("RESP-04..06 requester dashboard, zero data", () => {
  test("a Requester with no tickets still shows all six cards as 0 and two empty blocks", async ({ page, request }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const admin = await newApi();
    const user = await createUserViaAdminApi(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "REQUESTER");
    await admin.dispose();
    await loginAndUnlock(page, user.email, NEW_USER_INITIAL_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    for (const id of ["open", "in-progress", "waiting", "resolved", "closed", "attention"]) {
      await expect(page.getByTestId(`metric-card-${id}`)).toBeVisible();
      await expect(page.getByTestId(`metric-card-${id}`).locator(".metric-card__value")).toHaveText("0");
    }
    await expect(page.getByTestId("recent-tickets-empty-cta")).toBeVisible();
    await expect(page.getByTestId("resolved-tickets-empty-cta")).toBeVisible();
    await finish(page, "requester-dashboard-empty", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("RESP-07..12 staff dashboard by role", () => {
  test("IT Staff: queue cards, five-bucket strip, urgent list, recent actions; no Users card", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await staffLogin(page);
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    await expect(page.getByTestId("priority-strip")).toBeVisible();
    await expect(page.getByTestId("priority-bucket-null")).toBeVisible();
    await expect(page.getByTestId("urgent-section")).toBeVisible();
    await expect(page.getByTestId("my-recent-actions-card")).toBeVisible();
    await expect(page.getByTestId("metric-card-users")).toHaveCount(0);
    await finish(page, "staff-dashboard", testInfo.project.name);
    errors.assertClean();
  });

  test("Administrator: the same dashboard plus the Users card", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    await expect(page.getByTestId("priority-strip")).toBeVisible();
    await expect(page.getByTestId("metric-card-users")).toBeVisible();
    await finish(page, "staff-dashboard-admin", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("RESP-13..18 staff ticket: Actions Taken list and form (seed ticket with the most actions)", () => {
  async function openSeedTicketActions(page: import("@playwright/test").Page) {
    const { ticketNumber, actions } = seedTicketWithMostActions();
    expect(actions.length).toBeGreaterThanOrEqual(2);
    const id = await ticketIdByNumber(await staffSessionCookie(), ticketNumber);
    await staffLogin(page);
    await page.goto(`/staff/tickets/${id}`);
    await page.getByTestId("tab-actions").click();
    await expect(page.getByTestId("actions-list").locator("li.action-card")).toHaveCount(actions.length);
    return actions;
  }

  test("RESP-13..15: one entry per action, all six fields legible", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const actions = await openSeedTicketActions(page);
    const first = page.getByTestId("actions-list").locator("li.action-card").first();
    for (const label of ["Date/Time", "Description", "Result", "Performed By", "Follow-Up", "Notes"]) {
      await expect(first.locator("dt", { hasText: new RegExp(`^${label}$`) })).toBeVisible();
    }
    await expect(page.getByTestId("actions-list")).toContainText(actions[0].description);
    await finish(page, "actions-taken/staff-ticket-actions", testInfo.project.name);
    errors.assertClean();
  });

  test("RESP-16..18: the form opens as a drawer and Save stays reachable", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await openSeedTicketActions(page);
    await page.getByTestId("record-action-btn").click();
    const drawer = page.getByTestId("action-form-drawer");
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId("action-description-input")).toBeVisible();
    // Every field reachable, and Save/Cancel never pushed off-screen.
    await page.getByTestId("action-description-input").fill("Responsive check description");
    await page.getByTestId("action-result-input").fill("Responsive check result");
    const save = page.getByTestId("save-action-btn");
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    await expect(page.getByTestId("cancel-action-btn")).toBeInViewport();
    // Evidence shows the form from its title down: scroll every scrollable
    // ancestor of the first field back to the top before the shot.
    await page.getByTestId("action-description-input").evaluate((el) => {
      for (let n: HTMLElement | null = el as HTMLElement; n; n = n.parentElement) n.scrollTop = 0;
    });
    await assertNoHorizontalScroll(page);
    await capture(page, "actions-taken/staff-ticket-action-form", testInfo.project.name, { fullPage: false });
    await page.getByTestId("cancel-action-btn").click();
    errors.assertClean();
  });
});

test.describe("RESP-19..21 requester ticket: Actions Taken, read-only", () => {
  test("six fields, no Record / Edit / Delete control", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page);
    const staffCookie = await staffSessionCookie();
    const ticket = await createTempTicket(undefined, "resp requester actions", staffCookie, ["OPEN", "IN_PROGRESS"]);
    const api = await newApi();
    for (const [i, d] of ["E2E first action", "E2E second action"].entries()) {
      const res = await api.post("http://localhost:5000/api/tickets/" + ticket.id + "/actions", {
        headers: { cookie: staffCookie },
        data: { description: d, result: `${d} result`, followUpRequired: i === 1, followUpNote: i === 1 ? "E2E follow up" : undefined, attachmentNotes: "E2E note" },
      });
      expect(res.status()).toBe(201);
    }
    await api.dispose();

    await loginAndUnlock(page, ticket.requesterEmail, ticket.requesterPassword);
    await page.goto(`/tickets/${ticket.id}`);
    const section = page.getByTestId("requester-actions");
    await expect(section.locator("li.action-card")).toHaveCount(2);
    await expect(section.getByRole("button")).toHaveCount(0);
    await section.scrollIntoViewIfNeeded();
    await finish(page, "actions-taken/requester-ticket-actions", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("RESP-22..27 workflow gate and confirmation dialog", () => {
  test("RESP-22..24: the gate message sits at the status control and the badge is unchanged", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page, EXPECTED_4XX);
    const staffCookie = await staffSessionCookie();
    const ticket = await createTempTicket(undefined, "resp gate", staffCookie, ["OPEN", "IN_PROGRESS"]);
    await staffLogin(page);
    await page.goto(`/staff/tickets/${ticket.id}`);
    const badge = page.locator(".ticket-detail-header .badge");
    await expect(badge).toHaveText("IN_PROGRESS");

    await page.getByTestId("staff-status-select").selectOption("RESOLVED");
    await page.getByTestId("status-confirm-accept").click();
    const message = page.getByTestId("status-error");
    await expect(message).toBeVisible();
    await expect(badge).toHaveText("IN_PROGRESS");

    // The message does not overlap the status control it belongs to.
    const m = (await message.boundingBox())!;
    const s = (await page.getByTestId("staff-status-select").boundingBox())!;
    const overlap = m.x < s.x + s.width && m.x + m.width > s.x && m.y < s.y + s.height && m.y + m.height > s.y;
    expect(overlap, "gate message overlaps the status select").toBe(false);
    await message.scrollIntoViewIfNeeded();
    await finish(page, "workflow-gate-blocked", testInfo.project.name);
    errors.assertClean();
  });

  test("RESP-25..27: the dialog names the transition and both buttons are reachable", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page);
    const staffCookie = await staffSessionCookie();
    const ticket = await createTempTicket(undefined, "resp dialog", staffCookie, ["OPEN", "IN_PROGRESS"]);
    await staffLogin(page);
    await page.goto(`/staff/tickets/${ticket.id}`);
    await page.getByTestId("staff-status-select").selectOption("RESOLVED");
    const dialog = page.getByTestId("status-confirm-dialog");
    await expect(dialog).toContainText("IN PROGRESS");
    await expect(dialog).toContainText("RESOLVED");
    await expect(page.getByTestId("status-confirm-accept")).toBeInViewport();
    await expect(page.getByTestId("status-confirm-cancel")).toBeInViewport();
    await assertNoHorizontalScroll(page);
    await capture(page, "workflow-confirm-dialog", testInfo.project.name, { fullPage: false });
    // Close without confirming: nothing is written.
    await page.getByTestId("status-confirm-cancel").click();
    await expect(page.locator(".ticket-detail-header .badge")).toHaveText("IN_PROGRESS");
    errors.assertClean();
  });
});

test.describe("RESP-28..30 staff Actions Taken, empty", () => {
  test("a ticket with no actions shows a helpful empty block, not bare headers", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const id = await ticketIdByNumber(await staffSessionCookie(), seedTicketWithoutActions());
    await staffLogin(page);
    await page.goto(`/staff/tickets/${id}`);
    await page.getByTestId("tab-actions").click();
    await expect(page.getByTestId("actions-empty")).toBeVisible();
    await expect(page.getByTestId("empty-record-action-btn")).toBeVisible();
    await expect(page.getByTestId("actions-list")).toHaveCount(0);
    await finish(page, "actions-taken/staff-ticket-actions-empty", testInfo.project.name);
    errors.assertClean();
  });
});
