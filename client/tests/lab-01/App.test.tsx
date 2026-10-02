import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe("App — Lab 1 legacy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockRejectedValue(
      new api.ApiError("Not authenticated.", "UNAUTHORIZED")
    );
  });

  it("renders the TokTickIT heading", async () => {
    renderWithProvider(<App />);
    expect(await screen.findByText(/TokTickIT/i)).toBeInTheDocument();
  });
});
