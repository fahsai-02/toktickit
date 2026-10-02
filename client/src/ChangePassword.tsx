import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.js";
import { changePassword as apiChangePassword, ApiError } from "./api.js";
import TextField from "./components/TextField.js";
import Button from "./components/Button.js";
import Callout from "./components/Callout.js";
import PasswordChecklist, {
  checkPasswordRules,
  allPasswordRulesMet,
} from "./components/PasswordChecklist.js";

export default function ChangePassword() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  const rules = checkPasswordRules(newPassword);
  const rulesMet = allPasswordRulesMet(rules);
  const confirmMatches =
    confirmPassword.length > 0 && confirmPassword === newPassword;
  const canSubmit =
    currentPassword.length > 0 && rulesMet && confirmMatches && !busy;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setBanner("");
    setFieldErrors({});
    try {
      await apiChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      // mustChangePassword is now false server-side — re-read /me so the
      // route guards let the user into the app.
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors({
          currentPassword: err.fields.currentPassword,
          newPassword: err.fields.newPassword,
          confirmPassword: err.fields.confirmPassword,
        });
        if (!err.fields.currentPassword && !err.fields.newPassword && !err.fields.confirmPassword) {
          setBanner(err.message);
        }
      } else if (err instanceof ApiError) {
        setBanner(err.message);
      } else {
        setBanner("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  // ui-spec 5.2: Cancel is only for a VOLUNTARY visit (mustChangePassword
  // already false). Under BR-02 a forced-change user must not be able to
  // leave the flow, so the button stays hidden there.
  const isVoluntary = user != null && !user.mustChangePassword;

  return (
    <div className="selection-page">
      <div className="selection-card">
        <h1 className="selection-title">Change Your Password</h1>
        <p className="selection-subtitle">
          {isVoluntary
            ? "Choose a new password for your account."
            : "You must change your password to continue."}
        </p>

        {banner && (
          <Callout variant="error" data-testid="change-password-error">
            {banner}
          </Callout>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <TextField
            id="change-current"
            label="Current (temporary) password"
            required
            type={showPasswords ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={fieldErrors.currentPassword}
          />

          <TextField
            id="change-new"
            label="New password"
            required
            type={showPasswords ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={fieldErrors.newPassword}
          />
          <PasswordChecklist password={newPassword} />

          <TextField
            id="change-confirm"
            label="Confirm new password"
            required
            type={showPasswords ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={
              fieldErrors.confirmPassword ??
              (confirmPassword && !confirmMatches
                ? "Passwords do not match."
                : undefined)
            }
          />

          <label className="show-passwords">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />{" "}
            Show passwords
          </label>

          <Button
            type="submit"
            loading={busy}
            disabled={!canSubmit}
            data-testid="change-password-submit"
            className="auth-submit"
          >
            {busy ? "Changing password…" : "Continue"}
          </Button>

          {isVoluntary && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => navigate("/")}
              data-testid="change-password-cancel"
              className="auth-cancel"
            >
              Cancel
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
