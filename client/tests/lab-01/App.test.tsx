import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Online when the health check succeeds", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [],
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("unavailable"));

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });

  it("shows the seeded categories returned by the API on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/Supported Request Categories/i)).toBeInTheDocument();
    for (const name of ["Account and Access", "Hardware", "Software", "Network"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});
