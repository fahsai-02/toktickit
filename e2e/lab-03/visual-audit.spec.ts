import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  REQ_EMAIL,
  REQ_INITIAL_PASSWORD,
  STAFF_EMAIL,
  STAFF_PASSWORD,
  isMobileProject,
  loginAndUnlock,
  useLab3DbHooks,
} from "./helpers.js";

/**
 * STYLE-05..10 — the parts of the `ui-spec.md` section 9.1 visual checklist that
 * a screenshot alone cannot prove, measured in a real browser instead.
 *
 * The checklist calls for pass/fail on nine things: tokens, editable vs
 * read-only, validation placement, button hierarchy and busy state, badge
 * consistency, active/inactive badges, no clipping/overlap/horizontal scroll,
 * per-screen rendering, filters/sort/pagination, empty vs no-results, public
 * comments vs internal notes, the password checklist, the confirmation dialog,
 * safety errors, long-text clamping and VISIBLE FOCUS STATES. The Lab 2 and
 * Issue 22 evidence already covers the badge palettes (STYLE-01..04,
 * `client/tests/lab-03/zen-green-lab3-style.test.tsx`), the states (STATE-* in
 * `states.visual.spec.ts`) and the per-screen rendering with overflow checks
 * (RESP-* in `responsive.visual.spec.ts`).
 *
 * What was left is exactly what jsdom cannot compute and a human eye is a poor
 * judge of across the three viewport projects, so these tests measure it:
 *
 * - STYLE-05 focus rings, by tabbing through a real page and reading computed
 *   styles at every stop (the reason the invisible white ring on `.btn-primary`
 *   was found).
 * - STYLE-06 editable vs read-only, by comparing computed backgrounds.
 * - STYLE-07 validation placement, by comparing the message's box with its
 *   field's box.
 * - STYLE-08 overlap, by intersecting the boxes of every visible control.
 * - STYLE-09 role navigation for all three roles plus a forbidden destination.
 * - STYLE-10 long-text clamping.
 *
 * No screenshots here — this file produces verdicts, not images. Requires:
 * Postgres up, server on :5000, client on :5173, DB migrated.
 */

useLab3DbHooks({ allProjects: true });

// ── Documented colours (ui-spec section 1 token table) ──────────────────────
const SECONDARY_GREEN = "rgb(11, 122, 70)"; // --color-secondary #0B7A46
const HEADER_WHITE = "rgb(255, 255, 255)"; // header ring on the --color-primary bar
const READONLY_BG = "rgb(240, 244, 242)"; // --color-field-readonly #F0F4F2
const SURFACE_BG = "rgb(255, 255, 255)"; // --color-surface #FFFFFF

// Seed tickets reused from the other visual specs, addressed by their visible
// ticket number (never a hard-coded row id).
const STAFF_TICKET = "TKT-2025-000003";

// ── Page helpers ──────────────────────────────────────────────────────────

/** Open the collapsed nav when the viewport is below the 992px breakpoint. */
async function openNavIfCollapsed(page: Page, project: string) {
  if (project === "desktop") return;
  const toggle = page.locator('button[aria-label="Toggle navigation"]');
  if (await toggle.isVisible()) await toggle.click();
}

async function openStaffTicket(page: Page, project: string) {
  await page.fill('[data-testid="staff-search-input"]', STAFF_TICKET);
  const item = page.locator(
    isMobileProject(project)
      ? '[data-testid^="staff-ticket-card-"]'
      : '[data-testid^="staff-ticket-row-"]',
    { hasText: STAFF_TICKET }
  );
  await expect(item.first()).toBeVisible({ timeout: 15_000 });
  await item.first().click();
  await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
  await expect(page.locator('[data-testid="staff-ticket-detail"]')).toBeVisible();
}

/**
 * Tab through the page and return what each keyboard stop actually renders, so
 * the focus ring can be judged on computed styles rather than on a screenshot.
 *
 * `Tab` (rather than `element.focus()`) is what makes `:focus-visible` apply —
 * the same thing a keyboard user does. A stop that leaves focus on `<body>` or
 * on a zero-size element means the run has walked off the end of the page, so
 * it is reported as `wrapped` and ends the loop.
 */
async function tabThrough(page: Page, maxStops = 80) {
  const stops: {
    label: string;
    hasOutline: boolean;
    outlineColor: string;
    hasRingShadow: boolean;
    inHeader: boolean;
  }[] = [];
  let wrapped = false;

  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press("Tab");
    // `.field-input` transitions `box-shadow` and `border-color` over 0.15s, so
    // the instant a stop receives focus its computed ring is still the OLD value
    // (a zero-spread transparent shadow). Wait for the running CSSTransitions to
    // finish — a real signal, not a blind sleep — and only then measure.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a): a is CSSTransition => "transitionProperty" in a)
          .map((a) => a.finished.catch(() => undefined))
      )
    );
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) {
        return { wrapped: true as const };
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return { wrapped: true as const };
      const cs = getComputedStyle(el);
      const testid = el.getAttribute("data-testid");
      const id = el.id ? `#${el.id}` : "";
      return {
        wrapped: false as const,
        label: `${el.tagName.toLowerCase()}${id}${testid ? `[${testid}]` : ""}`,
        // The header bar is the one dark surface in the app, and ui-spec
        // section 7 documents a white ring on it — a green ring on the green
        // `--color-primary` bar would be invisible.
        inHeader: el.closest(".app-header") !== null,
        outlineWidth: parseFloat(cs.outlineWidth) || 0,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow,
      };
    });
    if (stop.wrapped) {
      // Focus sits on `<body>` for a few frames right after a client-side
      // navigation — the element that had it is destroyed with the old page.
      // Keep tabbing until focus enters the new page instead of reporting an
      // empty audit.
      if (stops.length === 0 && i < 10) continue;
      wrapped = true;
      break;
    }
    stops.push({
      label: stop.label,
      inHeader: stop.inHeader,
      // A 2px ring is the documented minimum (ui-spec section 7).
      hasOutline: stop.outlineStyle !== "none" && stop.outlineWidth >= 2,
      outlineColor: stop.outlineColor,
      // Form fields render their ring as a box-shadow instead of an outline
      // (`select.field-select { outline: none }` + `box-shadow: 0 0 0 2px …`),
      // which is the same 2px --color-secondary ring by another mechanism.
      hasRingShadow: stop.boxShadow !== "none" && stop.boxShadow.includes("11, 122, 70"),
    });
  }

  return { stops, wrapped };
}

/**
 * Assert the two halves of the focus contract from ui-spec section 7: every
 * keyboard stop draws a ring, and the ring is the colour documented for the
 * surface it sits on — green on light surfaces, white on the dark header.
 */
function expectDocumentedRings(
  stops: { label: string; hasOutline: boolean; outlineColor: string; hasRingShadow: boolean; inHeader: boolean }[],
  context: string
) {
  const missing = stops.filter((s) => !s.hasOutline && !s.hasRingShadow);
  expect(missing, `no visible focus ring in ${context} on: ${missing.map((s) => s.label).join(", ")}`)
    .toEqual([]);
  const wrongColour = stops
    .filter((s) => s.hasOutline)
    .filter((s) => s.outlineColor !== (s.inHeader ? HEADER_WHITE : SECONDARY_GREEN));
  expect(
    wrongColour,
    `focus ring is not the documented colour in ${context} on: ${wrongColour
      .map((s) => `${s.label} (${s.outlineColor})`)
      .join(", ")}`
  ).toEqual([]);
}

// ── STYLE-05: every keyboard stop shows the documented focus ring ──────────

test.describe("STYLE-05 focus indicators (ui-spec section 7, checklist 25)", () => {
  test("login screen: every tab stop has a 2px secondary-green ring", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#login-email")).toBeVisible();

    const { stops } = await tabThrough(page);
    expect(stops.length, "login page must expose keyboard stops").toBeGreaterThan(2);
    expectDocumentedRings(stops, "login");
  });

  test("staff queue and detail: every tab stop has a visible ring", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(
      page.locator(
        isMobileProject(testInfo.project.name)
          ? '[data-testid^="staff-ticket-card-"]'
          : '[data-testid^="staff-ticket-row-"]'
      ).first()
    ).toBeVisible({ timeout: 15_000 });
    // Below 768px the nav is collapsed, so without opening it the header links
    // are not tabbable and this run would never see a header ring at all.
    await openNavIfCollapsed(page, testInfo.project.name);
    const { stops: queueStops } = await tabThrough(page);
    expect(queueStops.length).toBeGreaterThan(3);
    expectDocumentedRings(queueStops, "staff queue");

    await openStaffTicket(page, testInfo.project.name);
    const { stops: detailStops } = await tabThrough(page);
    expect(detailStops.length).toBeGreaterThan(3);
    expectDocumentedRings(detailStops, "staff ticket detail");
  });

  test("administrator user list: every tab stop has a visible ring", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="user-management-page"]')).toBeVisible();

    await openNavIfCollapsed(page, testInfo.project.name);
    const { stops } = await tabThrough(page);
    expect(stops.length).toBeGreaterThan(3);
    expectDocumentedRings(stops, "admin user list");
  });
});

// ── STYLE-06: editable vs read-only fields are distinguishable (checklist 2) ─

test.describe("STYLE-06 editable vs read-only fields (ui-spec section 3)", () => {
  test("read-only fields use the read-only tint and hold no focusable control", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await openStaffTicket(page, testInfo.project.name);

    // The same screen shows both kinds side by side: Ticket No / Requester are
    // ReadOnlyField, IT Priority / Status / Owner are editable selects.
    const readOnly = page.locator(".field-readonly").first();
    const editable = page.locator("select.field-select").first();
    await expect(readOnly).toBeVisible();
    await expect(editable).toBeVisible();

    const roBg = await readOnly.evaluate((el) => getComputedStyle(el).backgroundColor);
    const edBg = await editable.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(roBg, "read-only field must use --color-field-readonly").toBe(READONLY_BG);
    expect(edBg, "editable field must use --color-surface").toBe(SURFACE_BG);
    expect(roBg, "editable and read-only must not share a background").not.toBe(edBg);

    // A read-only field is not a control: no input inside, and not tabbable.
    expect(await readOnly.locator("input, select, textarea, button, a").count()).toBe(0);
    expect(await readOnly.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
  });
});

// ── STYLE-07: validation messages sit under their own field (checklist 3) ──

test.describe("STYLE-07 validation placement (ui-spec section 5.2, checklist 3)", () => {
  test("client-side field errors render below the field they belong to", async ({
    page,
  }) => {
    // Reached without a server round-trip: submitting the empty create form
    // fails `validate()` in CreateTicket.tsx, so nothing is sent and the seeded
    // account is never rotated.
    await loginAndUnlock(page, "napat.chaiwong@toktickit.dev", REQ_INITIAL_PASSWORD);
    await page.goto("/create-ticket");
    await page.click('[data-testid="submit-ticket"]');

    // Summary and Description are the two client-side required fields.
    for (const id of ["summary", "description"]) {
      const field = page.locator(`#${id}`);
      const message = page.locator(`#${id}-error`);
      await expect(message, `${id} must show its own error`).toBeVisible();

      // Zen Green places the message under its field, inside the same
      // .field-group, and never floats it over the form.
      const [fieldBox, messageBox] = await Promise.all([
        field.boundingBox(),
        message.boundingBox(),
      ]);
      expect(fieldBox, `${id} must be laid out`).not.toBeNull();
      expect(messageBox, `${id} error must be laid out`).not.toBeNull();
      expect(
        messageBox!.y,
        `${id}: the error message must render BELOW its field`
      ).toBeGreaterThanOrEqual(fieldBox!.y + fieldBox!.height - 1);
      expect(
        Math.abs(messageBox!.x - fieldBox!.x),
        `${id}: the error message must share its field's left edge`
      ).toBeLessThanOrEqual(2);
    }

    // Required fields carry the red asterisk (ui-spec section 5.2).
    const asterisk = page.locator('label[for="summary"] .required');
    await expect(asterisk).toBeVisible();
    expect(
      await asterisk.evaluate((el) => getComputedStyle(el).color),
      "the required asterisk must use --color-error"
    ).toBe("rgb(185, 28, 28)");
  });
});

// ── STYLE-08: no overlapping controls (checklist 9) ────────────────────────

test.describe("STYLE-08 no element overlap (ui-spec section 6, checklist 9)", () => {
  /**
   * Intersect the boxes of every visible control on the page. Responsive bugs
   * show up as two controls sitting on top of each other once a column
   * collapses, and that is measurable in a way a screenshot of one viewport is
   * not.
   */
  async function overlappingControls(page: Page) {
    return page.evaluate(() => {
      const describe = (el: Element) => {
        const testid = el.getAttribute("data-testid");
        const id = (el as HTMLElement).id;
        return `${el.tagName.toLowerCase()}${id ? `#${id}` : ""}${
          testid ? `[${testid}]` : ""
        }`;
      };
      const visible = Array.from(
        document.querySelectorAll("input, select, textarea, button, a[href]")
      ).filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        if (parseFloat(cs.opacity) === 0) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const hits: string[] = [];
      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const a = visible[i];
          const b = visible[j];
          // A control inside another control (a button wrapping an icon) is
          // one control, not an overlap.
          if (a.contains(b) || b.contains(a)) continue;
          // `ui-spec.md` section 5.1 puts a Show/Hide toggle INSIDE the password
          // field, so the toggle and the input legitimately share pixels. That
          // is the documented design, and the risk it creates — typed text
          // running under the toggle — is asserted directly by the padding test
          // below rather than hidden by skipping every overlap.
          const overlay = (el: Element, other: Element) => {
            if (getComputedStyle(el).position !== "absolute") return false;
            const wrapper = el.offsetParent;
            return !!wrapper && wrapper.contains(other);
          };
          if (overlay(a, b) || overlay(b, a)) continue;
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const dx = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const dy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          // 1px of slack: sub-pixel layout rounds edges by a fraction.
          if (dx > 1 && dy > 1) {
            hits.push(`${describe(a)} ↔ ${describe(b)} (${Math.round(dx)}×${Math.round(dy)}px)`);
          }
        }
      }
      return hits;
    });
  }

  test("staff queue, staff detail and admin list have no overlapping controls", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.locator('[data-testid="staff-queue-page"]')).toBeVisible();
    expect(await overlappingControls(page), "staff queue overlaps").toEqual([]);

    // Open the filter card too: the densest layout on the screen.
    await page.click('[data-testid="filters-toggle"]');
    await expect(page.locator('[data-testid="filter-card"]')).toBeVisible();
    expect(await overlappingControls(page), "staff queue with filters overlaps").toEqual([]);

    await openStaffTicket(page, testInfo.project.name);
    expect(await overlappingControls(page), "staff detail overlaps").toEqual([]);
  });

  test("login and change-password forms have no overlapping controls", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#login-email")).toBeVisible();
    expect(await overlappingControls(page), "login overlaps").toEqual([]);

    // The Show/Hide toggle is drawn inside the password field on purpose
    // (ui-spec section 5.1), so the field must reserve room for it — otherwise
    // a typed password slides under the button and part of it is unreadable.
    const [inputBox, toggleBox, paddingRight] = await Promise.all([
      page.locator("#login-password").boundingBox(),
      page.locator(".password-toggle").boundingBox(),
      page.locator("#login-password").evaluate(
        (el) => parseFloat(getComputedStyle(el).paddingRight) || 0
      ),
    ]);
    expect(toggleBox, "the Show/Hide toggle must be rendered").not.toBeNull();
    expect(inputBox, "the password field must be laid out").not.toBeNull();
    // The toggle sits inside the field's own box: an in-field control.
    expect(toggleBox!.x).toBeGreaterThanOrEqual(inputBox!.x);
    expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(
      inputBox!.x + inputBox!.width + 1
    );
    expect(
      paddingRight,
      "the password field must reserve padding for the Show/Hide toggle so typed text never runs under it"
    ).toBeGreaterThanOrEqual(toggleBox!.width + 12);

    // The change-password form carries the strength checklist and a footer, so
    // it is the most crowded form in the app.
    await loginAndUnlock(page, "michael.brown@toktickit.dev", REQ_INITIAL_PASSWORD, {
      completeMandatoryChange: false,
    });
    await expect(page).toHaveURL(/\/change-password/);
    expect(await overlappingControls(page), "change password overlaps").toEqual([]);
  });
});

// ── STYLE-09: role navigation and forbidden destinations (checklist 12) ────

test.describe("STYLE-09 role-based navigation (ui-spec section 4.1, checklist 12)", () => {
  async function navHrefs(page: Page) {
    return page.locator('nav[aria-label="Primary"] a').evaluateAll((links) =>
      links.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "")
    );
  }

  test("REQUESTER sees only My Tickets and Create Ticket, and is denied /admin/users", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, REQ_EMAIL, REQ_INITIAL_PASSWORD);
    await openNavIfCollapsed(page, testInfo.project.name);
    expect((await navHrefs(page)).sort()).toEqual(["/create-ticket", "/my-tickets"]);

    // The nav must not be the only guard: typing the URL directly is refused
    // by the backend role check and rendered as the forbidden state.
    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="forbidden-state"]')).toBeVisible();
  });

  test("IT_STAFF sees only My Queue and Create Ticket, and is denied /admin/users", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await openNavIfCollapsed(page, testInfo.project.name);
    expect((await navHrefs(page)).sort()).toEqual(["/create-ticket", "/staff/queue"]);

    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="forbidden-state"]')).toBeVisible();
  });

  test("ADMINISTRATOR sees My Queue, Create Ticket and User Management", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await openNavIfCollapsed(page, testInfo.project.name);
    expect((await navHrefs(page)).sort()).toEqual([
      "/admin/users",
      "/create-ticket",
      "/staff/queue",
    ]);
  });
});

// ── STYLE-10: long text is clamped, not stretched (checklist 24) ───────────

test.describe("STYLE-10 long-text clamping (ui-spec section 3/5.4, checklist 24)", () => {
  test("queue summaries clamp to two lines instead of stretching the row", async ({
    page,
  }, testInfo) => {
    await loginAndUnlock(page, STAFF_EMAIL, STAFF_PASSWORD);
    await expect(page.locator('[data-testid="staff-queue-page"]')).toBeVisible();
    // Measure rendered rows, not the loading skeleton.
    await expect(
      page.locator(
        isMobileProject(testInfo.project.name)
          ? '[data-testid^="staff-ticket-card-"]'
          : '[data-testid^="staff-ticket-row-"]'
      ).first()
    ).toBeVisible({ timeout: 15_000 });

    // Both renderings of a summary clamp to two lines (App.css
    // `.staff-col-summary .ticket-summary-clamp` for the table, `.ticket-card-summary`
    // for the mobile card), so the check follows the viewport the way the other
    // visual specs do.
    const selector = isMobileProject(testInfo.project.name)
      ? ".ticket-card-summary"
      : ".ticket-summary-clamp";
    const summaries = page.locator(selector);
    expect(
      await summaries.count(),
      `${selector} must render on the staff queue`
    ).toBeGreaterThan(0);

    const measurements = await summaries.evaluateAll((nodes) =>
      nodes.map((el) => {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          lineClamp: cs.webkitLineClamp,
          overflow: cs.overflow,
          height: rect.height,
          lineHeight: parseFloat(cs.lineHeight) || 0,
        };
      })
    );
    for (const m of measurements) {
      expect(m.lineClamp, "a summary must clamp to 2 lines").toBe("2");
      expect(m.overflow, "a clamped summary must hide its overflow").not.toBe("visible");
      if (m.lineHeight > 0) {
        expect(
          m.height,
          "a clamped summary must stay within two line boxes"
        ).toBeLessThanOrEqual(m.lineHeight * 2 + 2);
      }
    }
  });
});
