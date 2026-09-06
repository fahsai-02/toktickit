import { expect, type Page, type APIRequestContext } from "@playwright/test";

export const API_BASE = "http://localhost:5000";

export const STORAGE_KEY = "toktickit-requester";

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

export interface CreatedAttachment {
  id: number;
}

/**
 * Uploads an attachment directly through the API (seeding data without
 * walking the UI). Returns the created attachment so tests can target it by id.
 */
export async function uploadAttachmentViaApi(
  request: APIRequestContext,
  ticketId: number,
  requesterId: number,
  fileName: string
): Promise<CreatedAttachment> {
  const res = await request.post(`${API_BASE}/api/tickets/${ticketId}/attachments`, {
    multipart: {
      requesterId: String(requesterId),
      file: { name: fileName, mimeType: "image/png", buffer: TINY_PNG },
    },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as { data: CreatedAttachment };
  return body.data;
}

/** Soft-removes an attachment through the API with the given reason. */
export async function removeAttachmentViaApi(
  request: APIRequestContext,
  attachmentId: number,
  requesterId: number,
  removalReason: string
): Promise<CreatedAttachment> {
  const res = await request.delete(`${API_BASE}/api/attachments/${attachmentId}`, {
    data: { requesterId, removalReason },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: CreatedAttachment };
  return body.data;
}

/** Inject a requester into localStorage so the app skips the selection screen. */
export function seedRequester(page: Page, requester: { id: number; name: string }) {
  page.addInitScript(
    (args) => {
      const { key, requester: r } = args as { key: string; requester: unknown };
      window.localStorage.setItem(key, JSON.stringify(r));
    },
    { key: STORAGE_KEY, requester }
  );
}

/** Assert no unintended horizontal page scrolling at the current viewport. */
export async function assertNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(
    () => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)
  );
  const innerWidth = await page.evaluate(() => window.innerWidth);
  expect(scrollWidth, `document scrollWidth ${scrollWidth} exceeds innerWidth ${innerWidth}`).toBeLessThanOrEqual(
    innerWidth + 1
  );
}

/**
 * Full-page screenshot at true top in `artifacts/lab-02/screenshots/<screen>/<project>.png`.
 * Under parallel runners the page can be left scrolled mid-form, which makes
 * Playwright's fullPage stitch start offset and the sticky header land below a
 * blank band at the top; scroll to 0 and let fonts/layout settle first.
 */
export async function capture(page: Page, screen: string, project: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts?.ready);
  // 600ms (not 150ms): the sticky header needs longer to re-stick after a
  // scroll-to-top, otherwise mobile shots keep a white band above the navbar.
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `artifacts/lab-02/screenshots/${screen}/${project}.png`,
    fullPage: true,
  });
}
