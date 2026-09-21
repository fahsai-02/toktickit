import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import StaffTicketQueue from "../../src/StaffTicketQueue.js";
import * as api from "../../src/api.js";

const staffUser: api.User = {
  id: 7,
  name: "Sombat Staff",
  email: "sombat.staff@toktickit.dev",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const requesterUser: api.User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: false,
};

const categories: api.Category[] = [
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
];

const ticketA: api.StaffTicketListItem = {
  id: 101,
  ticketNumber: "TKT-KW1W-V9KZ",
  summary: "Laptop battery drains overnight even when asleep",
  requestedPriority: "HIGH",
  itPriority: "URGENT",
  currentStatus: "OPEN",
  category: { id: 2, name: "Hardware" },
  requester: { id: 1, name: "Jennifer Anderson" },
  owner: { id: 7, name: "Sombat Staff" },
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-02T09:30:00.000Z",
};

const ticketB: api.StaffTicketListItem = {
  id: 102,
  ticketNumber: "TKT-KW1W-V9MZ",
  summary: "Cannot map network drive on lab machine",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "WAITING_FOR_REQUESTER",
  category: { id: 3, name: "Software" },
  requester: { id: 2, name: "Priya Raman" },
  owner: null,
  createdAt: "2026-08-30T07:00:00.000Z",
  updatedAt: "2026-08-31T10:00:00.000Z",
};

const emptyMeta: api.TicketListMeta = {
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

const onePageMeta = (total: number): api.TicketListMeta => ({
  total,
  page: 1,
  pageSize: 10,
  totalPages: Math.max(1, Math.ceil(total / 10)),
});

function renderQueue() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <Routes>
          <Route path="/staff/queue" element={<StaffTicketQueue />} />
          <Route
            path="/staff/tickets/:ticketId"
            element={<div data-testid="detail-route" />}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

// UI-07 — FR-22, AC-08 (ui-spec 5.4 table)
describe("StaffTicketQueue — table rendering (UI-07)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all 9 column headers from ui-spec 5.4", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA, ticketB],
      meta: onePageMeta(2),
    });
    renderQueue();

    await screen.findByTestId("staff-table-desktop");

    const headers: Array<[string, string]> = [
      ["staff-th-ticketNumber", "Ticket No."],
      ["staff-th-createdAt", "Created Date"],
      ["staff-th-summary", "Summary"],
      ["staff-th-category", "Category"],
      ["staff-th-requestedPriority", "Req. Priority"],
      ["staff-th-itPriority", "IT Priority"],
      ["staff-th-currentStatus", "Status"],
      ["staff-th-owner", "Owner"],
      ["staff-th-updatedAt", "Last Updated"],
    ];
    for (const [testId, label] of headers) {
      expect(screen.getByTestId(testId)).toHaveTextContent(label);
    }
  });

  it("renders row data: number, summary, category, priorities, status, owner", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA, ticketB],
      meta: onePageMeta(2),
    });
    renderQueue();

    const table = await screen.findByTestId("staff-table-desktop");

    expect(screen.getByTestId("staff-ticket-row-101")).toHaveTextContent(
      "TKT-KW1W-V9KZ"
    );
    expect(screen.getByTestId("staff-ticket-row-101")).toHaveTextContent(
      "Laptop battery drains overnight"
    );
    expect(screen.getByTestId("staff-ticket-row-101")).toHaveTextContent(
      "Hardware"
    );
    // Both priority badges + the colored status badge are painted.
    expect(within(table).getAllByText("HIGH").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("URGENT").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("OPEN").length).toBeGreaterThan(0);
    expect(within(table).getByText("Sombat Staff")).toBeInTheDocument();

    // Unassigned owner shows the muted literal "Unassigned".
    expect(screen.getByTestId("staff-ticket-row-102")).toHaveTextContent(
      "Unassigned"
    );
  });

  it("paints color-coded status + IT priority badges (Issue 19 AC)", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA, ticketB],
      meta: onePageMeta(2),
    });
    renderQueue();

    const table = await screen.findByTestId("staff-table-desktop");

    // OPEN → orange status class (plain `statusBadgeVariant` would yield the
    // NEW-only neutral mapping — the queue must use the color mapping).
    expect(table.querySelector(".badge-status-open")).toBeTruthy();
    expect(table.querySelector(".badge-status-waiting")).toBeTruthy();
    // IT priority URGENT uses the priority palette.
    expect(table.querySelector(".badge-priority-urgent")).toBeTruthy();
  });

  it("shows the results count line from ui-spec 5.4", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA, ticketB],
      meta: onePageMeta(25),
    });
    renderQueue();

    const count = await screen.findByTestId("results-count");
    expect(count).toHaveTextContent("Showing 1 to 10 of 25 tickets");
  });

  it("navigates to /staff/tickets/:id on row click", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(1),
    });
    renderQueue();

    await screen.findByTestId("staff-table-desktop");

    fireEvent.click(screen.getByTestId("staff-ticket-row-101"));

    expect(await screen.findByTestId("detail-route")).toBeInTheDocument();
  });
});

// UI-08 — FR-22, AC-08 (search + filters)
describe("StaffTicketQueue — search and filters (UI-08)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("debounces rapid keystrokes into a single API call", async () => {
    const mockFetch = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(1),
    });
    renderQueue();

    await screen.findByTestId("staff-table-desktop");

    const baseCount = mockFetch.mock.calls.length;

    const searchInput = screen.getByTestId("staff-search-input");
    expect(searchInput).toHaveAttribute(
      "placeholder",
      "Search by ticket number or summary..."
    );
    fireEvent.change(searchInput, { target: { value: "b" } });
    fireEvent.change(searchInput, { target: { value: "ba" } });
    fireEvent.change(searchInput, { target: { value: "bat" } });

    await waitFor(
      () => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(baseCount);
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: "bat" })
        );
      },
      { timeout: 1000 }
    );

    expect(mockFetch.mock.calls.length).toBe(baseCount + 1);
  });

  it("filter panel is hidden until the Filters button is toggled", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(1),
    });
    renderQueue();

    await screen.findByTestId("staff-table-desktop");

    expect(screen.queryByTestId("filter-card")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("filters-toggle"));
    expect(screen.getByTestId("filter-card")).toBeInTheDocument();
  });

  it("sends itPriority, categoryId, and ownerId params when filters change", async () => {
    const mockFetch = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(1),
    });
    renderQueue();

    await screen.findByTestId("staff-table-desktop");

    fireEvent.click(screen.getByTestId("filters-toggle"));

    fireEvent.change(screen.getByTestId("filter-it-priority"), {
      target: { value: "URGENT" },
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ itPriority: "URGENT" })
      );
    });

    fireEvent.change(screen.getByTestId("filter-category"), {
      target: { value: "2" },
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryId: 2 })
      );
    });

    fireEvent.change(screen.getByTestId("filter-owner"), {
      target: { value: "unassigned" },
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ ownerId: "unassigned" })
      );
    });

    fireEvent.change(screen.getByTestId("filter-owner"), {
      target: { value: "me" },
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ ownerId: "me" })
      );
    });
  });

  it("clear-filters resets selects and refetches un-filtered", async () => {
    const mockFetch = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(1),
    });
    renderQueue();

    await screen.findByTestId("staff-table-desktop");

    fireEvent.click(screen.getByTestId("filters-toggle"));
    fireEvent.change(screen.getByTestId("filter-status"), {
      target: { value: "OPEN" },
    });
    fireEvent.change(screen.getByTestId("filter-req-priority"), {
      target: { value: "HIGH" },
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ currentStatus: "OPEN", requestedPriority: "HIGH" })
      );
    });

    fireEvent.click(screen.getByTestId("clear-filters"));

    await waitFor(() => {
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
      expect(lastCall.currentStatus).toBeFalsy();
      expect(lastCall.requestedPriority).toBeFalsy();
    });
    expect(screen.getByTestId("filter-status")).toHaveValue("");
    expect(screen.getByTestId("filter-req-priority")).toHaveValue("");
  });

  it("sends sortBy/sortOrder for the 5 api-spec 5.1 columns only", async () => {
    const mockFetch = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(1),
    });
    renderQueue();

    const table = await screen.findByTestId("staff-table-desktop");

    // Default ordering.
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: "updatedAt", sortOrder: "desc" })
    );

    fireEvent.click(within(table).getByTestId("staff-th-ticketNumber"));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "ticketNumber", sortOrder: "desc" })
      );
    });

    // Non-whitelisted columns must NOT be sortable — clicking Summary must not
    // trigger any refetch (state never changed, so no effect runs).
    const callsBefore = mockFetch.mock.calls.length;
    fireEvent.click(within(table).getByTestId("staff-th-summary"));
    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });

  it("mobile sort select sends itPriority asc", async () => {
    const mockFetch = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(1),
    });
    renderQueue();

    await screen.findByTestId("mobile-sort-select");

    fireEvent.change(screen.getByTestId("mobile-sort-select"), {
      target: { value: "itPriority:asc" },
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "itPriority", sortOrder: "asc" })
      );
    });
  });
});

// UI-09 — FR-22 pagination
describe("StaffTicketQueue — pagination (UI-09)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the API with page/pageSize and handles Next/page-size", async () => {
    const mockFetch = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [ticketA],
      meta: onePageMeta(25),
    });
    renderQueue();

    await screen.findByTestId("pagination-bar");

    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10 })
    );

    fireEvent.click(screen.getByTestId("pagination-next"));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, pageSize: 10 })
      );
    });

    fireEvent.change(screen.getByTestId("page-size-select"), {
      target: { value: "20" },
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 })
      );
    });
  });
});

// UI-10 — FR-22 empty vs no-results
describe("StaffTicketQueue — empty/no-results states (UI-10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows empty state when the queue has no tickets", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      meta: emptyMeta,
    });
    renderQueue();

    const empty = await screen.findByTestId("empty-state");
    expect(within(empty).getByText("No tickets found.")).toBeInTheDocument();
    expect(screen.queryByTestId("no-results-state")).not.toBeInTheDocument();
  });

  it("shows no-results state (with Clear Filters) when filters match nothing", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      meta: emptyMeta,
    });
    renderQueue();

    await screen.findByTestId("empty-state");

    fireEvent.click(screen.getByTestId("filters-toggle"));
    fireEvent.change(screen.getByTestId("filter-status"), {
      target: { value: "OPEN" },
    });

    const noResults = await screen.findByTestId("no-results-state");
    expect(
      within(noResults).getByText("No results match your search.")
    ).toBeInTheDocument();
    expect(
      within(noResults).getByRole("button", { name: /Clear Filters/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows error banner and recovers via Retry", async () => {
    const mockFetch = vi
      .spyOn(api, "fetchStaffTickets")
      .mockRejectedValueOnce(
        new api.ApiError("Failed to fetch staff queue: 500", "INTERNAL_ERROR")
      )
      .mockResolvedValueOnce({
        data: [ticketA],
        meta: onePageMeta(1),
      });
    renderQueue();

    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    expect(
      screen.getByText("Failed to fetch staff queue: 500")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("retry-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("staff-table-desktop")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("StaffTicketQueue — role guard (ui-spec 5.4 forbidden state)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("non-staff roles see the forbidden state and never fetch the queue", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue(requesterUser);
    const mockFetch = vi.spyOn(api, "fetchStaffTickets");
    renderQueue();

    const forbidden = await screen.findByTestId("forbidden-state");
    expect(
      within(forbidden).getByText("You don't have access to this page.")
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});