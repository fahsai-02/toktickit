import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import { buildNextTicketNumber } from './lib/ticketNumber.js';
import { PrismaClientKnownRequestError } from './generated/prisma/internal/prismaNamespace.js';

dotenv.config();

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
          const existing = await tx.ticket.findMany({
            where: { ticketNumber: { startsWith: `TKT-${year}-` } },
            select: { ticketNumber: true },
          });
          const ticketNumber = buildNextTicketNumber(
            existing.map((t) => t.ticketNumber),
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
          err instanceof PrismaClientKnownRequestError &&
          err.code === "P2002"
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