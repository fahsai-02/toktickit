import { test, expect } from "@playwright/test";
import {
  TINY_PNG,
  createTicketViaApi,
  uploadAttachmentViaApi,
  removeAttachmentViaApi,
  seedRequester,
  capture,
} from "./helpers.js";

// ── State-evidence screenshots ───────────────────────────────────────────────

const REQ = {
  napat: { id: 5, name: "Napat Chaiwong" }, // guaranteed 0 tickets (empty state)
  sarah: { id: 3, name: "Sarah Johnson" }, // already has tickets (no-results/busy)
  michael: { id: 4, name: "Michael Brown" }, // attachment states
} as const;

test("STATE create-ticket validation messages under their own field", async ({ page }, testInfo) => {
  seedRequester(page, REQ.napat);
  await page.goto("/create-ticket");
  await expect(page.getByTestId("category")).toBeVisible();

  await page.getByTestId("submit-ticket").click();
  await expect(page.locator(".field-error-msg")).toHaveCount(5);
  await expect(page.locator(".field-label .required")).toHaveCount(5);

  await capture(page, "states/create-validation", testInfo.project.name);
});

test("STATE create-ticket submit busy state (button spinner)", async ({ page }, testInfo) => {
  seedRequester(page, REQ.sarah);
  await page.goto("/create-ticket");
  await expect(page.getByTestId("category")).toBeVisible();

  // Fill a valid form, then delay the POST so the button shows its busy state.
  await page.getByTestId("category").selectOption({ label: "Hardware" });
  const relatedSystem = page.getByTestId("relatedSystem");
  await expect(relatedSystem).toBeEnabled();
  await relatedSystem.selectOption({ label: "Corporate Laptop" });
  await page.getByTestId("priority").selectOption({ label: "HIGH" });
  await page.getByTestId("summary").fill("Busy-state screenshot ticket");
  await page.getByTestId("description").fill("Demonstrates the submit busy state.");

  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });

  await page.getByTestId("submit-ticket").click();
  const submitBtn = page.getByTestId("submit-ticket");
  await expect(submitBtn.locator(".spinner")).toBeVisible();
  await expect(submitBtn).toBeDisabled();
  await capture(page, "states/submit-busy", testInfo.project.name);

  // Release the route and confirm the submission completes.
  await expect(page.getByTestId("go-to-my-tickets")).toBeVisible({ timeout: 15_000 });
});

test("STATE my-tickets empty state", async ({ page }, testInfo) => {
  seedRequester(page, REQ.napat);
  await page.goto("/my-tickets");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await capture(page, "states/list-empty", testInfo.project.name);
});

test("STATE my-tickets no-results state", async ({ page }, testInfo) => {
  seedRequester(page, REQ.sarah);
  await page.goto("/my-tickets");

  await expect
    .poll(async () =>
      page.locator('[data-testid^="ticket-row-"], [data-testid^="ticket-card-"]').count()
    )
    .toBeGreaterThanOrEqual(1);

  // Search a term that matches nothing → no-results state (visually distinct from empty).
  await page.getByTestId("search-input").fill("zzzz-no-such-ticket");
  await expect(page.getByTestId("no-results-state")).toBeVisible({ timeout: 10_000 });
  await capture(page, "states/list-no-results", testInfo.project.name);
});

test("STATE attachment uploading spinner", async ({ page, request }, testInfo) => {
  const ticket = await createTicketViaApi(request, REQ.michael.id, `uploading-state ${Date.now()}`);
  seedRequester(page, REQ.michael);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByTestId("attachment-section")).toBeVisible();

  // Delay the upload POST so the "Uploading…" spinner row is visible.
  await page.route("**/api/tickets/*/attachments", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });

  await page
    .getByTestId("attachment-file-input")
    .setInputFiles({ name: "screenshot.png", mimeType: "image/png", buffer: TINY_PNG });
  await expect(page.getByTestId("uploading-attachment")).toBeVisible();
  await capture(page, "states/attachment-uploading", testInfo.project.name);

  // Release and confirm the upload completes.
  await expect(page.locator('[data-testid^="attachment-active-"]')).toHaveCount(1, {
    timeout: 15_000,
  });
});

test("STATE attachment invalid rejected at the picker", async ({ page, request }, testInfo) => {
  const ticket = await createTicketViaApi(request, REQ.michael.id, `invalid-state ${Date.now()}`);
  seedRequester(page, REQ.michael);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByTestId("attachment-section")).toBeVisible();

  // Selecting a .txt file is rejected client-side at the picker.
  await page
    .getByTestId("attachment-file-input")
    .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(page.getByTestId("local-errors")).toContainText("not an allowed type");
  await capture(page, "states/attachment-invalid", testInfo.project.name);
});

test("STATE attachment active + removed rows (muted, blocked download)", async ({ page, request }, testInfo) => {
  const ticket = await createTicketViaApi(request, REQ.michael.id, `active-removed-state ${Date.now()}`);
  const active = await uploadAttachmentViaApi(request, ticket.id, REQ.michael.id, "keep-me.png");
  const removed = await uploadAttachmentViaApi(request, ticket.id, REQ.michael.id, "remove-me.png");
  await removeAttachmentViaApi(request, removed.id, REQ.michael.id, "No longer needed");

  seedRequester(page, REQ.michael);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByTestId(`attachment-active-${active.id}`)).toBeVisible();
  await expect(page.getByTestId(`attachment-removed-${removed.id}`)).toBeVisible();
  await expect(page.getByTestId(`download-disabled-btn-${removed.id}`)).toBeDisabled();
  await capture(page, "states/attachment-active-removed", testInfo.project.name);
});

test("STATE attachment unavailable row-level error with retry", async ({ page, request }, testInfo) => {
  const ticket = await createTicketViaApi(request, REQ.michael.id, `unavailable-state ${Date.now()}`);
  const attachment = await uploadAttachmentViaApi(request, ticket.id, REQ.michael.id, "photo.png");

  seedRequester(page, REQ.michael);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByTestId(`attachment-active-${attachment.id}`)).toBeVisible();

  // Make the download fail so the row shows an inline error + Retry.
  await page.route("**/api/attachments/*/download**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Download failed" } }),
    })
  );
  await page.getByTestId(`download-btn-${attachment.id}`).click();
  await expect(page.getByTestId(`retry-download-btn-${attachment.id}`)).toBeVisible();
  await expect(page.locator(".attachment-error-text")).toBeVisible();
  await capture(page, "states/attachment-unavailable", testInfo.project.name);
});

test("STATE long attachment filename ellipsizes gracefully", async ({ page, request }, testInfo) => {
  const ticket = await createTicketViaApi(request, REQ.michael.id, `long-filename-state ${Date.now()}`);
  const LONG_NAME =
    "an-extremely-long-attachment-file-name-which-combines-many-words-to-force-the-row-to-truncate-gracefully-with-ellipsis-demonstration.png";
  const attachment = await uploadAttachmentViaApi(request, ticket.id, REQ.michael.id, LONG_NAME);

  seedRequester(page, REQ.michael);
  await page.goto(`/tickets/${ticket.id}`);
  const nameEl = page.getByTestId(`attachment-active-${attachment.id}`).locator(".attachment-name");
  await expect(nameEl).toHaveText(LONG_NAME);

  // On the narrow mobile viewport the name is ellipsized by CSS (ui-spec 9
  // item 10). Confirm the ellipsis rule actually applies and overflows.
  if (testInfo.project.name === "mobile") {
    const style = await nameEl.evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        overflow: computed.overflow,
        textOverflow: computed.textOverflow,
        whiteSpace: computed.whiteSpace,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    });
    expect(style.textOverflow).toBe("ellipsis");
    expect(style.overflow).toBe("hidden");
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.scrollWidth).toBeGreaterThan(style.clientWidth);
  }
  await capture(page, "states/long-filename", testInfo.project.name);
});