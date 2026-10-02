import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  REQ_INITIAL_PASSWORD,
  STAFF_EMAIL,
  STAFF_PASSWORD,
  assertNoHorizontalScroll,
  capture,
  createUserViaAdminApi,
  isMobileProject,
  loginAndUnlock,
  setUserActiveViaAdminApi,
  useLab3DbHooks,
} from "./helpers.js";

/**
 * STATE-01..03 — state-evidence screenshots for the states in
 * `docs/lab-03/ui-spec.md` section 9 that a happy-path screen shot cannot
 * show (Issue 23). Same three viewports as the responsive spec: desktop
 * 1440×900, tablet 820×1180 and mobile 375×844, so 14 states × 3 = 42 PNGs.
 *
 * Every test asserts `assertNoHorizontalScroll` first: a state that only fits
 * on desktop is still a failed state (ui-spec 9.1 item 9).
 *
 * Two rules keep the run deterministic:
 *
 * 1. `useLab3DbHooks({ allProjects: true })` re-seeds before and after every
 *    project, because BR-02 rotates seeded Requester passwords on unlock and
 *    the throwaway Administrator created in STATE-25..27 must not survive.
 * 2. States that mutate the DB (the throwaway admin) clean up through the
 *    same `prisma/cleanup-e2e.ts` hook the other Lab 3 specs use.
 *
 * Requires: Postgres up, server on :5000, client on :5173, DB migrated.
 */

useLab3DbHooks({ allProjects: true });

// TKT-2025-000003: REOPENED with one Public Comment AND one Internal Note, so
// the two staff timelines both have real content to photograph.
const STAFF_TICKET = "TKT-2025-000003";

// A seeded Requester that still holds an initial password, so BR-02 routes
// the login straight to the change-password form.
const REQ_CHANGE_EMAIL = "michael.brown@toktickit.dev";

// Satisfies all three PasswordChecklist rules (>=8 chars, upper + lower,
// number + special) and is used only to be rejected, never stored.
const NEW_PASSWORD = "VisualCheck1!";

/** Open a staff ticket by its visible ticket number (never a hard-coded id). */
async function openStaffTicket(page: Page, ticketNumber: string, project: string) {
  await page.fill('[data-testid="staff-search-input"]', ticketNumber);
  // The queue renders a table on desktop/tablet and cards on mobile while the
  // hidden half stays in the DOM, so scope to the half the viewport shows.
  const item = page.locator(
    isMobileProject(project)
      ? '[data-testid^="staff-ticket-card-"]'
      : '[data-testid^="staff-ticket-row-"]',
    { hasText: ticketNumber }
  );
  await expect(item.first()).toBeVisible({ timeout: 15_000 });
  await item.first().click();
  await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
  await expect(page.locator('[data-testid="staff-ticket-detail"]')).toBeVisible();
}

/** Open a user's edit drawer in the Administrator user list by email. */
async function openUserDrawer(page: Page, email: string, project: string) {
  await page.fill('[data-testid="user-search-input"]', email);
  // The list is a table on desktop/tablet and cards on mobile, and the hidden
  // half stays in the DOM, so scope by the container for the viewport.
  const container = page.locator(
    isMobileProject(project) ? '[data-testid^="user-card-"]' : "tr",
    { hasText: email }
  );
  await expect(container.first()).toBeVisible({ timeout: 15_000 });
  await container.first().getByRole("button", { name: /edit/i }).click();
  await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
}

// ── STATE-01..03: Login — credential error ─────────────────────────────────

test.describe("STATE-01..03 login error", () => {
  test("invalid credentials render the safe error callout", async ({ page }, testInfo) => {
    await page.goto("/login");
    await page.fill("#login-email", ADMIN_EMAIL);
    // Right address, wrong password: FR-02 / AC-05 answer with the same
    // generic message as an unknown account, so the shot proves we do not leak
    // which half of the pair was wrong.
    await page.fill("#login-password", "WrongPassword123!");
    await page.click('[data-testid="login-submit"]');

    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/login-error", testInfo.project.name);
  });
});

// ── STATE-04..06: Login — busy / submitting ────────────────────────────────

test.describe("STATE-04..06 login busy", () => {
  test("submit button shows its busy state while the request is in flight", async ({
    page,
  }, testInfo) => {
    // Hold the login response open so the busy state is on screen long enough
    // to photograph. The handler waits on `held`, which is only resolved after
    // the screenshot — that is the whole trick, so the button's loading state
    // is real rather than simulated.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/api\/auth\/login/, async (route) => {
      await held;
      await route.continue();
    });

    await page.goto("/login");
    await page.fill("#login-email", ADMIN_EMAIL);
    await page.fill("#login-password", ADMIN_PASSWORD);
    await page.click('[data-testid="login-submit"]');

    try {
      const submit = page.locator('[data-testid="login-submit"]');
      await expect(submit).toBeDisabled();
      // Button renders a Spinner while loading (client/src/components/Button.tsx).
      await expect(submit.locator(".spinner")).toBeVisible();

      await assertNoHorizontalScroll(page);
      await capture(page, "states/login-busy", testInfo.project.name);
    } finally {
      // Always let the request finish. Without this a failed assertion would
      // leave the handler parked on `held` for the rest of the run, so the
      // page would never receive its session cookie and the failure would be
      // reported as an unrelated 60s timeout.
      release();
    }
    await expect(page).toHaveURL(/\/staff\/queue/, { timeout: 15_000 });
  });
});

// ── STATE-07..09: Change Password — validation ─────────────────────────────

test.describe("STATE-07..09 change password validation", () => {
  test("rejected current password shows the checklist and the field error", async ({
    page,
  }, testInfo) => {
    // A seeded Requester holding an initial password lands here by BR-02, so
    // the form is reachable without rotating the account.
    //
    // The obvious "mismatch the confirmation" submit is NOT reachable: the
    // button stays `disabled` until `confirmMatches` (ChangePassword.tsx
    // `canSubmit`), so the app never sends a mismatched pair. The reachable
    // validation failure is the server rejecting the CURRENT password, which
    // leaves the new password and the account untouched.
    await loginAndUnlock(page, REQ_CHANGE_EMAIL, REQ_INITIAL_PASSWORD, {
      completeMandatoryChange: false,
    });
    await expect(page).toHaveURL(/\/change-password/);

    // All three checklist rules met and both entries equal, so the button
    // enables and the request is actually made — and rejected.
    await page.fill("#change-current", "WrongCurrent123!");
    await page.fill("#change-new", NEW_PASSWORD);
    await page.fill("#change-confirm", NEW_PASSWORD);
    await expect(
      page.locator('[data-testid="password-rule-numberAndSpecial"]')
    ).toHaveAttribute("data-met", "true");

    await page.click('[data-testid="change-password-submit"]');

    // The server answers a wrong current password as a FIELD error, and
    // ui-spec 9.1 item 3 requires the message to sit under its own field, so
    // assert through aria-describedby rather than looking for a banner.
    const currentField = page.locator("#change-current");
    await expect(currentField).toHaveAttribute("aria-invalid", "true");
    await expect(currentField).toHaveAttribute("aria-describedby", /.+/);
    const describedBy = await currentField.getAttribute("aria-describedby");
    await expect(page.locator(`#${describedBy}`)).toHaveText(
      /current password is incorrect/i
    );
    await expect(page).toHaveURL(/\/change-password/);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/change-password-validation", testInfo.project.name);
  });
});

// ── STATE-10..12: Staff queue — empty (zero tickets, no filters) ───────────

test.describe("STATE-10..12 queue empty", () => {
  test("queue with no tickets at all renders the empty state", async ({ page }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);

    // The IT Staff queue is GLOBAL — api-spec section 5.1 lists search,
    // status, priority, category and owner filters but no requester scope, so
    // with the seed in place it can never legitimately reach "empty":
    // StaffTicketQueue only shows that state when the API returns zero rows
    // AND no filter is active. To photograph the component we stub the list
    // response for this page only; the assertion is on the real empty-state
    // markup, only the data source is faked. The adjacent no-results state
    // below is captured from the real API instead.
    await page.route(/\/api\/staff\/tickets(\?|$)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        }),
      })
    );
    await page.reload();

    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 15_000 });
    // The empty state must NOT offer "Clear Filters": there are no filters.
    await expect(page.locator('[data-testid="no-results-state"]')).toHaveCount(0);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/queue-empty", testInfo.project.name);
  });
});

// ── STATE-13..15: Staff queue — no results for a search ────────────────────

test.describe("STATE-13..15 queue no results", () => {
  test("a search with no matches renders no-results with Clear Filters", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Real API, impossible ticket number: this is the genuine no-results path
    // (an active filter returned zero rows), not a stub.
    await page.fill('[data-testid="staff-search-input"]', "TKT-1999-999999");
    await expect(page.locator('[data-testid="no-results-state"]')).toBeVisible({
      timeout: 15_000,
    });
    // Visually distinct from empty (ui-spec 9.1 item 19): different icon,
    // different copy, and a recovery action.
    await expect(page.locator('[data-testid="empty-state"]')).toHaveCount(0);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/queue-no-results", testInfo.project.name);
  });
});

// ── STATE-16..18: Staff ticket detail — Public Comments tab ────────────────

test.describe("STATE-16..18 staff detail comments", () => {
  test("public comment timeline shows author, role badge and timestamp", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await openStaffTicket(page, STAFF_TICKET, testInfo.project.name);

    await page.click('[data-testid="tab-comments"]');
    await expect(page.locator('[data-testid="comment-timeline"]')).toBeVisible();
    // The composer is part of the same state: staff can post Public Comments.
    await expect(page.locator('[data-testid="comment-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-comment-btn"]')).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "states/staff-detail-comments", testInfo.project.name);
  });
});

// ── STATE-19..21: Staff ticket detail — Internal Notes tab ─────────────────

test.describe("STATE-19..21 staff detail notes", () => {
  test("internal note timeline is visibly distinct from public comments", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await openStaffTicket(page, STAFF_TICKET, testInfo.project.name);

    await page.click('[data-testid="tab-notes"]');
    await expect(page.locator('[data-testid="note-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="note-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-note-btn"]')).toBeVisible();
    // BR-04: notes are staff-only, so this panel is where the private
    // conversation lives — the notes timeline must not be a public surface.
    await expect(page.locator('[data-testid="note-timeline"]')).toContainText(/note|internal/i);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/staff-detail-notes", testInfo.project.name);
  });
});

// ── STATE-37..39: Internal-note button label contrast ──────────────────────
//
// Regression guard. `.btn-internal` is `variant="secondary"` (green text) that
// App.css repaints with a solid `--color-info` fill but, before Issue 23's fix,
// without touching `color` — green on blue, 1.05:1, i.e. unreadable. Nothing
// asserted the label, so a real button sat unreadable in the staff notes tab.
// This computes the actual painted colours and fails below WCAG AA 4.5:1.

const WCAG_AA_NORMAL_TEXT = 4.5;

function channelLuminance(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseRgb(value: string) {
  const parts = value.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`unreadable rgb: ${value}`);
  return {
    r: Number(parts[0]),
    g: Number(parts[1]),
    b: Number(parts[2]),
    a: parts.length > 3 ? Number(parts[3]) : 1,
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(fg: string, bg: string) {
  const a = relativeLuminance(parseRgb(fg));
  const b = relativeLuminance(parseRgb(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test.describe("STATE-37..39 internal note button contrast", () => {
  test("the Create Note label is readable on its own fill at each viewport", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await openStaffTicket(page, STAFF_TICKET, testInfo.project.name);
    await page.click('[data-testid="tab-notes"]');
    await expect(page.locator('[data-testid="create-note-btn"]')).toBeVisible();

    const measured = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-testid="create-note-btn"]'
      );
      if (!el) throw new Error("no create-note-btn");
      const own = getComputedStyle(el);

      // Walk ancestors for the first painted backdrop. A 3-component `rgb()` is
      // already opaque — only a 4-component `rgba()` needs its alpha read, and
      // treating opaque black-on-transparent as a real backdrop once scored
      // white text at a meaningless 21:1.
      let backdrop: string | null = null;
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const colour = getComputedStyle(node).backgroundColor;
        const parts = colour.match(/[\d.]+/g) ?? [];
        const alpha = parts.length > 3 ? Number(parts[3]) : 1;
        if (parts.length >= 3 && alpha > 0) {
          backdrop = colour;
          break;
        }
      }
      return { foreground: own.color, backdrop };
    });

    // Guard the measurement itself: without a real backdrop the ratio below is
    // meaningless, and a bogus one passes silently.
    expect(
      measured.backdrop,
      "the Create Note fill must be a real painted colour, not transparent"
    ).not.toBeNull();

    const ratio = contrastRatio(measured.foreground, measured.backdrop!);
    // eslint-disable-next-line no-console
    console.log(
      `Create Note contrast ${ratio.toFixed(2)}:1 (${measured.foreground} on ${measured.backdrop})`
    );
    expect(
      ratio,
      `Create Note label contrast ${ratio.toFixed(2)}:1 must reach ${WCAG_AA_NORMAL_TEXT}:1`
    ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);

    // The fill is what the eye reads as the button body, so it must not be the
    // same green the secondary variant paints its text with.
    await expect(page.locator('[data-testid="create-note-btn"]')).toHaveCSS(
      "color",
      "rgb(255, 255, 255)"
    );

    await capture(page, "states/staff-note-button-contrast", testInfo.project.name);
  });
});

// ── STATE-22..24: Administrator — deactivation confirmation ─────────────────

test.describe("STATE-22..24 admin deactivate confirm", () => {
  test("deactivate asks for confirmation before touching the account", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    // Some other Requester, never the admin themself.
    await openUserDrawer(
      page,
      "sarah.johnson@toktickit.dev",
      testInfo.project.name
    );

    await page.click('[data-testid="deactivate-user-btn"]');
    await expect(page.locator('[data-testid="confirm-ok-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-cancel-btn"]')).toBeVisible();
    // Cancelling must be the safe default on screen; nothing was sent yet.
    await expect(page.locator('[data-testid="form-error"]')).toHaveCount(0);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/admin-deactivate-confirm", testInfo.project.name);

    await page.click('[data-testid="confirm-cancel-btn"]');
    await expect(page.locator('[data-testid="confirm-ok-btn"]')).toHaveCount(0);
  });
});

// ── STATE-25..27: Administrator — self-deactivation safety error ───────────

test.describe("STATE-25..27 admin safety self deactivate", () => {
  test("an admin cannot deactivate their own account (403)", async ({
    page,
    request,
  }, testInfo) => {
    // FR-45 / AC-11 is only reachable while ANOTHER active Administrator
    // exists — the seed has exactly one, and the last-admin guard (STATE-28..30)
    // answers first in that case. So a throwaway second Administrator is
    // created through the public API and deactivated again at the end of this
    // test; `cleanup-e2e.ts` removes the row afterwards either way.
    const throwaway = await createUserViaAdminApi(
      request,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      "ADMINISTRATOR"
    );

    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await openUserDrawer(page, ADMIN_EMAIL, testInfo.project.name);

    await page.click('[data-testid="deactivate-user-btn"]');
    await page.click('[data-testid="confirm-ok-btn"]');

    // The drawer stays open and surfaces the server's own safe message.
    await expect(page.locator('[data-testid="form-error"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-testid="form-error"]')).toContainText(
      /your own account/i
    );
    // Nothing changed: the admin is still signed in and still active.
    await expect(page.locator('[data-testid="deactivate-user-btn"]')).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "states/admin-safety-self-deactivate", testInfo.project.name);

    // Leave the database exactly as seeded. Lab 3 has no user-deletion
    // endpoint, and STATE-28..30 below only reproduces the last-admin guard
    // while exactly ONE active Administrator exists — so the throwaway account
    // is deactivated again here. Doing it now (rather than leaving it to
    // `cleanup-e2e.ts` at afterAll) is what keeps the two safety states
    // independently meaningful instead of order-lucky.
    await setUserActiveViaAdminApi(request, throwaway.sessionCookie, throwaway.email, false);
  });
});

// ── STATE-28..30: Administrator — last-admin safety error ───────────────────

test.describe("STATE-28..30 admin safety last admin", () => {
  test("the final active admin cannot be deactivated (409)", async ({ page }, testInfo) => {
    // The seed ships exactly one active Administrator — STATE-25..27 above
    // deactivates its throwaway account again — so the acting admin targeting
    // themself is the last-admin case: app.ts checks that guard BEFORE the
    // self-guard, which is why the message here is 409 and not 403.
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await openUserDrawer(page, ADMIN_EMAIL, testInfo.project.name);

    await page.click('[data-testid="deactivate-user-btn"]');
    await page.click('[data-testid="confirm-ok-btn"]');

    await expect(page.locator('[data-testid="form-error"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-testid="form-error"]')).toContainText(
      /last active administrator/i
    );
    // The account survives, so the session must survive too.
    await expect(page.locator('[data-testid="deactivate-user-btn"]')).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "states/admin-safety-last-admin", testInfo.project.name);
  });
});

// ── STATE-31..33: IT Staff Queue — filters expanded ────────────────────────
//
// The queue's filter card is behind `{filtersOpen && …}` and starts closed, so
// every earlier screenshot of the queue shows the *unfiltered* list. That left
// ui-spec 9.1 item 18 ("filters, sort, pagination usable at all viewports")
// pointing at screenshots that never exercised a filter at all. These two
// groups close that gap with pictures instead of assertions.

test.describe("STATE-31..33 queue filters open", () => {
  test("the filter card exposes every filter control at each viewport", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.locator('[data-testid="staff-queue-page"]')).toBeVisible();

    // Closed by default — prove it, so the screenshot below is known to be the
    // expanded state rather than a card that was always on screen.
    await expect(page.locator('[data-testid="filter-card"]')).toHaveCount(0);
    await page.click('[data-testid="filters-toggle"]');
    await expect(page.locator('[data-testid="filter-card"]')).toBeVisible();

    // All five filters, not just "a card appeared".
    for (const id of [
      "filter-status",
      "filter-req-priority",
      "filter-it-priority",
      "filter-category",
      "filter-owner",
    ]) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
    }
    // "Clear Filters" is behind `hasActiveFilters`, so it must be absent while
    // the card is merely open — STATE-34..36 covers the other side of that.
    await expect(page.locator('[data-testid="clear-filters"]')).toHaveCount(0);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/queue-filters-open", testInfo.project.name);
  });
});

// The 8 statuses, longest first: "REOPENED" contains "OPEN" and "NEW" is a
// prefix of nothing else, so a naive substring match would read the wrong one.
const STATUS_VALUES = [
  "WAITING_FOR_REQUESTER",
  "IN_PROGRESS",
  "REOPENED",
  "RESOLVED",
  "CANCELLED",
  "CLOSED",
  "OPEN",
  "NEW",
] as const;

/** Total N from the results-count line: "Showing 1 to 10 of 362 tickets". */
async function readQueueTotal(page: Page) {
  const text = await page.locator('[data-testid="results-count"]').innerText();
  const match = text.match(/of\s+([\d,]+)\s+tickets/i);
  if (!match) throw new Error(`cannot read a total from results-count: "${text}"`);
  return Number(match[1].replace(/,/g, ""));
}

/** The status of the first row/card actually on screen, as the raw enum value. */
async function readFirstVisibleStatus(page: Page, project: string) {
  if (isMobileProject(project)) {
    const header = page.locator('[data-testid^="staff-ticket-card-"]').first();
    await expect(header).toBeVisible({ timeout: 15_000 });
    const text = await header.locator(".ticket-card-header").innerText();
    const found = STATUS_VALUES.find((s) => text.includes(s));
    if (!found) throw new Error(`no known status in the first card: "${text}"`);
    return found;
  }
  const cell = page
    .locator('[data-testid^="staff-ticket-row-"]')
    .first()
    .locator(".staff-col-currentStatus");
  await expect(cell).toBeVisible({ timeout: 15_000 });
  return (await cell.innerText()).trim();
}

test.describe("STATE-34..36 queue filter applied", () => {
  test("a status filter narrows the list and every remaining row matches", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.locator('[data-testid="staff-queue-page"]')).toBeVisible();
    const totalBefore = await readQueueTotal(page);

    // Filter by the status of a ticket that is on screen right now, so the
    // result set is guaranteed non-empty without asserting any seed count.
    const status = await readFirstVisibleStatus(page, testInfo.project.name);

    await page.click('[data-testid="filters-toggle"]');
    await page.selectOption('[data-testid="filter-status"]', status);
    await expect(page.locator('[data-testid="results-count"]')).not.toContainText(
      `of ${totalBefore} tickets`
    );

    const totalAfter = await readQueueTotal(page);
    // Strictly fewer, but not zero: the filter ran and it did not over-filter.
    expect(totalAfter, `filtering by ${status} must narrow the list`).toBeGreaterThan(0);
    expect(totalAfter, `filtering by ${status} must narrow the list`).toBeLessThan(
      totalBefore
    );

    // Every visible row/card carries the chosen status — proof the narrowing
    // happened server-side rather than being a repaint of the same list.
    // The badge prints the raw enum, so compare against `status` as read, not
    // a label-pretty version of it.
    const item = isMobileProject(testInfo.project.name)
      ? page.locator('[data-testid^="staff-ticket-card-"]')
      : page.locator('[data-testid^="staff-ticket-row-"]');
    const count = await item.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(item.nth(i)).toContainText(status);
    }
    // The recovery action only exists once a filter is active.
    await expect(page.locator('[data-testid="clear-filters"]')).toBeVisible();

    await assertNoHorizontalScroll(page);
    await capture(page, "states/queue-filtered-results", testInfo.project.name);
  });
});

// ── STATE-40..42: IT Staff Queue — sort applied ────────────────────────────
//
// Item 18 also names sort, and no earlier capture applied a sort order, so the
// sort half of that checklist item had no picture behind it. Each viewport gets
// the control a real user would actually operate: the sortable `th` on
// desktop/tablet, the "Sort by" select on mobile (App.css switches the select
// in and the table out at the mobile breakpoint).

/** Ticket numbers of the list the viewport is actually showing. */
async function readVisibleTicketNumbers(page: Page, project: string) {
  const scope = page.locator(
    isMobileProject(project)
      ? '[data-testid="staff-cards-mobile"]'
      : '[data-testid="staff-table-desktop"]'
  );
  const cell = isMobileProject(project)
    ? '[data-testid^="staff-ticket-card-"] .ticket-card-number'
    : '[data-testid^="staff-ticket-row-"] .col-ticket-number';
  // The queue renders rows asynchronously, so wait for the first one rather
  // than reading an empty container and treating 0 rows as an order.
  await expect(scope.locator(cell).first()).toBeVisible({ timeout: 15_000 });
  const text = await scope.locator(cell).allInnerTexts();
  return text.map((t) => t.trim()).filter(Boolean);
}

test.describe("STATE-40..42 queue sort applied", () => {
  test("sorting by ticket number ascending reorders the list", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.locator('[data-testid="staff-queue-page"]')).toBeVisible();
    const before = await readVisibleTicketNumbers(page, testInfo.project.name);
    expect(before.length).toBeGreaterThan(1);

    if (isMobileProject(testInfo.project.name)) {
      await page.selectOption(
        '[data-testid="mobile-sort-select"]',
        "ticketNumber:asc"
      );
    } else {
      // First click leaves the field on descending (handleSort defaults a newly
      // sorted field to desc), the second flips it to ascending.
      const header = page.locator('[data-testid="staff-th-ticketNumber"]');
      await header.click();
      await header.click();
      // The only sort indicator the table paints is this arrow, and it is
      // aria-hidden, so this is also the check that the sort visibly took.
      await expect(header.locator(".sort-arrow")).toHaveText(/\u25B2/);
    }

    // Wait for the refetch rather than sleeping, then read the new order.
    await expect
      .poll(
        async () => {
          const now = await readVisibleTicketNumbers(page, testInfo.project.name);
          return now.join(",");
        },
        { timeout: 15_000 }
      )
      .not.toBe(before.join(","));

    const after = await readVisibleTicketNumbers(page, testInfo.project.name);
    // The list must actually be ordered, not merely re-rendered.
    const sorted = [...after].sort();
    expect(
      after,
      `expected ${after.join(", ")} to be in ascending ticket-number order`
    ).toEqual(sorted);

    await assertNoHorizontalScroll(page);
    await capture(page, "states/queue-sort-applied", testInfo.project.name);
  });
});

