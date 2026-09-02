import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { buildNextTicketNumber } from './lib/ticketNumber.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_EXT_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

function validateAttachmentType(
  mimeType: string,
  extension: string
): { valid: boolean; reason?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, reason: `Unsupported MIME type: ${mimeType}` };
  }
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, reason: `Unsupported extension: ${extension}` };
  }
  const allowedExts = MIME_EXT_MAP[mimeType];
  if (!allowedExts || !allowedExts.includes(extension)) {
    return {
      valid: false,
      reason: `MIME type ${mimeType} does not match extension ${extension}`,
    };
  }
  return { valid: true };
}

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

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "TokTickIT API" });
});

app.get("/api/dev/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await db.requester.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true, department: true },
    });
    res.json({ data: requesters });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch requesters" },
    });
  }
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
const STATUSES = ["NEW"] as const;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function validationError(
  res: Response,
  fields: Record<string, string>,
  message = "Validation failed"
): void {
  res.status(400).json({
    error: { code: "VALIDATION_ERROR", message, fields },
  });
}

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

app.get("/api/tickets", async (req: Request, res: Response) => {
  const fields: Record<string, string> = {};

  const requesterId = parsePositiveInt(req.query.requesterId);
  if (requesterId === null) {
    fields.requesterId = "requesterId is required and must be a positive integer.";
  }

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
    const requester = await db.requester.findUnique({
      where: { id: requesterId! },
      select: { id: true },
    });
    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Requester not found" },
      });
      return;
    }

    const where: Record<string, unknown> = { requesterId };

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }
    if (currentStatus !== undefined) {
      where.currentStatus = currentStatus;
    }
    if (requestedPriority !== undefined) {
      where.requestedPriority = requestedPriority;
    }

    const orderBy: Array<Record<string, string>> = [
      { [sortBy]: sortOrder },
    ];
    if (sortBy !== "ticketNumber") {
      orderBy.push({ ticketNumber: "desc" });
    }

    const [total, tickets] = await Promise.all([
      db.ticket.count({ where }),
      db.ticket.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      data: tickets,
      meta: { total, page, pageSize, totalPages },
    });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch tickets" },
    });
  }
});

app.post("/api/tickets", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const fields: Record<string, string> = {};

  const requesterId = parsePositiveInt(body.requesterId);
  const categoryId = parsePositiveInt(body.categoryId);
  const relatedSystemId = parsePositiveInt(body.relatedSystemId);

  if (requesterId === null) {
    fields.requesterId = "Requester is required.";
  }
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
  if (
    requesterId === null ||
    categoryId === null ||
    relatedSystemId === null
  ) {
    validationError(res, fields);
    return;
  }

  try {
    const requester = await db.requester.findUnique({
      where: { id: requesterId },
      select: { id: true, isActive: true },
    });

    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Requester not found" },
      });
      return;
    }
    if (!requester.isActive) {
      res.status(400).json({
        error: {
          code: "BUSINESS_RULE_VIOLATION",
          message: "This requester is inactive and cannot create tickets",
        },
      });
      return;
    }

    const [category, relatedSystem] = await Promise.all([
      db.category.findUnique({ where: { id: categoryId } }),
      db.relatedSystem.findUnique({ where: { id: relatedSystemId } }),
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
              currentStatus: "NEW",
              requesterId,
              categoryId,
              relatedSystemId,
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

app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  const fields: Record<string, string> = {};

  const ticketId = parsePositiveInt(req.params.id);
  if (ticketId === null) {
    fields.id = "Ticket id must be a positive integer.";
  }

  const requesterId = parsePositiveInt(req.query.requesterId);
  if (requesterId === null) {
    fields.requesterId = "requesterId is required and must be a positive integer.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const requester = await db.requester.findUnique({
      where: { id: requesterId! },
      select: { id: true },
    });
    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Requester not found" },
      });
      return;
    }

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
        requester: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
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

    if (ticket.requesterId !== requesterId!) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "You don't have access to this ticket." },
      });
      return;
    }

    const { requesterId: _, ...ticketData } = ticket;
    res.json({ data: ticketData });
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch ticket" },
    });
  }
});

app.post("/api/tickets/:id/attachments", upload.single("file"), async (req: Request, res: Response) => {
  const ticketId = parsePositiveInt(req.params.id);
  const requesterId = parsePositiveInt(req.body.requesterId);

  if (ticketId === null || requesterId === null) {
    const fields: Record<string, string> = {};
    if (ticketId === null) fields.id = "Ticket id must be a positive integer.";
    if (requesterId === null) fields.requesterId = "requesterId is required.";
    validationError(res, fields);
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
    const requester = await db.requester.findUnique({
      where: { id: requesterId },
      select: { id: true, isActive: true },
    });

    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Requester not found" },
      });
      return;
    }

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
      return;
    }

    if (ticket.requesterId !== requesterId) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "You don't have access to this ticket." },
      });
      return;
    }

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

    if (req.file.size > MAX_FILE_SIZE) {
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "File size exceeds the 5 MB limit.",
        },
      });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
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
        originalFileName: req.file.originalname,
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

app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  const fields: Record<string, string> = {};

  const attachmentId = parsePositiveInt(req.params.id);
  if (attachmentId === null) {
    fields.id = "Attachment id must be a positive integer.";
  }

  const requesterId = parsePositiveInt(req.query.requesterId);
  if (requesterId === null) {
    fields.requesterId = "requesterId is required and must be a positive integer.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const requester = await db.requester.findUnique({
      where: { id: requesterId! },
      select: { id: true },
    });
    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Requester not found" },
      });
      return;
    }

    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId! },
      select: {
        id: true,
        storageFileName: true,
        originalFileName: true,
        fileSize: true,
        mimeType: true,
        isRemoved: true,
        ticket: { select: { requesterId: true } },
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

    if (attachment.ticket.requesterId !== requesterId!) {
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
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFileName}"`);
    res.setHeader("Content-Length", attachment.fileSize);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to download attachment" },
    });
  }
});

app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
  const attachmentId = parsePositiveInt(req.params.id);
  const body = req.body ?? {};
  const requesterId = parsePositiveInt(body.requesterId);
  const removalReason = typeof body.removalReason === "string" ? body.removalReason.trim() : "";

  const fields: Record<string, string> = {};
  if (attachmentId === null) fields.id = "Attachment id must be a positive integer.";
  if (requesterId === null) fields.requesterId = "requesterId is required.";
  if (removalReason.length < 3 || removalReason.length > 200) {
    fields.removalReason = "removalReason must be 3-200 characters.";
  }

  if (Object.keys(fields).length > 0) {
    validationError(res, fields);
    return;
  }

  try {
    const requester = await db.requester.findUnique({
      where: { id: requesterId! },
      select: { id: true },
    });
    if (!requester) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Requester not found" },
      });
      return;
    }

    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId! },
      select: {
        id: true,
        isRemoved: true,
        ticket: { select: { requesterId: true } },
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

    if (attachment.ticket.requesterId !== requesterId!) {
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