import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import RequesterDashboard from "../../src/RequesterDashboard.js";
import * as api from "../../src/api.js";

// Lab 4 — Requester Dashboard (docs/lab-04/tests.md rows UI-21..UI-24, UI-29;
// ui-spec 5.1). jsdom; the API is mocked, so every number on screen must come
// from the payload below and nothing is recomputed by the client.

const requester: api.User = {
  id: 3,
  name: "Dana Requester",
  email: "dana.requester@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: false,
};

const row = (id: number): api.DashboardTicketRow => ({
  id,
  ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`,
  summary: `Summary for ticket ${id}`,
  currentStatus: "IN_PROGRESS",
  itPriority: null,
  updatedAt: "2026-10-01T10:00:00.000Z",
});

const populated: api.RequesterDashboard = {
  counts: {
    open: 7,
    inProgress: 2,
    waitingForRequester: 1,
    resolved: 3,
    closed: 5,
    attentionRequired: 4,
  },
  recentTickets: [row(11), row(12)],
  recentlyResolved: [row(21)],
};

const zero: api.RequesterDashboard = {
  counts: {
    open: 0,
    inProgress: 0,
    waitingForRequester: 0,
    resolved: 0,
    closed: 0,
    attentionRequired: 0,
  },
  recentTickets: [],
  recentlyResolved: [],
};

function renderDashboard() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<RequesterDashboard />} />
          <Route path="/create-ticket" element={<div data-testid="create-route" />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("RequesterDashboard (UI-21..UI-23, UI-29)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(requester);
  });
  afterEach(() => vi.restoreAllMocks());

  // UI-21 — ui-spec section 5.1 "Cards" table: each card shows its response field.
  it("UI-21: all six cards render the server's numbers", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(populated);
    renderDashboard();
    await screen.findByTestId("metric-card-open");

    const expected: Record<string, number> = {
      "metric-card-open": populated.counts.open,
      "metric-card-in-progress": populated.counts.inProgress,
      "metric-card-waiting": populated.counts.waitingForRequester,
      "metric-card-resolved": populated.counts.resolved,
      "metric-card-closed": populated.counts.closed,
      "metric-card-attention": populated.counts.attentionRequired,
    };
    for (const [testId, value] of Object.entries(expected)) {
      expect(within(screen.getByTestId(testId)).getByText(String(value))).toBeInTheDocument();
    }
  });

  // UI-22 — ui-spec section 5.1: "A card showing 0 is still rendered" (FR-17).
  it("UI-22: zero cards are still rendered with 0", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(zero);
    renderDashboard();
    await screen.findByTestId("metric-card-open");
    for (const id of [
      "metric-card-open",
      "metric-card-in-progress",
      "metric-card-waiting",
      "metric-card-resolved",
      "metric-card-closed",
      "metric-card-attention",
    ]) {
      expect(within(screen.getByTestId(id)).getByText("0")).toBeInTheDocument();
    }
  });

  // UI-23 — ui-spec section 5.1: human wording, not the raw field name.
  it("UI-23: the attention card reads 'Needs your attention'", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(populated);
    renderDashboard();
    const card = await screen.findByTestId("metric-card-attention");
    expect(card).toHaveTextContent("Needs your attention");
    expect(card).not.toHaveTextContent("attentionRequired");
  });

  // ui-spec section 5.1 States: zero activity -> both lists show ListState + CTA.
  it("zero activity: both empty lists offer Create Ticket and it navigates", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(zero);
    renderDashboard();
    const recent = await screen.findByTestId("recent-tickets-empty");
    const resolved = screen.getByTestId("recently-resolved-empty");
    const cta1 = within(recent).getByRole("button", { name: "Create Ticket" });
    expect(within(resolved).getByRole("button", { name: "Create Ticket" })).toBeInTheDocument();
    fireEvent.click(cta1);
    expect(await screen.findByTestId("create-route")).toBeInTheDocument();
  });

  // ui-spec section 5.1 States: "Empty list, non-zero cards" has no CTA.
  it("non-zero cards with an empty list show no Create Ticket in the empty block", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue({
      ...populated,
      recentlyResolved: [],
    });
    renderDashboard();
    const empty = await screen.findByTestId("recently-resolved-empty");
    expect(within(empty).queryByRole("button", { name: "Create Ticket" })).toBeNull();
  });

  // UI-29 — FR-22: failure state is a visible block with Retry, no console noise.
  it("UI-29: failure shows an error block with Retry and logs nothing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(api, "fetchRequesterDashboard").mockRejectedValue(
      new api.ApiError("Dashboard unavailable", "INTERNAL_ERROR")
    );
    renderDashboard();
    const block = await screen.findByTestId("dashboard-error");
    expect(block).toHaveTextContent("Dashboard unavailable");
    expect(within(block).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByTestId("metric-card-open")).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
