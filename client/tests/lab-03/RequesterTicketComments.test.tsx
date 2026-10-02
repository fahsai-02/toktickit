import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";

const authUser: api.User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: false,
};

const ticketDetail: api.TicketDetail = {
  id: 12,
  ticketNumber: "TKT-2026-000912",
  summary: "Laptop battery drains quickly",
  description: "Battery drains within two hours.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  ticketDate: "2026-09-01T10:00:00.000Z",
  requester: { id: 1, name: "Jennifer Anderson" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  resolutionSummary: null,
  requesterIndicatedResolved: false,
  indicatedResolvedAt: null,
  owner: null,
  _count: { attachments: 0, comments: 2, notes: 0 },
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  attachments: [],
};

const comments: api.PublicComment[] = [
  {
    id: 2,
    ticketId: 12,
    authorId: 5,
    content: "We are investigating the issue.",
    createdAt: "2026-09-02T09:00:00.000Z",
    author: { id: 5, name: "Michael Brown", role: "IT_STAFF" },
  },
  {
    id: 1,
    ticketId: 12,
    authorId: 1,
    content: "Thank you for the update.",
    createdAt: "2026-09-01T11:00:00.000Z",
    author: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" },
  },
];

function renderDetail() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/tickets/12"]}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetail />} />
          <Route path="/my-tickets" element={<div>My Tickets</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("TicketDetail — Public Comments (Issue 18, ui-spec 5.3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(authUser);
    vi.spyOn(api, "fetchTicket").mockResolvedValue(ticketDetail);
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue(comments);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders comments newest-first with author, role badge, timestamp, and content", async () => {
    renderDetail();

    await screen.findByTestId("public-comments");
    const timeline = screen.getByTestId("comment-timeline");
    const items = Array.from(timeline.children);

    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain("We are investigating the issue.");
    expect(items[1].textContent).toContain("Thank you for the update.");
    expect(items[0].textContent).toContain("Michael Brown");
    expect(items[0].textContent).toContain("IT_STAFF");
    expect(items[1].textContent).toContain("Jennifer Anderson");
    expect(items[1].textContent).toContain("REQUESTER");
    expect(screen.getByText("Public Comments (2)")).toBeInTheDocument();
  });

  it("shows 'No comments yet' when the timeline is empty", async () => {
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
    renderDetail();

    await screen.findByTestId("public-comments");
    expect(screen.getByTestId("no-comments")).toHaveTextContent(/No comments yet/);
  });

  it("does NOT call the API when the comment is invalid (over-length input)", async () => {
    const postSpy = vi.spyOn(api, "postPublicComment").mockResolvedValue(
      comments[1]
    );
    renderDetail();

    await screen.findByTestId("public-comments");
    fireEvent.change(screen.getByTestId("comment-input"), {
      target: { value: "x".repeat(2001) },
    });
    fireEvent.click(screen.getByTestId("post-comment-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("comment-error")).toBeInTheDocument();
    });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("posts a comment, shows it at the top, and clears the input", async () => {
    const postSpy = vi.spyOn(api, "postPublicComment").mockResolvedValue({
      id: 3,
      ticketId: 12,
      authorId: 1,
      content: "Please keep me updated.",
      createdAt: "2026-09-03T10:00:00.000Z",
      author: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" },
    });
    renderDetail();

    await screen.findByTestId("public-comments");
    fireEvent.change(screen.getByTestId("comment-input"), {
      target: { value: "Please keep me updated." },
    });
    fireEvent.click(screen.getByTestId("post-comment-btn"));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(12, "Please keep me updated.");
    });
    const input = screen.getByTestId("comment-input") as HTMLTextAreaElement;
    expect(input.value).toBe("");
    const timeline = screen.getByTestId("comment-timeline");
    const items = Array.from(timeline.children);
    expect(items[0].textContent).toContain("Please keep me updated.");
  });
});

describe("TicketDetail — Problem Appears Resolved (Issue 18, ui-spec 5.3, api-spec 4.9)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(authUser);
    vi.spyOn(api, "fetchTicket").mockResolvedValue(ticketDetail);
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("toggles on with PUT and shows the confirmation state, then retracts", async () => {
    const toggleSpy = vi
      .spyOn(api, "indicateResolved")
      .mockResolvedValueOnce({
        id: 12,
        requesterIndicatedResolved: true,
        indicatedResolvedAt: "2026-09-03T00:00:00.000Z",
      })
      .mockResolvedValueOnce({
        id: 12,
        requesterIndicatedResolved: false,
        indicatedResolvedAt: null,
      });
    renderDetail();

    await screen.findByTestId("ticket-actions");
    expect(
      screen.getByTestId("indicate-resolved-btn")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("indicate-resolved-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("resolved-confirmation")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/You indicated this problem appears resolved/)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("indicate-resolved-btn")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("retract-resolved-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("indicate-resolved-btn")).toBeInTheDocument();
    });
    expect(toggleSpy).toHaveBeenCalledTimes(2);
    expect(toggleSpy).toHaveBeenNthCalledWith(1, 12);
    expect(toggleSpy).toHaveBeenNthCalledWith(2, 12);
  });

  it("shows an inline error when the toggle request fails", async () => {
    vi.spyOn(api, "indicateResolved").mockRejectedValue(
      new api.ApiError("Failed to update resolved indicator", "INTERNAL_ERROR")
    );
    renderDetail();

    await screen.findByTestId("ticket-actions");
    fireEvent.click(screen.getByTestId("indicate-resolved-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("toggle-error")).toBeInTheDocument();
    });
  });
});