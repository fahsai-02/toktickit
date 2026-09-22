import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { buildNextTicketNumber } from './lib/ticketNumber.js';
import { validateAttachmentType } from './lib/attachmentValidation.js';
import { sendError, validationError } from './lib/httpErrors.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { runTicketListQuery, STAFF_SORT_WHITELIST } from './lib/ticketListQuery.js';
import {
  canTransition,
  transitionViolationMessage,
  isTicketStatus,
} from './lib/statusTransitions.js';
import authRouter from './routes/auth.js';
import type { TicketStatus } from './generated/prisma/client.js';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const result = validateAttachmentType(file.mimetype, ext);
    if (result.valid) {
      cb(null, true);
    } else {
      cb(new Error("UNSUPPORTED_MEDIA_TYPE"));
    }
  },
});

const app: Express = express();

app.use(cors());
app.use(express.json());

// Session store choice (AD-02): in-memory MemoryStore is acceptable for this
// local-development course stack and does NOT survive a server restart.
// CSRF mitigation (AD-03): sameSite=lax cookie + JSON-only API.
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET is missing. Add it to server/.env (see .env.example)."
  );
}

app.use(
  session({
    secret: SESSION_SECRET,
    store: new session.MemoryStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use("/api/auth", authRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "TokTickIT API" });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.json({ data: categories });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories" },
    });
  }
});

app.get("/api/related-systems", async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;

    if (categoryId !== undefined) {
      const parsed = Number(categoryId);
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "categoryId must be a positive integer",
          },
        });
        return;
      }
    }

    const filterCategoryId =
      categoryId !== undefined ? Number(categoryId) : undefined;

    const systems = await db.relatedSystem.findMany({
      where: {
        isActive: true,
        ...(filterCategoryId !== undefined
          ? {
              OR: [
                { categoryId: filterCategoryId },
                { categoryId: null },
              ],
            }
          : {}),
      },
      orderBy: { id: "asc" },
      select: { id: true, name: true, categoryId: true },
    });
    res.json({ data: systems });
  } catch {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch related systems",
      },
    });
  }
});

const SORT_WHITELIST = ["updatedAt", "createdAt", "requestedPriority", "ticketNumber"] as const;
// TicketStatus filter is now the full Lab 3 set (specification.md section 7).
const STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// STAFF_SORT_WHITELIST is imported from ./lib/ticketListQuery.ts — the single
// source of truth shared with the client-facing query builder. Only the 5
// api-spec 5.1 fields are accepted (updatedAt, createdAt, itPriority,
// currentStatus, ticketNumber); `requestedPriority` sorting is NOT part of the
// contract, so `sortBy=requestedPriority` must 400.

const COMMENT_MAX_LENGTH = 2000;

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  return null;
}

// ── Session-identity helper (Issue 18) ─────────────────────────────────────
// `requesterId` (legacy FK → Requester) is no longer the identity transport:
// the authenticated User is. A helper resolves the legacy row so the non-null
// `requesterId` FK stays valid, and computes the effective owner for
// ownership checks (falling back to a Requester.email == User.email join for
// tickets created before this issue that still have requesterUserId = NULL).
// (specification.md FR-12, FR-13, BR-03; api-spec section 4.)

/** Legacy `Requester.id` for a session user — matched by email, auto-created
 *  if the user has no legacy row yet (e.g. an Admin-created Requester). */
async function resolveLegacyRequesterIdForUser(name: string, email: string): Promise<number> {
  const requester = await db.requester.upsert({
    where: { email },
    update: {},
    create: { name, email, isActive: true },
    select: { id: true },
  });
  return requester.id;
}

/** Effective owning User.id for a ticket. Backfills the legacy link by email
 *  when `requesterUserId` is still NULL (rows created pre-Issue 18). */
async function ownerUserIdFor(ticket: {
  requesterUserId: number | null;
  requesterId: number;
}): Promise<number | null> {
  if (ticket.requesterUserId !== null) return ticket.requesterUserId;
  const requester = await db.requester.findUnique({
    where: { id: ticket.requesterId },
    select: { email: true },
  });
  if (!requester) return null;
  const user = await db.user.findUnique({
    where: { email: requester.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** Ownership `where` clause for list queries: session user owns the ticket
 *  via `requesterUserId`, or (pre-backfill rows) via their mapped email. */
function ownershipWhereFor(user: { id: number; email: string }): Record<string, unknown> {
  return {
    OR: [
      { requesterUserId: user.id },
      { requesterUserId: null, requester: { email: user.email } },
    ],
  };
}

app.get("/api/tickets", requireAuth, async (req: Request, res: Response) => {
  const fields: Record<string, string> = {};

  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const categoryIdParam = req.query.categoryId;
  let categoryId: number | undefined;
  if (categoryIdParam !== undefined) {
    const parsed = parsePositiveInt(categoryIdParam);
    if (parsed === null) {
      fields.categoryId = "categoryId must be a positive integer.";
    } else {
      categoryId = parsed;
    }
  }

  const currentStatusParam = req.query.currentStatus;
  let currentStatus: string | undefined;
  if (currentStatusParam !== undefined) {
    if (typeof currentStatusParam === "string" && STATUSES.includes(currentStatusParam as typeof STATUSES[number])) {
      currentStatus = currentStatusParam;
    } else {
      fields.currentStatus = `currentStatus must be one of: ${STATUSES.join(", ")}.`;
    }
  }

  const requestedPriorityParam = req.query.requestedPriority;
  let requestedPriority: string | undefined;
  if (requestedPriorityParam !== undefined) {
    if (typeof requestedPriorityParam === "string" && PRIORITIES.includes(requestedPriorityParam)) {
      requestedPriority = requestedPriorityParam;
    } else {
      fields.requestedPriority = `requestedPriority must be one of: ${PRIORITIES.join(", ")}.`;
    }
  }

  let sortBy: string = "updatedAt";
  if (req.query.sortBy !== undefined) {
    if (typeof req.query.sortBy === "string" && SORT_WHITELIST.includes(req.query.sortBy as typeof SORT_WHITELIST[number])) {
      sortBy = req.query.sortBy;
    } else {
      fields.sortBy = `sortBy must be one of: ${SORT_WHITELIST.join(", ")}.`;
    }
  }

  let sortOrder: "asc" | "desc" = "desc";
  if (req.query.sortOrder !== undefined) {
    if (typeof req.query.sortOrder === "string" && (req.query.sortOrder === "asc" || req.query.sortOrder === "desc")) {
      sortOrder = req.query.sortOrder;
    } else {
      fields.sortOrder = "sortOrder must be asc or desc.";
    }
  }

  let page = 1;
  if (req.query.page !== undefined) {
    const parsed = Number(req.query.page);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      fields.page = "page must be an integer >= 1.";
    } else {
      page = parsed;
    }
  }

  let pageSize = 10;
  if (req.query.pageSize !== undefined) {
    const parsed = Number(req.query.pageSize);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      fields.pageSize = "pageSize must be an integer between 1 and 50.";
    } else {
      pageSize = parsed;
    }
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const and: Array<Record<string, unknown>> = [ownershipWhereFor(req.user!)];

    if (search) {
      and.push({
        OR: [
          { ticketNumber: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (categoryId !== undefined) {
      and.push({ categoryId });
    }
    if (currentStatus !== undefined) {
      and.push({ currentStatus });
    }
    if (requestedPriority !== undefined) {
      and.push({ requestedPriority });
    }

    const where = { AND: and };

    const orderBy: Array<Record<string, string>> = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== "ticketNumber") {
      orderBy.push({ ticketNumber: "desc" });
    }

    const result = await runTicketListQuery({
      where,
      orderBy,
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        requestedPriority: true,
        itPriority: true,
        currentStatus: true,
        category: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      page,
      pageSize,
    });

    res.json(result);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch tickets" },
    });
  }
});

/**
 * IT Staff Ticket Queue (api-spec section 5.1; FR-22/23/24, AC-08). Only IT
 * Staff and Administrators may use staff endpoints (requireRole regression
 * canary: a Requester must still get 403 here, never leak staff data).
 *
 * Unlike the Requester list, staff see EVERY ticket (no ownership where)
 * plus two staff-only axes the requester screen cannot use:
 *   - `itPriority` filter (api-spec 5.1)
 *   - `ownerId` filter: `"unassigned"`, `"me"`, or an integer owner id
 * Every ticket also carries its `owner` (nullable, via TicketOwner) and the
 * legacy `requester` so the queue table can show both columns.
 */
app.get(
  "/api/staff/tickets",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const fields: Record<string, string> = {};

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const categoryIdParam = req.query.categoryId;
    let categoryId: number | undefined;
    if (categoryIdParam !== undefined) {
      const parsed = parsePositiveInt(categoryIdParam);
      if (parsed === null) {
        fields.categoryId = "categoryId must be a positive integer.";
      } else {
        categoryId = parsed;
      }
    }

    const currentStatusParam = req.query.currentStatus;
    let currentStatus: string | undefined;
    if (currentStatusParam !== undefined) {
      if (
        typeof currentStatusParam === "string" &&
        STATUSES.includes(currentStatusParam as typeof STATUSES[number])
      ) {
        currentStatus = currentStatusParam;
      } else {
        fields.currentStatus = `currentStatus must be one of: ${STATUSES.join(", ")}.`;
      }
    }

    const requestedPriorityParam = req.query.requestedPriority;
    let requestedPriority: string | undefined;
    if (requestedPriorityParam !== undefined) {
      if (
        typeof requestedPriorityParam === "string" &&
        PRIORITIES.includes(requestedPriorityParam)
      ) {
        requestedPriority = requestedPriorityParam;
      } else {
        fields.requestedPriority = `requestedPriority must be one of: ${PRIORITIES.join(", ")}.`;
      }
    }

    const itPriorityParam = req.query.itPriority;
    let itPriority: string | undefined;
    if (itPriorityParam !== undefined) {
      if (typeof itPriorityParam === "string" && PRIORITIES.includes(itPriorityParam)) {
        itPriority = itPriorityParam;
      } else {
        fields.itPriority = `itPriority must be one of: ${PRIORITIES.join(", ")}.`;
      }
    }

    // ownerId (api-spec 5.1): integer = filter by owner id; "unassigned" = no
    // owner (ownerId null); "me" = owned by the current staff session user.
    const ownerIdParam = req.query.ownerId;
    let ownerIdWhere: Record<string, unknown> | undefined;
    if (ownerIdParam !== undefined) {
      if (ownerIdParam === "unassigned") {
        ownerIdWhere = { ownerId: null };
      } else if (ownerIdParam === "me") {
        ownerIdWhere = { ownerId: req.user!.id };
      } else {
        const parsed = parsePositiveInt(ownerIdParam);
        if (parsed === null) {
          fields.ownerId =
            "ownerId must be a positive integer, unassigned, or me.";
        } else {
          ownerIdWhere = { ownerId: parsed };
        }
      }
    }

    let sortBy: string = "updatedAt";
    if (req.query.sortBy !== undefined) {
      if (
        typeof req.query.sortBy === "string" &&
        STAFF_SORT_WHITELIST.includes(req.query.sortBy as typeof STAFF_SORT_WHITELIST[number])
      ) {
        sortBy = req.query.sortBy;
      } else {
        fields.sortBy = `sortBy must be one of: ${STAFF_SORT_WHITELIST.join(", ")}.`;
      }
    }

    let sortOrder: "asc" | "desc" = "desc";
    if (req.query.sortOrder !== undefined) {
      if (
        typeof req.query.sortOrder === "string" &&
        (req.query.sortOrder === "asc" || req.query.sortOrder === "desc")
      ) {
        sortOrder = req.query.sortOrder;
      } else {
        fields.sortOrder = "sortOrder must be asc or desc.";
      }
    }

    let page = 1;
    if (req.query.page !== undefined) {
      const parsed = Number(req.query.page);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        fields.page = "page must be an integer >= 1.";
      } else {
        page = parsed;
      }
    }

    let pageSize = 10;
    if (req.query.pageSize !== undefined) {
      const parsed = Number(req.query.pageSize);
      if (
        !Number.isFinite(parsed) ||
        !Number.isInteger(parsed) ||
        parsed < 1 ||
        parsed > 50
      ) {
        fields.pageSize = "pageSize must be an integer between 1 and 50.";
      } else {
        pageSize = parsed;
      }
    }

    if (Object.keys(fields).length > 0) {
      validationError(res, fields);
      return;
    }

    const and: Array<Record<string, unknown>> = [];

    if (search) {
      and.push({
        OR: [
          { ticketNumber: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (categoryId !== undefined) {
      and.push({ categoryId });
    }
    if (currentStatus !== undefined) {
      and.push({ currentStatus });
    }
    if (requestedPriority !== undefined) {
      and.push({ requestedPriority });
    }
    if (itPriority !== undefined) {
      and.push({ itPriority });
    }
    if (ownerIdWhere !== undefined) {
      and.push(ownerIdWhere);
    }

    const where = { AND: and };

    const orderBy: Array<Record<string, string>> = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== "ticketNumber") {
      orderBy.push({ ticketNumber: "desc" });
    }

    try {
      const result = await runTicketListQuery({
        where,
        orderBy,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          itPriority: true,
          currentStatus: true,
          category: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
          createdAt: true,
          updatedAt: true,
        },
        page,
        pageSize,
      });

      res.json(result);
    } catch {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch tickets",
        },
      });
    }
  }
);

app.post("/api/tickets", requireAuth, async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const fields: Record<string, string> = {};

  // `requesterId` is intentionally NOT read from the body (FR-13, BR-03) —
  // ownership is derived from the authenticated session below.
  const categoryId = parsePositiveInt(body.categoryId);
  const relatedSystemId = parsePositiveInt(body.relatedSystemId);

  if (categoryId === null) {
    fields.categoryId = "Category is required.";
  }
  if (relatedSystemId === null) {
    fields.relatedSystemId = "Related system is required.";
  }

  const requestedPriority =
    typeof body.requestedPriority === "string"
      ? body.requestedPriority.trim()
      : "";
  if (!PRIORITIES.includes(requestedPriority)) {
    fields.requestedPriority = "Priority must be LOW, MEDIUM, HIGH, or URGENT.";
  }

  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (summary.length < 1 || summary.length > 120) {
    fields.summary = "Summary is required (1-120 characters).";
  }
  if (description.length < 1 || description.length > 2000) {
    fields.description = "Description is required (1-2000 characters).";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  // Type-only narrowing: categoryId/relatedSystemId are valid numbers here —
  // the null branches above already recorded `fields` entries and returned.
  // Asserting once lets the narrowed number flow into the transaction closure.
  const categoryIdNum = categoryId as number;
  const relatedSystemIdNum = relatedSystemId as number;

  try {
    const user = req.user!;
    // The authenticated User must itself be active to create tickets
    // (requireAuth already guarantees this, but keep the safe business rule).
    if (!user.isActive) {
      sendError(
        res,
        400,
        "BUSINESS_RULE_VIOLATION",
        "This account is inactive and cannot create tickets"
      );
      return;
    }

    const requesterId = await resolveLegacyRequesterIdForUser(
      user.name,
      user.email
    );

    const [category, relatedSystem] = await Promise.all([
      db.category.findUnique({ where: { id: categoryIdNum } }),
      db.relatedSystem.findUnique({ where: { id: relatedSystemIdNum } }),
    ]);

    if (!category) {
      res
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Category not found" } });
      return;
    }
    if (!relatedSystem) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Related system not found" },
      });
      return;
    }

    const year = new Date().getFullYear();
    let ticket = null;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        ticket = await db.$transaction(async (tx) => {
          const latest = await tx.ticket.findFirst({
            where: { ticketNumber: { startsWith: `TKT-${year}-` } },
            orderBy: { ticketNumber: "desc" },
            select: { ticketNumber: true },
          });
          const ticketNumber = buildNextTicketNumber(
            latest ? [latest.ticketNumber] : [],
            year
          );
          return tx.ticket.create({
            data: {
              ticketNumber,
              summary,
              description,
              requestedPriority,
              itPriority: requestedPriority,
              currentStatus: "NEW",
              requesterId,
              requesterUserId: user.id,
              categoryId: categoryIdNum,
              relatedSystemId: relatedSystemIdNum,
            },
          });
        });
        break;
      } catch (err) {
        if (
          (err as { code?: string }).code === "P2002"
        ) {
          continue;
        }
        throw err;
      }
    }

    if (!ticket) {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create ticket, please try again",
        },
      });
      return;
    }

    const created = await db.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        requester: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ data: created });
  } catch {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create ticket, please try again",
      },
    });
  }
});

app.get("/api/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  const fields: Record<string, string> = {};

  const ticketId = parsePositiveInt(req.params.id);
  if (ticketId === null) {
    fields.id = "Ticket id must be a positive integer.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId! },
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        description: true,
        requestedPriority: true,
        itPriority: true,
        currentStatus: true,
        ticketDate: true,
        requesterId: true,
        requesterUserId: true,
        resolutionSummary: true,
        requesterIndicatedResolved: true,
        indicatedResolvedAt: true,
        requester: { select: { id: true, name: true } },
        owner: {
          select: { id: true, name: true, role: true },
        },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { attachments: true, comments: true, notes: true },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            originalFileName: true,
            fileSize: true,
            mimeType: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
            uploadedByRequesterId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
      return;
    }

    const ownerId = await ownerUserIdFor(ticket);
    if (ownerId !== req.user!.id) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "You don't have access to this ticket." },
      });
      return;
    }

    const { requesterId: _, requesterUserId: __, ...ticketData } = ticket;
    res.json({ data: ticketData });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch ticket" },
    });
  }
});

app.post("/api/tickets/:id/attachments", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  const ticketId = parsePositiveInt(req.params.id);

  if (ticketId === null) {
    validationError(res, { id: "Ticket id must be a positive integer." });
    return;
  }

  if (!req.file) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "File is required. Allowed types: jpg, jpeg, png, webp, pdf (max 5 MB).",
      },
    });
    return;
  }

  try {
    const user = req.user!;

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, requesterUserId: true },
    });

    if (!ticket) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
      return;
    }

    const ownerId = await ownerUserIdFor(ticket);
    // IT Staff/Administrator may attach to any ticket (Issue 20); Requesters
    // keep ownership checks.
    const canActOnAnyTicket =
      user.role === "IT_STAFF" || user.role === "ADMINISTRATOR";
    if (!canActOnAnyTicket && ownerId !== user.id) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "You don't have access to this ticket." },
      });
      return;
    }

    // Issue 20 decision #1: IT Staff/Admin may attach to any ticket. The
    // legacy `uploadedByRequesterId` FK must still point at a Requester row
    // (Attachment model is untouched), so staff uploads are tagged with the
    // ticket's OWN requester instead of fabricating a Requester row from the
    // staff member's identity. Requester uploads keep the session-mapped row.
    const requesterId = canActOnAnyTicket
      ? ticket.requesterId
      : await resolveLegacyRequesterIdForUser(user.name, user.email);

    const activeCount = await db.attachment.count({
      where: { ticketId, isRemoved: false },
    });

    if (activeCount >= 5) {
      res.status(400).json({
        error: {
          code: "BUSINESS_RULE_VIOLATION",
          message: "Ticket already has the maximum of 5 active attachments.",
        },
      });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const typeResult = validateAttachmentType(req.file.mimetype, ext);
    if (!typeResult.valid) {
      res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "File type not allowed. Allowed: jpg, jpeg, png, webp, pdf.",
        },
      });
      return;
    }

    const attachment = await db.attachment.create({
      data: {
        ticketId,
        originalFileName: req.file.originalname.trim().slice(0, 255),
        storageFileName: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedByRequesterId: requesterId,
      },
      select: {
        id: true,
        originalFileName: true,
        fileSize: true,
        mimeType: true,
        isRemoved: true,
        removedAt: true,
        removalReason: true,
        uploadedByRequesterId: true,
        createdAt: true,
      },
    });

    res.status(201).json({ data: attachment });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to upload attachment" },
    });
  }
});

app.get("/api/attachments/:id/download", requireAuth, async (req: Request, res: Response) => {
  const fields: Record<string, string> = {};

  const attachmentId = parsePositiveInt(req.params.id);
  if (attachmentId === null) {
    fields.id = "Attachment id must be a positive integer.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId! },
      select: {
        id: true,
        storageFileName: true,
        originalFileName: true,
        fileSize: true,
        mimeType: true,
        isRemoved: true,
        ticket: {
          select: { requesterId: true, requesterUserId: true },
        },
      },
    });

    if (!attachment) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Attachment not found" },
      });
      return;
    }

    if (attachment.isRemoved) {
      res.status(410).json({
        error: { code: "GONE", message: "This attachment has been removed." },
      });
      return;
    }

    const ownerId = await ownerUserIdFor(attachment.ticket);
    const canActOnAnyTicket =
      req.user!.role === "IT_STAFF" || req.user!.role === "ADMINISTRATOR";
    if (!canActOnAnyTicket && ownerId !== req.user!.id) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "You don't have access to this attachment." },
      });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, attachment.storageFileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Attachment file not found on disk." },
      });
      return;
    }

    res.setHeader("Content-Type", attachment.mimeType);
    const safeName = attachment.originalFileName
      .replace(/[\r\n]/g, "")
      .replace(/"/g, '\\"');
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName)}`
    );
    res.setHeader("Content-Length", attachment.fileSize);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to download attachment" },
    });
  }
});

app.delete("/api/attachments/:id", requireAuth, async (req: Request, res: Response) => {
  const attachmentId = parsePositiveInt(req.params.id);
  const body = req.body ?? {};
  const removalReason = typeof body.removalReason === "string" ? body.removalReason.trim() : "";

  const fields: Record<string, string> = {};
  if (attachmentId === null) fields.id = "Attachment id must be a positive integer.";
  if (removalReason.length < 3 || removalReason.length > 200) {
    fields.removalReason = "removalReason must be 3-200 characters.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId! },
      select: {
        id: true,
        isRemoved: true,
        ticket: {
          select: { requesterId: true, requesterUserId: true },
        },
      },
    });

    if (!attachment) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Attachment not found" },
      });
      return;
    }

    if (attachment.isRemoved) {
      res.status(400).json({
        error: {
          code: "BUSINESS_RULE_VIOLATION",
          message: "This attachment has already been removed.",
        },
      });
      return;
    }

    const ownerId = await ownerUserIdFor(attachment.ticket);
    if (
      req.user!.role !== "IT_STAFF" &&
      req.user!.role !== "ADMINISTRATOR" &&
      ownerId !== req.user!.id
    ) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "You don't have access to this attachment." },
      });
      return;
    }

    const updated = await db.attachment.update({
      where: { id: attachmentId! },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removalReason,
      },
      select: {
        id: true,
        originalFileName: true,
        fileSize: true,
        mimeType: true,
        isRemoved: true,
        removedAt: true,
        removalReason: true,
        uploadedByRequesterId: true,
        createdAt: true,
      },
    });

    res.json({ data: updated });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to remove attachment" },
    });
  }
});

// ── Requester Public Comments ───────────────────────────────────────────────
// Append-only (FR-18): read via GET, write via POST, any edit/delete is a 405.

const commentSelect = {
  id: true,
  ticketId: true,
  authorId: true,
  content: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} as const;

function validateCommentContent(raw: unknown): { content: string; error?: string } {
  const content = typeof raw === "string" ? raw.trim() : "";
  if (content.length < 1 || content.length > COMMENT_MAX_LENGTH) {
    return {
      content,
      error: `Comment text is required (1-${COMMENT_MAX_LENGTH} characters).`,
    };
  }
  return { content };
}

app.get("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const ticketId = parsePositiveInt(req.params.id);
  if (ticketId === null) {
    validationError(res, { id: "Ticket id must be a positive integer." });
    return;
  }

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, requesterUserId: true },
    });

    if (!ticket) {
      sendError(res, 404, "NOT_FOUND", "Ticket not found");
      return;
    }

    const ownerId = await ownerUserIdFor(ticket);
    if (ownerId !== req.user!.id) {
      sendError(res, 403, "FORBIDDEN", "You don't have access to this ticket.");
      return;
    }

    const comments = await db.publicComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      select: commentSelect,
    });

    res.json({ data: comments });
  } catch {
    sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch comments");
  }
});

app.post("/api/tickets/:id/comments", requireAuth, async (req: Request, res: Response) => {
  const ticketId = parsePositiveInt(req.params.id);
  if (ticketId === null) {
    validationError(res, { id: "Ticket id must be a positive integer." });
    return;
  }

  const { content, error } = validateCommentContent(req.body?.content);
  if (error) {
    validationError(res, { content: error });
    return;
  }

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, requesterUserId: true },
    });

    if (!ticket) {
      sendError(res, 404, "NOT_FOUND", "Ticket not found");
      return;
    }

    const ownerId = await ownerUserIdFor(ticket);
    if (ownerId !== req.user!.id) {
      sendError(res, 403, "FORBIDDEN", "You don't have access to this ticket.");
      return;
    }

    // Author + timestamp come from the backend, never the client (BR-16).
    const comment = await db.publicComment.create({
      data: {
        ticketId,
        authorId: req.user!.id,
        content,
      },
      select: commentSelect,
    });

    res.status(201).json({ data: comment });
  } catch {
    sendError(res, 500, "INTERNAL_ERROR", "Failed to post comment");
  }
});

app.put("/api/tickets/:id/comments", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});

app.put("/api/tickets/:id/comments/:commentId", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});

app.delete("/api/tickets/:id/comments", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});

app.delete("/api/tickets/:id/comments/:commentId", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});

// ── IT Staff Ticket Detail (FR-26..39; api-spec section 5.2-5.13) ───────────
// Every route is guarded by requireRole("IT_STAFF", "ADMINISTRATOR"); there is
// NO per-ticket ownership restriction — staff/admin operate on any ticket.

const staffDetailSelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  description: true,
  requestedPriority: true,
  itPriority: true,
  currentStatus: true,
  ticketDate: true,
  resolutionSummary: true,
  requesterIndicatedResolved: true,
  indicatedResolvedAt: true,
  requester: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, role: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { attachments: true, comments: true, notes: true } },
  attachments: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      originalFileName: true,
      fileSize: true,
      mimeType: true,
      isRemoved: true,
      removedAt: true,
      removalReason: true,
      uploadedByRequesterId: true,
      createdAt: true,
    },
  },
} as const;

app.get(
  "/api/staff/tickets/:id",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    if (ticketId === null) {
      validationError(res, { id: "Ticket id must be a positive integer." });
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: staffDetailSelect,
      });

      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      // requesterId/requesterUserId/ownerId are internal FK columns and are
      // deliberately not selected above; the response carries the requester
      // and owner relations instead.
      res.json({ data: ticket });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch ticket");
    }
  }
);

app.put(
  "/api/staff/tickets/:id/claim",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    if (ticketId === null) {
      validationError(res, { id: "Ticket id must be a positive integer." });
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, ownerId: true },
      });

      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }
      if (ticket.ownerId === req.user!.id) {
        sendError(res, 409, "CONFLICT", "You already own this ticket.");
        return;
      }

      await db.ticket.update({
        where: { id: ticketId },
        data: { ownerId: req.user!.id },
      });
      const owner = await db.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, name: true, role: true },
      });
      res.json({ data: { owner } });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to claim ticket");
    }
  }
);

app.put(
  "/api/staff/tickets/:id/assign",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    const ownerId = parsePositiveInt(req.body?.ownerId);

    const fields: Record<string, string> = {};
    if (ticketId === null) {
      fields.id = "Ticket id must be a positive integer.";
    }
    if (ownerId === null) {
      fields.ownerId =
        "ownerId is required and must be a positive integer.";
    }
    if (Object.keys(fields).length > 0) {
      validationError(res, fields);
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId! },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      // BR-13: the owner must be an active IT Staff or Administrator user.
      const target = await db.user.findFirst({
        where: {
          id: ownerId!,
          isActive: true,
          OR: [{ role: "IT_STAFF" }, { role: "ADMINISTRATOR" }],
        },
        select: { id: true, name: true, role: true },
      });
      if (!target) {
        sendError(
          res,
          404,
          "NOT_FOUND",
          "Owner must be an active IT Staff or Administrator user"
        );
        return;
      }

      await db.ticket.update({
        where: { id: ticketId! },
        data: { ownerId: target.id },
      });
      res.json({ data: { owner: target } });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to assign ticket");
    }
  }
);

app.put(
  "/api/staff/tickets/:id/priority",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    const itPriority =
      typeof req.body?.itPriority === "string" ? req.body.itPriority : "";

    const fields: Record<string, string> = {};
    if (ticketId === null) {
      fields.id = "Ticket id must be a positive integer.";
    }
    if (!PRIORITIES.includes(itPriority)) {
      fields.itPriority = "itPriority must be LOW, MEDIUM, HIGH, or URGENT.";
    }
    if (Object.keys(fields).length > 0) {
      validationError(res, fields);
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId! },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      await db.ticket.update({
        where: { id: ticketId! },
        data: { itPriority: itPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" },
      });
      res.json({ data: { itPriority } });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to set IT priority");
    }
  }
);

app.put(
  "/api/staff/tickets/:id/status",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    const raw =
      typeof req.body?.currentStatus === "string" ? req.body.currentStatus : "";

    const fields: Record<string, string> = {};
    if (ticketId === null) {
      fields.id = "Ticket id must be a positive integer.";
    }
    if (!isTicketStatus(raw)) {
      fields.currentStatus = "Invalid status value.";
    }
    if (Object.keys(fields).length > 0) {
      validationError(res, fields);
      return;
    }

    try {
      const to = raw as TicketStatus;
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId! },
        select: { id: true, currentStatus: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      if (!canTransition(ticket.currentStatus, to)) {
        sendError(
          res,
          400,
          "BUSINESS_RULE_VIOLATION",
          transitionViolationMessage(ticket.currentStatus, to)
        );
        return;
      }

      const updated = await db.ticket.update({
        where: { id: ticketId! },
        data: { currentStatus: to },
        select: { currentStatus: true },
      });
      res.json({ data: updated });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to update ticket status");
    }
  }
);

// Issue 20 decision: the Category dropdown is editable (ui-spec 5.5), which
// needs a dedicated endpoint since api-spec section 5 has none for it.
app.put(
  "/api/staff/tickets/:id/category",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    const categoryId = parsePositiveInt(req.body?.categoryId);

    const fields: Record<string, string> = {};
    if (ticketId === null) {
      fields.id = "Ticket id must be a positive integer.";
    }
    if (categoryId === null) {
      fields.categoryId = "categoryId must be a positive integer.";
    }
    if (Object.keys(fields).length > 0) {
      validationError(res, fields);
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId! },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      // api-spec section 5.14: only an ACTIVE category may be referenced.
      // Inactive or unknown categories both resolve to 404 (same safe shape).
      const category = await db.category.findFirst({
        where: { id: categoryId!, isActive: true },
        select: { id: true, name: true },
      });
      if (!category) {
        sendError(res, 404, "NOT_FOUND", "Category not found");
        return;
      }

      await db.ticket.update({
        where: { id: ticketId! },
        data: { categoryId: category.id },
      });
      res.json({ data: { category } });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to set category");
    }
  }
);

function validateResolutionSummary(raw: unknown): {
  summary: string;
  error?: string;
} {
  const summary = typeof raw === "string" ? raw.trim() : "";
  if (summary.length < 1 || summary.length > 2000) {
    return {
      summary,
      error: "Resolution summary is required (1-2000 characters).",
    };
  }
  return { summary };
}

app.put(
  "/api/staff/tickets/:id/resolution-summary",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    const { summary, error } = validateResolutionSummary(
      req.body?.resolutionSummary
    );

    const fields: Record<string, string> = {};
    if (ticketId === null) {
      fields.id = "Ticket id must be a positive integer.";
    }
    if (error) {
      fields.resolutionSummary = error;
    }
    if (Object.keys(fields).length > 0) {
      validationError(res, fields);
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId! },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      const updated = await db.ticket.update({
        where: { id: ticketId! },
        data: { resolutionSummary: summary },
        select: { resolutionSummary: true },
      });
      res.json({ data: updated });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to save resolution summary");
    }
  }
);

app.get(
  "/api/staff/tickets/:id/comments",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    if (ticketId === null) {
      validationError(res, { id: "Ticket id must be a positive integer." });
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      const comments = await db.publicComment.findMany({
        where: { ticketId },
        orderBy: { createdAt: "desc" },
        select: commentSelect,
      });
      res.json({ data: comments });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch comments");
    }
  }
);

app.post(
  "/api/staff/tickets/:id/comments",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    if (ticketId === null) {
      validationError(res, { id: "Ticket id must be a positive integer." });
      return;
    }

    const { content, error } = validateCommentContent(req.body?.content);
    if (error) {
      validationError(res, { content: error });
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      const comment = await db.publicComment.create({
        data: { ticketId, authorId: req.user!.id, content },
        select: commentSelect,
      });
      res.status(201).json({ data: comment });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to post comment");
    }
  }
);

const noteSelect = {
  id: true,
  ticketId: true,
  authorId: true,
  content: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} as const;

app.post(
  "/api/staff/tickets/:id/notes",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    if (ticketId === null) {
      validationError(res, { id: "Ticket id must be a positive integer." });
      return;
    }

    const { content, error } = validateCommentContent(req.body?.content);
    if (error) {
      validationError(res, { content: error });
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      const note = await db.internalNote.create({
        data: { ticketId, authorId: req.user!.id, content },
        select: noteSelect,
      });
      res.status(201).json({ data: note });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to create note");
    }
  }
);

app.get(
  "/api/staff/tickets/:id/notes",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInt(req.params.id);
    if (ticketId === null) {
      validationError(res, { id: "Ticket id must be a positive integer." });
      return;
    }

    try {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });
      if (!ticket) {
        sendError(res, 404, "NOT_FOUND", "Ticket not found");
        return;
      }

      const notes = await db.internalNote.findMany({
        where: { ticketId },
        orderBy: { createdAt: "desc" },
        select: noteSelect,
      });
      res.json({ data: notes });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch notes");
    }
  }
);

app.get(
  "/api/staff/users",
  requireAuth,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (_req: Request, res: Response) => {
    try {
      const users = await db.user.findMany({
        where: {
          isActive: true,
          OR: [{ role: "IT_STAFF" }, { role: "ADMINISTRATOR" }],
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      });
      res.json({ data: users });
    } catch {
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch staff users");
    }
  }
);

// ── Staff append-only enforcement (api-spec 5.13, BR-14, FR-34) ──────────────
app.put("/api/staff/tickets/:id/comments", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});
app.put("/api/staff/tickets/:id/comments/:commentId", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});
app.delete("/api/staff/tickets/:id/comments", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});
app.delete("/api/staff/tickets/:id/comments/:commentId", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Public comments are append-only.");
});
app.put("/api/staff/tickets/:id/notes", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Internal notes are append-only.");
});
app.put("/api/staff/tickets/:id/notes/:noteId", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Internal notes are append-only.");
});
app.delete("/api/staff/tickets/:id/notes", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Internal notes are append-only.");
});
app.delete("/api/staff/tickets/:id/notes/:noteId", (_req: Request, res: Response) => {
  sendError(res, 405, "METHOD_NOT_ALLOWED", "Internal notes are append-only.");
});

// ── Requester: "Problem Appears Resolved" (FR-19, BR-05, BR-20) ─────────────
// Only flags the request; it never transitions `currentStatus`.

app.put("/api/tickets/:id/indicate-resolved", requireAuth, async (req: Request, res: Response) => {
  const ticketId = parsePositiveInt(req.params.id);
  if (ticketId === null) {
    validationError(res, { id: "Ticket id must be a positive integer." });
    return;
  }

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        requesterId: true,
        requesterUserId: true,
        requesterIndicatedResolved: true,
      },
    });

    if (!ticket) {
      sendError(res, 404, "NOT_FOUND", "Ticket not found");
      return;
    }

    const ownerId = await ownerUserIdFor(ticket);
    if (ownerId !== req.user!.id) {
      sendError(res, 403, "FORBIDDEN", "You don't have access to this ticket.");
      return;
    }

    // Toggle (api-spec 4.9): set + timestamp, or clear on a repeated call.
    // `currentStatus` is NEVER touched (FR-19, BR-05, BR-20).
    const nextState = ticket.requesterIndicatedResolved
      ? { requesterIndicatedResolved: false, indicatedResolvedAt: null }
      : { requesterIndicatedResolved: true, indicatedResolvedAt: new Date() };

    const updated = await db.ticket.update({
      where: { id: ticketId },
      data: nextState,
      select: {
        id: true,
        requesterIndicatedResolved: true,
        indicatedResolvedAt: true,
      },
    });

    res.json({ data: updated });
  } catch {
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update ticket");
  }
});

// Requesters cannot set the resolution summary (api-spec 4.10). The IT Staff
// endpoint is added at release time; until then this path is a guarded 403 for
// everyone.
app.put("/api/tickets/:id/resolution-summary", requireAuth, (_req: Request, res: Response) => {
  sendError(
    res,
    403,
    "FORBIDDEN",
    "The resolution summary can only be set by IT Staff."
  );
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Resource not found" },
  });
});

app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: (err?: unknown) => void
  ) => {
    if (err instanceof Error && err.message === "UNSUPPORTED_MEDIA_TYPE") {
      res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "File type not allowed. Allowed: jpg, jpeg, png, webp, pdf.",
        },
      });
      return;
    }
    if (err instanceof Error && (err as { code?: string }).code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "File size exceeds the 5 MB limit.",
        },
      });
      return;
    }
    if (
      err instanceof SyntaxError &&
      "status" in err &&
      (err as { status?: number }).status === 400
    ) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Malformed JSON in request body",
        },
      });
      return;
    }
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
);

export default app;