import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// Traceability: tests.md UI-01..UI-03 (AC-01, AC-05, FR-01, FR-02).

const requesterUser: api.User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: false,
};

const freshUser: api.User = {
  ...requesterUser,
  mustChangePassword: true,
};

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

function fillLoginForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: password },
  });
}

describe("Login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // No session at load — the app boots onto the login screen.
    vi.spyOn(api, "fetchMe").mockRejectedValue(
      new api.ApiError("Not authenticated.", "UNAUTHORIZED")
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-01: shows a generic error banner, keeps values, and stays put on invalid credentials", async () => {
    const loginSpy = vi
      .spyOn(api, "login")
      .mockRejectedValue(
        new api.ApiError("Invalid email or password. Please try again.", "UNAUTHORIZED")
      );
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("nobody@toktickit.dev", "WrongPass1!");
    fireEvent.click(screen.getByTestId("login-submit"));

    // Safe generic message — never reveals whether the email exists.
    expect(
      await screen.findByTestId("login-error")
    ).toHaveTextContent("Invalid email or password. Please try again.");
    // Form values are retained and no redirect happened.
    expect(screen.getByLabelText(/email address/i)).toHaveValue("nobody@toktickit.dev");
    expect(screen.getByLabelText(/^password/i)).toHaveValue("WrongPass1!");
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(loginSpy).toHaveBeenCalledWith("nobody@toktickit.dev", "WrongPass1!");
  });

  it("UI-02: redirects to the app shell on valid credentials", async () => {
    vi.spyOn(api, "login").mockResolvedValue(requesterUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("jennifer.anderson@toktickit.dev", "NewSecure123!");
    fireEvent.click(screen.getByTestId("login-submit"));

    // Landed inside the authenticated shell with the user name visible.
    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  });

  it("redirects a mustChangePassword user to /change-password", async () => {
    vi.spyOn(api, "login").mockResolvedValue(freshUser);
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("fresh@toktickit.dev", "TempPass123!");
    fireEvent.click(screen.getByTestId("login-submit"));

    expect(await screen.findByText("Change Your Password")).toBeInTheDocument();
  });

  it("UI-03: disables the button and shows a busy label while signing in", async () => {
    vi.spyOn(api, "login").mockReturnValue(new Promise(() => {}));
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("jennifer.anderson@toktickit.dev", "NewSecure123!");
    fireEvent.click(screen.getByTestId("login-submit"));

    const submit = await screen.findByTestId("login-submit");
    await waitFor(() => {
      expect(submit).toBeDisabled();
      expect(submit).toHaveTextContent("Signing in…");
    });
  });

  it("shows inline validation and never calls the API for a malformed email", async () => {
    const loginSpy = vi.spyOn(api, "login").mockResolvedValue(requesterUser);
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("not-an-email", "SomePass1!");
    fireEvent.click(screen.getByTestId("login-submit"));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("shows the same generic error for an inactive account (AC-06)", async () => {
    // Server returns the identical generic message for unknown / wrong /
    // inactive (specification.md BR-01) — the UI must not distinguish them.
    const loginSpy = vi
      .spyOn(api, "login")
      .mockRejectedValue(
        new api.ApiError("Invalid email or password. Please try again.", "UNAUTHORIZED")
      );
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("inactive@toktickit.dev", "TempPass123!");
    fireEvent.click(screen.getByTestId("login-submit"));

    expect(
      await screen.findByTestId("login-error")
    ).toHaveTextContent("Invalid email or password. Please try again.");
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(loginSpy).toHaveBeenCalledWith("inactive@toktickit.dev", "TempPass123!");
  });

  it("re-enables the button after a failed attempt so the user can retry", async () => {
    vi.spyOn(api, "login").mockRejectedValue(
      new api.ApiError("Invalid email or password. Please try again.", "UNAUTHORIZED")
    );
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("nobody@toktickit.dev", "WrongPass1!");
    fireEvent.click(screen.getByTestId("login-submit"));

    await screen.findByTestId("login-error");
    const submit = screen.getByTestId("login-submit");
    await waitFor(() => {
      expect(submit).not.toBeDisabled();
      expect(submit).toHaveTextContent("Sign in");
    });
  });

  it("shows an inline error and never calls the API for an empty password", async () => {
    const loginSpy = vi.spyOn(api, "login").mockResolvedValue(requesterUser);
    renderLogin();
    await screen.findByText("Sign in to your account");

    fillLoginForm("jennifer.anderson@toktickit.dev", "");
    fireEvent.click(screen.getByTestId("login-submit"));

    expect(await screen.findByText("Password is required.")).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("toggles password visibility without submitting", async () => {
    renderLogin();
    await screen.findByText("Sign in to your account");

    const password = screen.getByLabelText(/^password/i);
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("shows a placeholder note for Forgot password and performs no reset", async () => {    const loginSpy = vi.spyOn(api, "login").mockResolvedValue(requesterUser);
    renderLogin();
    await screen.findByText("Sign in to your account");

    fireEvent.click(screen.getByRole("button", { name: "Forgot your password?" }));
    expect(await screen.findByTestId("forgot-note")).toBeInTheDocument();
    // Placeholder only — no API traffic of any kind.
    expect(loginSpy).not.toHaveBeenCalled();
    expect(api.fetchMe).toHaveBeenCalledTimes(1);
  });
});

describe("AppShell — profile menu and guards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderAuthedApp(user: api.User, initialEntries = ["/"]) {
    vi.spyOn(api, "fetchMe").mockResolvedValue(user);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it("profile dropdown shows name + role and Change Password navigates", async () => {
    renderAuthedApp(requesterUser);
    await screen.findByText("Jennifer Anderson");

    fireEvent.click(screen.getByRole("button", { name: /profile for/i }));
    expect(screen.getByRole("menuitem", { name: "Change Password" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Change Password" }));
    expect(await screen.findByText("Change Your Password")).toBeInTheDocument();
  });

  it("Logout destroys the session and returns to /login", async () => {
    const logoutSpy = vi.spyOn(api, "logout").mockResolvedValue(undefined);
    // After logout the boot check sees no session.
    vi.spyOn(api, "fetchMe").mockResolvedValue(requesterUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    await screen.findByText("Jennifer Anderson");

    fireEvent.click(screen.getByRole("button", { name: /profile for/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Sign in to your account")
    ).toBeInTheDocument();
  });

  it("redirects unauthenticated direct access to a protected route to /login", async () => {
    vi.spyOn(api, "fetchMe").mockRejectedValue(
      new api.ApiError("Not authenticated.", "UNAUTHORIZED")
    );
    render(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
  });
});

describe("auth api client", () => {
  const okJson = (body: unknown) =>
    ({
      ok: true,
      status: 200,
      json: async () => body,
    }) as unknown as Response;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("login POSTs credentials as JSON with cookies included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data: requesterUser }));
    vi.stubGlobal("fetch", fetchMock);

    const user = await api.login("J@toktickit.dev", "Secret1!");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/login"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ email: "J@toktickit.dev", password: "Secret1!" });
    expect(user).toEqual(requesterUser);
  });

  it("logout POSTs with cookies included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await api.logout();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/logout"),
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });

  it("fetchMe GETs the current user with cookies included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data: requesterUser }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await api.fetchMe()).toEqual(requesterUser);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/me"),
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("changePassword POSTs all three fields with cookies included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await api.changePassword({
      currentPassword: "TempPass123!",
      newPassword: "NewSecure123!",
      confirmPassword: "NewSecure123!",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/change-password"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      currentPassword: "TempPass123!",
      newPassword: "NewSecure123!",
      confirmPassword: "NewSecure123!",
    });
  });

  it("lab-2 ticket/attachment APIs send the session cookie (Issue 17 fix)", async () => {
    // Regression pin: every one of these used to omit `credentials`, so the
    // server would see them as unauthenticated once Issue 18 enforces
    // requireAuth. Traceability: specification.md FR-12, BR-03.
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.fetchCategories();
    await api.fetchRelatedSystems();
    await api.fetchTickets({});
    await api.fetchTicket(1);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const call of fetchMock.mock.calls) {
      expect(call[1] ?? {}).toEqual(
        expect.objectContaining({ credentials: "include" })
      );
    }
  });
});

describe("role-aware routing and shell (FR-10, ui-spec.md section 4.1)", () => {
  const staffUser: api.User = {
    id: 5,
    name: "Michael Brown",
    email: "michael.brown@toktickit.dev",
    role: "IT_STAFF",
    mustChangePassword: false,
  };
  const adminUser: api.User = {
    id: 10,
    name: "John Smith",
    email: "john.smith@toktickit.dev",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderAuthedAs(user: api.User, initialEntries: string[]) {
    vi.spyOn(api, "fetchMe").mockResolvedValue(user);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    // Staff/Admin homes land on the staff queue (Issue 19) — fetch must resolve.
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it("sends a signed-in user visiting /login into the app (RequireAnonymous)", async () => {
    renderAuthedAs(requesterUser, ["/login"]);
    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.queryByText("Sign in to your account")).not.toBeInTheDocument();
  });

  it("lands IT Staff on My Queue (staff queue home, ui-spec 4.1)", async () => {
    renderAuthedAs(staffUser, ["/"]);
    // StaffTicketQueue page heading — the "My Queue" nav link alone would
    // also match, so target the heading role.
    expect(
      await screen.findByRole("heading", { name: "My Queue" })
    ).toBeInTheDocument();
    // Role badge + name in the profile button; requester-only link hidden.
    // (Name also appears in the queue's own headers, so assert the profile
    // button by its accessible name instead of bare text.)
    expect(
      screen.getByRole("button", { name: /profile for michael brown/i })
    ).toBeInTheDocument();
    expect(screen.getByText("IT Staff")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
  });

  it("bounces IT Staff away from the requester-only /my-tickets", async () => {
    renderAuthedAs(staffUser, ["/my-tickets"]);
    expect(
      await screen.findByRole("heading", { name: "My Queue" })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-table-desktop")).not.toBeInTheDocument();
  });

  it("lands Administrators on My Queue with the Administrator badge", async () => {
    renderAuthedAs(adminUser, ["/"]);
    expect(
      await screen.findByRole("heading", { name: "My Queue" })
    ).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
  });

  it("closes the profile menu on Escape", async () => {
    renderAuthedAs(requesterUser, ["/"]);
    await screen.findByText("Jennifer Anderson");

    fireEvent.click(screen.getByRole("button", { name: /profile for/i }));
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Logout" })).not.toBeInTheDocument();
    });
  });

  it("closes the profile menu on an outside click", async () => {
    renderAuthedAs(requesterUser, ["/"]);
    await screen.findByText("Jennifer Anderson");

    fireEvent.click(screen.getByRole("button", { name: /profile for/i }));
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Logout" })).not.toBeInTheDocument();
    });
  });

  it("still returns to /login when the logout request itself fails", async () => {
    vi.spyOn(api, "logout").mockRejectedValue(new Error("network down"));
    renderAuthedAs(requesterUser, ["/"]);
    await screen.findByText("Jennifer Anderson");

    fireEvent.click(screen.getByRole("button", { name: /profile for/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    // Local state is cleared regardless, so the guards bounce to /login.
    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
  });
});
