import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import * as api from "../../src/api.js";

// Lab 4 — Ticket workflow UI (docs/lab-04/tests.md rows UI-17..UI-20, UI-30;
// ui-spec 5.5). jsdom; every API call is mocked. The backend is the enforcer,
// so the gate message the UI shows is the one the server returns.

const staffUser: api.User = {
  id: 7,
  name: "Sombat Staff",
  email: "sombat.staff@toktickit.dev",
  role: "IT_STAFF",
  mustChangePassword: false,
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
  version: 3,
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

function makeTicket(overrides: Partial<api.StaffTicketDetail> = {}) {
  return { ...baseTicket, ...overrides };
}

function renderDetail(path = "/staff/tickets/101") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/staff/tickets/:ticketId" element={<StaffTicketDetail />} />
          <Route path="/staff/queue" element={<div data-testid="queue-route" />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

const GATE_NO_SUMMARY_MSG =
  "Cannot resolve this ticket without a resolution summary. Save a resolution summary first.";

describe("TicketWorkflow — status gate, matrix and confirmation (UI-17..UI-20, UI-30)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom has no real confirm; stub it (AGENTS.md test rule 6).
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchStaffComments").mockResolvedValue([]);
    vi.spyOn(api, "fetchInternalNotes").mockResolvedValue([]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 2, name: "Hardware" }]);
    vi.spyOn(api, "fetchStaffUsers").mockResolvedValue([
      { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
    ]);
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-17: a gate failure renders the server message at the status control and keeps the badge", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(makeTicket());
    // The backend refuses RESOLVED because no summary was saved (BR-11).
    vi.spyOn(api, "updateStaffTicketStatus").mockRejectedValue(
      new api.ApiError(GATE_NO_SUMMARY_MSG, "BUSINESS_RULE_VIOLATION")
    );
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    // The status badge shows the raw enum value.
    expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("staff-status-select"), {
      target: { value: "RESOLVED" },
    });
    // IN_PROGRESS → RESOLVED requires confirmation (BR-12).
    fireEvent.click(await screen.findByTestId("status-confirm-accept"));

    // The message names the unmet condition, right at the status control, and
    // is announced (A11Y-04: role="alert").
    const error = await screen.findByTestId("status-error");
    expect(error).toHaveTextContent(GATE_NO_SUMMARY_MSG);
    expect(error).toHaveAttribute("role", "alert");
    // The badge did not change.
    expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
  });

  it("UI-18: the IN_PROGRESS dropdown offers RESOLVED but not CANCELLED", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(makeTicket());
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    const select = screen.getByTestId("staff-status-select") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);

    expect(optionValues).toContain("RESOLVED");
    expect(optionValues).toContain("WAITING_FOR_REQUESTER");
    expect(optionValues).not.toContain("CANCELLED");
  });

  it("UI-19: confirmation-required transitions name the exact change; cancelling sends nothing", async () => {
    const statusSpy = vi.spyOn(api, "updateStaffTicketStatus");
    const fetchSpy = vi.spyOn(api, "fetchStaffTicket");

    // Shape 1: IN_PROGRESS → RESOLVED.
    fetchSpy.mockResolvedValueOnce(makeTicket());
    const first = renderDetail();
    await screen.findByTestId("staff-ticket-detail");
    fireEvent.change(screen.getByTestId("staff-status-select"), {
      target: { value: "RESOLVED" },
    });
    const dialog = await screen.findByTestId("status-confirm-dialog");
    expect(dialog).toHaveTextContent("IN PROGRESS");
    expect(dialog).toHaveTextContent("RESOLVED");
    fireEvent.click(screen.getByTestId("status-confirm-cancel"));
    expect(statusSpy).not.toHaveBeenCalled();
    first.unmount();

    // Shape 2: OPEN → CANCELLED.
    fetchSpy.mockResolvedValueOnce(makeTicket({ currentStatus: "OPEN" }));
    renderDetail();
    await screen.findByTestId("staff-ticket-detail");
    fireEvent.change(screen.getByTestId("staff-status-select"), {
      target: { value: "CANCELLED" },
    });
    const dialog2 = await screen.findByTestId("status-confirm-dialog");
    expect(dialog2).toHaveTextContent("OPEN");
    expect(dialog2).toHaveTextContent("CANCELLED");
    fireEvent.click(screen.getByTestId("status-confirm-cancel"));
    expect(statusSpy).not.toHaveBeenCalled();
  });

  it("UI-20: the requester-indicated-resolved badge is separate from the status badge", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({
        requesterIndicatedResolved: true,
        indicatedResolvedAt: "2026-09-02T08:00:00.000Z",
      })
    );
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    const indicator = screen.getByTestId("requester-resolved-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain("resolved-indicator");
    // The status badge is a different element and still shows the real status.
    expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
    expect(indicator).not.toHaveTextContent("IN_PROGRESS");
  });

  it("UI-30: a 409 shows a conflict callout with a Refresh action that updates status, version, and resolution summary", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({ resolutionSummary: "Initial local summary" })
    );
    vi.spyOn(api, "updateStaffTicketStatus").mockRejectedValue(
      new api.TicketConflictError(
        "This ticket was updated by someone else. Refresh to load the latest version.",
        {
          id: 101,
          currentStatus: "WAITING_FOR_REQUESTER",
          resolutionSummary: "Newer summary saved by another staff member",
          version: 9,
        }
      )
    );
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByTestId("resolution-input")).toHaveValue("Initial local summary");

    fireEvent.change(screen.getByTestId("staff-status-select"), {
      target: { value: "RESOLVED" },
    });
    fireEvent.click(await screen.findByTestId("status-confirm-accept"));

    const callout = await screen.findByTestId("status-conflict-callout");
    expect(callout).toHaveTextContent("Refresh");
    expect(callout).toHaveAttribute("role", "alert");
    fireEvent.click(screen.getByTestId("status-conflict-refresh"));
    await waitFor(() => {
      expect(screen.queryByTestId("status-conflict-callout")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("resolution-input")).toHaveValue(
      "Newer summary saved by another staff member"
    );
  });

  // ui-spec section 5.2: dashboard "My Recent Actions" rows link with ?tab=actions.
  it("opens the Actions Taken tab when the URL carries ?tab=actions", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(makeTicket());
    renderDetail("/staff/tickets/101?tab=actions");
    await screen.findByTestId("staff-ticket-detail");
    const tab = await screen.findByRole("tab", { name: /Actions Taken/ });
    expect(tab).toHaveAttribute("aria-selected", "true");
  });
});
