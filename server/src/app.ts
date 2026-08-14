import express, { type Application } from 'express';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const app: Application = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "TokTickIT API" });
});

app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await db.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default app;