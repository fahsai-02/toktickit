import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import TicketDetail from "../../src/TicketDetail.js";
import * as api from "../../src/api.js";
import {
  formatActionDateTime,
  relativeDayHint,
} from "../../src/lib/format.js";

// MIG-01 (Issue 26) — Actions Taken UI on both Ticket Detail screens.
// Traceability: docs/lab-04/tests.md UI-01..UI-16; ui-spec.md sections 5.3,
// 5.4, 7, 8; specification.md FR-01..FR-08, FR-20..FR-25, BR-03..BR-08,
// BR-15, BR-16, BR-18, BR-22..BR-23; api-spec.md section 2.

const staffUser: api.User = {
  id: 7,
  name: "Sombat Staff",
  email: "sombat.staff@toktickit.dev",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const categories: api.Category[] = [{ id: 2, name: "Hardware" }];
const staffUsers: api.StaffUser[] = [
  { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
];

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

// 2026-10-04T02:15Z === 09:15 in Asia/Bangkok (UTC+7).
const baseAction: api.ActionTaken = {
  id: 42,
  ticketId: 101,
  actionDate: "2026-10-04T02:15:00.000Z",
  description: "Replaced the 65W charger",
  result: "Charge rate verified",
  performedById: 7,
  performedBy: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
  followUpRequired: true,
  followUpNote: "Order a spare charger",
  attachmentNotes: "See charger-after.png",
  version: 1,
  createdAt: "2026-10-04T02:20:00.000Z",
  updatedAt: "2026-10-04T02:20:00.000Z",
};

const makeAction = (overrides: Partial<api.ActionTaken> = {}): api.ActionTaken => ({
  ...baseAction,
  ...overrides,
});

function renderStaff() {
  return render(
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

function renderRequester() {
  return render(
    <MemoryRouter initialEntries={["/tickets/101"]}>
      <Routes>
        <Route path="/tickets/:ticketId" element={<TicketDetail />} />
        <Route path="/my-tickets" element={<div data-testid="my-tickets-route" />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockStaffScreen(actions: api.ActionTaken[], ticket = baseTicket) {
  vi.spyOn(api, "fetchMe").mockResolvedValue(staffUser);
  vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "fetchStaffComments").mockResolvedValue([]);
  vi.spyOn(api, "fetchInternalNotes").mockResolvedValue([]);
  vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
  vi.spyOn(api, "fetchStaffUsers").mockResolvedValue(staffUsers);
  vi.spyOn(api, "fetchTicketActions").mockResolvedValue(actions);
}

async function openStaffActions() {
  renderStaff();
  await screen.findByTestId("staff-ticket-detail");
  fireEvent.click(screen.getByTestId("tab-actions"));
  await screen.findByTestId("panel-actions");
}

// ── API request shape (real api.ts against a stubbed fetch) ─────────────────

const response = (ok: boolean, status: number, body: unknown) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as unknown as Response;

describe("Actions Taken — API client (UI-01, UI-07)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // UI-01 — FR-01, AC-01: create sends the exact request and returns the record.
  it("createActionTaken POSTs the editable fields with credentials", async () => {
    const created = makeAction();
    const fetchMock = vi.fn().mockResolvedValue(response(true, 201, { data: created }));
    vi.stubGlobal("fetch", fetchMock);

    const input: api.ActionTakenInput = {
      actionDate: "2026-10-04T02:15:00.000Z",
      description: "Replaced the 65W charger",
      result: "Charge rate verified",
      followUpRequired: true,
      followUpNote: "Order a spare charger",
      attachmentNotes: "See charger-after.png",
    };
    await expect(api.createActionTaken(101, input)).resolves.toMatchObject(created);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("/api/tickets/101/actions");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(String(options.body))).toEqual(input);
  });

  // UI-01 — FR-01/FR-12: update carries the loaded version (BR-15).
  it("updateActionTaken PUTs to /api/actions/:id including the loaded version", async () => {
    const updated = makeAction({ version: 2, description: "Edited" });
    const fetchMock = vi.fn().mockResolvedValue(response(true, 200, { data: updated }));
    vi.stubGlobal("fetch", fetchMock);

    await api.updateActionTaken(42, {
      version: 1,
      actionDate: baseAction.actionDate,
      description: "Edited",
      result: baseAction.result,
      followUpRequired: true,
      followUpNote: baseAction.followUpNote,
      attachmentNotes: baseAction.attachmentNotes,
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("/api/actions/42");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(String(options.body)).version).toBe(1);
  });

  // UI-07 — FR-12, AC-06: a 409 throws ActionConflictError carrying the server copy.
  it("updateActionTaken surfaces the server's latest copy on 409", async () => {
    const latest = makeAction({ version: 3, description: "Server copy" });
    const fetchMock = vi.fn().mockResolvedValue(
      response(false, 409, {
        error: {
          code: "CONFLICT",
          message: "This Action Taken was updated by someone else.",
        },
        data: latest,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      api.updateActionTaken(42, {
        version: 1,
        actionDate: baseAction.actionDate,
        description: "Mine",
        result: baseAction.result,
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
      })
    ).rejects.toMatchObject({ name: "ActionConflictError", latest });
  });
});

// ── Time-zone formatting (UI-09, UI-10) ─────────────────────────────────────

describe("Actions Taken — Asia/Bangkok formatting (UI-09, UI-10)", () => {
  // UI-10 — FR-08, BR-18: a known UTC instant renders as UTC+7 wall clock.
  it("formatActionDateTime renders the UTC+7 wall clock with the zone label", () => {
    expect(formatActionDateTime("2026-10-04T02:15:00.000Z")).toBe(
      "4 Oct, 09:15 (Asia/Bangkok)"
    );
  });

  // ui-spec 5.3: relative hint only when the gap is large.
  it("relativeDayHint reports whole days for old actions and null for recent ones", () => {
    const now = new Date("2026-10-08T02:15:00.000Z");
    expect(relativeDayHint("2026-10-04T02:15:00.000Z", now)).toBe("4 days ago");
    expect(relativeDayHint("2026-10-08T00:15:00.000Z", now)).toBeNull();
  });

  // ui-spec 5.3: the gap counts Bangkok calendar days, not raw 24-hour spans.
  it("relativeDayHint counts Bangkok calendar days, not raw 24-hour spans", () => {
    // 16:59Z = 23:59 in Bangkok on 1 Oct; 17:01Z = 00:01 on 3 Oct (2 calendar days later).
    expect(
      relativeDayHint(
        "2026-10-01T16:59:00.000Z",
        new Date("2026-10-02T17:01:00.000Z")
      )
    ).toBe("2 days ago");
  });
});

// ── IT Staff Ticket Detail (UI-01..UI-16, A11Y-01, A11Y-04, A11Y-05) ───────

describe("Actions Taken — IT Staff Ticket Detail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // UI-09 — FR-03: the panel renders the six fields and Bangkok dates.
  it("renders the actions list with the six fields and Bangkok dates", async () => {
    mockStaffScreen([baseAction]);
    await openStaffActions();

    expect(screen.getByTestId("tab-actions")).toHaveTextContent("Actions Taken (1)");
    const list = screen.getByTestId("actions-list");
    expect(
      Array.from(list.querySelectorAll("dt")).map((dt) => dt.textContent)
    ).toEqual([
      "Date/Time",
      "Description",
      "Result",
      "Performed By",
      "Follow-Up",
      "Notes",
    ]);
    expect(within(list).getByText(/09:15 \(Asia\/Bangkok\)/)).toBeInTheDocument();
    expect(within(list).getByText("Replaced the 65W charger")).toBeInTheDocument();
    expect(within(list).getByText("See charger-after.png")).toBeInTheDocument();
  });

  // FR-22 / ui-spec section 5.1, 5.3 — a forbidden list is visible feedback,
  // never an empty list, and the failure state offers Retry.
  it("shows the error block with Retry when actions are forbidden", async () => {
    mockStaffScreen([baseAction]);
    const actionsSpy = vi.spyOn(api, "fetchTicketActions");
    actionsSpy.mockRejectedValueOnce(
      new api.ApiError(
        "You do not have permission to access this resource.",
        "FORBIDDEN"
      )
    );

    await openStaffActions();

    const error = await screen.findByTestId("actions-error");
    expect(error).toHaveTextContent("You do not have permission");
    expect(within(error).getByTestId("actions-retry-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("actions-empty")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("actions-retry-btn"));
    await screen.findByTestId("actions-list");
    expect(actionsSpy).toHaveBeenCalledTimes(2);
  });

  // UI-16 — FR-03: an empty area is a helpful block, not a headers-only list.
  it("shows a helpful empty block instead of a headers-only list", async () => {
    mockStaffScreen([]);
    await openStaffActions();

    expect(screen.getByTestId("actions-empty")).toHaveTextContent(
      "No actions have been recorded yet."
    );
    expect(screen.queryByTestId("actions-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("empty-record-action-btn")).toBeInTheDocument();
  });

  // UI-14, UI-12 — FR-24: the owner control is on the Ticket, not the action.
  it("keeps the Ticket owner control and has no assignee control in the action area", async () => {
    mockStaffScreen([baseAction]);
    await openStaffActions();

    // Owner lives at Ticket level.
    expect(screen.getByTestId("staff-owner-select")).toBeInTheDocument();

    const panel = screen.getByTestId("panel-actions");
    expect(within(panel).queryByLabelText(/assign/i)).toBeNull();

    fireEvent.click(screen.getByTestId("record-action-btn"));
    const drawer = await screen.findByTestId("action-form-drawer");
    expect(within(drawer).queryByLabelText(/assign/i)).toBeNull();
  });

  // UI-13 — FR-25, BR-23: no per-action status/complete/cancel control.
  it("has no per-action status, complete, or cancel control", async () => {
    mockStaffScreen([baseAction]);
    await openStaffActions();

    const panel = screen.getByTestId("panel-actions");
    expect(within(panel).queryByLabelText(/status/i)).toBeNull();
    expect(within(panel).queryByLabelText(/complete/i)).toBeNull();
    expect(within(panel).queryByLabelText(/cancel/i)).toBeNull();

    fireEvent.click(screen.getByTestId("record-action-btn"));
    const drawer = await screen.findByTestId("action-form-drawer");
    expect(within(drawer).queryByLabelText(/status/i)).toBeNull();
    expect(within(drawer).queryByLabelText(/complete/i)).toBeNull();
    expect(within(drawer).queryByLabelText(/cancel/i)).toBeNull();
  });

  // UI-11 — BR-03: Performed By is read-only text, never an input/picker.
  it("renders Performed By as text with no editable affordance", async () => {
    mockStaffScreen([baseAction]);
    await openStaffActions();

    const cell = screen.getByTestId("action-performed-by-42");
    expect(cell).toHaveTextContent("Sombat Staff");
    expect(cell.querySelector("input, select, textarea, button")).toBeNull();
  });

  // UI-01 — FR-01, AC-01: the create happy path calls the real request shape.
  it("creates an action and prepends it to the list on success", async () => {
    mockStaffScreen([]);
    const createSpy = vi
      .spyOn(api, "createActionTaken")
      .mockResolvedValue(makeAction({ id: 99, description: "First recorded action" }));
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "First recorded action" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Done" },
    });
    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    const [, input] = createSpy.mock.calls[0] as [number, api.ActionTakenInput];
    expect(input.description).toBe("First recorded action");
    expect(input.followUpRequired).toBe(false);
    expect(input.followUpNote).toBeNull();

    await waitFor(() => {
      expect(screen.queryByTestId("action-form-drawer")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("action-99")).toBeInTheDocument();
  });

  // UI-02, UI-03 — FR-05, AC-02: toggle reveals the note and requires it.
  it("reveals the Follow-Up Note only when required and blocks a blank note", async () => {
    mockStaffScreen([]);
    const createSpy = vi.spyOn(api, "createActionTaken");
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    // Not shown until the toggle is on.
    expect(screen.queryByTestId("action-followup-note-input")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("action-followup-toggle"));
    expect(screen.getByTestId("action-followup-note-input")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Diagnosed the fault" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Part ordered" },
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await screen.findByTestId("action-followup-note-error");
    expect(screen.getByTestId("action-followup-note-error")).toHaveTextContent(
      /required when follow-up is needed/i
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  // UI-04 — FR-20, AC-16: single-flight guard.
  it("blocks a second save while the first request is in flight", async () => {
    mockStaffScreen([]);
    const createSpy = vi
      .spyOn(api, "createActionTaken")
      .mockReturnValue(new Promise(() => {}));
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Work" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Result" },
    });

    const saveBtn = screen.getByTestId("save-action-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => expect((saveBtn as HTMLButtonElement).disabled).toBe(true));
    expect(saveBtn.querySelector(".spinner")).not.toBeNull();

    fireEvent.click(saveBtn);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  // UI-05 — FR-21, AC-15: retention + inline messages after a 400.
  it("retains field values and shows inline messages after a 400", async () => {
    mockStaffScreen([]);
    vi.spyOn(api, "createActionTaken").mockRejectedValue(
      new api.ApiError("Validation failed", "VALIDATION_ERROR", {
        description: "description is required and must be non-blank.",
      })
    );
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "typed description" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "typed result" },
    });
    fireEvent.click(screen.getByTestId("save-action-btn"));

    await screen.findByTestId("action-description-error");
    expect(
      (screen.getByTestId("action-description-input") as HTMLTextAreaElement).value
    ).toBe("typed description");
    expect(
      (screen.getByTestId("action-result-input") as HTMLTextAreaElement).value
    ).toBe("typed result");
  });

  // UI-06 — FR-21, AC-15: a safe failure callout with no raw error text.
  it("shows a safe failure callout and keeps values after a 500", async () => {
    mockStaffScreen([]);
    vi.spyOn(api, "createActionTaken").mockRejectedValue(
      new api.ApiError("Something went wrong. Please try again.", "INTERNAL_ERROR")
    );
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "kept" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "kept result" },
    });
    fireEvent.click(screen.getByTestId("save-action-btn"));

    const callout = await screen.findByTestId("action-form-error");
    expect(callout).toHaveClass("callout", "callout-error", "action-form-error");
    expect(callout).toHaveTextContent(/Something went wrong/);
    expect(callout.textContent).not.toMatch(/stack|at Object|node_modules/i);
    expect(
      (screen.getByTestId("action-description-input") as HTMLTextAreaElement).value
    ).toBe("kept");
  });

  // S4 — ui-spec section 5.3: the counter turns the error colour and the inline
  // message appears once the value exceeds 2000; no request is sent.
  it("turns the counter to the error colour and blocks a value over the limit", async () => {
    mockStaffScreen([]);
    const createSpy = vi.spyOn(api, "createActionTaken");
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "a".repeat(2001) },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Done" },
    });

    const counter = screen.getByTestId("field-counter-action-description");
    expect(counter).toHaveClass("field-counter-error");
    expect(counter).toHaveTextContent("2001/2000");

    fireEvent.click(screen.getByTestId("save-action-btn"));
    const error = await screen.findByTestId("action-description-error");
    expect(error).toHaveTextContent(/2000/);
    expect(createSpy).not.toHaveBeenCalled();
  });

  // S4 — ui-spec 5.3 counter also warns as the field nears its limit.
  it("turns the counter to the warning colour near the limit", async () => {
    mockStaffScreen([]);
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "a".repeat(1800) },
    });

    const counter = screen.getByTestId("field-counter-action-description");
    expect(counter).toHaveClass("field-counter-warn");
    expect(counter).not.toHaveClass("field-counter-error");
  });

  // UI-07 — FR-12, AC-06: 409 keeps typing and offers a Refresh of the server copy.
  it("keeps the form on a 409, then Refresh loads the server copy", async () => {
    mockStaffScreen([baseAction]);
    const latest = makeAction({ version: 4, description: "Server edited copy" });
    vi.spyOn(api, "updateActionTaken").mockRejectedValue(
      new api.ActionConflictError("Conflict", latest)
    );
    await openStaffActions();

    fireEvent.click(screen.getByTestId("edit-action-42"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "My unsaved edit" },
    });
    fireEvent.click(screen.getByTestId("save-action-btn"));

    await screen.findByTestId("action-conflict-callout");
    // B1 — the passed className must not clobber the base callout classes.
    const conflictCallout = screen.getByTestId("action-conflict-callout");
    expect(conflictCallout).toHaveClass("callout");
    expect(conflictCallout).toHaveClass("callout-error");
    expect(conflictCallout).toHaveClass("action-conflict-callout");
    // Typing is not silently discarded.
    expect(
      (screen.getByTestId("action-description-input") as HTMLTextAreaElement).value
    ).toBe("My unsaved edit");

    fireEvent.click(screen.getByTestId("action-conflict-refresh"));

    await waitFor(() => {
      expect(screen.queryByTestId("action-conflict-callout")).not.toBeInTheDocument();
    });
    expect(
      (screen.getByTestId("action-description-input") as HTMLTextAreaElement).value
    ).toBe("Server edited copy");
  });

  // UI-08 — FR-01, BR-07: a future date is rejected before any request.
  it("rejects an actionDate more than 5 minutes in the future without a request", async () => {
    mockStaffScreen([]);
    const createSpy = vi.spyOn(api, "createActionTaken");
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Future work" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Done" },
    });
    // 2099 is far beyond the 5-minute limit.
    fireEvent.change(screen.getByTestId("action-date-input"), {
      target: { value: "2099-01-01T00:00" },
    });
    fireEvent.click(screen.getByTestId("save-action-btn"));

    const error = await screen.findByTestId("action-date-error");
    expect(error).toHaveTextContent(/5 minutes in the future/);
    expect(createSpy).not.toHaveBeenCalled();
  });

  // A11Y-01 — ui-spec section 7: switch semantics + labelled fields.
  it("exposes switch semantics on the toggle and labels every form field", async () => {
    mockStaffScreen([]);
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");

    const toggle = screen.getByTestId("action-followup-toggle");
    expect(toggle).toHaveAttribute("role", "switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    expect(screen.getByLabelText(/Action Date\/Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Result/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Attachment Notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Follow-up required/i)).toBe(toggle);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText(/Follow-Up Note/i)).toBeInTheDocument();
  });

  // A11Y-04 — ui-spec section 7: save success is announced via aria-live.
  it("announces a successful save through an aria-live region", async () => {
    mockStaffScreen([]);
    vi.spyOn(api, "createActionTaken").mockResolvedValue(
      makeAction({ id: 77, description: "Announced action" })
    );
    await openStaffActions();

    fireEvent.click(screen.getByTestId("empty-record-action-btn"));
    await screen.findByTestId("action-form-drawer");
    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Announced action" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Done" },
    });
    fireEvent.click(screen.getByTestId("save-action-btn"));

    const live = screen.getByTestId("actions-live");
    expect(live).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(live).toHaveTextContent("Action saved."));
  });

  // A11Y-05 — ui-spec section 7: named list + per-entry Edit naming.
  it("names the list and each Edit button with its action date", async () => {
    mockStaffScreen([baseAction]);
    await openStaffActions();

    expect(
      screen.getByRole("list", { name: "Actions recorded for this ticket" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("edit-action-42")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("4 Oct")
    );
  });

  // A11Y-05 — ui-spec section 7: the tab and row Edit are keyboard-reachable,
  // and the form dialog traps focus and returns it on Escape.
  it("opens the form by keyboard, traps focus, and returns focus on Escape", async () => {
    mockStaffScreen([baseAction]);
    await openStaffActions();

    // No positive tabindex anywhere in the tab/list (natural DOM order).
    expect(screen.getByTestId("tab-actions").getAttribute("tabindex") ?? "0").not.toMatch(/^[1-9]/);
    const edit = screen.getByTestId("edit-action-42");
    expect(edit.getAttribute("tabindex") ?? "0").not.toMatch(/^[1-9]/);

    edit.focus();
    fireEvent.click(edit);
    await screen.findByTestId("action-form-drawer");
    // Focus moved into the dialog (onto its close control).
    expect(document.activeElement).toBe(screen.getByTestId("drawer-close"));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("action-form-drawer")).not.toBeInTheDocument();
    });
    // Focus returns to the trigger that opened the dialog.
    expect(document.activeElement).toBe(edit);
  });
});

// ── Requester Ticket Detail (UI-15, UI-11) ─────────────────────────────────

describe("Actions Taken — Requester read-only view (UI-15)", () => {
  const requesterTicket: api.TicketDetail = {
    ...baseTicket,
    owner: { id: 7, name: "Sombat Staff", role: "IT_STAFF" },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchTicket").mockResolvedValue(requesterTicket);
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the six fields read-only with no Record, Edit, or Delete control", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([baseAction]);
    renderRequester();

    const section = await screen.findByTestId("requester-actions");
    expect(within(section).getByText(/Actions Taken \(1\)/)).toBeInTheDocument();

    const list = within(section).getByTestId("actions-list");
    expect(
      Array.from(list.querySelectorAll("dt")).map((dt) => dt.textContent)
    ).toEqual([
      "Date/Time",
      "Description",
      "Result",
      "Performed By",
      "Follow-Up",
      "Notes",
    ]);
    expect(within(list).getByText(/09:15 \(Asia\/Bangkok\)/)).toBeInTheDocument();

    // No write affordances anywhere in the section.
    expect(within(section).queryByRole("button")).toBeNull();
    expect(within(section).queryByTestId("actions-list")).not.toBeNull();
  });

  // FR-22 / ui-spec section 5.1, 5.3 — a forbidden read is visible feedback,
  // never an empty list, and the failure state offers Retry.
  it("shows the error block with Retry when the list is forbidden", async () => {
    const actionsSpy = vi.spyOn(api, "fetchTicketActions");
    actionsSpy
      .mockRejectedValueOnce(
        new api.ApiError(
          "You do not have permission to access this resource.",
          "FORBIDDEN"
        )
      )
      .mockResolvedValueOnce([baseAction]);

    renderRequester();

    const section = await screen.findByTestId("requester-actions");
    const error = await within(section).findByTestId("actions-error");
    expect(error).toHaveTextContent("You do not have permission");
    expect(within(error).getByTestId("actions-retry-btn")).toBeInTheDocument();
    expect(within(section).queryByTestId("actions-empty")).not.toBeInTheDocument();

    fireEvent.click(within(error).getByTestId("actions-retry-btn"));
    await within(section).findByTestId("actions-list");
    expect(actionsSpy).toHaveBeenCalledTimes(2);
  });

  it("shows the empty block when the ticket has no recorded actions", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([]);
    renderRequester();

    const section = await screen.findByTestId("requester-actions");
    expect(within(section).getByTestId("actions-empty")).toHaveTextContent(
      "No actions have been recorded yet."
    );
    expect(within(section).queryByTestId("actions-list")).not.toBeInTheDocument();
    expect(within(section).queryByRole("button")).toBeNull();
  });
});
