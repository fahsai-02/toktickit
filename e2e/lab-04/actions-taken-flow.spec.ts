import { expect, test } from "@playwright/test";
import {
  API_BASE, STAFF_EMAIL, STAFF_PASSWORD, STAFF_NAME,
  collectConsoleErrors, createTempTicket, loginAndUnlock, loginViaUi,
  recordActionViaApi, staffSessionCookie, useLab3DbHooks,
} from "./helpers.js";

// Lab 4 E2E — Actions Taken. docs/lab-04/tests.md E2E-01, E2E-02, E2E-06.
// Every write goes to a throw-away ticket ("E2E lab4 ..."), never a seed ticket.
useLab3DbHooks();

// A deliberate 4xx makes Chrome log "Failed to load resource"; that is the
// handled path under test, not an unhandled error (E2E-06).
const EXPECTED_4XX = [/Failed to load resource: the server responded with a status of 4\d\d/];

test.describe("Actions Taken journeys", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "functional spec: desktop only");
  });

  // E2E-01 — AC-01, AC-02; specification.md FR-01, FR-02, FR-04, BR-04.
  test("E2E-01: staff records an action, sees the performer, and a stale second edit is refused with 409", async ({ page, request }) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page, EXPECTED_4XX);
    const staffCookie = await staffSessionCookie(request);
    const ticket = await createTempTicket(request, "actions flow", staffCookie, ["OPEN", "IN_PROGRESS"]);

    await loginViaUi(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await page.goto(`/staff/tickets/${ticket.id}`);
    await page.getByTestId("tab-actions").click();
    await expect(page.getByTestId("actions-empty")).toBeVisible();

    // Record: the performer must come from the session, not the form.
    await page.getByTestId("empty-record-action-btn").click();
    await page.getByTestId("action-description-input").fill("E2E checked the cable");
    await page.getByTestId("action-result-input").fill("E2E cable replaced");
    const created = page.waitForResponse((r) => r.url().endsWith(`/api/tickets/${ticket.id}/actions`) && r.request().method() === "POST");
    await page.getByTestId("save-action-btn").click();
    const createdRes = await created;
    expect(createdRes.status()).toBe(201);
    const action = ((await createdRes.json()) as { data: { id: number; version: number } }).data;

    const row = page.getByTestId(`action-${action.id}`);
    await expect(row).toContainText("E2E checked the cable");
    await expect(row).toContainText("E2E cable replaced");
    await expect(page.getByTestId(`action-performed-by-${action.id}`)).toHaveText(STAFF_NAME);

    // Edit while someone else edits the same record first -> 409 on Save.
    await page.getByTestId(`edit-action-${action.id}`).click();
    await page.getByTestId("action-description-input").fill("E2E my edit");
    const staffCookie2 = await staffSessionCookie(request);
    const other = await request.put(`${API_BASE}/api/actions/${action.id}`, {
      headers: { cookie: staffCookie2 },
      data: { description: "E2E edited elsewhere", result: "E2E cable replaced", version: action.version },
    });
    expect(other.status()).toBe(200);

    const saved = page.waitForResponse((r) => r.url().endsWith(`/api/actions/${action.id}`) && r.request().method() === "PUT");
    await page.getByTestId("save-action-btn").click();
    expect((await saved).status()).toBe(409);
    await expect(page.getByTestId("action-conflict-callout")).toBeVisible();
    // The other writer's text is what is stored; ours did not overwrite it.
    await page.getByTestId("action-conflict-refresh").click();
    await expect(page.getByTestId(`action-${action.id}`)).toContainText("E2E edited elsewhere");
    await expect(page.getByTestId(`action-${action.id}`)).not.toContainText("E2E my edit");
    errors.assertClean();
  });

  // E2E-02 — AC-05; FR-03, BR-08, FR-24, FR-25.
  test("E2E-02: a requester reads all six fields, has no write controls, and the API refuses them with 403", async ({ page, request }) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page, EXPECTED_4XX);
    const staffCookie = await staffSessionCookie(request);
    const ticket = await createTempTicket(request, "requester read", staffCookie, ["OPEN", "IN_PROGRESS"]);
    const res = await request.post(`${API_BASE}/api/tickets/${ticket.id}/actions`, {
      headers: { cookie: staffCookie },
      data: {
        description: "E2E six-field description",
        result: "E2E six-field result",
        followUpRequired: true,
        followUpNote: "E2E follow-up note",
        attachmentNotes: "E2E attachment note",
      },
    });
    expect(res.status()).toBe(201);
    const actionId = ((await res.json()) as { data: { id: number } }).data.id;

    await loginAndUnlock(page, ticket.requesterEmail, ticket.requesterPassword);
    await page.goto(`/tickets/${ticket.id}`);
    const section = page.getByTestId("requester-actions");
    const entry = section.getByTestId(`action-${actionId}`);
    await expect(entry).toBeVisible();
    for (const label of ["Date/Time", "Description", "Result", "Performed By", "Follow-Up", "Notes"]) {
      await expect(entry.locator("dt", { hasText: new RegExp(`^${label}$`) })).toBeVisible();
    }
    await expect(entry).toContainText("E2E six-field description");
    await expect(entry).toContainText("E2E six-field result");
    await expect(entry).toContainText("E2E follow-up note");
    await expect(entry).toContainText("E2E attachment note");
    await expect(entry).toContainText(STAFF_NAME);

    // No Record / Edit / Delete, no assignee, no per-action status.
    await expect(section.getByRole("button", { name: /record|edit|delete|remove/i })).toHaveCount(0);
    await expect(section.locator('[data-testid^="edit-action-"], [data-testid="record-action-btn"]')).toHaveCount(0);
    await expect(section.locator("select, input, textarea")).toHaveCount(0);
    await expect(section.getByText(/assignee/i)).toHaveCount(0);

    // The browser session itself is refused by the API (backend, not UI, enforces it).
    const results = await page.evaluate(
      async ({ ticketId, id }) => {
        const call = (url: string, method: string, body: unknown) =>
          fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.status);
        return {
          create: await call(`/api/tickets/${ticketId}/actions`, "POST", { description: "E2E denied", result: "E2E denied" }),
          update: await call(`/api/actions/${id}`, "PUT", { description: "E2E denied", result: "E2E denied", version: 1 }),
        };
      },
      { ticketId: ticket.id, id: actionId }
    );
    expect(results).toEqual({ create: 403, update: 403 });
    errors.assertClean();
  });
});
