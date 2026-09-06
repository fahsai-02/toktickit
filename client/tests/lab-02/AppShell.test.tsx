import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequesterProvider } from "../../src/RequesterContext.js";
import AppShell from "../../src/AppShell.js";

function renderWithProvider(ui: React.ReactElement) {
  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

describe("AppShell", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders brand name in header", () => {
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" })
    );

    renderWithProvider(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/my-tickets" element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
  });

  it("shows the selected requester name", () => {
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" })
    );

    renderWithProvider(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/my-tickets" element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
  });

  it("highlights the active nav link", () => {
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" })
    );

    renderWithProvider(
      <MemoryRouter initialEntries={["/create-ticket"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/create-ticket" element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const createBtn = screen.getByText("Create Ticket");
    expect(createBtn.className).toContain("nav-link--active");
  });

  it("navigates when a nav link is clicked", () => {
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" })
    );

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

    fireEvent.click(screen.getByText("Create Ticket"));
    expect(screen.getByText("create ticket page")).toBeInTheDocument();
  });

  it("renders children content", () => {
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" })
    );

    renderWithProvider(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/my-tickets" element={<div>child content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
