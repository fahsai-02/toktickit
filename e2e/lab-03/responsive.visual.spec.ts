import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  REQ_EMAIL,
  REQ_INITIAL_PASSWORD,
  STAFF_EMAIL,
  STAFF_PASSWORD,
  assertNoHorizontalScroll,
  capture,
  isMobileProject,
  loginAndUnlock,
  useLab3DbHooks,
} from "./helpers.js";

/**
 * RESP-01..03 — responsive visual evidence for every Lab 3 screen
 * (Issue 23, `docs/lab-03/ui-spec.md` section 9).
 *
 * Each test runs once per Playwright project, which is where the viewport sizes
 * come from (`playwright.config.ts`): desktop 1440×900, tablet 820×1180,
 * mobile 375×844 — 10 screens × 3 = 30 screenshots.
 * Every run asserts `assertNoHorizontalScroll` — the Issue 23 headline
 * criterion — and then saves a screenshot to
 * `artifacts/lab-03/screenshots/<screen>/<project>.png`.
 *
 * Two rules keep the run deterministic (see the fixtures below):
 *
 * 1. `useLab3DbHooks({ allProjects: true })` re-seeds before and after every
 *    project. Seeded Requesters all hold an initial password, so unlocking a
 *    requester screen rewrites that account's password (BR-02); without the
 *    per-project re-seed the later viewport runs could not log in at all.
 * 2. Each Requester screen uses a DIFFERENT seeded account, because within one
 *    project an account can only be rotated once.
 *
 * Requires: Postgres up, server on :5000, client on :5173, DB migrated.
 */

useLab3DbHooks({ allProjects: true });

// ── Fixtures ──────────────────────────────────────────────────────────────
// Addresses are read from the seed definition (see helpers.ts `seedUser`) so a
// seed change fails loudly instead of timing out on a login.

// TKT-2026-000902: the richest requester view in the seed — IN_PROGRESS, two
// Public Comments (requester + staff), and requesterIndicatedResolved = true,
// so the screenshot shows the timeline AND the resolution indicator together.
const RICH_TICKET = "TKT-2026-000902";

// TKT-2025-000003: REOPENED, one Public Comment AND one Internal Note, so the
// staff detail shots can show both tabs with real content.
const STAFF_TICKET = "TKT-2025-000003";

// ── RESP-01..03: Login ────────────────────────────────────────────────────

test.describe("RESP-01..03 login screen", () => {
  test("login renders without horizontal scroll at every viewport", async ({ page }, testInfo) => {
    await page.goto("/login");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "authentication", testInfo.project.name);
  });
});

// ── RESP-04..06: Change Password ──────────────────────────────────────────

test.describe("RESP-04..06 change password screen", () => {
  // Michael Brown only ever LOGS IN here — the form is never submitted, so
  // BR-02 leaves his initial password untouched and the account stays reusable.
  test("mandatory first-login change renders at every viewport", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, "michael.brown@toktickit.dev", REQ_INITIAL_PASSWORD, {
      completeMandatoryChange: false,
    });
    // mustChangePassword = true -> the app forces this screen (BR-02).
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator("#change-current")).toBeVisible();
    // The live password-strength checklist is checklist item 21; it is part of
    // the screen, so it belongs in the evidence.
    await page.fill("#change-new", "VisualCheck1!");
    await page.fill("#change-confirm", "VisualChck1!");

    await assertNoHorizontalScroll(page);
    await capture(page, "change-password", testInfo.project.name);
  });
});

// ── RESP-07..09: App Shell with role-aware navigation ─────────────────────

test.describe("RESP-07..09 authenticated app shell", () => {
  // Logged in as the Administrator, whose nav carries BOTH staff and admin
  // destinations — the clearest evidence for checklist item 12 (role-based
  // navigation). The profile menu is opened so the shot also carries the
  // user name, the role badge, and the Logout action.
  test("shell shows role navigation and profile menu", async ({ page }, testInfo) => {
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Below 992px the nav collapses behind the hamburger (ui-spec.md 4.1), so
    // open it first — the shot then doubles as evidence that role navigation
    // is reachable on tablet and mobile, not only on desktop.
    if (testInfo.project.name !== "desktop") {
      await page.click('button[aria-label="Toggle navigation"]');
    }
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toBeVisible();
    // ui-spec.md 4.1: an Administrator sees exactly My Queue, Create Ticket and
    // User Management — the Requester-only "My Tickets" link must be absent.
    await expect(nav.locator('a[href="/staff/queue"]')).toBeVisible();
    await expect(nav.locator('a[href="/create-ticket"]')).toBeVisible();
    await expect(nav.locator('a[href="/admin/users"]')).toBeVisible();
    await expect(nav.locator('a[href="/my-tickets"]')).toHaveCount(0);

    await page.click('button[aria-haspopup="menu"]');
    await expect(page.getByRole("menu")).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "app-shell", testInfo.project.name);
  });
});

// ── RESP-10..12: Requester — Ticket Detail with Public Comments ───────────

test.describe("RESP-10..12 requester ticket detail", () => {
  test("detail with comments and resolution indicator at every viewport", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, "jennifer.anderson@toktickit.dev", REQ_INITIAL_PASSWORD);
    await expect(page).toHaveURL(/\/my-tickets/);

    // Navigate by the visible ticket number rather than a hard-coded row id.
    await page.fill('[data-testid="search-input"]', RICH_TICKET);
    const hit = page.getByText(RICH_TICKET).and(page.locator(":visible")).first();
    await expect(hit).toBeVisible({ timeout: 15_000 });
    await hit.click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    await expect(page.locator('[data-testid="ticket-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="comment-timeline"]')).toBeVisible();
    // The seeded "problem appears resolved" state (api-spec 4.9) — the
    // requester's own signal to staff, rendered above the comment timeline.
    await expect(page.getByText("You indicated this problem appears resolved.")).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "requester-ticket-detail", testInfo.project.name);
  });
});

// ── RESP-13..15: IT Staff Ticket Queue ────────────────────────────────────

test.describe("RESP-13..15 IT staff ticket queue", () => {
  test("queue table/cards render at every viewport", async ({ page }, testInfo) => {
    // Sara Patel holds a real password (mustChangePassword = false), so this
    // login has no side effect and can be repeated across tests.
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('[data-testid="staff-queue-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="results-count"]')).toBeVisible();
    await expect(
      page.locator('[data-testid^="staff-ticket-row-"], [data-testid^="staff-ticket-card-"]')
    ).not.toHaveCount(0);

    if (isMobileProject(testInfo.project.name)) {
      await expect(page.locator('[data-testid="staff-cards-mobile"]')).toBeVisible();
      await expect(page.locator('[data-testid="staff-table-desktop"]')).toBeHidden();
    } else {
      await expect(page.locator('[data-testid="staff-table-desktop"]')).toBeVisible();
      await expect(page.locator('[data-testid="staff-cards-mobile"]')).toBeHidden();
    }

    await assertNoHorizontalScroll(page);
    await capture(page, "staff-queue", testInfo.project.name);
  });
});

// ── RESP-16..18: IT Staff Ticket Detail ───────────────────────────────────

test.describe("RESP-16..18 IT staff ticket detail", () => {
  test("staff detail renders at every viewport", async ({ page }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);

    await page.fill('[data-testid="staff-search-input"]', STAFF_TICKET);
    // The queue is a table on desktop and a card list below 768px
    // (ui-spec.md section 6), and the hidden half stays in the DOM, so pick
    // the clickable element for the viewport under test.
    const queueItem = page.locator(
      isMobileProject(testInfo.project.name)
        ? '[data-testid^="staff-ticket-card-"]'
        : '[data-testid^="staff-ticket-row-"]',
      { hasText: STAFF_TICKET }
    );
    await expect(queueItem.first()).toBeVisible({ timeout: 15_000 });
    await queueItem.first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);

    await expect(page.locator('[data-testid="staff-ticket-detail"]')).toBeVisible();
    // Operational controls a staff member actually uses (checklist item 2:
    // editable vs read-only must be visually distinguishable).
    await expect(page.locator('[data-testid="staff-it-priority-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="staff-status-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="staff-owner-select"]')).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "staff-ticket-detail", testInfo.project.name);
  });
});

// ── RESP-19..21: Administrator — User Management list ─────────────────────

test.describe("RESP-19..21 user management list", () => {
  test("user list renders at every viewport", async ({ page }, testInfo) => {
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="user-management-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-user-btn"]')).toBeVisible();

    if (isMobileProject(testInfo.project.name)) {
      await expect(page.locator('[data-testid="user-cards-mobile"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-table-desktop"]')).toBeHidden();
    } else {
      await expect(page.locator('[data-testid="user-table-desktop"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-cards-mobile"]')).toBeHidden();
    }

    await assertNoHorizontalScroll(page);
    await capture(page, "user-management", testInfo.project.name);
  });
});

// ── RESP-22..24: Administrator — create/edit drawer ───────────────────────

test.describe("RESP-22..24 create user drawer", () => {
  test("drawer renders at every viewport", async ({ page }, testInfo) => {
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await page.click('[data-testid="create-user-btn"]');

    // The drawer is a fixed-position overlay, so this is the one shot that
    // must NOT be full-page: a stitched screenshot re-renders fixed elements
    // against the taller virtual viewport and smears the overlay.
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-role"]')).toBeVisible();
    await expect(page.locator('[data-testid="initial-password"]')).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "user-management-create", testInfo.project.name, {
      fullPage: false,
    });
  });
});

// ── RESP-25..27: Requester — My Tickets ─────────────────────────────────────
// Added beyond the eight screens in ui-spec.md section 9 (student-approved
// during Issue 23): the Requester ticket list is the busiest list in the app,
// so it is the screen most likely to break at 375px and therefore the one
// worth having responsive evidence for.

test.describe("RESP-25..27 requester my tickets", () => {
  // david.lee owns three seed tickets spanning NEW / IN_PROGRESS / CLOSED, so
  // the list shows a real mix of status and priority badges.
  test("ticket list renders at every viewport", async ({ page }, testInfo) => {
    await loginAndUnlock(page, REQ_EMAIL, REQ_INITIAL_PASSWORD);
    await expect(page).toHaveURL(/\/my-tickets/);
    await expect(
      page.locator('[data-testid^="ticket-row-"], [data-testid^="ticket-card-"]')
    ).not.toHaveCount(0);

    // The desktop table and the mobile card list are both in the DOM and
    // swapped by CSS, so prove the swap happened instead of trusting it
    // (ui-spec.md section 6, mobile "<768px: table → cards").
    if (isMobileProject(testInfo.project.name)) {
      await expect(page.locator('[data-testid="ticket-cards-mobile"]')).toBeVisible();
      await expect(page.locator('[data-testid="ticket-table-desktop"]')).toBeHidden();
    } else {
      await expect(page.locator('[data-testid="ticket-table-desktop"]')).toBeVisible();
      await expect(page.locator('[data-testid="ticket-cards-mobile"]')).toBeHidden();
    }

    await assertNoHorizontalScroll(page);
    await capture(page, "requester-my-tickets", testInfo.project.name);
  });
});

// ── RESP-28..30: Requester — Create Ticket ──────────────────────────────────
// Added beyond the eight screens in ui-spec.md section 9 (student-approved
// during Issue 23). The two-column classification grid is the densest form in
// the app, so its 375px behaviour needs evidence of its own.

test.describe("RESP-28..30 requester create ticket", () => {
  test("create form renders at every viewport", async ({ page }, testInfo) => {
    await loginAndUnlock(page, "napat.chaiwong@toktickit.dev", REQ_INITIAL_PASSWORD);
    await page.goto("/create-ticket");
    await expect(page.locator("#category")).toBeVisible();

    // Fill the form so the shot shows realistic content and the enabled
    // dependent Related System select. Nothing is submitted — no DB write.
    await page.selectOption("#category", { index: 1 });
    const relatedSystem = page.locator("#relatedSystem");
    await expect(relatedSystem).toBeEnabled();
    await relatedSystem.selectOption({ index: 1 });
    await page.selectOption("#priority", "HIGH");
    await page.fill(
      "#summary",
      "Cannot connect to the corporate VPN after this morning's update"
    );
    await page.fill(
      "#description",
      "The VPN client reports an authentication error on every attempt since the update was installed. Reinstalling the profile did not help."
    );

    await assertNoHorizontalScroll(page);
    await capture(page, "requester-create-ticket", testInfo.project.name);
  });
});
