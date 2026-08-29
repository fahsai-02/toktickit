import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterProvider } from "../../src/RequesterContext.js";
import RequesterSelection from "../../src/RequesterSelection.js";
import * as api from "../../src/api.js";

function renderWithProvider(ui: React.ReactElement) {
  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

const mockRequesters: api.Requester[] = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer@toktickit.dev", department: "Marketing" },
  { id: 2, name: "David Lee", email: "david@toktickit.dev", department: "Finance" },
];

describe("RequesterSelection", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    vi.spyOn(api, "fetchRequesters").mockReturnValue(new Promise(() => {}));
    renderWithProvider(<RequesterSelection />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("shows empty state when no active requesters", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);
    renderWithProvider(<RequesterSelection />);
    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
  });

  it("shows error state when API fails", async () => {
    vi.spyOn(api, "fetchRequesters").mockRejectedValue(new Error("fail"));
    renderWithProvider(<RequesterSelection />);
    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText(/Failed to load requesters/i)).toBeInTheDocument();
  });

  it("renders dropdown with requesters on success", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    renderWithProvider(<RequesterSelection />);

    await waitFor(() => {
      expect(screen.getByTestId("requester-select")).toBeInTheDocument();
    });

    expect(screen.getByText(/Jennifer Anderson/)).toBeInTheDocument();
    expect(screen.getByText(/David Lee/)).toBeInTheDocument();
  });

  it("disables Continue until a requester is selected", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    renderWithProvider(<RequesterSelection />);

    await waitFor(() => {
      expect(screen.getByTestId("requester-select")).toBeInTheDocument();
    });

    expect(screen.getByTestId("continue-button")).toBeDisabled();

    fireEvent.change(screen.getByTestId("requester-select"), {
      target: { value: "1" },
    });

    expect(screen.getByTestId("continue-button")).toBeEnabled();
  });

  it("shows explanatory text about testing mechanism", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    renderWithProvider(<RequesterSelection />);

    expect(
      await screen.findByText(/testing mechanism/)
    ).toBeInTheDocument();
  });
});
