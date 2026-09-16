import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/AuthContext.js";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// Traceability: tests.md UI-04..UI-06 (AC-02, FR-07).

const freshUser: api.User = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.dev",
  role: "REQUESTER",
  mustChangePassword: true,
};

const changedUser: api.User = { ...freshUser, mustChangePassword: false };

function renderChangePassword() {
  render(
    <MemoryRouter initialEntries={["/change-password"]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

function fillPasswords(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText(/current.*password/i), {
    target: { value: current },
  });
  fireEvent.change(screen.getByLabelText(/^new password/i), {
    target: { value: next },
  });
  fireEvent.change(screen.getByLabelText(/confirm new password/i), {
    target: { value: confirm },
  });
}

describe("ChangePassword", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchMe").mockResolvedValue(freshUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-04: renders the 3-rule checklist and checks items off live", async () => {
    renderChangePassword();
    await screen.findByText("Change Your Password");

    const length = screen.getByTestId("password-rule-minLength");
    const cases = screen.getByTestId("password-rule-upperAndLower");
    const complex = screen.getByTestId("password-rule-numberAndSpecial");
    expect(length).toHaveAttribute("data-met", "false");
    expect(cases).toHaveAttribute("data-met", "false");
    expect(complex).toHaveAttribute("data-met", "false");

    // 8+ chars only: length checks off, the other two stay off.
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "abcdefgh" },
    });
    expect(length).toHaveAttribute("data-met", "true");
    expect(cases).toHaveAttribute("data-met", "false");
    expect(complex).toHaveAttribute("data-met", "false");

    // Fully valid password: all three check off.
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "NewSecure123!" },
    });
    expect(length).toHaveAttribute("data-met", "true");
    expect(cases).toHaveAttribute("data-met", "true");
    expect(complex).toHaveAttribute("data-met", "true");
  });

  it("UI-05: enables Continue when valid, submits, and enters the app", async () => {
    const changeSpy = vi.spyOn(api, "changePassword").mockResolvedValue(undefined);
    // After the change the server clears mustChangePassword — refresh() sees it.
    vi.spyOn(api, "fetchMe")
      .mockResolvedValueOnce(freshUser)
      .mockResolvedValue(changedUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });
    renderChangePassword();
    await screen.findByText("Change Your Password");

    const submit = screen.getByTestId("change-password-submit");
    expect(submit).toBeDisabled();

    fillPasswords("TempPass123!", "NewSecure123!", "NewSecure123!");
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    expect(changeSpy).toHaveBeenCalledWith({
      currentPassword: "TempPass123!",
      newPassword: "NewSecure123!",
      confirmPassword: "NewSecure123!",
    });
    // Landed inside the authenticated shell.
    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  });

  it("UI-06: shows a mismatch message and keeps Continue disabled", async () => {
    const changeSpy = vi.spyOn(api, "changePassword").mockResolvedValue(undefined);
    renderChangePassword();
    await screen.findByText("Change Your Password");

    fillPasswords("TempPass123!", "NewSecure123!", "Different123!");
    expect(
      await screen.findByText("Passwords do not match.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("change-password-submit")).toBeDisabled();
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it("UI-06: keeps Continue disabled until every rule is met", async () => {
    renderChangePassword();
    await screen.findByText("Change Your Password");

    // Too short — length rule fails even though the other rules pass.
    fillPasswords("TempPass123!", "Ab1!", "Ab1!");
    expect(screen.getByTestId("password-rule-minLength")).toHaveAttribute(
      "data-met",
      "false"
    );
    expect(screen.getByTestId("change-password-submit")).toBeDisabled();
  });

  it("surfaces a wrong-current-password error under its own field", async () => {
    vi.spyOn(api, "changePassword").mockRejectedValue(
      new api.ApiError("Password change failed.", "VALIDATION_ERROR", {
        currentPassword: "Current password is incorrect.",
      })
    );
    renderChangePassword();
    await screen.findByText("Change Your Password");

    fillPasswords("WrongCurrent1!", "NewSecure123!", "NewSecure123!");
    fireEvent.click(screen.getByTestId("change-password-submit"));

    expect(
      await screen.findByText("Current password is incorrect.")
    ).toBeInTheDocument();
    // Still on the change-password screen — the app stays blocked.
    expect(screen.getByText("Change Your Password")).toBeInTheDocument();
  });

  it("treats a trailing space as NOT a special character (backend parity)", async () => {
    // Backend rule is /[^A-Za-z0-9\s]/ (server/src/lib/passwordValidation.ts):
    // whitespace never counts. The checklist must agree, otherwise Continue
    // enables and the server rejects on submit.
    renderChangePassword();
    await screen.findByText("Change Your Password");

    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "Abcdefg1 " },
    });
    expect(screen.getByTestId("password-rule-numberAndSpecial")).toHaveAttribute(
      "data-met",
      "false"
    );
    expect(screen.getByTestId("change-password-submit")).toBeDisabled();
  });

  it("lets a signed-in user with mustChangePassword=false open the page voluntarily", async () => {
    // Issue 17 AC: "Change Password" in the profile menu works at any time,
    // not only on forced change (specification.md FR-08).
    vi.spyOn(api, "fetchMe").mockResolvedValue(changedUser);
    renderChangePassword();
    expect(await screen.findByText("Change Your Password")).toBeInTheDocument();
  });

  it("surfaces a server-side newPassword rejection under its own field", async () => {
    // Contract test for the server-error → field mapping: the password below
    // passes every client rule, so the submit really fires; the (mocked)
    // server still rejects and its field message must land under the New
    // password field while the user stays on the page to retry.
    // Traceability: api-spec.md section 2.4.
    const changeSpy = vi.spyOn(api, "changePassword").mockRejectedValue(
      new api.ApiError("Password change failed.", "VALIDATION_ERROR", {
        newPassword: "Password must include at least one special character.",
      })
    );
    renderChangePassword();
    await screen.findByText("Change Your Password");

    fillPasswords("TempPass123!", "NewSecure123!", "NewSecure123!");
    fireEvent.click(screen.getByTestId("change-password-submit"));

    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("Password must include at least one special character.")
    ).toBeInTheDocument();
    expect(screen.getByText("Change Your Password")).toBeInTheDocument();
  });

  it("blocks direct access to app routes while mustChangePassword is true", async () => {
    render(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    // RequireAuth bounces the user to /change-password.
    expect(await screen.findByText("Change Your Password")).toBeInTheDocument();
  });
});
