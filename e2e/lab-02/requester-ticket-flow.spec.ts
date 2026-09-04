import { test, expect, type Page } from "@playwright/test";
import { API_BASE, TINY_PNG, createTicketViaApi } from "./helpers.js";

// ── Configuration ────────────────────────────────────────────────────────────
// The E2E flow runs against the full stack (API :5000 + Vite :5173) and is
// scoped to the **desktop** project only (tests.md RESP/E2E note: viewport
// matrix is covered by the responsive spec; the flow does not need 3 widths).

const REQUESTER_JENNIFER = { id: 1, name: "Jennifer Anderson" };
const REQUESTER_DAVID = { id: 2, name: "David Lee" };

// ── Helpers ─────────────────────────────────────────────────────────────────

async function makePngFixture(name: string): Promise<string> {
  const { writeFileSync } = await import("node:fs");
  const path = `tmp-${name}`;
  writeFileSync(path, TINY_PNG);
  return path;
}

async function selectRequester(page: Page, name: string) {
  await page.goto("/select-requester");
  const select = page.getByTestId("requester-select");
  await select.waitFor({ state: "visible" });
  // RequesterSelect options render as <option value=<id>> with label "Name (email)".
  // getAttribute auto-waits for the option to exist without requiring visibility.
  const option = select.locator("option").filter({ hasText: name }).first();
  const value = await option.getAttribute("value");
  expect(value, `option for ${name} should have a value`).toBeTruthy();
  await select.selectOption(value as string);
  await page.getByTestId("continue-button").click();
  await page.waitForURL("**/my-tickets");
}

async function searchTickets(page: Page, term: string) {
  const input = page.getByTestId("search-input");
  await input.fill(term);
  // search is debounced 300ms + refetch; poll until loading resolves
  await expect(page.getByTestId("loading-state")).toBeHidden({ timeout: 10_000 });
}

// ── E2E-01: Happy-path journey (AC-01, 11, 17, 19, 22, 23, 24) ──────────────

test.describe("E2E requester ticket flow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    // Only run this file's tests on the desktop project (per user requirement).
    test.skip(
      testInfo.project.name !== "desktop",
      "E2E flow runs only against the desktop viewport project"
    );
  });

  test("E2E-01 full happy path: create, locate, detail, attach, download, soft-remove", async ({
    page,
    request,
  }) => {
    const unique = Date.now();
    const summary = `E2E screen flicker ${unique}`;
    const pngPath = await makePngFixture(`e2e-${unique}.png`);

    try {
      // 1. Select requester and land on My Tickets
      await selectRequester(page, REQUESTER_JENNIFER.name);

      // 2. Go to Create Ticket
      await page.getByTestId("create-ticket-btn").click();
      await page.waitForURL("**/create-ticket");

      // Read-only row should show "Generated upon submission" + requester name
      await expect(page.locator("text=Generated upon submission")).toBeVisible();
      await expect(page.locator("text=Jennifer Anderson").first()).toBeVisible();

      // 3. Fill classification + text fields (FR-06: related system reloads on category)
      await page.getByTestId("category").selectOption({ label: "Hardware" });
      // Related System reloads; Corporate Laptop (id 7) must now be present/enabled
      const relatedSystem = page.getByTestId("relatedSystem");
      await expect(relatedSystem).toBeEnabled();
      await expect(
        relatedSystem.locator("option", { hasText: "Corporate Laptop" })
      ).toHaveCount(1);
      await page.getByTestId("relatedSystem").selectOption({ label: "Corporate Laptop" });
      await page.getByTestId("priority").selectOption({ label: "MEDIUM" });
      await page.getByTestId("summary").fill(summary);
      await page
        .getByTestId("description")
        .fill(`The laptop screen flickers every few minutes (run ${unique}).`);

      // 4. Stage an attachment (validated client-side before submit)
      await page.getByTestId("file-input").setInputFiles(pngPath);
      await expect(page.locator(".staged-chip", { hasText: pngPath.split("/").pop()! })).toBeVisible();

      // 5. Submit → success panel with ticket number; staged file auto-uploads (AD-03)
      await page.getByTestId("submit-ticket").click();
      await expect(page.locator("text=Ticket created:")).toBeVisible({ timeout: 15_000 });
      const numberText = (await page
        .locator("strong")
        .filter({ hasText: "TKT-" })
        .innerText()).trim();
      const numberMatch = numberText.match(/TKT-\d{4}-\d{6}/);
      expect(numberMatch, `expected a ticket number in "${numberText}"`).toBeTruthy();
      const ticketNumber = numberMatch![0];

      // Auto-upload completes
      await expect(page.getByTestId("upload-progress")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(".uploaded-item--success")).toBeVisible({ timeout: 15_000 });

      // 6. Open ticket detail (AC-17)
      await page.getByRole("button", { name: "View ticket" }).click();
      await page.waitForURL(/\/tickets\/\d+$/);
      const detail = page.getByTestId("ticket-detail");
      await expect(detail).toBeVisible();

      const detailNumber = await detail.locator(".ticket-detail-number").innerText();
      expect(detailNumber).toBe(ticketNumber);
      await expect(detail.locator("text=NEW")).toBeVisible(); // status badge
      await expect(detail.locator("text=Corporate Laptop")).toBeVisible();
      await expect(detail.locator("text=MEDIUM")).toBeVisible(); // priority badge
      // IT priority renders "—"
      await expect(detail.locator("text=—")).toBeVisible();
      // Read-only: the ticket info card has no editable inputs (the file picker
      // in the attachment section below is a legitimate upload control).
      await expect(detail.locator(".ticket-detail-card input, .ticket-detail-card select, .ticket-detail-card textarea")).toHaveCount(0);

      // 7. The auto-uploaded attachment is now active (AC-19)
      const attachmentSection = page.getByTestId("attachment-section");
      await expect(attachmentSection).toBeVisible();
      const activeRow = attachmentSection.locator('[data-testid^="attachment-active-"]');
      await expect(activeRow.first()).toBeVisible({ timeout: 15_000 });

      // 8. Download the active attachment (AC-22)
      const downloadPromise = page.waitForEvent("download");
      const dlBtn = activeRow.first().locator('[data-testid^="download-btn-"]');
      await dlBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(pngPath.split("/").pop());

      // 9. Soft-remove with a valid reason (AC-23)
      await activeRow.first().locator('[data-testid^="remove-btn-"]').click();
      const dialog = page.getByTestId("remove-dialog");
      await expect(dialog).toBeVisible();
      // Confirm is disabled with an empty/short reason
      const confirmBtn = dialog.getByTestId("confirm-remove-btn");
      await expect(confirmBtn).toBeDisabled();
      await dialog.getByTestId("remove-reason-input").fill("Attached the wrong screenshot");
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();
      await expect(dialog).toBeHidden();

      // Row now rendered as removed / muted (AC-24)
      const removedRow = attachmentSection.locator('[data-testid^="attachment-removed-"]');
      await expect(removedRow.first()).toBeVisible({ timeout: 15_000 });
      await expect(removedRow.first()).toContainText("Removed");
      await expect(removedRow.first()).toContainText("Attached the wrong screenshot");
      // Download is disabled for removed attachment
      const disabledDownload = removedRow.locator('[data-testid^="download-disabled-btn-"]');
      await expect(disabledDownload).toBeDisabled();
      await expect(disabledDownload).toHaveAttribute(
        "title",
        "Removed attachments cannot be downloaded"
      );

      // Backend enforces the 410 Gone for a removed attachment download (AC-24 / BR-10).
      // The attachment id is encoded in the removed row's data-testid (attachment-removed-<id>).
      const removedTestId = (await removedRow.first().getAttribute("data-testid")) ?? "";
      const removedId = removedTestId.match(/attachment-removed-(\d+)/)?.[1];
      expect(removedId, `could not parse attachment id from "${removedTestId}"`).toBeTruthy();
      const gone = await request.get(
        `${API_BASE}/api/attachments/${removedId}/download?requesterId=${REQUESTER_JENNIFER.id}`
      );
      expect(gone.status(), "removed attachment download must be 410 Gone").toBe(410);

      // 10. Back to My Tickets; ticket is findable via search (AC-11, AC-12)
      await page.getByTestId("ticket-detail").locator("a.back-link").click();
      await page.waitForURL("**/my-tickets");
      await searchTickets(page, ticketNumber);
      await expect(page.getByTestId("ticket-table-desktop").locator("text=" + summary)).toBeVisible();
    } finally {
      // Cleanup the temp fixture even if the test fails mid-way (no orphan files left)
      const fs = await import("node:fs");
      fs.rmSync(pngPath, { force: true });
    }
  });

  test("E2E-02 cross-requester isolation: switching requester hides the other's tickets", async ({
    page,
    request,
  }) => {
    const unique = Date.now();
    const jenniferSummary = `E2E Jennifer laptop ${unique}`;
    const jenniferTicket = await createTicketViaApi(request, REQUESTER_JENNIFER.id, jenniferSummary, { requestedPriority: "HIGH" });

    // Select Jennifer, her ticket must be visible (AC-11)
    await selectRequester(page, REQUESTER_JENNIFER.name);
    await searchTickets(page, jenniferTicket.ticketNumber);
    await expect(page.getByTestId("ticket-table-desktop").locator("text=" + jenniferSummary)).toBeVisible();

    // Switch requester to David via Change Requester (AC-09)
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Change Requester" }).click();
    await page.waitForURL("**/select-requester");
    await selectRequester(page, REQUESTER_DAVID.name);

    // Jennifer's ticket must be invisible for David (AC-09/11)
    await searchTickets(page, jenniferTicket.ticketNumber);
    await expect(page.getByTestId("ticket-table-desktop").locator("text=" + jenniferSummary)).toHaveCount(0);
    await expect(page.getByTestId("ticket-table-desktop").locator("text=" + jenniferTicket.ticketNumber)).toHaveCount(0);
  });

  test("E2E-03 backend-down resilience: error banner and values retained when API fails", async ({
    page,
  }) => {
    const unique = Date.now();
    const summary = `E2E critical outage ${unique}`;
    const description = `Main server unresponsive (run ${unique}).`;

    await selectRequester(page, REQUESTER_JENNIFER.name);

    await page.getByTestId("create-ticket-btn").click();
    await page.waitForURL("**/create-ticket");

    await page.getByTestId("category").selectOption({ label: "Hardware" });
    await page.getByTestId("relatedSystem").selectOption({ label: "Corporate Laptop" });
    await page.getByTestId("priority").selectOption({ label: "HIGH" });
    await page.getByTestId("summary").fill(summary);
    await page.getByTestId("description").fill(description);

    // Intercept the create request and fail it (simulate backend down) (AC-05)
    await page.route("**/api/tickets", (route) => route.abort("failed"));

    await page.getByTestId("submit-ticket").click();

    // Error banner appears
    await expect(page.getByTestId("submit-error")).toBeVisible({ timeout: 15_000 });

    // No navigation occurred
    expect(page.url()).toContain("/create-ticket");

    // All typed values remain (BR-12)
    await expect(page.getByTestId("summary")).toHaveValue(summary);
    await expect(page.getByTestId("description")).toHaveValue(description);
    await expect(page.getByTestId("category")).toHaveValue("2");
    await expect(page.getByTestId("relatedSystem")).toHaveValue("7");
    await expect(page.getByTestId("priority")).toHaveValue("HIGH");
  });
});
