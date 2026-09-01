import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequesterProvider } from "../../src/RequesterContext.js";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const requester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  department: "Marketing",
};

const ticketDetail: api.TicketDetail = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  description: "Battery drops from 100% to 20% within two hours even when idle.",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  ticketDate: "2026-08-29T10:00:00.000Z",
  requester: { id: 1, name: "Jennifer Anderson" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
  attachments: [
    {
      id: 1,
      originalFileName: "battery-report.pdf",
      fileSize: 204800,
      mimeType: "application/pdf",
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      uploadedByRequesterId: 1,
      createdAt: "2026-08-29T10:05:00.000Z",
    },
  ],
};

function renderDetail(ticketId = "1") {
  render(
    <RequesterProvider>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetail />} />
          <Route path="/my-tickets" element={<div>My Tickets</div>} />
        </Routes>
      </MemoryRouter>
    </RequesterProvider>
  );
}

describe("TicketDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify(requester)
    );
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("UI-13: Read-only detail view", () => {
    it("renders all ticket fields as read-only text", async () => {
      vi.spyOn(api, "fetchTicket").mockResolvedValue(ticketDetail);
      renderDetail();

      expect(await screen.findByTestId("ticket-detail")).toBeInTheDocument();

      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
      expect(screen.getByText("NEW")).toBeInTheDocument();
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
      expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
      expect(screen.getByText(/Battery drops from 100%/)).toBeInTheDocument();
    });

    it("shows IT Priority as em dash", async () => {
      vi.spyOn(api, "fetchTicket").mockResolvedValue(ticketDetail);
      renderDetail();

      await screen.findByTestId("ticket-detail");
      expect(screen.getByText("\u2014")).toBeInTheDocument();
    });

    it("has a back link to My Tickets", async () => {
      vi.spyOn(api, "fetchTicket").mockResolvedValue(ticketDetail);
      renderDetail();

      await screen.findByTestId("ticket-detail");
      expect(screen.getByRole("link", { name: /my tickets/i })).toHaveAttribute("href", "/my-tickets");
    });

    it("shows active attachments", async () => {
      vi.spyOn(api, "fetchTicket").mockResolvedValue(ticketDetail);
      renderDetail();

      await screen.findByTestId("ticket-detail");
      expect(screen.getByText("battery-report.pdf")).toBeInTheDocument();
    });

    it("shows removed attachments as muted metadata", async () => {
      const detailWithRemoved = {
        ...ticketDetail,
        attachments: [
          ...ticketDetail.attachments,
          {
            id: 2,
            originalFileName: "old-photo.png",
            fileSize: 512000,
            mimeType: "image/png",
            isRemoved: true,
            removedAt: "2026-08-29T11:00:00.000Z",
            removalReason: "Attached wrong screenshot",
            uploadedByRequesterId: 1,
            createdAt: "2026-08-29T10:03:00.000Z",
          },
        ],
      };
      vi.spyOn(api, "fetchTicket").mockResolvedValue(detailWithRemoved);
      renderDetail();

      await screen.findByTestId("ticket-detail");
      expect(screen.getByText("old-photo.png")).toBeInTheDocument();
      expect(screen.getByText(/Removed.*Attached wrong screenshot/)).toBeInTheDocument();
    });

    it("does not show any edit affordances", async () => {
      vi.spyOn(api, "fetchTicket").mockResolvedValue(ticketDetail);
      renderDetail();

      await screen.findByTestId("ticket-detail");
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe("UI-14: Error states", () => {
    it("shows not-found state for unknown ticket", async () => {
      vi.spyOn(api, "fetchTicket").mockRejectedValue(
        new api.ApiError("Ticket not found", "NOT_FOUND")
      );
      renderDetail();

      await waitFor(() => {
        expect(screen.getByTestId("not-found-state")).toBeInTheDocument();
      });
      expect(screen.getByText(/Ticket not found/)).toBeInTheDocument();
    });

    it("shows access-denied state for foreign ticket", async () => {
      vi.spyOn(api, "fetchTicket").mockRejectedValue(
        new api.ApiError("You don't have access to this ticket.", "FORBIDDEN")
      );
      renderDetail();

      await waitFor(() => {
        expect(screen.getByTestId("access-denied-state")).toBeInTheDocument();
      });
      expect(screen.getByText(/don.* have access/)).toBeInTheDocument();
    });

    it("does not leak ticket data on error", async () => {
      vi.spyOn(api, "fetchTicket").mockRejectedValue(
        new api.ApiError("Ticket not found", "NOT_FOUND")
      );
      renderDetail();

      await waitFor(() => {
        expect(screen.getByTestId("not-found-state")).toBeInTheDocument();
      });
      expect(screen.queryByText("TKT-2026-000001")).not.toBeInTheDocument();
      expect(screen.queryByText("Laptop battery")).not.toBeInTheDocument();
    });
  });
});
