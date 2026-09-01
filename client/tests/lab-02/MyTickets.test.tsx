import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequesterProvider } from "../../src/RequesterContext.js";
import MyTickets from "../../src/MyTickets.js";
import * as api from "../../src/api.js";

const requester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  department: "Marketing",
};

const categories: api.Category[] = [
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const ticketA: api.TicketListItem = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  category: { id: 2, name: "Hardware" },
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
};

const ticketB: api.TicketListItem = {
  id: 2,
  ticketNumber: "TKT-2026-000002",
  summary: "Cannot access email",
  requestedPriority: "HIGH",
  itPriority: null,
  currentStatus: "NEW",
  category: { id: 3, name: "Software" },
  createdAt: "2026-08-28T09:00:00.000Z",
  updatedAt: "2026-08-28T09:00:00.000Z",
};

const emptyMeta: api.TicketListMeta = {
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

function renderMyTickets() {
  render(
    <RequesterProvider>
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <MyTickets />
      </MemoryRouter>
    </RequesterProvider>
  );
}

describe("MyTickets", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify(requester)
    );
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("UI-07: Search sends search param", () => {
    it("debounces search input and sends search param to API", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        });
      renderMyTickets();

      await screen.findByTestId("ticket-table-desktop");

      const initialCallCount = mockFetch.mock.calls.length;

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "battery" } });

      // After debounce (300ms), search param should be set
      await waitFor(
        () => {
          expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
          expect(mockFetch).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: "battery" })
          );
        },
        { timeout: 1000 }
      );
    });
  });

  describe("UI-07b: Category filter sends categoryId", () => {
    it("sends categoryId param when category is selected", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        });
      renderMyTickets();

      await screen.findByTestId("ticket-table-desktop");

      fireEvent.change(screen.getByTestId("filter-category"), {
        target: { value: "2" },
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({ categoryId: 2 })
        );
      });
    });
  });

  describe("UI-08: Clear Filters visibility", () => {
    it("does not show Clear Filters button when no filters are active", async () => {
      vi.spyOn(api, "fetchTickets").mockResolvedValue({
        data: [ticketA],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      });
      renderMyTickets();

      await screen.findByTestId("ticket-table-desktop");

      expect(screen.queryByTestId("clear-filters")).not.toBeInTheDocument();
    });

    it("shows Clear Filters button when a filter is active", async () => {
      vi.spyOn(api, "fetchTickets").mockResolvedValue({
        data: [ticketA],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      });
      renderMyTickets();

      await screen.findByTestId("ticket-table-desktop");

      fireEvent.change(screen.getByTestId("filter-status"), {
        target: { value: "NEW" },
      });

      await waitFor(() => {
        expect(screen.getByTestId("clear-filters")).toBeInTheDocument();
      });
    });
  });

  describe("UI-08: Empty vs no-results states", () => {
    it("shows empty state when requester has no tickets at all", async () => {
      vi.spyOn(api, "fetchTickets").mockResolvedValue({
        data: [],
        meta: emptyMeta,
      });
      renderMyTickets();

      expect(
        await screen.findByTestId("empty-state")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/haven.* created any tickets yet/)
      ).toBeInTheDocument();
      const emptyState = screen.getByTestId("empty-state");
      expect(
        within(emptyState).getByRole("button", { name: /Create Ticket/i })
      ).toBeInTheDocument();
      // No-results state should NOT be present
      expect(screen.queryByTestId("no-results-state")).not.toBeInTheDocument();
    });

    it("shows no-results state when filters match nothing", async () => {
      vi.spyOn(api, "fetchTickets").mockResolvedValue({
        data: [],
        meta: emptyMeta,
      });
      renderMyTickets();

      // Wait for initial load (empty state)
      await screen.findByTestId("empty-state");

      // Apply a filter — now it should switch to no-results
      fireEvent.change(screen.getByTestId("filter-status"), {
        target: { value: "NEW" },
      });

      await waitFor(() => {
        expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
      });
      expect(
        screen.getByText("No tickets match your filters.")
      ).toBeInTheDocument();
      const noResults = screen.getByTestId("no-results-state");
      expect(
        within(noResults).getByRole("button", { name: /Clear Filters/i })
      ).toBeInTheDocument();
      // Empty state should NOT be present
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });

  describe("UI-09: Clear Filters", () => {
    it("resets all filters and refetches unfiltered first page", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        });
      renderMyTickets();

      await screen.findByTestId("ticket-table-desktop");

      // Apply filters
      fireEvent.change(screen.getByTestId("filter-status"), {
        target: { value: "NEW" },
      });
      fireEvent.change(screen.getByTestId("filter-priority"), {
        target: { value: "HIGH" },
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({
            currentStatus: "NEW",
            requestedPriority: "HIGH",
            page: 1,
          })
        );
      });

      // Click Clear Filters
      fireEvent.click(screen.getByTestId("clear-filters"));

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
        expect(lastCall.currentStatus).toBeFalsy();
        expect(lastCall.requestedPriority).toBeFalsy();
        expect(lastCall.page).toBe(1);
      });

      // Filter selects should be reset
      expect(screen.getByTestId("filter-status")).toHaveValue("");
      expect(screen.getByTestId("filter-priority")).toHaveValue("");
    });
  });

  describe("UI-10: Pagination wiring", () => {
    it("calls API with correct page and pageSize params", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 25, page: 1, pageSize: 10, totalPages: 3 },
        });
      renderMyTickets();

      await screen.findByTestId("pagination-bar");

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 })
      );

      // Click Next
      fireEvent.click(screen.getByTestId("pagination-next"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 2, pageSize: 10 })
        );
      });
    });

    it("changes pageSize and resets to page 1", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 25, page: 1, pageSize: 10, totalPages: 3 },
        });
      renderMyTickets();

      await screen.findByTestId("pagination-bar");

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

  describe("UI-11: Sort control", () => {
    it("sends sortBy and sortOrder params when column header is clicked", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        });
      renderMyTickets();

      await screen.findByTestId("ticket-table-desktop");

      // Default is updatedAt desc
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "updatedAt", sortOrder: "desc" })
      );

      // Click Ticket Number column to sort by ticketNumber desc
      fireEvent.click(screen.getByText("Ticket Number"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({ sortBy: "ticketNumber", sortOrder: "desc" })
        );
      });
    });

    it("toggles sort order when clicking the same column", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        });
      renderMyTickets();

      await screen.findByTestId("ticket-table-desktop");

      // Click Last Updated (already sorted by this) to toggle
      fireEvent.click(screen.getByText("Last Updated"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({ sortBy: "updatedAt", sortOrder: "asc" })
        );
      });
    });

    it("mobile sort select sends correct params", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValue({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        });
      renderMyTickets();

      await screen.findByTestId("mobile-sort-select");

      fireEvent.change(screen.getByTestId("mobile-sort-select"), {
        target: { value: "ticketNumber:asc" },
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({ sortBy: "ticketNumber", sortOrder: "asc" })
        );
      });
    });
  });

  describe("UI-12: Error banner + Retry", () => {
    it("shows error banner and retries the request", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockRejectedValueOnce(
          new api.ApiError("Failed to fetch tickets: 500", "INTERNAL_ERROR")
        )
        .mockResolvedValueOnce({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        });
      renderMyTickets();

      expect(await screen.findByTestId("error-state")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to fetch tickets: 500")
      ).toBeInTheDocument();

      // Click Retry
      fireEvent.click(screen.getByTestId("retry-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("ticket-table-desktop")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    });

    it("keeps old list visible when refetch fails", async () => {
      const mockFetch = vi
        .spyOn(api, "fetchTickets")
        .mockResolvedValueOnce({
          data: [ticketA],
          meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
        })
        .mockRejectedValueOnce(
          new api.ApiError("Network error", "NETWORK_ERROR")
        );
      renderMyTickets();

      // Initial load succeeds — table visible
      await screen.findByTestId("ticket-table-desktop");
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0);

      // Trigger a filter change that causes refetch failure
      fireEvent.change(screen.getByTestId("filter-status"), {
        target: { value: "IN_PROGRESS" },
      });

      // Error banner appears
      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
      });

      // Old list is still visible behind the error
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0);
      expect(screen.getByTestId("ticket-table-desktop")).toBeInTheDocument();
    });
  });
});
