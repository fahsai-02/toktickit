import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { validateNewPassword } from "../lib/passwordValidation.js";
import { BCRYPT_ROUNDS } from "../lib/seedCredentials.js";
import { sendError, validationError } from "../lib/httpErrors.js";
import { requireAuth } from "../middleware/auth.js";

// Authentication routes (Issue 16). Contract: `docs/lab-03/api-spec.md` section 2.
// Safe errors: an unknown email, a wrong password, and an inactive account all
// produce the SAME 401 so the response never reveals account existence
// (`docs/lab-03/specification.md` AC-05, AC-06, BR-01). The dummy bcrypt hash
// keeps the password-compare cost similar across all three cases.

const LOGIN_FAILED_MESSAGE = "Invalid email or password. Please try again.";

const router: Router = Router();

// Precomputed at boot so the very first login can't be the slow one and the
// cost always matches BCRYPT_ROUNDS. Compared against when the email does not
// match any account so unknown-email vs wrong-password timing is ~equal.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/login", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const fields: Record<string, string> = {};

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !EMAIL_RE.test(email)) {
    fields.email = "A valid email address is required.";
  }
  if (!password) {
    fields.password = "Password is required.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordHash: true,
      },
    });

    // Same comparison for all three failure cases (unknown account / wrong
    // password / inactive account) so the response is indistinguishable.
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH
    );

    if (!user || !passwordMatches || !user.isActive) {
      sendError(res, 401, "UNAUTHORIZED", LOGIN_FAILED_MESSAGE);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      req.session.userId = user.id;
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch (err) {
    console.error("Login failed:", err);
    sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout failed:", err);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to log out");
      return;
    }
    res.json({ data: { message: "Logged out successfully" } });
  });
});

router.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({ data: req.user });
});

router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const fields: Record<string, string> = {};

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword) {
    fields.currentPassword = "Current password is required.";
  }
  const passwordResult = validateNewPassword(newPassword);
  if (!passwordResult.valid) {
    fields.newPassword = passwordResult.fieldMessage;
  }
  if (!confirmPassword) {
    fields.confirmPassword = "Please confirm your new password.";
  } else if (newPassword !== confirmPassword) {
    fields.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: req.user!.id },
      select: { passwordHash: true },
    });
    if (!user) {
      sendError(
        res,
        401,
        "UNAUTHORIZED",
        "You must be logged in to access this resource."
      );
      return;
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      validationError(res, { currentPassword: "Current password is incorrect." });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    res.json({ data: { message: "Password changed successfully" } });
  } catch (err) {
    console.error("Change password failed:", err);
    sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
});

export default router;