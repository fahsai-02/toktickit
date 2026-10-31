import { expect, test, type Page } from "@playwright/test";
import {
  API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD, NEW_USER_INITIAL_PASSWORD, REQ_EMAIL, REQ_INITIAL_PASSWORD, createUserViaAdminApi,
  collectConsoleErrors, createTempTicket, isMobileProject, loginAndUnlock, newApi,
  seedTicketWithMostActions, staffLogin, staffSessionCookie, ticketIdByNumber,
  useLab3DbHooks,
} from "./helpers.js";

/**
 * STYLE-08..11 — measured design rules (computed style and geometry, not
 * pixel diffs). docs/lab-04/tests.md section 2 (Style), ui-spec.md sections 1,
 * 5, 6, 7. Runs on all three projects. Read-only except throw-away tickets.
 */
useLab3DbHooks({ allProjects: true });

// ── geometry helpers (run in the page) ──────────────────────────────────────
interface Finding { what: string; detail: string }

async function layoutFindings(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const out: { what: string; detail: string }[] = [];
    const vw = window.innerWidth;
    // The rectangle a user can actually see: the element's box intersected with
    // every scroll/overflow container above it (the Urgent list scrolls inside a
    // fixed box, so rows scrolled out of it are not on screen and cannot overlap).
    const seen = (el: Element) => {
      const r = el.getBoundingClientRect();
      let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const pr = p.getBoundingClientRect();
        if (cs.overflowX !== "visible") { left = Math.max(left, pr.left); right = Math.min(right, pr.right); }
        if (cs.overflowY !== "visible") { top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom); }
      }
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const visible = (el: Element) => {
      const r = seen(el);
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest(".sr-only");
    };
    const label = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.getAttribute("data-testid") ? `[${el.getAttribute("data-testid")}]` : ""}.${(el.className?.toString() || "").split(" ")[0]}`;

    // Overlap: visible interactive controls must not cover each other.
    const controls = [...document.querySelectorAll("a[href], button, input, select, textarea")].filter(visible);
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i], b = controls[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = seen(a), rb = seen(b);
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w > 2 && h > 2) out.push({ what: "overlap", detail: `${label(a)} x ${label(b)} (${Math.round(w)}x${Math.round(h)}px)` });
      }
    }

    // Clipping: text that sticks out of the viewport, or hidden by overflow
    // without an ellipsis (an ellipsis is the design for one-line summaries).
    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el)) continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
      if (!hasText) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) out.push({ what: "outside-viewport", detail: `${label(el)} ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}` });
      const cs = getComputedStyle(el);
      const clips = ["hidden", "clip"].includes(cs.overflowX);
      if (clips && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== "ellipsis") {
        out.push({ what: "clipped", detail: `${label(el)} scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}` });
      }
    }
    return out;
  });
}

async function auditScreen(page: Page, name: string) {
  const findings = await layoutFindings(page);
  expect(findings, `${name}: layout findings`).toEqual([]);
}

/** A brand-new Requester, unlocked: seed accounts can only be rotated once per project run. */
async function freshRequester(page: Page) {
  const admin = await newApi();
  const user = await createUserViaAdminApi(admin, ADMIN_EMAIL, ADMIN_PASSWORD, "REQUESTER");
  await admin.dispose();
  await loginAndUnlock(page, user.email, NEW_USER_INITIAL_PASSWORD);
}

// ── STYLE-08: layout integrity + visible focus ring ─────────────────────────
test.describe("STYLE-08 layout integrity and focus ring", () => {
  test("requester and staff dashboards have no overlap or clipping", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAndUnlock(page, REQ_EMAIL, REQ_INITIAL_PASSWORD);
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    await auditScreen(page, "requester dashboard");

    errors.assertClean();
  });

  test("staff dashboard, staff ticket (Actions Taken) and its form", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await staffLogin(page);
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    await auditScreen(page, "staff dashboard");

    const id = await ticketIdByNumber(await staffSessionCookie(), seedTicketWithMostActions().ticketNumber);
    await page.goto(`/staff/tickets/${id}`);
    await page.getByTestId("tab-actions").click();
    await expect(page.getByTestId("actions-list")).toBeVisible();
    await auditScreen(page, "staff ticket actions");

    await page.getByTestId("record-action-btn").click();
    await expect(page.getByTestId("action-description-input")).toBeVisible();
    // Inside the open drawer: the drawer's own controls must not collide.
    const drawerFindings = await page.getByTestId("action-form-drawer").evaluate((drawer) => {
      const out: string[] = [];
      const cs = [...drawer.querySelectorAll("button, input, select, textarea")].filter((e) => (e as HTMLElement).offsetWidth > 0);
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i].getBoundingClientRect(), b = cs[j].getBoundingClientRect();
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2)
          out.push(`${cs[i].tagName}#${cs[i].id} x ${cs[j].tagName}#${cs[j].id}`);
      }
      return out;
    });
    expect(drawerFindings, "drawer overlap").toEqual([]);
    errors.assertClean();
  });

  test("requester ticket with Actions Taken", async ({ page }) => {
    test.setTimeout(120_000);
    const staffCookie = await staffSessionCookie();
    const ticket = await createTempTicket(undefined, "audit requester", staffCookie, ["OPEN", "IN_PROGRESS"]);
    const api = await newApi();
    await api.post(`${API_BASE}/api/tickets/${ticket.id}/actions`, {
      headers: { cookie: staffCookie },
      data: { description: "E2E audit action", result: "E2E audit result", followUpRequired: true, followUpNote: "E2E audit follow-up", attachmentNotes: "E2E audit note" },
    });
    await api.dispose();
    await loginAndUnlock(page, ticket.requesterEmail, ticket.requesterPassword);
    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByTestId("requester-actions").locator("li.action-card")).toHaveCount(1);
    await auditScreen(page, "requester ticket");
  });

  test("focus ring: 2px, offset 2px, visible on a card, a tab, an Edit button and a form field", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await staffLogin(page);
    const probe = (loc: ReturnType<Page["locator"]>) => loc.first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { focusVisible: el.matches(":focus-visible"), width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset, color: cs.outlineColor, shadow: cs.boxShadow };
    });
    // Polled, because fields animate border/box-shadow over 0.15s: the ring is
    // asserted once the transition has settled, not on the first frame.
    const expectRing = async (name: string, loc: ReturnType<Page["locator"]>) => {
      await expect
        .poll(async () => {
          const r = await probe(loc);
          const outline = r.style === "solid" && r.width === "2px" && r.offset === "2px";
          const shadow = /0px 0px 0px 2px/.test(r.shadow);
          return r.focusVisible && (outline || shadow) ? "ok" : JSON.stringify(r);
        }, { message: `${name} must show a 2px focus ring` })
        .toBe("ok");
    };

    await page.keyboard.press("Tab");
    const card = page.getByTestId("metric-card-new");
    await card.focus();
    await expectRing("dashboard card", card);

    const id = await ticketIdByNumber(await staffSessionCookie(), seedTicketWithMostActions().ticketNumber);
    await page.goto(`/staff/tickets/${id}`);
    await page.getByTestId("tab-actions").click();
    await page.keyboard.press("Tab");
    await page.getByTestId("tab-actions").focus();
    await expectRing("tab", page.getByTestId("tab-actions"));
    const edit = page.locator('[data-testid^="edit-action-"]').first();
    await page.keyboard.press("Tab");
    await edit.focus();
    await expectRing("Edit button", edit);

    await page.getByTestId("record-action-btn").click();
    const field = page.getByTestId("action-description-input");
    await page.keyboard.press("Tab");
    await field.focus();
    await expectRing("form field", field);
    errors.assertClean();
  });
});

// ── STYLE-09: Asia/Bangkok on screen ────────────────────────────────────────
test.describe("STYLE-09 dates render as Asia/Bangkok wall clock", () => {
  // A browser in Los Angeles must still show Bangkok time (BR-18): if the
  // implementation used the browser zone, this would be 14-15 hours off.
  test.use({ timezoneId: "America/Los_Angeles" });

  test("staff Actions Taken list shows each action at its Bangkok date and time", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { ticketNumber, actions } = seedTicketWithMostActions();
    const id = await ticketIdByNumber(await staffSessionCookie(), ticketNumber);
    await staffLogin(page);
    await page.goto(`/staff/tickets/${id}`);
    await page.getByTestId("tab-actions").click();
    await expect(page.getByTestId("actions-list")).toBeVisible();

    for (const a of actions) {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(new Date(a.actionDate));
      const get = (t: string) => parts.find((p) => p.type === t)!.value;
      const card = page.locator("li.action-card", { hasText: a.description });
      await expect(card, a.description).toBeVisible();
      const dateText = await card.locator(".actions-date").innerText();
      expect(dateText, a.actionDate).toContain(`${get("hour")}:${get("minute")}`);
      expect(dateText).toContain(`${get("day")} `);
      expect(dateText).toContain("(Asia/Bangkok)");
    }
    errors.assertClean();
  });

  test("the Action form's Set to now writes a Bangkok-labelled time, not the browser zone", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const id = await ticketIdByNumber(await staffSessionCookie(), seedTicketWithMostActions().ticketNumber);
    await staffLogin(page);
    await page.goto(`/staff/tickets/${id}`);
    await page.getByTestId("tab-actions").click();
    await page.getByTestId("record-action-btn").click();
    await page.getByTestId("action-date-now").click();
    const value = await page.getByTestId("action-date-input").inputValue();
    const bangkokNow = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).replace(" ", "T");
    // Within two minutes of Bangkok "now" (the clock moves while the test runs).
    const diff = Math.abs(new Date(value + "Z").getTime() - new Date(bangkokNow + "Z").getTime());
    expect(diff, `input ${value} vs Bangkok now ${bangkokNow}`).toBeLessThan(2 * 60_000);
    errors.assertClean();
  });
});

// ── STYLE-10: metric cards are uniform ──────────────────────────────────────
test.describe("STYLE-10 metric cards are visually uniform", () => {
  async function cardStyles(page: Page) {
    return page.evaluate(() => [...document.querySelectorAll(".metric-card")].map((el) => {
      const cs = getComputedStyle(el);
      const v = el.querySelector(".metric-card__value");
      const l = el.querySelector(".metric-card__label");
      const vs = v ? getComputedStyle(v) : null;
      const ls = l ? getComputedStyle(l) : null;
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-testid") ?? el.className,
        padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(" "),
        radius: cs.borderRadius,
        valueSize: vs?.fontSize, valueWeight: vs?.fontWeight, valueAlign: vs?.textAlign,
        labelSize: ls?.fontSize, textAlign: cs.textAlign,
        valueLeft: v ? Math.round(v.getBoundingClientRect().left - r.left) : null,
        row: Math.round(r.top / 10), height: Math.round(r.height),
      };
    }));
  }

  function expectUniform(cards: Awaited<ReturnType<typeof cardStyles>>, name: string) {
    expect(cards.length, `${name}: cards found`).toBeGreaterThanOrEqual(6);
    const same = (key: keyof (typeof cards)[number]) => {
      const set = new Set(cards.map((c) => c[key]));
      expect(set.size, `${name}: ${String(key)} differs across cards: ${JSON.stringify(cards.map((c) => [c.id, c[key]]))}`).toBe(1);
    };
    for (const k of ["padding", "radius", "valueSize", "valueWeight", "valueAlign", "labelSize", "textAlign"] as const) same(k);
    // Cards in the same grid row are the same height (none taller for another reason).
    const rows = new Map<number, number[]>();
    for (const c of cards) rows.set(c.row, [...(rows.get(c.row) ?? []), c.height]);
    for (const [row, heights] of rows) {
      expect(Math.max(...heights) - Math.min(...heights), `${name}: row ${row} heights ${heights}`).toBeLessThanOrEqual(1);
    }
  }

  test("requester dashboard", async ({ page }) => {
    await freshRequester(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    expectUniform(await cardStyles(page), "requester");
  });

  test("staff dashboard (Administrator, with the Users card)", async ({ page }) => {
    await loginAndUnlock(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/staff/dashboard");
    await expect(page.getByTestId("dashboard-live-region")).toHaveText("Dashboard loaded.");
    expectUniform(await cardStyles(page), "staff admin");
  });
});

// ── STYLE-11: tap targets >= 36px on mobile (ui-spec section 6, Mobile; amended from 44px) ──────
test.describe("STYLE-11 tap targets are at least 36px at 375px", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!isMobileProject(testInfo.project.name), "ui-spec section 6 sets the 36px rule for Mobile only");
  });

  async function smallTargets(page: Page) {
    return page.evaluate(() => {
      const out: string[] = [];
      const sel = "button, select, textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), a.btn-primary, a.btn-secondary, a.btn-ghost, [role=tab], [role=switch], .detail-tab";
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || el.closest(".sr-only")) continue;
        if (Math.round(r.height) < 36) out.push(`${el.tagName.toLowerCase()}[${el.getAttribute("data-testid") ?? el.className}] ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return out;
    });
  }

  test("requester screens", async ({ page }) => {
    await freshRequester(page);
    for (const path of ["/dashboard", "/my-tickets", "/create-ticket"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await smallTargets(page), path).toEqual([]);
    }
  });

  test("staff screens", async ({ page }) => {
    await staffLogin(page);
    for (const path of ["/staff/dashboard", "/staff/queue"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await smallTargets(page), path).toEqual([]);
    }
    const id = await ticketIdByNumber(await staffSessionCookie(), seedTicketWithMostActions().ticketNumber);
    await page.goto(`/staff/tickets/${id}`);
    for (const tab of ["tab-comments", "tab-notes", "tab-attachments", "tab-actions"]) {
      await page.getByTestId(tab).click();
      expect(await smallTargets(page), tab).toEqual([]);
    }
    await page.getByTestId("tab-actions").click();
    await page.getByTestId("record-action-btn").click();
    expect(await smallTargets(page), "action form").toEqual([]);
  });
});
