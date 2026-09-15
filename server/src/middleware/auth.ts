import type { NextFunction, Request, Response } from "express";
import { db } from "../db.js";
import { sendError } from "../lib/httpErrors.js";
import type { UserRole } from "../generated/prisma/client.js";

// Auth middleware for Lab 3 (Issue 16). `requireAuth` establishes the current
// user from the session and re-reads it from the DB on every request so that a
// deactivated account or changed role takes effect immediately
// (`docs/lab-03/specification.md` FR-11, AC-01; api-spec section 2).

const UNAUTHENTICATED = "You must be logged in to access this resource.";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.session.userId;
  if (userId === undefined) {
    sendError(res, 401, "UNAUTHORIZED", UNAUTHENTICATED);
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 401, "UNAUTHORIZED", UNAUTHENTICATED);
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("requireAuth failed:", err);
    sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
}

export function requireRole(
  ...roles: UserRole[]
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", UNAUTHENTICATED);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to access this resource."
      );
      return;
    }

    next();
  };
}