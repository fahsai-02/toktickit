import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import RequesterDashboard from "../../src/RequesterDashboard.js";
import StaffDashboard from "../../src/StaffDashboard.js";
import * as api from "../../src/api.js";

// Lab 4 — dashboard card drill-downs and console hygiene (docs/lab-04/tests.md
// UI-24, UI-29; ui-spec 5.1/5.2, api-spec section 3.1/3.3).

const requester: api.User = {
  id: 3, name: "Dana Requester", email: "dana@toktickit.dev",
  role: "REQUESTER", mustChangePassword: false,
};
const staff: api.User = {
  id: 7, name: "Sombat Staff", email: "sombat@toktickit.dev",
  role: "IT_STAFF", mustChangePassword: false,
};

const requesterData: api.RequesterDashboard = {
  counts: { open: 7, inProgress: 2, waitingForRequester: 1, resolved: 3, closed: 5, attentionRequired: 4 },
  recentTickets: [],
  recentlyResolved: [],
};
const staffData: api.StaffDashboard = {
  counts: { new: 4, open: 9, inProgress: 6, waitingForRequester: 3, unassigned: 12, myAssigned: 5, urgentTickets: 0 },
  byItPriority: [
    { itPriority: "URGENT", count: 1 }, { itPriority: "HIGH", count: 2 },
    { itPriority: "MEDIUM", count: 3 }, { itPriority: "LOW", count: 4 },
    { itPriority: null, count: 5 },
  ],
  recentTickets: [],
  urgentTickets: [],
  myRecentActions: [],
};

function renderAt(path: string, user: api.User) {
  vi.spyOn(api, "fetchMe").mockResolvedValue(user);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<RequesterDashboard />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Dashboard cards (UI-24, UI-29)", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  // UI-24 — api-spec section 3.1 documents these URLs.
  it("UI-24: requester cards are real links with the number in the accessible name", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(requesterData);
    renderAt("/dashboard", requester);
    await screen.findByTestId("metric-card-open");

    const cases: Array<[string, string, string]> = [
      ["metric-card-open", "/my-tickets?statusGroup=open", "Open: 7. View all"],
      ["metric-card-in-progress", "/my-tickets?currentStatus=IN_PROGRESS", "In Progress: 2. View all"],
      ["metric-card-waiting", "/my-tickets?currentStatus=WAITING_FOR_REQUESTER", "Waiting for You: 1. View all"],
      ["metric-card-resolved", "/my-tickets?currentStatus=RESOLVED", "Resolved: 3. View all"],
      ["metric-card-closed", "/my-tickets?currentStatus=CLOSED", "Closed: 5. View all"],
      ["metric-card-attention", "/my-tickets?statusGroup=attention", "Needs your attention: 4. View all"],
    ];
    for (const [testId, href, name] of cases) {
      const link = screen.getByTestId(testId);
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAccessibleName(name);
    }
  });

  it("UI-24: staff cards link to their queue drill-downs", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(staffData);
    renderAt("/staff/dashboard", staff);
    await screen.findByTestId("metric-card-new");

    const cases: Array<[string, string, string]> = [
      ["metric-card-new", "/staff/queue?currentStatus=NEW", "New: 4. View all"],
      ["metric-card-open", "/staff/queue?currentStatus=OPEN", "Open: 9. View all"],
      ["metric-card-in-progress", "/staff/queue?currentStatus=IN_PROGRESS", "In Progress: 6. View all"],
      ["metric-card-waiting", "/staff/queue?currentStatus=WAITING_FOR_REQUESTER", "Waiting for Requester: 3. View all"],
      ["metric-card-unassigned", "/staff/queue?ownerId=unassigned", "Unassigned: 12. View all"],
      ["metric-card-my-assigned", "/staff/queue?ownerId=me", "Assigned to me: 5. View all"],
    ];
    for (const [testId, href, name] of cases) {
      const link = screen.getByTestId(testId);
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAccessibleName(name);
    }
  });

  // UI-29 — FR-22: no unhandled console errors on either screen, success or failure.
  it("UI-29: both dashboards are console-clean on success and on failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(requesterData);
    const first = renderAt("/dashboard", requester);
    await screen.findByTestId("metric-card-open");
    first.unmount();

    vi.restoreAllMocks();
    const errorSpy2 = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(api, "fetchStaffDashboard").mockRejectedValue(
      new api.ApiError("Nope", "FORBIDDEN")
    );
    renderAt("/staff/dashboard", staff);
    await screen.findByTestId("dashboard-error");

    expect(errorSpy).not.toHaveBeenCalled();
    expect(errorSpy2).not.toHaveBeenCalled();
  });
});
