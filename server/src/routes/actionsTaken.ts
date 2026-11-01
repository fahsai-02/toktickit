import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db.js";
import { sendError, validationError } from "../lib/httpErrors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ownerUserIdFor, parsePositiveInt } from "../lib/requestHelpers.js";

// Lab 4 — Action Taken endpoints (docs/lab-04/api-spec.md section 2).
//   GET  /api/tickets/:id/actions   list, any authenticated caller
//   POST /api/tickets/:id/actions   create, IT_STAFF / ADMINISTRATOR
//   PUT  /api/actions/:id [versioned]  edit, IT_STAFF / ADMINISTRATOR
// Append-only guards (DELETE/PATCH/POST on the wrong paths) are registered
// WITHOUT requireAuth so an unauthenticated call still receives 405, matching
// the Lab 3 comment/note guards (api-spec section 2.4).

const router: Router = Router();

const ACTION_DATE_FUTURE_MSG =
  "actionDate cannot be more than 5 minutes in the future.";

const performedBySelect = { performedBy: { select: { id: true, name: true, role: true } } } as const;

function maxBoundsNotFuture(actionDate: Date, now: Date): boolean {
  return actionDate.getTime() <= now.getTime() + 5 * 60 * 1000;
}

// ---------------------------------------------------------------------
// GET /api/tickets/:id/actions
// ---------------------------------------------------------------------
router.get(
  "/tickets/:id/actions",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parsePositiveInt(req.params.id as string);
    if (ticketId === null) {
      validationError(res, { id: "id must be a positive integer." });
      return;
    }

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      sendError(res, 404, "NOT_FOUND", "Ticket not found");
      return;
    }

    if (req.user!.role === "REQUESTER") {
      const ownerId = await ownerUserIdFor(ticket);
      if (ownerId !== req.user!.id) {
        sendError(res, 403, "FORBIDDEN", "You do not have permission to access this resource.");
        return;
      }
    }

    const actions = await db.actionTaken.findMany({
      where: { ticketId },
      include: performedBySelect,
      orderBy: [{ actionDate: "asc" }, { createdAt: "asc" }],
    });
    res.status(200).json({ data: actions, meta: { total: actions.length } });
  },
);

// ---------------------------------------------------------------------
// POST /api/tickets/:id/actions
// ---------------------------------------------------------------------
function validateDescription(
  res: Response,
  description: unknown,
): string | null {
  const text = description === undefined || description === null ? "" : String(description);
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    validationError(res, { description: "description is required and must be non-blank." });
    return null;
  }
  if (trimmed.length > 2000) {
    validationError(res, { description: "description must be at most 2000 characters." });
    return null;
  }
  return trimmed;
}

function validateResult(res: Response, result: unknown): string | null {
  const text = result === undefined || result === null ? "" : String(result);
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    validationError(res, { result: "result is required and must be non-blank." });
    return null;
  }
  if (trimmed.length > 2000) {
    validationError(res, { result: "result must be at most 2000 characters." });
    return null;
  }
  return trimmed;
}

// `followUpRequired` is documented as a boolean (api-spec section 2.1 field
// table). Coercing anything else with `=== true` would silently turn
// `"true"` (a client that serialized the wrong) into `false`, and on PUT that
// would also drop the "note is required" gate of FR-05/BR-04 without telling
// anyone. Non-boolean values are rejected like any other malformed input.
// An omitted key is still legal: create defaults to `false`, PUT keeps the
// stored value (api-spec section 2.3).
function validateFollowUpRequired(
  res: Response,
  value: unknown,
): { ok: true; value: boolean | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== "boolean") {
    validationError(res, { followUpRequired: "followUpRequired must be a boolean." });
    return { ok: false };
  }
  return { ok: true, value };
}

function validateLongText(
  res: Response,
  field: "followUpNote" | "attachmentNotes",
  value: unknown,
): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }
  const text = String(value);
  if (text.length > 2000) {
    validationError(res, { [field]: `${field} must be at most 2000 characters.` });
    return { ok: false };
  }
  // FR-05 (tests.md API-10): the note is stored exactly as submitted — never
  // silently trimmed or discarded. Only the blank check below trims.
  return { ok: true, value: text };
}

router.post(
  "/tickets/:id/actions",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parsePositiveInt(req.params.id as string);
    if (ticketId === null) {
      validationError(res, { id: "id must be a positive integer." });
      return;
    }

    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      sendError(res, 404, "NOT_FOUND", "Ticket not found");
      return;
    }

    const body = req.body ?? {};

    const description = validateDescription(res, body.description);
    if (description === null) return;
    const result = validateResult(res, body.result);
    if (result === null) return;

    const followUpFlag = validateFollowUpRequired(res, body.followUpRequired);
    if (!followUpFlag.ok) return;
    const followUpRequired = followUpFlag.value === true;
    const followUpCheck = validateLongText(res, "followUpNote", body.followUpNote ?? null);
    if (!followUpCheck.ok) return;
    if (
      followUpRequired &&
      (followUpCheck.value === null || followUpCheck.value.trim().length === 0)
    ) {
      validationError(
        res,
        { followUpNote: "followUpNote is required when followUpRequired is true." },
        "Validation failed",
      );
      return;
    }

    const attachmentCheck = validateLongText(res, "attachmentNotes", body.attachmentNotes ?? null);
    if (!attachmentCheck.ok) return;

    let actionDate = new Date();
    if (body.actionDate !== undefined && body.actionDate !== null) {
      actionDate = new Date(String(body.actionDate));
      if (isNaN(actionDate.getTime())) {
        validationError(res, { actionDate: "actionDate must be a valid ISO 8601 timestamp." });
        return;
      }
      if (!maxBoundsNotFuture(actionDate, new Date())) {
        validationError(res, { actionDate: ACTION_DATE_FUTURE_MSG });
        return;
      }
    }

    // AD-05: no idempotency / dedupe on the server. A deliberately repeated
    // body creates a second record — that is documented behavior.
    const action = await db.actionTaken.create({
      data: {
        ticketId,
        performedById: req.user!.id,
        actionDate,
        description,
        result,
        followUpRequired,
        followUpNote: followUpCheck.value,
        attachmentNotes: attachmentCheck.value,
      },
      include: performedBySelect,
    });
    res.status(201).json({ data: action });
  },
);

// ---------------------------------------------------------------------
// PUT /api/actions/:id  [versioned]
// ---------------------------------------------------------------------
router.put(
  "/actions/:id",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const id = parsePositiveInt(req.params.id as string);
    if (id === null) {
      validationError(res, { id: "id must be a positive integer." });
      return;
    }

    const existing = await db.actionTaken.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "ActionTaken not found");
      return;
    }

    const body = req.body ?? {};
    const version = Number.isInteger(body.version) ? (body.version as number) : NaN;
    if (body.version === undefined || body.version === null || !Number.isInteger(body.version)) {
      validationError(res, { version: "version is required and must be an integer." });
      return;
    }
    if (version !== existing.version) {
      const latest = await db.actionTaken.findUnique({
        where: { id },
        include: performedBySelect,
      });
      res.status(409).json({
        error: { code: "CONFLICT", message: "This Action Taken was updated by someone else. Refresh to load the latest version." },
        data: latest,
      });
      return;
    }

    const description = validateDescription(res, body.description);
    if (description === null) return;
    const result = validateResult(res, body.result);
    if (result === null) return;

    const followUpFlag = validateFollowUpRequired(res, body.followUpRequired);
    if (!followUpFlag.ok) return;
    const followUpRequired =
      followUpFlag.value === undefined ? existing.followUpRequired : followUpFlag.value;
    const followUpInput =
      body.followUpNote === undefined ? existing.followUpNote : body.followUpNote;
    const followUpCheck = validateLongText(res, "followUpNote", followUpInput);
    if (!followUpCheck.ok) return;
    if (
      followUpRequired &&
      (followUpCheck.value === null || followUpCheck.value.trim().length === 0)
    ) {
      validationError(
        res,
        { followUpNote: "followUpNote is required when followUpRequired is true." },
        "Validation failed",
      );
      return;
    }

    const attachmentInput =
      body.attachmentNotes === undefined ? existing.attachmentNotes : body.attachmentNotes;
    const attachmentCheck = validateLongText(res, "attachmentNotes", attachmentInput);
    if (!attachmentCheck.ok) return;

    let actionDate = existing.actionDate;
    if (body.actionDate !== undefined && body.actionDate !== null) {
      actionDate = new Date(String(body.actionDate));
      if (isNaN(actionDate.getTime())) {
        validationError(res, { actionDate: "actionDate must be a valid ISO 8601 timestamp." });
        return;
      }
      if (!maxBoundsNotFuture(actionDate, new Date())) {
        validationError(res, { actionDate: ACTION_DATE_FUTURE_MSG });
        return;
      }
    }

    // BR-15: the version is enforced atomically in the write itself
    // (`WHERE id AND version` + `version INCREMENT` in one statement), so two
    // concurrent PUTs presenting the same version cannot both win. The
    // equality check above is only a fast path for the common stale-client
    // case; the updateMany below is the authoritative gate (BR-15).
    const write = await db.actionTaken.updateMany({
      where: { id, version },
      data: {
        actionDate,
        description,
        result,
        followUpRequired,
        followUpNote: followUpCheck.value,
        attachmentNotes: attachmentCheck.value,
        version: { increment: 1 },
      },
    });
    if (write.count === 0) {
      // Either the row was deleted concurrently (404) or another writer
      // bumped the version between our check and the write (409).
      const latest = await db.actionTaken.findUnique({
        where: { id },
        include: performedBySelect,
      });
      if (!latest) {
        sendError(res, 404, "NOT_FOUND", "ActionTaken not found");
        return;
      }
      res.status(409).json({
        error: { code: "CONFLICT", message: "This Action Taken was updated by someone else. Refresh to load the latest version." },
        data: latest,
      });
      return;
    }
    const updated = await db.actionTaken.findUnique({
      where: { id },
      include: performedBySelect,
    });
    res.status(200).json({ data: updated });
  },
);

// ---------------------------------------------------------------------
// Append-only guards — registered WITHOUT requireAuth (405, not 401).
// ---------------------------------------------------------------------
const methodNotAllowed = (_req: Request, res: Response): void => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
};

router.post("/actions/:id", methodNotAllowed);
router.patch("/actions/:id", methodNotAllowed);
router.delete("/actions/:id", methodNotAllowed);
router.patch("/tickets/:id/actions", methodNotAllowed);
router.delete("/tickets/:id/actions", methodNotAllowed);

export default router;