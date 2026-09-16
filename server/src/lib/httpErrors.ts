import type { Response } from "express";

// Shared HTTP error helpers. Keep the safe, consistent `{ error: { code,
// message [, fields] } }` envelope used across the API (api-spec section 1).

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  res.status(status).json({ error: { code, message } });
}

export function validationError(
  res: Response,
  fields: Record<string, string>,
  message = "Validation failed"
): void {
  res.status(400).json({ error: { code: "VALIDATION_ERROR", message, fields } });
}