import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequesterProvider } from "../../src/RequesterContext.js";
import App from "../../src/App.js";

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <RequesterProvider>{ui}</RequesterProvider>
    </MemoryRouter>
  );
}

describe("App — Requester context routing", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows RequesterSelection when no requester is stored", () => {
    renderWithProvider(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    expect(screen.getByText(/testing mechanism/)).toBeInTheDocument();
  });

  it("shows AppShell when a requester is stored in localStorage", () => {
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" })
    );

    renderWithProvider(<App />);
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getAllByText("My Tickets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Create Ticket").length).toBeGreaterThan(0);
  });

  it("redirects to selection when Change Requester is clicked", async () => {
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" })
    );

    renderWithProvider(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Change Requester" }));

    await waitFor(() => {
      expect(screen.getByText(/testing mechanism/)).toBeInTheDocument();
    });
  });
});
