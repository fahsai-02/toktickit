import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import "../../src/index.css";
import "../../src/App.css";
import { AuthProvider } from "../../src/AuthContext.js";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import StaffDashboard from "../../src/StaffDashboard.js";
import RequesterDashboard from "../../src/RequesterDashboard.js";
import Badge, {
  coloredStatusBadgeVariant,
  priorityBadgeVariant,
} from "../../src/components/Badge.js";
import * as api from "../../src/api.js";

// Lab 4 Zen Green style + accessibility checks (Issue 29).
// Traceability: docs/lab-04/tests.md STYLE-01..07, A11Y-03, anchored on
// ui-spec.md section 1 (tokens), section 3 (badges, buttons, fields),
// section 5.3 (Actions Taken form), section 5.5 and section 7 (accessibility).
// jsdom cannot parse the modern `@layer` CSS (AGENTS.md test rule 6), so rules
// are read from the CSS SOURCE FILES and the DOM is asserted by class/ARIA.
// Real computed colours at three viewports are STYLE-08..10 in Playwright.

const readCss = (rel: string) =>
  readFileSync(resolvePath(process.cwd(), "src", rel), "utf8"); // vitest runs from client/
const INDEX_CSS = readCss("index.css");
const APP_CSS = readCss("App.css");
const BADGE_CSS = readCss("components/Badge.css");

interface Rule { selector: string; body: string }
function rulesOf(css: string): Rule[] {
  const out: Rule[] = [];
  const leaf = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = leaf.exec(css))) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (selector && !selector.startsWith("@")) out.push({ selector, body: m[2] });
  }
  return out;
}
const rootBody = rulesOf(INDEX_CSS).find((r) => r.selector === ":root")!.body;
const TOKENS = new Map<string, string>(
  [...rootBody.matchAll(/(--color-[a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
);
const decl = (body: string, prop: string) =>
  new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();
/** Resolve `var(--color-x)` to its hex; literals pass through. */
const resolve = (v: string | undefined) => {
  const m = v && /^var\((--[a-z-]+)\)$/.exec(v);
  return m ? TOKENS.get(m[1]) : v;
};
const ruleFor = (css: string, selector: string) =>
  rulesOf(css).find((r) => r.selector.split(",").map((s) => s.trim()).includes(selector));

const STATUSES = [
  "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER",
  "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// ── fixtures ────────────────────────────────────────────────────────────────
const staffUser: api.User = {
  id: 7, name: "Sombat Staff", email: "sombat.staff@toktickit.dev",
  role: "IT_STAFF", mustChangePassword: false,
};
const requesterUser: api.User = {
  id: 3, name: "Dana Requester", email: "dana@toktickit.dev",
  role: "REQUESTER", mustChangePassword: false,
};

const baseTicket: api.StaffTicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000910",
  summary: "Laptop battery drains quickly",
  description: "Battery drains within two hours even when asleep.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  ticketDate: "2026-09-01T10:00:00.000Z",
  version: 1,
  requester: { id: 1, name: "Jennifer Anderson" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  resolutionSummary: null,
  requesterIndicatedResolved: false,
  indicatedResolvedAt: null,
  owner: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
  _count: { attachments: 0, comments: 0, notes: 0 },
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T09:30:00.000Z",
  attachments: [],
};
const baseAction: api.ActionTaken = {
  id: 42, ticketId: 101,
  actionDate: "2026-10-04T02:15:00.000Z",
  description: "Replaced the 65W charger",
  result: "Charge rate verified",
  performedById: 7,
  performedBy: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
  followUpRequired: false, followUpNote: null, attachmentNotes: null,
  version: 1,
  createdAt: "2026-10-04T02:20:00.000Z",
  updatedAt: "2026-10-04T02:20:00.000Z",
};

function mockStaffScreen(actions: api.ActionTaken[], ticket = baseTicket) {
  vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
  vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "fetchStaffComments").mockResolvedValue([]);
  vi.spyOn(api, "fetchInternalNotes").mockResolvedValue([]);
  vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 2, name: "Hardware" }]);
  vi.spyOn(api, "fetchStaffUsers").mockResolvedValue([{ id: 7, name: "Sombat Staff", role: "IT_STAFF" }]);
  vi.spyOn(api, "fetchTicketActions").mockResolvedValue(actions);
}
function renderStaffDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/staff/tickets/101"]}>
        <Routes>
          <Route path="/staff/tickets/:ticketId" element={<StaffTicketDetail />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}
async function openActionForm(actions: api.ActionTaken[] = [baseAction]) {
  mockStaffScreen(actions);
  renderStaffDetail();
  await screen.findByTestId("staff-ticket-detail");
  fireEvent.click(screen.getByTestId("tab-actions"));
  await screen.findByTestId("panel-actions");
  fireEvent.click(await screen.findByTestId(actions.length ? "record-action-btn" : "empty-record-action-btn"));
  await screen.findByTestId("action-description-input");
}

const dashTicket = (id: number, status: string, prio: string | null): api.StaffDashboardTicketRow => ({
  id, ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`, summary: `Summary ${id}`,
  currentStatus: status as api.StaffDashboardTicketRow["currentStatus"],
  itPriority: prio as api.StaffDashboardTicketRow["itPriority"],
  updatedAt: "2026-10-01T10:00:00.000Z", owner: null,
});

function renderStaffDashboard(data: api.StaffDashboard) {
  vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
  vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(data);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/staff/dashboard"]}>
        <Routes><Route path="/staff/dashboard" element={<StaffDashboard />} /></Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}
function renderRequesterDashboard(data: api.RequesterDashboard) {
  vi.spyOn(api, "fetchMe").mockResolvedValue(requesterUser);
  vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(data);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes><Route path="/dashboard" element={<RequesterDashboard />} /></Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

const zeroStaff: api.StaffDashboard = {
  counts: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, unassigned: 0, myAssigned: 0, urgentTickets: 0 },
  byItPriority: [
    { itPriority: "URGENT", count: 0 }, { itPriority: "HIGH", count: 0 },
    { itPriority: "MEDIUM", count: 0 }, { itPriority: "LOW", count: 0 },
    { itPriority: null, count: 0 },
  ],
  recentTickets: [], urgentTickets: [], myRecentActions: [],
};

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

// STYLE-01 — ui-spec section 1: no new colour token.
describe("STYLE-01: Lab 4 components use only existing --color-* tokens", () => {
  const LAB4 = /^\.(action-|actions-|dashboard-|metric-|priority-strip|skeleton-|urgent-|resolved-|resolution-)/;
  const lab4Rules = rulesOf(APP_CSS).filter((r) =>
    r.selector.split(",").some((s) => LAB4.test(s.trim()))
  );

  it("finds the Lab 4 rule set (guards against the filter matching nothing)", () => {
    expect(lab4Rules.length).toBeGreaterThan(40);
  });

  it("every colour declaration is a var(--color-*) that :root defines, never a literal", () => {
    const COLOR_PROPS = ["color", "background", "background-color", "border", "border-color", "border-left", "border-top", "border-bottom", "outline", "fill", "stroke"];
    const offenders: string[] = [];
    for (const r of lab4Rules) {
      for (const prop of COLOR_PROPS) {
        const v = decl(r.body, prop);
        if (!v) continue;
        if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(v)) offenders.push(`${r.selector} { ${prop}: ${v} }`);
        for (const m of v.matchAll(/var\((--color-[a-z-]+)\)/g)) {
          if (!TOKENS.has(m[1])) offenders.push(`${r.selector}: undefined token ${m[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("App.css introduces no --color-* token of its own", () => {
    expect(APP_CSS).not.toMatch(/--color-[a-z-]+\s*:/);
  });
});

// STYLE-02 — ui-spec section 3 Badges: same palettes as Lab 3.
describe("STYLE-02: status and priority badges reuse the Lab 3 classes", () => {
  it("maps all 8 statuses and 4 priorities to the Lab 3 badge class names", () => {
    const status: Record<string, string> = {
      NEW: "badge-status-new", OPEN: "badge-status-open", IN_PROGRESS: "badge-status-in-progress",
      WAITING_FOR_REQUESTER: "badge-status-waiting", RESOLVED: "badge-status-resolved",
      CLOSED: "badge-status-closed", REOPENED: "badge-status-reopened", CANCELLED: "badge-status-cancelled",
    };
    for (const s of STATUSES) {
      const { container, unmount } = render(<Badge variant={coloredStatusBadgeVariant(s)}>{s}</Badge>);
      expect(container.firstElementChild).toHaveClass("badge", status[s]);
      expect(ruleFor(BADGE_CSS, `.${status[s]}`), `${status[s]} is defined in Badge.css`).toBeTruthy();
      unmount();
    }
    for (const p of PRIORITIES) {
      const cls = `badge-priority-${p.toLowerCase()}`;
      const { container, unmount } = render(<Badge variant={priorityBadgeVariant(p)}>{p}</Badge>);
      expect(container.firstElementChild).toHaveClass("badge", cls);
      expect(ruleFor(BADGE_CSS, `.${cls}`)).toBeTruthy();
      unmount();
    }
  });

  it("the Staff Dashboard lists render badges with those same classes", async () => {
    renderStaffDashboard({
      ...zeroStaff,
      counts: { ...zeroStaff.counts, urgentTickets: 1 },
      recentTickets: [dashTicket(1, "WAITING_FOR_REQUESTER", "HIGH")],
      urgentTickets: [dashTicket(2, "REOPENED", "URGENT")],
    });
    await screen.findByTestId("urgent-section");
    expect(document.querySelector(".badge-status-waiting")).toBeTruthy();
    expect(document.querySelector(".badge-status-reopened")).toBeTruthy();
    expect(document.querySelector(".badge-priority-urgent")).toBeTruthy();
  });
});

// STYLE-03 — ui-spec section 5.5: indicated-resolved is not a status badge.
describe("STYLE-03: the 'requester indicated resolved' marker is distinct from every status badge", () => {
  const pair = (selector: string, css = APP_CSS) => {
    const r = ruleFor(css, selector)!;
    expect(r, selector).toBeTruthy();
    return {
      color: resolve(decl(r.body, "color"))?.toLowerCase(),
      background: resolve(decl(r.body, "background") ?? decl(r.body, "background-color"))?.toLowerCase(),
    };
  };

  it("staff marker has its own class (not .badge / badge-status-*) and a colour pair no status badge uses", async () => {
    mockStaffScreen([], { ...baseTicket, requesterIndicatedResolved: true, indicatedResolvedAt: "2026-10-02T08:00:00.000Z" });
    renderStaffDetail();
    const marker = await screen.findByTestId("requester-resolved-indicator");
    expect(marker).toHaveClass("resolved-indicator");
    expect(marker.className).not.toMatch(/badge/);

    const mine = pair(".resolved-indicator");
    for (const s of STATUSES) {
      const theirs = pair(`.${coloredStatusBadgeVariant(s).replace(/^/, "badge-")}`, BADGE_CSS);
      expect(`${mine.color}/${mine.background}`, `vs ${s}`).not.toBe(`${theirs.color}/${theirs.background}`);
    }
  });

  it("requester confirmation is likewise not a status badge and differs from RESOLVED's pair", () => {
    const mine = pair(".resolved-confirmation");
    const resolved = pair(".badge-status-resolved", BADGE_CSS);
    expect(`${mine.color}/${mine.background}`).not.toBe(`${resolved.color}/${resolved.background}`);
  });
});

// STYLE-04 — FR-17, AC-10: zero is shown, never hidden.
describe("STYLE-04: a 0 metric and the 'Not set' bucket stay in the DOM", () => {
  it("staff dashboard with every count 0 still renders each card and all five buckets with 0", async () => {
    renderStaffDashboard(zeroStaff);
    const strip = await screen.findByTestId("priority-strip");
    const notSet = within(strip).getByTestId("priority-bucket-null");
    expect(notSet).toHaveTextContent("Not set");
    expect(notSet).toHaveTextContent("0");
    for (const id of ["new", "open", "in-progress", "waiting", "unassigned", "my-assigned"]) {
      expect(screen.getByTestId(`metric-card-${id}`)).toHaveTextContent("0");
    }
  });

  it("requester dashboard with no tickets still renders all six cards showing 0", async () => {
    renderRequesterDashboard({
      counts: { open: 0, inProgress: 0, waitingForRequester: 0, resolved: 0, closed: 0, attentionRequired: 0 },
      recentTickets: [], recentlyResolved: [],
    });
    for (const id of ["open", "in-progress", "waiting", "resolved", "closed", "attention"]) {
      expect(await screen.findByTestId(`metric-card-${id}`)).toHaveTextContent("0");
    }
  });
});

// STYLE-05 — ui-spec section 3 Buttons: busy state.
describe("STYLE-05: Save is disabled and shows a spinner while in flight", () => {
  it("disables Save Action, keeps the spinner aria-hidden, and removes both when the request settles", async () => {
    await openActionForm();
    let release!: (a: api.ActionTaken) => void;
    vi.spyOn(api, "createActionTaken").mockReturnValue(new Promise((res) => { release = res; }));

    fireEvent.change(screen.getByTestId("action-description-input"), { target: { value: "Did a thing" } });
    fireEvent.change(screen.getByTestId("action-result-input"), { target: { value: "It worked" } });
    const save = screen.getByTestId("save-action-btn");
    expect(save).toBeEnabled();
    expect(save.querySelector(".spinner")).toBeNull();

    fireEvent.click(save);
    await waitFor(() => expect(screen.getByTestId("save-action-btn")).toBeDisabled());
    const spinner = screen.getByTestId("save-action-btn").querySelector(".spinner");
    expect(spinner).toBeTruthy();
    expect(spinner).toHaveAttribute("aria-hidden", "true");
    expect(ruleFor(INDEX_CSS, ".spinner")).toBeTruthy();

    release({ ...baseAction, id: 99 });
    await waitFor(() => expect(screen.queryByTestId("save-action-btn")).toBeNull());
  });
});

// STYLE-06 — FR-01: required markers and field-bound messages.
describe("STYLE-06: required markers and error wiring on the Action form", () => {
  it("shows a red * on Description and Result, and on Follow-Up Note only once follow-up is on", async () => {
    await openActionForm();
    const star = (labelText: string) =>
      screen.getByText(labelText, { selector: "label" }).querySelector(".required");
    expect(star("Description")).toHaveTextContent("*");
    expect(star("Result")).toHaveTextContent("*");
    expect(screen.queryByText("Follow-Up Note", { selector: "label" })).toBeNull();

    fireEvent.click(screen.getByTestId("action-followup-toggle"));
    expect(star("Follow-Up Note")).toHaveTextContent("*");
    expect(resolve(decl(ruleFor(INDEX_CSS, ".required")!.body, "color"))).toBe(TOKENS.get("--color-error"));
    // Attachment Notes is optional: no marker.
    expect(screen.getByText("Attachment Notes", { selector: "label" }).querySelector(".required")).toBeNull();
  });

  it("an empty Save puts each message under its own field, linked by aria-describedby, without calling the API", async () => {
    await openActionForm();
    const create = vi.spyOn(api, "createActionTaken");
    fireEvent.click(screen.getByTestId("action-followup-toggle"));
    fireEvent.click(screen.getByTestId("save-action-btn"));

    for (const [field, errId] of [
      ["action-description", "action-description-error"],
      ["action-result", "action-result-error"],
      ["action-followup-note", "action-followup-note-error"],
    ] as const) {
      const msg = await screen.findByTestId(errId);
      const input = document.getElementById(field)!;
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby")).toBe(msg.id);
      expect(input.parentElement).toContainElement(msg);
    }
    expect(create).not.toHaveBeenCalled();
    expect(resolve(decl(ruleFor(INDEX_CSS, ".field-error-msg")!.body, "color"))).toBe(TOKENS.get("--color-error"));
  });
});

// STYLE-07 — FR-01: 2000-character counter.
describe("STYLE-07: 2000-character counter", () => {
  it("is present, and switches to the error class past the limit", async () => {
    await openActionForm();
    const counter = () => screen.getByTestId("field-counter-action-description");
    expect(counter()).toHaveTextContent("0/2000");
    expect(counter()).not.toHaveClass("field-counter-error");

    fireEvent.change(screen.getByTestId("action-description-input"), { target: { value: "x".repeat(2000) } });
    expect(counter()).toHaveTextContent("2000/2000");
    expect(counter()).not.toHaveClass("field-counter-error");

    fireEvent.change(screen.getByTestId("action-description-input"), { target: { value: "x".repeat(2001) } });
    expect(counter()).toHaveTextContent("2001/2000");
    expect(counter()).toHaveClass("field-counter-error");
    expect(resolve(decl(ruleFor(INDEX_CSS, ".field-counter-error")!.body, "color"))).toBe(TOKENS.get("--color-error"));
  });
});

// A11Y-03 — ui-spec section 7: never colour alone.
describe("A11Y-03: every status and priority badge carries its value as text", () => {
  const VALUES = new Set<string>([...STATUSES, ...PRIORITIES]);
  const statusPriorityBadges = (root: ParentNode) =>
    [...root.querySelectorAll<HTMLElement>('[class*="badge-status-"], [class*="badge-priority-"]')];

  function expectTextBadges(root: ParentNode, expected: string[]) {
    const badges = statusPriorityBadges(root);
    expect(badges.length).toBeGreaterThan(0);
    for (const b of badges) {
      expect(b.textContent?.trim(), b.className).toMatch(/\S/);
      expect(VALUES.has(b.textContent!.trim()), `"${b.textContent}" is a real status/priority value`).toBe(true);
    }
    const texts = badges.map((b) => b.textContent!.trim());
    for (const e of expected) expect(texts).toContain(e);
  }

  it("Actions Taken screen (staff ticket header)", async () => {
    mockStaffScreen([baseAction]);
    renderStaffDetail();
    await screen.findByTestId("staff-ticket-detail");
    fireEvent.click(screen.getByTestId("tab-actions"));
    await screen.findByTestId("panel-actions");
    expectTextBadges(document.body, ["IN_PROGRESS"]);
  });

  it("Staff dashboard recent and urgent lists", async () => {
    renderStaffDashboard({
      ...zeroStaff,
      counts: { ...zeroStaff.counts, urgentTickets: 1 },
      recentTickets: STATUSES.map((s, i) => dashTicket(10 + i, s, PRIORITIES[i % 4])),
      urgentTickets: [dashTicket(50, "OPEN", "URGENT")],
    });
    await screen.findByTestId("urgent-section");
    expectTextBadges(document.body, [...STATUSES, "URGENT"]);
  });

  it("Requester dashboard lists", async () => {
    const row = (id: number, s: string) => ({
      id, ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`, summary: `S ${id}`,
      currentStatus: s, itPriority: null, updatedAt: "2026-10-01T10:00:00.000Z",
    }) as api.DashboardTicketRow;
    renderRequesterDashboard({
      counts: { open: 1, inProgress: 1, waitingForRequester: 0, resolved: 1, closed: 0, attentionRequired: 0 },
      recentTickets: [row(1, "IN_PROGRESS")],
      recentlyResolved: [row(2, "RESOLVED")],
    });
    await screen.findByTestId("metric-card-open");
    expectTextBadges(document.body, ["IN_PROGRESS", "RESOLVED"]);
  });
});
