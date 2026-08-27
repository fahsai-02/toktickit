import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';

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

export default app;