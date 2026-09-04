import { expect, type APIRequestContext } from "@playwright/test";

// ── Shared helpers for the Lab 2 E2E / responsive specs ─────────────────────
// Extracted from requester-ticket-flow.spec.ts and responsive.visual.spec.ts so
// the two specs do not each redefine identical buffers/helpers (tests.md §2).

export const API_BASE = "http://localhost:5000";

/** A tiny valid 1×1 PNG so the client MIME/extension validator accepts it. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export interface CreateTicketOverrides {
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: string;
}

export interface CreatedTicket {
  id: number;
  ticketNumber: string;
  summary: string;
}

/**
 * Creates a ticket directly through the API (seeding data without walking the
 * UI). Accepts optional category/system/priority overrides; defaults to
 * Hardware / Corporate Laptop / HIGH.
 */
export async function createTicketViaApi(
  request: APIRequestContext,
  requesterId: number,
  summary: string,
  overrides: CreateTicketOverrides = {}
): Promise<CreatedTicket> {
  const res = await request.post(`${API_BASE}/api/tickets`, {
    data: {
      requesterId,
      categoryId: overrides.categoryId ?? 2, // Hardware
      relatedSystemId: overrides.relatedSystemId ?? 7, // Corporate Laptop
      requestedPriority: overrides.requestedPriority ?? "HIGH",
      summary,
      description: `Responsive visual-screenshot ticket: ${summary}`,
    },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as { data: CreatedTicket };
  return body.data;
}
