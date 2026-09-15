import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { validateNewPassword } from "../lib/passwordValidation.js";
import { BCRYPT_ROUNDS } from "../lib/seedCredentials.js";
import { requireAuth } from "../middleware/auth.js";

// Authentication routes (Issue 16). Contract: `docs/lab-03/api-spec.md` section 2.
// Safe errors: an unknown email, a wrong password, and an inactive account all
// produce the SAME 401 so the response never reveals account existence
// (`docs/lab-03/specification.md` AC-05, AC-06, BR-01). The dummy bcrypt hash
// keeps the password-compare cost similar across all three cases.

const router: Router = Router();

// Precomputed bcrypt hash (cost 12) of a throwaway string — used only to
// equalize response timing when the email does not match any account.
const DUMMY_PASSWORD_HASH =
  "$2b$12$iZojWxWFm2m6zMmwZxpKYeNH7lyudoZXxUgWm2VKDXES8Oj/p.dJ2";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(
  res: Response,
  fields: Record<string, string>,
  message = "Validation failed"
): void {
  res.status(400).json({
    error: { code: "VALIDATION_ERROR", message, fields },
  });
}

function unauthorized(res: Response): void {
  res.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "Invalid email or password. Please try again.",
    },
  });
}

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
      unauthorized(res);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      req.session.userId = user.id;
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to log out" },
      });
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
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to access this resource.",
        },
      });
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
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export default router;