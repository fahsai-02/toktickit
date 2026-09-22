import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const staffUser: api.User = {
  id: 7,
  name: "Sombat Staff",
  email: "sombat.staff@toktickit.dev",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const categories: api.Category[] = [
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
];

const staffUsers: api.StaffUser[] = [
  { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
  { id: 8, name: "Dara Admin", role: "ADMINISTRATOR" },
];

const baseTicket: api.StaffTicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000910",
  summary: "Laptop battery drains quickly",
  description: "Battery drains within two hours even when asleep.",
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
  _count: { attachments: 0, comments: 1, notes: 1 },
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T09:30:00.000Z",
  attachments: [],
};

const comments: api.PublicComment[] = [
  {
    id: 30,
    ticketId: 101,
    authorId: 1,
    content: "Please check the battery health.",
    createdAt: "2026-09-02T11:00:00.000Z",
    author: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" },
  },
];

const notes: api.InternalNote[] = [
  {
    id: 21,
    ticketId: 101,
    authorId: 7,
    content: "Replace battery under warranty before next lab.",
    createdAt: "2026-09-02T12:00:00.000Z",
    author: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
  },
];

function makeTicket(overrides: Partial<api.StaffTicketDetail> = {}) {
  return { ...baseTicket, ...overrides };
}

function renderDetail() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/staff/tickets/101"]}>
        <Routes>
          <Route path="/staff/tickets/:ticketId" element={<StaffTicketDetail />} />
          <Route path="/staff/queue" element={<div data-testid="queue-route" />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

// UI-11 — FR-26, FR-37 (ui-spec 5.5 Operational meta)
describe("StaffTicketDetail — ticket info rendering and editability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchStaffComments").mockResolvedValue(comments);
    vi.spyOn(api, "fetchInternalNotes").mockResolvedValue(notes);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
    vi.spyOn(api, "fetchStaffUsers").mockResolvedValue(staffUsers);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders breadcrumbs, back link, and all operational meta fields with correct editability", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByLabelText(/Breadcrumb/)).toHaveTextContent(
      "My Queue > Ticket Detail"
    );
    expect(screen.getByTestId("back-queue-link")).toBeInTheDocument();
    expect(screen.getByTestId("staff-ticket-number")).toHaveTextContent(
      "TKT-2026-000910"
    );

    // Editable dropdowns from GET /api/staff/users + categories.
    expect(screen.getByTestId("staff-category-select")).toBeInstanceOf(
      HTMLSelectElement
    );
    expect(screen.getByTestId("staff-owner-select")).toBeInstanceOf(
      HTMLSelectElement
    );
    expect(screen.getByTestId("staff-it-priority-select")).toBeInstanceOf(
      HTMLSelectElement
    );
    expect(screen.getByTestId("staff-status-select")).toBeInstanceOf(
      HTMLSelectElement
    );

    // Read-only fields render plain text.
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MEDIUM").length).toBeGreaterThan(0);
  });

  it("shows the claim button when unassigned, and 'Claimed by you' when the user owns it", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    renderDetail();
    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByTestId("claim-btn")).toBeInTheDocument();
  });

  it("renders 'Claimed by you' instead of a Claim button when the user owns it", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({ owner: { id: 7, name: "Sombat Staff", role: "IT_STAFF" } })
    );
    renderDetail();
    await screen.findByTestId("claimed-by-you");
    expect(screen.queryByTestId("claim-btn")).not.toBeInTheDocument();
  });

  it("still shows the Claim button when a different staff member owns it", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({ owner: { id: 8, name: "Dara Admin", role: "ADMINISTRATOR" } })
    );
    renderDetail();
    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByTestId("claim-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("claimed-by-you")).not.toBeInTheDocument();
  });

  it("claim calls the API and marks the ticket as owned by the caller", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    const claimSpy = vi.spyOn(api, "claimTicket").mockResolvedValue({
      owner: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
    });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.click(screen.getByTestId("claim-btn"));

    await waitFor(() => {
      expect(claimSpy).toHaveBeenCalledWith(101);
      expect(screen.getByTestId("claimed-by-you")).toBeInTheDocument();
    });
    expect(screen.getByTestId("claim-note")).toHaveTextContent(
      /now the owner/
    );
  });

  it("category, owner, and IT priority changes call their endpoints", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    const assignSpy = vi.spyOn(api, "assignTicket").mockResolvedValue({
      owner: { id: 8, name: "Dara Admin", role: "ADMINISTRATOR" },
    });
    const prioritySpy = vi
      .spyOn(api, "updateStaffTicketPriority")
      .mockResolvedValue({ itPriority: "URGENT" });
    const categorySpy = vi
      .spyOn(api, "updateStaffTicketCategory")
      .mockResolvedValue({ category: { id: 3, name: "Software" } });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");

    fireEvent.change(screen.getByTestId("staff-owner-select"), {
      target: { value: "8" },
    });
    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(101, 8);
    });

    fireEvent.change(screen.getByTestId("staff-it-priority-select"), {
      target: { value: "URGENT" },
    });
    await waitFor(() => {
      expect(prioritySpy).toHaveBeenCalledWith(101, "URGENT");
    });

    fireEvent.change(screen.getByTestId("staff-category-select"), {
      target: { value: "3" },
    });
    await waitFor(() => {
      expect(categorySpy).toHaveBeenCalledWith(101, 3);
    });
  });

  it("shows the 'requester indicated resolved' indicator and prefills the resolution summary", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({
        resolutionSummary: "Replaced the battery; ticket resolved.",
        requesterIndicatedResolved: true,
        indicatedResolvedAt: "2026-09-03T08:00:00.000Z",
        owner: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
      })
    );
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByTestId("requester-resolved-indicator")).toBeInTheDocument();
    const input = screen.getByTestId("resolution-input") as HTMLTextAreaElement;
    expect(input.value).toContain("Replaced the battery; ticket resolved.");
  });

  it("saving a resolution summary calls the endpoint and shows 'Saved.'", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    const saveSpy = vi
      .spyOn(api, "saveResolutionSummary")
      .mockResolvedValue({ resolutionSummary: "Battery replaced under warranty." });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.change(screen.getByTestId("resolution-input"), {
      target: { value: "Battery replaced under warranty." },
    });
    fireEvent.click(screen.getByTestId("save-resolution-btn"));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        101,
        "Battery replaced under warranty."
      );
    });
    expect(screen.getByTestId("resolution-saved")).toBeInTheDocument();
  });

  it("clears 'Saved.' once the resolution text is edited after saving", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    vi.spyOn(api, "saveResolutionSummary").mockResolvedValue({
      resolutionSummary: "Battery replaced under warranty.",
    });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.change(screen.getByTestId("resolution-input"), {
      target: { value: "Battery replaced under warranty." },
    });
    fireEvent.click(screen.getByTestId("save-resolution-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("resolution-saved")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("resolution-input"), {
      target: { value: "Battery replaced under warranty; ticket closed." },
    });
    await waitFor(() => {
      expect(
        screen.queryByTestId("resolution-saved")
      ).not.toBeInTheDocument();
    });
  });

  it("still shows the ticket's category when it is inactive (absent from the active list)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({ category: { id: 9, name: "Legacy Hardware" } })
    );
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    const select = screen.getByTestId("staff-category-select") as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toContain("Legacy Hardware");
    expect(select.value).toBe("9");
  });

  it("does NOT call the API when the resolution summary is blank", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    const saveSpy = vi.spyOn(api, "saveResolutionSummary");
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    const input = screen.getByTestId("resolution-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "   " } });
    expect(screen.getByTestId("save-resolution-btn")).toBeDisabled();

    fireEvent.click(screen.getByTestId("save-resolution-btn"));
    await waitFor(() => {
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });
});

// UI-12 — FR-30, FR-38 (ui-spec 5.5 Current Status, BR-12 transitions)
describe("StaffTicketDetail — status dropdown shows only permitted next states", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchStaffComments").mockResolvedValue(comments);
    vi.spyOn(api, "fetchInternalNotes").mockResolvedValue(notes);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
    vi.spyOn(api, "fetchStaffUsers").mockResolvedValue(staffUsers);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("NEW offers only OPEN as a next state (BR-12 matrix)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    const statusSpy = vi
      .spyOn(api, "updateStaffTicketStatus")
      .mockResolvedValue({ currentStatus: "OPEN" });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");

    const select = screen.getByTestId("staff-status-select") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(["", "OPEN"]);

    fireEvent.change(select, { target: { value: "OPEN" } });
    await waitFor(() => {
      expect(statusSpy).toHaveBeenCalledWith(101, "OPEN");
    });
  });

  it("an illegal transition is never offered (CANCELLED is not reachable from NEW)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    const select = screen.getByTestId("staff-status-select") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).not.toContain("CANCELLED");
    expect(optionValues).not.toContain("RESOLVED");
  });

  it("disables the status dropdown for the terminal CANCELLED state (BR-12)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({ currentStatus: "CANCELLED" })
    );
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByTestId("staff-status-select")).toBeDisabled();
  });

  it("OPEN → CANCELLED requires the confirmation dialog before the API call", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({ currentStatus: "OPEN" })
    );
    const statusSpy = vi
      .spyOn(api, "updateStaffTicketStatus")
      .mockResolvedValue({ currentStatus: "CANCELLED" });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");

    fireEvent.change(screen.getByTestId("staff-status-select"), {
      target: { value: "CANCELLED" },
    });

    // Dialog opens; the API call must NOT have fired yet.
    await screen.findByTestId("status-confirm-dialog");
    expect(statusSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("status-confirm-accept"));
    await waitFor(() => {
      expect(statusSpy).toHaveBeenCalledWith(101, "CANCELLED");
    });
  });

  it("cancelling the confirmation dialog never calls the API", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({ currentStatus: "OPEN" })
    );
    const statusSpy = vi.spyOn(api, "updateStaffTicketStatus");
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.change(screen.getByTestId("staff-status-select"), {
      target: { value: "CANCELLED" },
    });

    await screen.findByTestId("status-confirm-dialog");
    fireEvent.click(screen.getByTestId("status-confirm-cancel"));

    await waitFor(() => {
      expect(screen.queryByTestId("status-confirm-dialog")).not.toBeInTheDocument();
    });
    expect(statusSpy).not.toHaveBeenCalled();
  });
});

// UI-13 — FR-32, FR-33 (ui-spec 5.5 tabs)
describe("StaffTicketDetail — comments/notes tabs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(baseTicket);
    vi.spyOn(api, "fetchStaffComments").mockResolvedValue(comments);
    vi.spyOn(api, "fetchInternalNotes").mockResolvedValue(notes);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
    vi.spyOn(api, "fetchStaffUsers").mockResolvedValue(staffUsers);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows all three tabs with counts; Public Comments is selected by default", async () => {
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");

    const commentsTab = screen.getByTestId("tab-comments");
    const notesTab = screen.getByTestId("tab-notes");
    const attachmentsTab = screen.getByTestId("tab-attachments");

    expect(commentsTab).toHaveTextContent("Public Comments (1)");
    expect(notesTab).toHaveTextContent("Internal Notes (1)");
    expect(attachmentsTab).toHaveTextContent("Attachments (0)");

    expect(commentsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("panel-comments")).toBeInTheDocument();
  });

  it("shows server _count totals on tabs even while comment/note fetches are still pending", async () => {
    vi.spyOn(api, "fetchStaffComments").mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, "fetchInternalNotes").mockReturnValue(new Promise(() => {}));
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByTestId("tab-comments")).toHaveTextContent(
      "Public Comments (1)"
    );
    expect(screen.getByTestId("tab-notes")).toHaveTextContent(
      "Internal Notes (1)"
    );
  });

  it("counts only active attachments on the Attachments tab (BR-18)", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(
      makeTicket({
        attachments: [
          {
            id: 1,
            originalFileName: "laptop.png",
            fileSize: 2048,
            mimeType: "image/png",
            isRemoved: false,
            removedAt: null,
            removalReason: null,
            uploadedByRequesterId: 1,
            createdAt: "2026-09-01T10:00:00.000Z",
          },
          {
            id: 2,
            originalFileName: "receipt.pdf",
            fileSize: 4096,
            mimeType: "application/pdf",
            isRemoved: true,
            removedAt: "2026-09-02T09:00:00.000Z",
            removalReason: "duplicate",
            uploadedByRequesterId: 1,
            createdAt: "2026-09-01T10:00:00.000Z",
          },
        ],
      })
    );
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    expect(screen.getByTestId("tab-attachments")).toHaveTextContent(
      "Attachments (1)"
    );
  });

  it("posts a public comment, prepends it, and clears the input", async () => {
    const postSpy = vi.spyOn(api, "postStaffComment").mockResolvedValue({
      id: 31,
      ticketId: 101,
      authorId: 7,
      content: "We will look into the battery tomorrow.",
      createdAt: "2026-09-03T09:00:00.000Z",
      author: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
    });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.change(screen.getByTestId("comment-input"), {
      target: { value: "We will look into the battery tomorrow." },
    });
    fireEvent.click(screen.getByTestId("post-comment-btn"));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        101,
        "We will look into the battery tomorrow."
      );
    });
    const input = screen.getByTestId("comment-input") as HTMLTextAreaElement;
    expect(input.value).toBe("");
    const timeline = screen.getByTestId("comment-timeline");
    expect(within(timeline).getAllByRole("listitem")[0].textContent).toContain(
      "We will look into the battery tomorrow."
    );
  });

  it("does NOT call the API when the comment is over-length", async () => {
    const postSpy = vi.spyOn(api, "postStaffComment");
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.change(screen.getByTestId("comment-input"), {
      target: { value: "x".repeat(2001) },
    });
    fireEvent.click(screen.getByTestId("post-comment-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("comment-error")).toBeInTheDocument();
    });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("switches to Internal Notes, renders the timeline, and creates a note", async () => {
    const noteSpy = vi.spyOn(api, "createInternalNote").mockResolvedValue({
      id: 22,
      ticketId: 101,
      authorId: 7,
      content: "Ordered a replacement battery internally.",
      createdAt: "2026-09-03T10:00:00.000Z",
      author: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
    });
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.click(screen.getByTestId("tab-notes"));

    await screen.findByTestId("panel-notes");
    expect(screen.getByTestId("note-timeline")).toBeInTheDocument();
    expect(screen.getByText(/visible only to IT Staff/)).toBeInTheDocument();
    // Distinct "Internal" visibility chip.
    expect(screen.getByText("Internal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("note-input"), {
      target: { value: "Ordered a replacement battery internally." },
    });
    fireEvent.click(screen.getByTestId("create-note-btn"));

    await waitFor(() => {
      expect(noteSpy).toHaveBeenCalledWith(
        101,
        "Ordered a replacement battery internally."
      );
    });
    const timeline = screen.getByTestId("note-timeline");
    expect(within(timeline).getAllByRole("listitem")[0].textContent).toContain(
      "Ordered a replacement battery internally."
    );
  });

  it("does NOT call the API when the note is blank", async () => {
    const noteSpy = vi.spyOn(api, "createInternalNote");
    renderDetail();

    await screen.findByTestId("staff-ticket-detail");
    fireEvent.click(screen.getByTestId("tab-notes"));

    await screen.findByTestId("panel-notes");
    fireEvent.change(screen.getByTestId("note-input"), {
      target: { value: "   " },
    });
    expect(screen.getByTestId("create-note-btn")).toBeDisabled();
    fireEvent.click(screen.getByTestId("create-note-btn"));
    expect(noteSpy).not.toHaveBeenCalled();
  });
});

describe("StaffTicketDetail — error states", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
    vi.spyOn(api, "fetchStaffComments").mockResolvedValue(comments);
    vi.spyOn(api, "fetchInternalNotes").mockResolvedValue(notes);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
    vi.spyOn(api, "fetchStaffUsers").mockResolvedValue(staffUsers);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows access-denied when the backend forbids the ticket", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockRejectedValue(
      new api.ApiError("Not authorized", "FORBIDDEN")
    );
    renderDetail();

    await screen.findByTestId("forbidden-state");
    expect(screen.getByText("You don't have access to this ticket.")).toBeInTheDocument();
  });

  it("shows not-found for a non-existent ticket", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockRejectedValue(
      new api.ApiError("Ticket not found", "NOT_FOUND")
    );
    renderDetail();

    await screen.findByTestId("not-found-state");
    expect(screen.getByText("Ticket not found.")).toBeInTheDocument();
  });
});