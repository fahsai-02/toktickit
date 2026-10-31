import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import StaffDashboard from "../../src/StaffDashboard.js";
import * as api from "../../src/api.js";

// Lab 4 — IT Staff Dashboard (docs/lab-04/tests.md rows UI-25..UI-28;
// ui-spec 5.2). jsdom; the API is mocked.

const staff: api.User = {
  id: 7, name: "Sombat Staff", email: "sombat@toktickit.dev",
  role: "IT_STAFF", mustChangePassword: false,
};
const admin: api.User = { ...staff, id: 1, name: "Ada Admin", role: "ADMINISTRATOR" };

const ticket = (id: number): api.StaffDashboardTicketRow => ({
  id,
  ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`,
  summary: `Summary ${id}`,
  currentStatus: "OPEN",
  itPriority: "URGENT",
  updatedAt: "2026-10-01T10:00:00.000Z",
  owner: null,
});

const action = (id: number, ticketId: number): api.MyRecentAction => ({
  id,
  ticketId,
  ticketNumber: `TKT-2026-${String(ticketId).padStart(6, "0")}`,
  actionDate: "2026-10-01T10:00:00.000Z",
  description: `Did thing ${id}`,
  result: "Done",
  performedById: 7,
  updatedAt: "2026-10-01T10:00:00.000Z",
});

const base: api.StaffDashboard = {
  counts: { new: 4, open: 9, inProgress: 6, waitingForRequester: 3, unassigned: 12, myAssigned: 5, urgentTickets: 1 },
  byItPriority: [
    { itPriority: "URGENT", count: 2 },
    { itPriority: "HIGH", count: 5 },
    { itPriority: "MEDIUM", count: 11 },
    { itPriority: "LOW", count: 4 },
    { itPriority: null, count: 8 },
  ],
  recentTickets: [ticket(31)],
  urgentTickets: [ticket(31)],
  myRecentActions: [41, 42, 43, 44, 45].map((i) => action(i, 100 + i)),
};

function renderDashboard(user: api.User, data: api.StaffDashboard) {
  vi.spyOn(api, "fetchMe").mockResolvedValue(user);
  vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(data);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/staff/dashboard"]}>
        <Routes>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("StaffDashboard (UI-25..UI-28)", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  // UI-25 — ui-spec section 5.2 "By IT Priority": always five buckets.
  it("UI-25: the strip renders all five buckets including 'Not set'", async () => {
    renderDashboard(staff, base);
    const strip = await screen.findByTestId("priority-strip");
    for (const bucket of base.byItPriority) {
      const label = bucket.itPriority ?? "Not set";
      const testId = `priority-bucket-${bucket.itPriority === null ? "null" : bucket.itPriority.toLowerCase()}`;
      const link = within(strip).getByTestId(testId);
      expect(link).toHaveTextContent(label);
      expect(link).toHaveTextContent(String(bucket.count));
    }
    expect(within(strip).getByTestId("priority-bucket-null")).toHaveAttribute("href", "/staff/queue");
    expect(within(strip).getByTestId("priority-bucket-urgent")).toHaveAttribute(
      "href",
      "/staff/queue?itPriority=URGENT"
    );
  });

  it("UI-25: an empty bucket still renders with 0", async () => {
    renderDashboard(staff, {
      ...base,
      byItPriority: base.byItPriority.map((b) =>
        b.itPriority === "LOW" ? { ...b, count: 0 } : b
      ),
    });
    const low = await screen.findByTestId("priority-bucket-low");
    expect(low).toHaveTextContent("0");
  });

  // UI-26 — ui-spec section 5.2 "Urgent list": two filter links, two queries.
  it("UI-26: Urgent header offers both links pointing at different queries", async () => {
    renderDashboard(staff, base);
    const byIt = await screen.findByTestId("urgent-link-it-priority");
    const byReq = screen.getByTestId("urgent-link-req-priority");
    expect(byIt).toHaveTextContent("By IT Priority");
    expect(byReq).toHaveTextContent("By Requested Priority");
    expect(byIt).toHaveAttribute("href", "/staff/queue?itPriority=URGENT");
    expect(byReq).toHaveAttribute("href", "/staff/queue?requestedPriority=URGENT");
    expect(byIt.getAttribute("href")).not.toBe(byReq.getAttribute("href"));
  });

  // UI-27 — FR-15: the Users card follows the payload, not a client guess.
  it("UI-27: Users card renders for an Administrator payload", async () => {
    renderDashboard(admin, { ...base, userCounts: { total: 10, active: 8, inactive: 2 } });
    const card = await screen.findByTestId("metric-card-users");
    expect(card).toHaveAttribute("href", "/admin/users");
    expect(card).toHaveTextContent("10");
    expect(card).toHaveTextContent("8 active");
    expect(card).toHaveTextContent("2 inactive");
  });

  it("UI-27: Users card is absent when userCounts is missing", async () => {
    renderDashboard(staff, base);
    await screen.findByTestId("staff-dashboard");
    await screen.findByTestId("priority-strip");
    expect(screen.queryByTestId("admin-users-section")).toBeNull();
    expect(screen.queryByTestId("metric-card-users")).toBeNull();
  });

  // UI-28 — ui-spec section 5.2 "My Recent Actions": rows open the Actions Taken tab.
  it("UI-28: five recent actions, each linking to its ticket's Actions Taken tab", async () => {
    renderDashboard(staff, base);
    const card = await screen.findByTestId("my-recent-actions-card");
    const rows = within(card).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    for (const a of base.myRecentActions) {
      expect(within(card).getByTestId(`recent-action-${a.id}`)).toHaveAttribute(
        "href",
        `/staff/tickets/${a.ticketId}?tab=actions`
      );
    }
  });

  it("UI-28: empty My Recent Actions says so", async () => {
    renderDashboard(staff, { ...base, myRecentActions: [] });
    expect(await screen.findByTestId("my-recent-actions-empty")).toHaveTextContent(
      "No recent actions recorded."
    );
  });

  // ui-spec section 5.1/5.2 "Loading" and section 7 "Live regions".
  it("loading shows card/list skeletons and announces loading, then loaded", async () => {
    let resolve!: (v: api.StaffDashboard) => void;
    vi.spyOn(api, "fetchMe").mockResolvedValue(staff);
    vi.spyOn(api, "fetchStaffDashboard").mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <Routes>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const skeleton = await screen.findByTestId("dashboard-loading");
    // Same sections as the loaded page (no layout shift, ui-spec section 5.2):
    // four status cards, two ownership cards, the five-bucket priority strip,
    // the Urgent list and the two list cards. No Users card for IT Staff.
    expect(skeleton.querySelectorAll(".dashboard-grid .metric-card--skeleton")).toHaveLength(4);
    expect(skeleton.querySelectorAll(".dashboard-ownership .metric-card--skeleton")).toHaveLength(2);
    expect(skeleton.querySelectorAll(".priority-strip .priority-strip__item")).toHaveLength(5);
    expect(skeleton.querySelectorAll(".dashboard-urgent-section")).toHaveLength(1);
    expect(skeleton.querySelectorAll(".dashboard-list-card")).toHaveLength(2);
    expect(skeleton.querySelector(".dashboard-admin-section")).toBeNull();
    // Lists reserve 5 rows (api-spec section 3.2); the Urgent box is 5 rows high
    // and scrolls inside, because up to 10 can arrive (api-spec section 3.3).
    for (const body of skeleton.querySelectorAll(".dashboard-list-body")) {
      expect(body.querySelectorAll(".skeleton-bar--row")).toHaveLength(5);
    }
    const urgent = skeleton.querySelector(".dashboard-urgent-body")!;
    expect(urgent.querySelectorAll(".skeleton-bar--row")).toHaveLength(5);

    const live = screen.getByTestId("dashboard-live-region");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("Loading queue data...");

    resolve(base);
    await screen.findByTestId("priority-strip");
    expect(screen.getByTestId("dashboard-live-region")).toBe(live);
    await waitFor(() => expect(live).toHaveTextContent("Dashboard loaded."));
    expect(screen.queryByTestId("dashboard-loading")).toBeNull();
  });

  // The Users card only exists for Administrators, so only their skeleton
  // reserves its space (ui-spec section 5.2, FR-15).
  it("loading reserves the Users card for an Administrator only", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue(admin);
    vi.spyOn(api, "fetchStaffDashboard").mockReturnValue(new Promise(() => {}));
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <Routes>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    const skeleton = await screen.findByTestId("dashboard-loading");
    expect(skeleton.querySelectorAll(".dashboard-admin-section .metric-card--skeleton")).toHaveLength(1);
  });

  // ui-spec section 5.1 "no layout shift" with the cap from api-spec section
  // 3.3: up to 10 urgent Tickets come back, and they must not grow the page.
  it("a full 10-row Urgent list scrolls inside a fixed box and is keyboard-reachable", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => ticket(100 + i));
    renderDashboard(staff, {
      ...base,
      counts: { ...base.counts, urgentTickets: 10 },
      urgentTickets: ten,
    });
    const section = await screen.findByTestId("urgent-section");
    const box = section.querySelector(".dashboard-urgent-body") as HTMLElement;
    expect(within(box).getAllByRole("listitem")).toHaveLength(10);
    // Past 5 rows the box scrolls, so it is a labelled, focusable region.
    expect(box).toHaveAttribute("role", "region");
    expect(box).toHaveAttribute("aria-label", "Urgent tickets, scrollable");
    expect(box).toHaveAttribute("tabindex", "0");
  });

  it("an Urgent list within 5 rows is not an extra tab stop", async () => {
    renderDashboard(staff, base);
    const section = await screen.findByTestId("urgent-section");
    const box = section.querySelector(".dashboard-urgent-body") as HTMLElement;
    expect(box).not.toHaveAttribute("tabindex");
    expect(box).not.toHaveAttribute("role");
  });
});
