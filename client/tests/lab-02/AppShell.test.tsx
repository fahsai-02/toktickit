import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import AppShell from "../../src/AppShell.js";
import * as api from "../../src/api.js";

const authUser: api.User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: false,
};

function renderWithProvider(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Auth identity now comes from GET /api/auth/me (Lab 3) instead of
    // localStorage (removed Dev Requester selector, Issue 17).
    vi.spyOn(api, "fetchMe").mockResolvedValue(authUser);
  });

  it("renders brand name in header", async () => {
    renderWithProvider(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/my-tickets" element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Wait for the AuthProvider's async GET /api/auth/me to settle so its
    // setState happens inside act() — otherwise React logs an act warning.
    await screen.findByText("Jennifer Anderson");
    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
  });

  it("shows the authenticated user name", async () => {
    renderWithProvider(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/my-tickets" element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  });

  it("highlights the active nav link", async () => {
    renderWithProvider(
      <MemoryRouter initialEntries={["/create-ticket"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/create-ticket" element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Jennifer Anderson");
    const createBtn = screen.getByText("Create Ticket");
    expect(createBtn).toHaveAttribute("aria-current", "page");
    const myTicketsBtn = screen.getByText("My Tickets");
    expect(myTicketsBtn).not.toHaveAttribute("aria-current", "page");
  });

  it("navigates when a nav link is clicked", async () => {
    renderWithProvider(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/my-tickets" element={<div>my tickets page</div>} />
            <Route path="/create-ticket" element={<div>create ticket page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Jennifer Anderson");
    fireEvent.click(screen.getByText("Create Ticket"));
    expect(screen.getByText("create ticket page")).toBeInTheDocument();
  });

  it("renders children content", async () => {
    renderWithProvider(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/my-tickets" element={<div>child content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Same act() reason as above: let the async auth check settle first.
    await screen.findByText("Jennifer Anderson");
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
