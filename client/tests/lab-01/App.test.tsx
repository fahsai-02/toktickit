import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("App — Lab 1 legacy", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the TokTickIT heading", () => {
    renderWithProvider(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });
});
