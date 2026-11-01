import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import CreateTicket from "../../src/CreateTicket.js";
import * as api from "../../src/api.js";

// Issue 30 (#83) polish finding F1.
// Spec anchors: ui-spec.md (Lab 4) section 4.2 — `/tickets/:ticketId` is
// Requester-only and `/staff/tickets/:ticketId` is IT Staff / Administrator;
// section 4.1 — Create Ticket is shown to every role; Lab 2 ui-spec.md
// ("Success state") — buttons "View ticket" and "Go to ... Tickets".
// A Requester-only destination bounces staff to their dashboard, so the success
// buttons must follow the signed-in role. The Requester wording and test ids are
// unchanged (client/tests/lab-02/CreateTicket.test.tsx still covers them).

function user(role: api.UserRole): api.User {
  return {
    id: 9,
    name: "Test Person",
    email: "person@example.test",
    role,
    mustChangePassword: false,
  };
}

const createdTicket: api.Ticket = {
  id: 321,
  ticketNumber: "TKT-2026-000321",
  summary: "Laptop battery drains quickly",
  description: "Battery drains within two hours.",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  ticketDate: "2026-08-29T10:00:00.000Z",
  requester: { id: 9, name: "Test Person" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
};

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

async function createAs(role: api.UserRole) {
  vi.spyOn(api, "fetchMe").mockResolvedValue(user(role));
  vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 2, name: "Hardware" }]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
    { id: 7, name: "Corporate Laptop", categoryId: 2 },
  ]);
  vi.spyOn(api, "createTicket").mockResolvedValue(createdTicket);

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/create-ticket"]}>
        <Routes>
          <Route path="/create-ticket" element={<CreateTicket />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
  await screen.findByTestId("category");
  fireEvent.change(screen.getByTestId("category"), { target: { value: "2" } });
  fireEvent.change(screen.getByTestId("relatedSystem"), { target: { value: "7" } });
  fireEvent.change(screen.getByTestId("priority"), { target: { value: "MEDIUM" } });
  fireEvent.change(screen.getByTestId("summary"), {
    target: { value: "Laptop battery drains quickly" },
  });
  fireEvent.change(screen.getByTestId("description"), {
    target: { value: "Battery drains within two hours." },
  });
  fireEvent.click(screen.getByTestId("submit-ticket"));
  await screen.findByText(/Ticket created: TKT-2026-000321/);
}

// REG-03 — docs/lab-04/tests.md section 2 (Migration / Regression); ui-spec.md
// section 4.1 (role-based navigation) and AC-17. Create Ticket is open to every
// role (docs/lab-03/ui-spec.md role table), so its success buttons must not send
// IT Staff or Administrators to Requester-only routes.
describe("CreateTicket success buttons follow the signed-in role (Issue 30, F1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<api.UserRole>(["IT_STAFF", "ADMINISTRATOR"])(
    "%s: View ticket opens the staff ticket detail",
    async (role) => {
      await createAs(role);
      fireEvent.click(screen.getByText("View ticket"));
      expect(await screen.findByTestId("where")).toHaveTextContent("/staff/tickets/321");
    }
  );

  it.each<api.UserRole>(["IT_STAFF", "ADMINISTRATOR"])(
    "%s: the second button goes to the staff queue, not My Tickets",
    async (role) => {
      await createAs(role);
      expect(screen.queryByTestId("go-to-my-tickets")).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId("go-to-my-queue"));
      expect(await screen.findByTestId("where")).toHaveTextContent("/staff/queue");
    }
  );

  it("REQUESTER: buttons keep their original destinations", async () => {
    await createAs("REQUESTER");
    expect(screen.queryByTestId("go-to-my-queue")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("View ticket"));
    expect(await screen.findByTestId("where")).toHaveTextContent("/tickets/321");
  });

  it("REQUESTER: Go to My Tickets still opens /my-tickets", async () => {
    await createAs("REQUESTER");
    fireEvent.click(screen.getByTestId("go-to-my-tickets"));
    expect(await screen.findByTestId("where")).toHaveTextContent("/my-tickets");
  });
});
