import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const authUser: api.User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: false,
};

function renderWithProvider(ui: React.ReactElement, initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe("App — authenticated routing (Issue 17)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the Login screen when no session exists", async () => {
    vi.spyOn(api, "fetchMe").mockRejectedValue(
      new api.ApiError("Not authenticated.", "UNAUTHORIZED")
    );
    renderWithProvider(<App />);
    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeInTheDocument();
  });

  it("shows AppShell with the user name when a session exists", async () => {
    vi.spyOn(api, "fetchMe").mockResolvedValue(authUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    renderWithProvider(<App />);
    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getAllByText("My Tickets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Create Ticket").length).toBeGreaterThan(0);
  });

  it("redirects the removed /select-requester route into the app", async () => {
    vi.spyOn(api, "fetchMe").mockRejectedValue(
      new api.ApiError("Not authenticated.", "UNAUTHORIZED")
    );
    renderWithProvider(<App />, ["/select-requester"]);
    // Unknown/removed routes fall back to the role default — unauthenticated
    // users land on the login screen.
    expect(await screen.findByText("Sign in to your account")).toBeInTheDocument();
  });
});
