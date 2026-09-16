import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.js";
import { ApiError } from "./api.js";
import TextField from "./components/TextField.js";
import Button from "./components/Button.js";
import Callout from "./components/Callout.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    // Client-side validation first — invalid input never hits the API.
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!EMAIL_RE.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (!password) {
      errors.password = "Password is required.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    setBanner("");
    try {
      const signedIn = await login(email.trim(), password);
      navigate(signedIn.mustChangePassword ? "/change-password" : "/", {
        replace: true,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // Safe generic message from the server — never reveals whether
        // the email exists (specification.md BR-01 / FR-02).
        setBanner(err.message);
      } else {
        setBanner("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="selection-page">
      <div className="selection-card">
        <h1 className="selection-title">TokTickIT</h1>
        <p className="selection-subtitle">Sign in to your account</p>

        {banner && (
          <Callout variant="error" data-testid="login-error">
            {banner}
          </Callout>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <TextField
            id="login-email"
            label="Email address"
            required
            type="email"
            autoComplete="email"
            placeholder="you@toktickit.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />

          <div className="password-field-wrap">
            <TextField
              id="login-password"
              label="Password"
              required
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <Button
            type="submit"
            loading={busy}
            data-testid="login-submit"
            className="auth-submit"
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="auth-alt">
          {/* Placeholder only — password-reset email is excluded from Lab 3
              (specification.md section 3), so this performs no action. */}
          <button
            type="button"
            className="link-button"
            onClick={() => setShowForgotNote((v) => !v)}
          >
            Forgot your password?
          </button>
        </p>
        {showForgotNote && (
          <Callout variant="info" data-testid="forgot-note">
            Password reset via email is not available. Please contact your
            administrator.
          </Callout>
        )}

      </div>
    </div>
  );
}
