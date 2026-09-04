import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { API_BASE, TINY_PNG, createTicketViaApi } from "./helpers.js";

// ── Configuration ────────────────────────────────────────────────────────────
// RESP-01..09: 3 screens (create-ticket, my-tickets, ticket-detail) × 3
// viewport projects (desktop 1440×900, tablet 820×1180, mobile 390×844) per
// ui-spec.md section 9 / tests.md RESP-01..09. Runs against the real stack.

const STORAGE_KEY = "toktickit-requester";

// Distinct requesters per screen so parallel tests never share tickets.
const TEST_REQUESTERS = {
  createTicket: { id: 5, name: "Napat Chaiwong", email: "napat.chaiwong@toktickit.dev" },
  myTickets: { id: 3, name: "Sarah Johnson", email: "sarah.johnson@toktickit.dev" },
  ticketDetail: { id: 4, name: "Michael Brown", email: "michael.brown@toktickit.dev" },
};

async function uploadAttachmentViaApi(
  request: APIRequestContext,
  ticketId: number,
  requesterId: number,
  fileName: string
) {
  const res = await request.post(`${API_BASE}/api/tickets/${ticketId}/attachments`, {
    multipart: {
      requesterId: String(requesterId),
      file: { name: fileName, mimeType: "image/png", buffer: TINY_PNG },
    },
  });
  expect(res.status()).toBe(201);
}

/** Inject a requester into localStorage so the app skips the selection screen. */
function seedRequester(page: Page, requester: typeof TEST_REQUESTERS.createTicket) {
  page.addInitScript(
    (args) => {
      const { key, requester } = args as { key: string; requester: unknown };
      window.localStorage.setItem(key, JSON.stringify(requester));
    },
    { key: STORAGE_KEY, requester }
  );
}

/** Assert no unintended horizontal page scrolling at the current viewport. */
async function assertNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(
    () => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)
  );
  const innerWidth = await page.evaluate(() => window.innerWidth);
  expect(scrollWidth, `document scrollWidth ${scrollWidth} exceeds innerWidth ${innerWidth}`).toBeLessThanOrEqual(
    innerWidth + 1
  );
}

async function capture(page: Page, screen: string, project: string) {
  // Ensure the capture starts at the true top. Under parallel runners the page
  // can be left scrolled mid-form, which makes Playwright's fullPage stitch
  // start offset and the sticky header land below a blank band at the top
  // (the "navbar fell down over content" artifact). Scroll to 0 and let
  // fonts/layout settle for a deterministic full-page shot.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(150);
  await page.screenshot({
    path: `artifacts/lab-02/screenshots/${screen}/${project}.png`,
    fullPage: true,
  });
}

// ── RESP-01..03: Create Ticket ──────────────────────────────────────────────

// Vary category/priority per viewport so the screenshots demonstrate different
// valid options (Hardware/MEDIUM → Software/HIGH → Network/URGENT) instead of
// reusing identical static values for all three projects.
const CREATE_PROJECT = {
  desktop: { category: "Hardware", relatedSystem: "Corporate Laptop", priority: "MEDIUM" },
  tablet: { category: "Software", relatedSystem: "LEB2 App", priority: "HIGH" },
  mobile: { category: "Network", relatedSystem: "Campus Wi-Fi", priority: "URGENT" },
} as const;

test("RESP create-ticket screen at all viewports", async ({ page }, testInfo) => {
  seedRequester(page, TEST_REQUESTERS.createTicket);
  await page.goto("/create-ticket");
  await expect(page.getByTestId("category")).toBeVisible();

  const { category, relatedSystem: systemLabel, priority } =
    CREATE_PROJECT[testInfo.project.name as keyof typeof CREATE_PROJECT] ?? CREATE_PROJECT.desktop;

  // Populate the form so the screenshot is realistic (no submit, no DB write).
  await page.getByTestId("category").selectOption({ label: category });
  const relatedSystem = page.getByTestId("relatedSystem");
  await expect(relatedSystem).toBeEnabled();
  await relatedSystem.selectOption({ label: systemLabel });
  await page.getByTestId("priority").selectOption({ label: priority });
  await page.getByTestId("summary").fill("Cannot connect to the corporate VPN after update");
  await page
    .getByTestId("description")
    .fill(
      "After the latest update, the VPN client stops connecting and reports an authentication error."
    );

  // Stage a file so the attachment chip is visible before the screenshot.
  await page.getByTestId("file-input").setInputFiles({
    name: "evidence-screenshot.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await expect(page.locator(".staged-chip")).toHaveCount(1);

  await assertNoHorizontalScroll(page);
  await capture(page, "create-ticket", testInfo.project.name);
});

// ── RESP-04..06: My Tickets ─────────────────────────────────────────────────

test("RESP my-tickets screen at all viewports", async ({ page, request }, testInfo) => {
  const unique = Date.now();
  // Seed several tickets in different categories so the list screenshot shows a
  // variety of classification badge colors, not only Hardware.
  await Promise.all([
    createTicketViaApi(request, TEST_REQUESTERS.myTickets.id, `VPN auth failure ${unique}`, {
      categoryId: 4, // Network
      relatedSystemId: 3, // VPN
      requestedPriority: "URGENT",
    }),
    createTicketViaApi(request, TEST_REQUESTERS.myTickets.id, `Corporate laptop won't boot ${unique}`, {
      categoryId: 2, // Hardware
      relatedSystemId: 7, // Corporate Laptop
      requestedPriority: "MEDIUM",
    }),
    createTicketViaApi(request, TEST_REQUESTERS.myTickets.id, `LEB2 App crashes on login ${unique}`, {
      categoryId: 3, // Software
      relatedSystemId: 4, // LEB2 App
      requestedPriority: "HIGH",
    }),
  ]);

  seedRequester(page, TEST_REQUESTERS.myTickets);
  await page.goto("/my-tickets");
  // Wait for the list to render the 3 seeded rows (desktop table or mobile card).
  await expect
    .poll(async () => page.locator('[data-testid^="ticket-row-"], [data-testid^="ticket-card-"]').count(), {
      timeout: 10_000,
    })
    .toBeGreaterThanOrEqual(3);

  // ui-spec.md section 6 / AC-25: assert the desktop table actually becomes
  // the mobile card list on the mobile viewport (not merely "some row type").
  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".ticket-cards-mobile")).toBeVisible();
    await expect(page.locator(".ticket-table-desktop")).toBeHidden();
  } else {
    await expect(page.locator(".ticket-table-desktop")).toBeVisible();
    await expect(page.locator(".ticket-cards-mobile")).toBeHidden();
  }

  await assertNoHorizontalScroll(page);
  await capture(page, "my-tickets", testInfo.project.name);
});

// ── RESP-07..09: Ticket Detail ──────────────────────────────────────────────

test("RESP ticket-detail screen at all viewports", async ({ page, request }, testInfo) => {
  const unique = Date.now();
  const ticket = await createTicketViaApi(
    request,
    TEST_REQUESTERS.ticketDetail.id,
    `Laptop charger not working ${unique}`
  );
  await uploadAttachmentViaApi(request, ticket.id, TEST_REQUESTERS.ticketDetail.id, "charger-photo.png");

  seedRequester(page, TEST_REQUESTERS.ticketDetail);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByTestId("ticket-detail")).toBeVisible();
  await expect(page.getByTestId("attachment-section")).toBeVisible();

  await assertNoHorizontalScroll(page);
  await capture(page, "ticket-detail", testInfo.project.name);
});
