import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import UserManagement from "../../src/UserManagement.js";
import * as api from "../../src/api.js";

const adminUser: api.User = {
  id: 7,
  name: "Administrator",
  email: "admin@toktickit.dev",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const requesterUser: api.User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: false,
};

const users: api.AdminUser[] = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.dev",
    role: "REQUESTER",
    isActive: true,
  },
  {
    id: 7,
    name: "Administrator",
    email: "admin@toktickit.dev",
    role: "ADMINISTRATOR",
    isActive: true,
  },
  {
    id: 8,
    name: "Kevin Smith",
    email: "itstaff.kevin@toktickit.dev",
    role: "IT_STAFF",
    isActive: true,
  },
  {
    id: 9,
    name: "Lisa Tan",
    email: "itstaff.lisa@toktickit.dev",
    role: "IT_STAFF",
    isActive: false,
  },
];

function renderPage() {
  render(
    <AuthProvider>
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    </AuthProvider>
  );
}

// UI-14 — FR-40, AC-13 (tests.md UI-14; ui-spec 5.6)
describe("UserManagement — user list (UI-14)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(adminUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the list with Name, Email, Role, Status, Edit columns", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(users);
    renderPage();

    const table = await screen.findByTestId("user-table-desktop");

    for (const label of ["Name", "Email", "Role", "Status", "Edit"]) {
      expect(
        within(table).getByRole("columnheader", { name: label })
      ).toBeInTheDocument();
    }

    const row1 = screen.getByTestId("edit-user-1");
    expect(row1.closest("tr")).toHaveTextContent("Jennifer Anderson");
    expect(row1.closest("tr")).toHaveTextContent(
      "jennifer.anderson@toktickit.dev"
    );
    // Role badge text (ui-spec 5.6 Role dropdown labels).
    expect(
      within(row1.closest("tr") as HTMLElement).getByText("Requester")
    ).toBeInTheDocument();
    expect(
      within(row1.closest("tr") as HTMLElement).getByText("Active")
    ).toBeInTheDocument();

    const row9 = screen.getByTestId("edit-user-9");
    expect(
      within(row9.closest("tr") as HTMLElement).getByText("Inactive")
    ).toBeInTheDocument();
    expect(
      within(row9.closest("tr") as HTMLElement).getByText("IT Staff")
    ).toBeInTheDocument();
  });

  it("paints per-role and active/inactive badge classes (ui-spec 5.6 Status)", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(users);
    renderPage();

    const table = await screen.findByTestId("user-table-desktop");

    expect(table.querySelector(".badge-role-requester")).toBeTruthy();
    expect(table.querySelector(".badge-role-administrator")).toBeTruthy();
    expect(table.querySelector(".badge-role-it-staff")).toBeTruthy();
    expect(table.querySelector(".badge-active")).toBeTruthy();
    expect(table.querySelector(".badge-inactive")).toBeTruthy();
  });

  it("debounces search into a single API call with the last value", async () => {
    const mockFetch = vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(users);
    renderPage();

    await screen.findByTestId("user-table-desktop");
    const baseCount = mockFetch.mock.calls.length;

    const searchInput = screen.getByTestId("user-search-input");
    expect(searchInput).toHaveAttribute("placeholder", "Search users...");
    fireEvent.change(searchInput, { target: { value: "a" } });
    fireEvent.change(searchInput, { target: { value: "ad" } });
    fireEvent.change(searchInput, { target: { value: "adm" } });

    await waitFor(
      () => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(baseCount);
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: "adm" })
        );
      },
      { timeout: 1500 }
    );

    expect(mockFetch.mock.calls.length).toBe(baseCount + 1);
  });

  it("role filter is hidden until Filters is toggled, then sends the param", async () => {
    const mockFetch = vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(users);
    renderPage();

    await screen.findByTestId("user-table-desktop");

    expect(screen.queryByTestId("filter-card")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("filters-toggle"));
    expect(screen.getByTestId("filter-card")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("filter-role"), {
      target: { value: "ADMINISTRATOR" },
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: "ADMINISTRATOR" })
      );
    });

    fireEvent.click(screen.getByTestId("clear-filters"));
    await waitFor(() => {
      const lastArgs = mockFetch.mock.calls.at(-1)?.[0];
      expect(lastArgs?.role ?? "").toBeFalsy();
      expect(lastArgs?.search ?? "").toBeFalsy();
    });
    expect(screen.getByTestId("filter-role")).toHaveValue("");
    expect(screen.getByTestId("user-search-input")).toHaveValue("");
  });

  it("shows empty state for a zero-user list", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue([]);
    renderPage();

    const empty = await screen.findByTestId("empty-state");
    expect(within(empty).getByText("No users found.")).toBeInTheDocument();
    expect(screen.queryByTestId("user-table-desktop")).not.toBeInTheDocument();
  });

  it("shows the forbidden state for non-admins and never fetches the list", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue(requesterUser);
    const mockFetch = vi.spyOn(api, "fetchAdminUsers");
    renderPage();

    const forbidden = await screen.findByTestId("forbidden-state");
    expect(
      within(forbidden).getByText("You don't have access to this page.")
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// UI-15 — FR-41 (tests.md UI-15; ui-spec 5.6 create mode)
describe("UserManagement — create user drawer (UI-15)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(adminUser);
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(users);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the create drawer with the required fields", async () => {
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("create-user-btn"));

    const drawer = await screen.findByTestId("user-drawer");
    expect(drawer).toHaveTextContent("Create New User");
    expect(screen.getByTestId("user-name")).toBeInTheDocument();
    expect(screen.getByTestId("user-email")).toBeInTheDocument();
    expect(screen.getByTestId("user-role")).toBeInTheDocument();
    expect(screen.getByTestId("active-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("initial-password")).toBeInTheDocument();
  });

  it("closes on a dark-backdrop click but stays open when clicking inside", async () => {
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("create-user-btn"));
    await screen.findByTestId("user-drawer");

    // Clicking inside the panel (the drawer dialog itself) does not close.
    fireEvent.click(screen.getByTestId("user-drawer"));
    expect(screen.getByTestId("user-drawer")).toBeInTheDocument();

    // Clicking the dark backdrop closes the drawer.
    fireEvent.click(screen.getByTestId("user-drawer-overlay"));
    await waitFor(() => {
      expect(screen.queryByTestId("user-drawer")).not.toBeInTheDocument();
    });
  });

  it("blocks empty submissions client-side and never calls the API", async () => {
    const mockCreate = vi.spyOn(api, "createAdminUser");
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("create-user-btn"));
    await screen.findByTestId("user-drawer");

    fireEvent.click(screen.getByTestId("save-user-btn"));

    expect(await screen.findByTestId("name-error")).toHaveTextContent(
      "Full name is required."
    );
    expect(screen.getByTestId("email-error")).toHaveTextContent(
      "A valid email address is required."
    );
    expect(screen.getByTestId("initial-password-error")).toHaveTextContent(
      "An initial password is required."
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("submits the real payload and surfaces success after saving", async () => {
    const mockCreate = vi
      .spyOn(api, "createAdminUser")
      .mockResolvedValueOnce({
        id: 10,
        name: "Nina New",
        email: "nina.new@toktickit.dev",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
        createdAt: "2026-09-20T10:00:00.000Z",
      });
    const mockList = vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(users);
    renderPage();

    await screen.findByTestId("user-table-desktop");
    const callsBefore = mockCreate.mock.calls.length;

    fireEvent.click(screen.getByTestId("create-user-btn"));
    await screen.findByTestId("user-drawer");

    fireEvent.change(screen.getByTestId("user-name"), {
      target: { value: "Nina New" },
    });
    fireEvent.change(screen.getByTestId("user-email"), {
      target: { value: "nina.new@toktickit.dev" },
    });
    fireEvent.change(screen.getByTestId("user-role"), {
      target: { value: "IT_STAFF" },
    });
    fireEvent.click(screen.getByTestId("active-toggle"));
    fireEvent.change(screen.getByTestId("initial-password"), {
      target: { value: "TempPass123!" },
    });

    fireEvent.click(screen.getByTestId("save-user-btn"));

    await waitFor(() => {
      expect(mockCreate.mock.calls.length).toBe(callsBefore + 1);
    });
    expect(mockCreate).toHaveBeenLastCalledWith({
      name: "Nina New",
      email: "nina.new@toktickit.dev",
      role: "IT_STAFF",
      isActive: false,
      initialPassword: "TempPass123!",
    });

    // Drawer closes, success banner shows, the list is refetched.
    await waitFor(() => {
      expect(screen.queryByTestId("user-drawer")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("page-success")).toHaveTextContent(
      "User created successfully."
    );
    await waitFor(() => {
      expect(mockList.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("surfaces the real duplicate-email 409 as an inline email error (create)", async () => {
    // The server's duplicate-email response is `{ error: { code, message } }`
    // with NO per-field body (api-spec 6.2 409 row). The page must map that
    // real shape to the email field (ui-spec 5.6 "Duplicate email: inline
    // field error"), so the mock mirrors the actual response, not a
    // hand-added `fields` value.
    const mockCreate = vi
      .spyOn(api, "createAdminUser")
      .mockRejectedValueOnce(
        new api.ApiError(
          "A user with this email already exists.",
          "CONFLICT"
        )
      );
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("create-user-btn"));
    await screen.findByTestId("user-drawer");

    fireEvent.change(screen.getByTestId("user-name"), {
      target: { value: "Dup Email" },
    });
    fireEvent.change(screen.getByTestId("user-email"), {
      target: { value: "dup@toktickit.dev" },
    });
    fireEvent.change(screen.getByTestId("initial-password"), {
      target: { value: "TempPass123!" },
    });

    fireEvent.click(screen.getByTestId("save-user-btn"));

    expect(await screen.findByTestId("email-error")).toHaveTextContent(
      "A user with this email already exists."
    );
    // The conflict is a field error, not a generic banner.
    expect(screen.queryByTestId("form-error")).not.toBeInTheDocument();
    // The drawer stays open so the admin can fix the field.
    expect(screen.getByTestId("user-drawer")).toBeInTheDocument();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

// UI-16 — FR-43, FR-44, FR-45, FR-46 (tests.md UI-16; ui-spec 5.6 edit mode)
describe("UserManagement — edit drawer and safety (UI-16)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(adminUser);
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(users);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the selected user's data into the edit drawer", async () => {
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("edit-user-8"));

    const drawer = await screen.findByTestId("user-drawer");
    expect(drawer).toHaveTextContent("Edit User");
    expect(screen.getByTestId("user-name")).toHaveValue("Kevin Smith");
    expect(screen.getByTestId("user-email")).toHaveValue(
      "itstaff.kevin@toktickit.dev"
    );
    expect(screen.getByTestId("user-role")).toHaveValue("IT_STAFF");
    expect(screen.getByTestId("active-toggle")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    // Edit-mode toggle is read-only — a status change must go through the
    // confirmed Deactivate/Activate buttons (ui-spec 5.6), never via Save.
    expect(screen.getByTestId("active-toggle")).toBeDisabled();
    // Password field is not on the edit form; reset lives in its own section.
    expect(screen.queryByTestId("initial-password")).not.toBeInTheDocument();
  });

  it("sends the updated payload on save", async () => {
    const mockUpdate = vi.spyOn(api, "updateAdminUser").mockResolvedValueOnce({
      id: 8,
      name: "Kevin Smith Jr.",
      email: "itstaff.kevin@toktickit.dev",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
    });
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("edit-user-8"));
    await screen.findByTestId("user-drawer");

    fireEvent.change(screen.getByTestId("user-name"), {
      target: { value: "Kevin Smith Jr." },
    });

    fireEvent.click(screen.getByTestId("save-user-btn"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(8, {
        name: "Kevin Smith Jr.",
        email: "itstaff.kevin@toktickit.dev",
        role: "IT_STAFF",
      });
    });
  });

  it("cannot deactivate an existing user through the Active toggle + Save (regression)", async () => {
    const mockUpdate = vi.spyOn(api, "updateAdminUser").mockResolvedValueOnce({
      id: 8,
      name: "Kevin Smith",
      email: "itstaff.kevin@toktickit.dev",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
    });
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("edit-user-8"));
    await screen.findByTestId("user-drawer");

    // The toggle is read-only in edit mode: flipping it is a no-op and no
    // confirmation dialog is reachable from it (ui-spec 5.6 has exactly one
    // deactivation flow — the confirmed Deactivate User button).
    expect(screen.getByTestId("active-toggle")).toBeDisabled();
    fireEvent.click(screen.getByTestId("active-toggle"));
    expect(screen.getByTestId("active-toggle")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(
      screen.queryByTestId("deactivate-confirm-dialog")
    ).not.toBeInTheDocument();

    // Save never sends `isActive` for existing users, so it cannot deactivate.
    fireEvent.click(screen.getByTestId("save-user-btn"));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(8, {
        name: "Kevin Smith",
        email: "itstaff.kevin@toktickit.dev",
        role: "IT_STAFF",
      });
    });
    expect(
      screen.queryByTestId("deactivate-confirm-dialog")
    ).not.toBeInTheDocument();
  });

  it("shows the duplicate-email 409 as an inline email error on edit (real response shape)", async () => {
    const mockUpdate = vi
      .spyOn(api, "updateAdminUser")
      .mockRejectedValueOnce(
        new api.ApiError("A user with this email already exists.", "CONFLICT")
      );
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("edit-user-8"));
    await screen.findByTestId("user-drawer");

    fireEvent.change(screen.getByTestId("user-email"), {
      target: { value: "taken@toktickit.dev" },
    });
    fireEvent.click(screen.getByTestId("save-user-btn"));

    expect(await screen.findByTestId("email-error")).toHaveTextContent(
      "A user with this email already exists."
    );
    expect(screen.queryByTestId("form-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("user-drawer")).toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("Escape closes only the topmost dialog, restores trigger focus, and keeps scroll locked until the drawer closes (regression)", async () => {
    const mockUpdate = vi.spyOn(api, "updateAdminUser").mockResolvedValueOnce({
      id: 8,
      name: "Kevin Smith",
      email: "itstaff.kevin@toktickit.dev",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
    });
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("edit-user-8"));
    await screen.findByTestId("user-drawer");
    expect(document.body.style.overflow).toBe("hidden");

    // Confirm dialog is open on top of the drawer. jsdom's fireEvent does not
    // move focus on click (a real browser would), so focus the trigger
    // explicitly — the dialog must capture THIS element as the one to restore.
    const deactivateBtn = screen.getByTestId("deactivate-user-btn");
    deactivateBtn.focus();
    fireEvent.click(deactivateBtn);
    await screen.findByTestId("deactivate-confirm-dialog");

    // First Escape closes only the confirmation dialog — the drawer beneath
    // must survive and the page must stay scroll-locked.
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByTestId("deactivate-confirm-dialog")
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("user-drawer")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    // ui-spec section 7: a dialog returns focus to its trigger when closed.
    // The drawer resumes from suspension here and must NOT steal focus back
    // to its close button (PR review regression).
    expect(document.activeElement).toBe(screen.getByTestId("deactivate-user-btn"));

    // Second Escape closes the drawer and finally releases the scroll lock.
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("user-drawer")).not.toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("");
  });

  it("confirms before deactivating and surfaces a 403 self-deactivation message", async () => {
    const mockUpdate = vi
      .spyOn(api, "updateAdminUser")
      .mockRejectedValueOnce(
        new api.ApiError("You cannot deactivate your own account.", "FORBIDDEN")
      );
    renderPage();

    await screen.findByTestId("user-table-desktop");
    // Edit the admin's own row (id 7 === signed-in admin).
    fireEvent.click(screen.getByTestId("edit-user-7"));
    await screen.findByTestId("user-drawer");

    fireEvent.click(screen.getByTestId("deactivate-user-btn"));
    const confirm = await screen.findByTestId("deactivate-confirm-dialog");
    expect(confirm).toHaveTextContent(
      "Are you sure you want to deactivate Administrator?"
    );
    expect(confirm).toHaveTextContent(
      "This user will no longer be able to log in."
    );
    expect(
      within(confirm).getByRole("button", { name: "Deactivate" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-ok-btn"));

    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "You cannot deactivate your own account."
    );
    expect(mockUpdate).toHaveBeenCalledWith(7, { isActive: false });
    // Drawer stays open, no success banner.
    expect(screen.getByTestId("user-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("page-success")).not.toBeInTheDocument();
  });

  it("surfaces a 409 last-admin message when deactivating the final admin", async () => {
    const mockUpdate = vi
      .spyOn(api, "updateAdminUser")
      .mockRejectedValueOnce(
        new api.ApiError(
          "Cannot deactivate the last active Administrator.",
          "CONFLICT"
        )
      );
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("edit-user-7"));
    await screen.findByTestId("user-drawer");

    fireEvent.click(screen.getByTestId("deactivate-user-btn"));
    await screen.findByTestId("deactivate-confirm-dialog");
    fireEvent.click(screen.getByTestId("confirm-ok-btn"));

    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "Cannot deactivate the last active Administrator."
    );
    expect(mockUpdate).toHaveBeenCalledWith(7, { isActive: false });
  });

  it("shows Activate for inactive users and sends the reactivation payload", async () => {
    const mockUpdate = vi.spyOn(api, "updateAdminUser").mockResolvedValueOnce({
      id: 9,
      name: "Lisa Tan",
      email: "itstaff.lisa@toktickit.dev",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
    });
    renderPage();

    await screen.findByTestId("user-table-desktop");
    // id 9 (Lisa Tan) is inactive in the fixture.
    fireEvent.click(screen.getByTestId("edit-user-9"));
    await screen.findByTestId("user-drawer");

    // Inactive users get an "Activate User" action, never "Deactivate User".
    expect(screen.queryByTestId("deactivate-user-btn")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("activate-user-btn"));

    const confirm = await screen.findByTestId("deactivate-confirm-dialog");
    expect(confirm).toHaveTextContent(
      "Are you sure you want to activate Lisa Tan?"
    );
    expect(confirm).toHaveTextContent("This user will be able to log in again.");
    expect(
      within(confirm).getByRole("button", { name: "Activate" })
    ).toBeInTheDocument();
    // The activate confirm is not destructive (no red styling).
    expect(confirm.querySelector(".btn-destructive")).toBeFalsy();

    fireEvent.click(screen.getByTestId("confirm-ok-btn"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(9, { isActive: true });
    });
    expect(await screen.findByTestId("page-success")).toHaveTextContent(
      "User updated successfully."
    );
  });

  it("reset-password sub-form validates and calls the API", async () => {
    const mockReset = vi
      .spyOn(api, "resetAdminPassword")
      .mockResolvedValueOnce({
        message: "Password reset successfully. User must change password at next login.",
      });
    renderPage();

    await screen.findByTestId("user-table-desktop");
    fireEvent.click(screen.getByTestId("edit-user-9"));
    await screen.findByTestId("user-drawer");

    fireEvent.click(screen.getByTestId("open-reset-password"));

    // Client-side validation: empty password blocks the API call.
    fireEvent.click(screen.getByTestId("save-reset-password"));
    expect(await screen.findByTestId("reset-password-error")).toHaveTextContent(
      "An initial password is required."
    );
    expect(mockReset).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("reset-password"), {
      target: { value: "NewPass123!" },
    });
    fireEvent.click(screen.getByTestId("save-reset-password"));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith(9, "NewPass123!");
    });
    expect(await screen.findByTestId("reset-success")).toHaveTextContent(
      "Password reset successfully. User must change password at next login."
    );
  });
});