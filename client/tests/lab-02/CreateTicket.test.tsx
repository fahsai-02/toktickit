import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequesterProvider } from "../../src/RequesterContext.js";
import CreateTicket from "../../src/CreateTicket.js";
import * as api from "../../src/api.js";

const requester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  department: "Marketing",
};

const categories: api.Category[] = [
  { id: 2, name: "Hardware" },
  { id: 4, name: "Network" },
];

const allSystems: api.RelatedSystem[] = [
  { id: 7, name: "Corporate Laptop", categoryId: 2 },
  { id: 2, name: "Campus Wi-Fi", categoryId: 4 },
  { id: 1, name: "Email", categoryId: null },
];

function createFile(name: string, type: string, size: number, lastModified = 0): File {
  return new File([new ArrayBuffer(size)], name, { type, lastModified });
}

async function renderTicket() {
  render(
    <RequesterProvider>
      <MemoryRouter initialEntries={["/create-ticket"]}>
        <CreateTicket />
      </MemoryRouter>
    </RequesterProvider>
  );
  await screen.findByTestId("category");
}

function selectField(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByTestId("submit-ticket"));
}

const validTicket: api.Ticket = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "Laptop battery drains quickly",
  description: "Battery drains within two hours.",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  ticketDate: "2026-08-29T10:00:00.000Z",
  requester: { id: 1, name: "Jennifer Anderson" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop", categoryId: 2 },
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
};

function fillValidForm() {
  selectField("category", "2");
  selectField("relatedSystem", "7");
  selectField("priority", "MEDIUM");
  fireEvent.change(screen.getByTestId("summary"), {
    target: { value: "Laptop battery drains quickly" },
  });
  fireEvent.change(screen.getByTestId("description"), {
    target: { value: "Battery drains within two hours." },
  });
}

describe("CreateTicket", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "toktickit-requester",
      JSON.stringify(requester)
    );
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue(categories);
    vi.spyOn(api, "fetchRelatedSystems").mockImplementation(
      async (categoryId?: number) =>
        categoryId === undefined
          ? allSystems
          : allSystems.filter(
              (s) => s.categoryId === categoryId || s.categoryId === null
            )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an inline requirement error and does not call the API when fields are missing (UI-01)", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue(validTicket);
    await renderTicket();

    submit();

    expect(
      await screen.findByText("Summary is required (1-120 characters).")
    ).toBeInTheDocument();
    expect(api.createTicket).not.toHaveBeenCalled();
  });

  it("updates the live character counter and rejects an over-long summary (UI-02)", async () => {
    await renderTicket();

    fireEvent.change(screen.getByTestId("summary"), {
      target: { value: "Hello" },
    });
    expect(screen.getByTestId("field-counter-summary")).toHaveTextContent(
      "5/120"
    );

    fireEvent.change(screen.getByTestId("description"), {
      target: { value: "abc" },
    });
    expect(screen.getByTestId("field-counter-description")).toHaveTextContent(
      "3/2000"
    );

    fireEvent.change(screen.getByTestId("summary"), {
      target: { value: "a".repeat(121) },
    });
    fillValidForm();
    screen
      .getByTestId("summary")
      .setAttribute("value", "a".repeat(121));
    fireEvent.change(screen.getByTestId("summary"), {
      target: { value: "a".repeat(121) },
    });
    submit();

    expect(
      await screen.findByText("Summary is required (1-120 characters).")
    ).toBeInTheDocument();
  });

  it("disables the button and shows a busy state while submitting (UI-03)", async () => {
    vi.spyOn(api, "createTicket").mockReturnValue(new Promise(() => {}));
    await renderTicket();

    fillValidForm();
    submit();

    expect(screen.getByTestId("submit-ticket")).toBeDisabled();
    expect(document.querySelector(".spinner")).toBeInTheDocument();
  });

  it("shows an error callout and keeps typed values on failure without redirect (UI-04)", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new api.ApiError("Could not save your ticket", "INTERNAL_ERROR")
    );
    await renderTicket();

    fillValidForm();
    submit();

    expect(await screen.findByTestId("submit-error")).toBeInTheDocument();
    expect(
      screen.getByTestId("summary")
    ).toHaveValue("Laptop battery drains quickly");
    expect(screen.getByTestId("description")).toHaveValue(
      "Battery drains within two hours."
    );
    expect(screen.queryByTestId("go-to-my-tickets")).not.toBeInTheDocument();
  });

  it("shows a success panel with the official ticket number (UI-05)", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue(validTicket);
    await renderTicket();

    fillValidForm();
    submit();

    expect(
      await screen.findByText(/Ticket created — TKT-2026-000012/)
    ).toBeInTheDocument();
    expect(screen.getByTestId("go-to-my-tickets")).toBeInTheDocument();
  });

  it("stages valid files and rejects disallowed or oversized files immediately (UI-06)", async () => {
    await renderTicket();

    const input = screen.getByTestId("file-input");
    const goodPdf = createFile("report.pdf", "application/pdf", 2048);
    const badType = createFile("virus.exe", "application/octet-stream", 1024);
    const oversized = createFile("big.png", "image/png", 6 * 1024 * 1024);

    fireEvent.change(input, {
      target: { files: [goodPdf, badType, oversized] },
    });

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/virus\.exe: only JPG, PNG, WEBP, or PDF/)).toBeInTheDocument();
    expect(screen.getByText(/big\.png: file exceeds 5 MB/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove report.pdf" }));
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("reloads the related-system options when the category changes (UI-07)", async () => {
    await renderTicket();

    selectField("category", "4");

    await waitFor(() => {
      expect(screen.getByTestId("relatedSystem")).toContainElement(
        screen.getByRole("option", { name: "Campus Wi-Fi" })
      );
    });
    const selectedSystem = screen.getByTestId("relatedSystem") as HTMLSelectElement;
    expect(Array.from(selectedSystem.options).map((o) => o.textContent)).toEqual(
      ["— Select system —", "Campus Wi-Fi", "Email"]
    );
  });
});
