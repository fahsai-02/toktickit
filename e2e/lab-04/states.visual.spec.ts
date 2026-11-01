import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, NEW_USER_INITIAL_PASSWORD, API_BASE,
  assertNoHorizontalScroll, capture, collectConsoleErrors, createTempTicket, expectedHttpError,
  createUserViaAdminApi, loginAndUnlock, newApi, seedTicketWithMostActions,
  seedTicketWithoutActions, staffLogin, staffSessionCookie, ticketIdByNumber,
  useLab3DbHooks,
} from "./helpers.js";

/**
 * STATE-01..27 — evidence for states a happy-path screenshot cannot show.
 * docs/lab-04/tests.md section 2 (State), ui-spec.md sections 5 and 9.
 *
 * Evidence type, per tests.md section 7 (a stub proves the LOOK, not the data):
 *   REAL DATA : STATE-01..06, 19..27
 *   STUBBED   : STATE-07..09 (forced 500), 10..12 (delayed response, real data
 *               after the delay), 13..15 (all-zero staff payload),
 *               16..18 (aborted request, then the real one)
 * Writes go only to "E2E lab4" throw-away tickets.
 */
useLab3DbHooks({ allProjects: true });

const GATE_REFUSAL = [expectedHttpError(400, /\/api\/staff\/tickets\/\d+\/status$/)];
const SAVE_CONFLICT = [expectedHttpError(409, /\/api\/actions\/\d+$/)];
const STUBBED_500 = [expectedHttpError(500, /\/api\/tickets\/\d+\/actions$/)];
// The aborted dashboard request: the network error, and only for that URL.
const ABORTED_DASHBOARD = [(text: string, url: string) =>
  /net::ERR_FAILED|Failed to load resource/.test(text) && /\/api\/dashboards\/staff$/.test(url)];
const shot = (page: Page, folder: string, project: string, fullPage = false) =>
  capture(page, `states/${folder}`, project, { fullPage });

async function openForm(page: Page, ticketId: number) {
  await staffLogin(page);
  await page.goto(`/staff/tickets/${ticketId}`);
  await page.getByTestId("tab-actions").click();
  await expect(page.getByTestId("panel-actions")).toBeVisible();
}

test.describe("STATE-01..03 action save conflict (real 409)", () => {
  test("the callout offers Refresh and the typed value stays on screen", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page, SAVE_CONFLICT);
    const staffCookie = await staffSessionCookie();
    const ticket = await createTempTicket(undefined, "state conflict", staffCookie, ["OPEN", "IN_PROGRESS"]);
    const api = await newApi();
    const made = await api.post(`${API_BASE}/api/tickets/${ticket.id}/actions`, {
      headers: { cookie: staffCookie }, data: { description: "E2E original", result: "E2E original result" },
    });
    const action = ((await made.json()) as { data: { id: number; version: number } }).data;

    await openForm(page, ticket.id);
    await page.getByTestId(`edit-action-${action.id}`).click();
    await page.getByTestId("action-description-input").fill("E2E my typed edit");
    // Someone else saves first, so the version this form holds is stale.
    const other = await api.put(`${API_BASE}/api/actions/${action.id}`, {
      headers: { cookie: staffCookie }, data: { description: "E2E other writer", result: "E2E original result", version: action.version },
    });
    expect(other.status()).toBe(200);
    await api.dispose();

    await page.getByTestId("save-action-btn").click();
    await expect(page.getByTestId("action-conflict-callout")).toBeVisible();
    await expect(page.getByTestId("action-conflict-refresh")).toBeVisible();
    await expect(page.getByTestId("action-description-input")).toHaveValue("E2E my typed edit");
    await assertNoHorizontalScroll(page);
    await shot(page, "action-save-conflict", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("STATE-04..06 action form validation errors (real, client side)", () => {
  test("every message sits under its own field, asterisks visible, no request sent", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const id = await ticketIdByNumber(await staffSessionCookie(), seedTicketWithoutActions());
    const posts: string[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/actions")) posts.push(r.url()); });
    await openForm(page, id);
    await page.getByTestId("empty-record-action-btn").click();
    await page.getByTestId("action-followup-toggle").click();
    await page.getByTestId("save-action-btn").click();
    for (const t of ["action-description-error", "action-result-error", "action-followup-note-error"]) {
      await expect(page.getByTestId(t)).toBeVisible();
    }
    for (const label of ["Description", "Result", "Follow-Up Note"]) {
      await expect(page.locator("label", { hasText: label }).locator(".required")).toBeVisible();
    }
    expect(posts, "validation failure must not call the API").toEqual([]);
    await assertNoHorizontalScroll(page);
    await shot(page, "action-validation-errors", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("STATE-07..09 form retained after a safe failure (STUB: forced 500)", () => {
  test("every value survives, the callout is safe, no raw error text", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page, STUBBED_500);
    const id = await ticketIdByNumber(await staffSessionCookie(), seedTicketWithoutActions());
    // The real global handler answers { code, message: "Internal server error" }; any extra
    // raw fields a faulty proxy or future change adds must still never reach the screen.
    const RAW = "SqlState 42P01 relation public.ActionTaken at pg_stack_trace";
    await page.route("**/api/tickets/*/actions", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Internal server error", stack: RAW, detail: RAW } }) });
    });
    await openForm(page, id);
    await page.getByTestId("empty-record-action-btn").click();
    await page.getByTestId("action-description-input").fill("E2E retained description");
    await page.getByTestId("action-result-input").fill("E2E retained result");
    await page.getByTestId("action-followup-toggle").click();
    await page.getByTestId("action-followup-note-input").fill("E2E retained follow-up");
    await page.getByTestId("action-attachment-notes-input").fill("E2E retained notes");
    await page.getByTestId("save-action-btn").click();

    await expect(page.getByTestId("action-form-error")).toBeVisible();
    await expect(page.getByTestId("action-description-input")).toHaveValue("E2E retained description");
    await expect(page.getByTestId("action-result-input")).toHaveValue("E2E retained result");
    await expect(page.getByTestId("action-followup-note-input")).toHaveValue("E2E retained follow-up");
    await expect(page.getByTestId("action-attachment-notes-input")).toHaveValue("E2E retained notes");
    await expect(page.locator("body")).not.toContainText("SqlState");
    await expect(page.locator("body")).not.toContainText("pg_stack_trace");
    await assertNoHorizontalScroll(page);
    await shot(page, "action-form-retained-after-failure", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("STATE-10..12 dashboard loading (STUB: delayed response)", () => {
  test("skeletons are on screen while the request is held, then real data lands", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await staffLogin(page);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/api/dashboards/staff", async (route) => { await gate; await route.continue(); });
    await page.goto("/staff/dashboard");
    await expect(page.getByTestId("dashboard-loading")).toBeVisible();
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Loading queue data...");
    await assertNoHorizontalScroll(page);
    await shot(page, "dashboard-loading", testInfo.project.name, true);
    release();
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    await expect(page.getByTestId("dashboard-loading")).toHaveCount(0);
    errors.assertClean();
  });
});

test.describe("STATE-13..15 dashboard zero metrics (STUB: all-zero staff payload; real zeros are RESP-04..06)", () => {
  test("every card shows 0 and the Not set bucket is still present", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await staffLogin(page);
    await page.route("**/api/dashboards/staff", (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: {
        counts: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, unassigned: 0, myAssigned: 0, urgentTickets: 0 },
        byItPriority: [
          { itPriority: "URGENT", count: 0 }, { itPriority: "HIGH", count: 0 }, { itPriority: "MEDIUM", count: 0 },
          { itPriority: "LOW", count: 0 }, { itPriority: null, count: 0 },
        ],
        recentTickets: [], urgentTickets: [], myRecentActions: [],
      } }),
    }));
    await page.goto("/staff/dashboard");
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    for (const id of ["new", "open", "in-progress", "waiting", "unassigned", "my-assigned"]) {
      await expect(page.getByTestId(`metric-card-${id}`).locator(".metric-card__value")).toHaveText("0");
    }
    await expect(page.getByTestId("priority-bucket-null")).toContainText("Not set");
    await expect(page.getByTestId("priority-bucket-null").locator(".priority-strip__count")).toHaveText("0");
    await assertNoHorizontalScroll(page);
    await shot(page, "dashboard-zero-metrics", testInfo.project.name, true);
    errors.assertClean();
  });
});

test.describe("STATE-16..18 dashboard error and retry (STUB: aborted request)", () => {
  test("an error block with a working Retry, and no stale numbers while it shows", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page, ABORTED_DASHBOARD);
    await staffLogin(page);
    await page.route("**/api/dashboards/staff", (route) => route.abort("failed"));
    await page.goto("/staff/dashboard");
    await expect(page.getByTestId("dashboard-error")).toBeVisible();
    await expect(page.locator(".metric-card")).toHaveCount(0);
    await expect(page.getByTestId("priority-strip")).toHaveCount(0);
    await assertNoHorizontalScroll(page);
    await shot(page, "dashboard-error-retry", testInfo.project.name);

    await page.unroute("**/api/dashboards/staff");
    await page.getByTestId("dashboard-error").getByRole("button", { name: "Retry" }).click();
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    await expect(page.getByTestId("metric-card-new")).toBeVisible();
    await expect(page.getByTestId("dashboard-error")).toHaveCount(0);
    errors.assertClean();
  });
});

test.describe("STATE-19..21 Actions Taken keyboard focus (real data)", () => {
  test("a 2px ring is on the tab and on a row Edit button", async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const { ticketNumber } = seedTicketWithMostActions();
    const id = await ticketIdByNumber(await staffSessionCookie(), ticketNumber);
    await openForm(page, id);
    await expect(page.getByTestId("actions-list")).toBeVisible();

    const ring = (testId: string) => page.getByTestId(testId).first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { visible: el.matches(":focus-visible"), width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset, shadow: cs.boxShadow };
    });
    // Keyboard modality first, so :focus-visible applies exactly as for a Tab press.
    await page.keyboard.press("Tab");
    await page.getByTestId("tab-actions").focus();
    const tab = await ring("tab-actions");
    const editId = await page.locator('[data-testid^="edit-action-"]').first().getAttribute("data-testid");
    await page.keyboard.press("Tab");
    await page.getByTestId(editId!).focus();
    const edit = await ring(editId!);
    for (const r of [tab, edit]) {
      expect(r.visible).toBe(true);
      const outline = r.style !== "none" && parseFloat(r.width) >= 2;
      const shadow = /\b2px\b/.test(r.shadow);
      expect(outline || shadow, JSON.stringify(r)).toBe(true);
    }
    await page.getByTestId(editId!).scrollIntoViewIfNeeded();
    await assertNoHorizontalScroll(page);
    await shot(page, "action-tab-keyboard-focus", testInfo.project.name);
    errors.assertClean();
  });
});

test.describe("STATE-22..27 gate and dialog (real data, throw-away ticket)", () => {
  test("STATE-22..24: both unmet conditions are named and the badge holds", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page, GATE_REFUSAL);
    const staffCookie = await staffSessionCookie();
    const ticket = await createTempTicket(undefined, "state gate", staffCookie, ["OPEN", "IN_PROGRESS"]);
    await staffLogin(page);
    await page.goto(`/staff/tickets/${ticket.id}`);
    await page.getByTestId("staff-status-select").selectOption("RESOLVED");
    await page.getByTestId("status-confirm-accept").click();
    const msg = page.getByTestId("status-error");
    await expect(msg).toContainText("resolution summary");
    await expect(msg).toContainText("Action Taken");
    await expect(page.locator(".ticket-detail-header .badge")).toHaveText("IN_PROGRESS");
    await msg.scrollIntoViewIfNeeded();
    await assertNoHorizontalScroll(page);
    await shot(page, "gate-blocked-both-unmet", testInfo.project.name);
    errors.assertClean();
  });

  test("STATE-25..27: focus stays inside the open dialog and the transition is named", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page);
    const staffCookie = await staffSessionCookie();
    const ticket = await createTempTicket(undefined, "state dialog", staffCookie, ["OPEN", "IN_PROGRESS"]);
    await staffLogin(page);
    await page.goto(`/staff/tickets/${ticket.id}`);
    await page.getByTestId("staff-status-select").selectOption("RESOLVED");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("IN PROGRESS");
    await expect(dialog).toContainText("RESOLVED");
    const insideDialog = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(await insideDialog()).toBe(true);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      expect(await insideDialog(), `focus escaped on Tab ${i + 1}`).toBe(true);
    }
    await assertNoHorizontalScroll(page);
    await shot(page, "confirm-dialog-open", testInfo.project.name);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    errors.assertClean();
  });
});

// ── Layout shift (STATE-10..12, ui-spec section 5.1 "no layout shift") ──────
// Measured, not eyeballed: every dashboard section is measured while the
// response is held (skeleton on screen) and again after the data lands, for an
// empty, a mid (3 rows) and a maximum (5 rows per list, 10 urgent) payload, for
// all three roles. api-spec section 3.1-3.3 caps: 5, 5, 10, 5.
const SECTIONS = [
  ".dashboard-grid", ".dashboard-attention", ".dashboard-ownership", ".priority-strip",
  ".dashboard-urgent-section", ".dashboard-lists", ".dashboard-admin-section",
];
const TOLERANCE_PX = 3;

const row = (i: number, staff: boolean, prio: string | null = "URGENT") => ({
  id: 1000 + i, ticketNumber: `TKT-2026-${String(900000 + i).slice(-6)}`,
  summary: `Layout shift probe ticket number ${i} with a deliberately long summary that must be cut to one line`,
  currentStatus: "IN_PROGRESS", itPriority: staff ? prio : null,
  updatedAt: "2026-10-30T09:00:00.000Z", ...(staff ? { owner: { id: 1, name: "Sara Patel" } } : {}),
});
const act = (i: number) => ({
  id: 2000 + i, ticketId: 1000 + i, ticketNumber: `TKT-2026-${String(900000 + i).slice(-6)}`,
  actionDate: "2026-10-30T09:00:00.000Z", description: `Probe action ${i} with a long description to force ellipsis on one line`,
  result: "Done", performedById: 1, updatedAt: "2026-10-30T09:00:00.000Z",
});
const requesterPayload = (n: number) => ({
  counts: { open: n, inProgress: n, waitingForRequester: n, resolved: n, closed: n, attentionRequired: n },
  recentTickets: Array.from({ length: n }, (_, i) => row(i, false)),
  recentlyResolved: Array.from({ length: n }, (_, i) => row(50 + i, false)),
});
const staffPayload = (recent: number, urgent: number, actions: number, admin: boolean) => ({
  counts: { new: recent, open: recent, inProgress: recent, waitingForRequester: recent, unassigned: recent, myAssigned: recent, urgentTickets: urgent },
  byItPriority: [
    { itPriority: "URGENT", count: urgent }, { itPriority: "HIGH", count: recent }, { itPriority: "MEDIUM", count: recent },
    { itPriority: "LOW", count: recent }, { itPriority: null, count: recent },
  ],
  recentTickets: Array.from({ length: recent }, (_, i) => row(i, true, "HIGH")),
  urgentTickets: Array.from({ length: urgent }, (_, i) => row(100 + i, true)),
  myRecentActions: Array.from({ length: actions }, (_, i) => act(i)),
  ...(admin ? { userCounts: { total: 14, active: 12, inactive: 2 } } : {}),
});

async function measure(page: Page) {
  return page.evaluate((sels) => {
    const out: Record<string, { top: number; height: number } | null> = {};
    for (const s of sels) {
      const el = document.querySelector(s);
      if (!el) { out[s] = null; continue; }
      const r = el.getBoundingClientRect();
      out[s] = { top: Math.round(r.top + window.scrollY), height: Math.round(r.height) };
    }
    out.__page = { top: 0, height: document.documentElement.scrollHeight };
    return out;
  }, SECTIONS);
}

async function expectNoShift(page: Page, path: string, endpoint: string, payload: unknown, label: string) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const pattern = `**/api/dashboards/${endpoint}`;
  await page.route(pattern, async (route) => {
    await gate;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: payload }) });
  });
  await page.goto(path);
  await expect(page.getByTestId("dashboard-loading")).toBeVisible();
  const before = await measure(page);
  release();
  await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
  const after = await measure(page);
  await page.unroute(pattern);

  for (const [sel, a] of Object.entries(after)) {
    if (!a) continue;
    const b = before[sel];
    expect(b, `${label}: ${sel} exists after load but the skeleton has no such section`).toBeTruthy();
    expect(Math.abs(b!.top - a.top), `${label}: ${sel} top ${b!.top} -> ${a.top}`).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs(b!.height - a.height), `${label}: ${sel} height ${b!.height} -> ${a.height}`).toBeLessThanOrEqual(TOLERANCE_PX);
  }
}

test.describe("STATE-10..12 layout shift is measured (empty, mid, maximum payloads)", () => {
  test("Requester dashboard", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const admin = await newApi();
    const user = await createUserViaAdminApi(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "REQUESTER");
    await admin.dispose();
    await loginAndUnlock(page, user.email, NEW_USER_INITIAL_PASSWORD);
    for (const [name, n] of [["empty", 0], ["mid", 3], ["max", 5]] as const) {
      await expectNoShift(page, "/dashboard", "requester", requesterPayload(n), `${testInfo.project.name} requester ${name}`);
    }
  });

  for (const role of ["IT Staff", "Administrator"] as const) {
    test(`${role} dashboard`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      if (role === "Administrator") await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      else await staffLogin(page);
      const isAdmin = role === "Administrator";
      for (const [name, recent, urgent, actions] of [["empty", 0, 0, 0], ["mid", 3, 3, 3], ["max", 5, 10, 5]] as const) {
        await expectNoShift(page, "/staff/dashboard", "staff", staffPayload(recent, urgent, actions, isAdmin), `${testInfo.project.name} ${role} ${name}`);
      }
    });
  }
});
