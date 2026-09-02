const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
  department: string | null;
}

export interface RelatedSystem {
  id: number;
  name: string;
  categoryId: number | null;
}



// ── Lab 2 Reference APIs ───────────────────────────────────────────────────

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/dev/requesters`);
  if (!res.ok) {
    await handleApiError(res, "Failed to fetch requesters");
  }
  const { data } = (await res.json()) as { data: Requester[] };
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    await handleApiError(res, "Failed to fetch categories");
  }
  const { data } = (await res.json()) as { data: Category[] };
  return data;
}

export async function fetchRelatedSystems(
  categoryId?: number
): Promise<RelatedSystem[]> {
  const url = new URL("/api/related-systems", API_URL || window.location.origin);
  if (categoryId !== undefined) {
    url.searchParams.set("categoryId", String(categoryId));
  }
  const res = await fetch(url);
  if (!res.ok) {
    await handleApiError(res, "Failed to fetch related systems");
  }
  const { data } = (await res.json()) as { data: RelatedSystem[] };
  return data;
}

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "NEW";

export interface TicketRequester {
  id: number;
  name: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: TicketStatus;
  ticketDate: string;
  requester: TicketRequester;
  category: Category;
  relatedSystem: Pick<RelatedSystem, "id" | "name">;
  createdAt: string;
  updatedAt: string;
}

export interface NewTicketInput {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: RequestedPriority;
  summary: string;
  description: string;
}

// ── Ticket List (Issue 9) ───────────────────────────────────────────────────

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: TicketStatus;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketListParams {
  requesterId: number;
  search?: string;
  categoryId?: number;
  currentStatus?: string;
  requestedPriority?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchTickets(
  params: TicketListParams
): Promise<{ data: TicketListItem[]; meta: TicketListMeta }> {
  const base = API_URL || window.location.origin;
  const url = new URL("/api/tickets", base);
  url.searchParams.set("requesterId", String(params.requesterId));
  if (params.search) url.searchParams.set("search", params.search);
  if (params.categoryId !== undefined)
    url.searchParams.set("categoryId", String(params.categoryId));
  if (params.currentStatus)
    url.searchParams.set("currentStatus", params.currentStatus);
  if (params.requestedPriority)
    url.searchParams.set("requestedPriority", params.requestedPriority);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.pageSize !== undefined)
    url.searchParams.set("pageSize", String(params.pageSize));

  const res = await fetch(url);
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch tickets: ${res.status}`);
  }
  return (await res.json()) as { data: TicketListItem[]; meta: TicketListMeta };
}

export class ApiError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(message: string, code: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
  }
}

async function handleApiError(
  res: Response,
  fallbackMessage: string
): Promise<never> {
  let message = fallbackMessage;
  let code = "INTERNAL_ERROR";
  let fields: Record<string, string> | undefined;
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; fields?: Record<string, string> };
    };
    code = body.error?.code ?? "INTERNAL_ERROR";
    message = body.error?.message ?? message;
    fields = body.error?.fields;
  } catch {
    // ignore malformed error body
  }
  throw new ApiError(message, code, fields);
}

export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    await handleApiError(res, `Failed to create ticket: ${res.status}`);
  }

  const { data } = (await res.json()) as { data: Ticket };
  return data;
}

// ── Ticket Detail (Issue 10) ──────────────────────────────────────────────

export interface Attachment {
  id: number;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  isRemoved: boolean;
  removedAt: string | null;
  removalReason: string | null;
  uploadedByRequesterId: number;
  createdAt: string;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: TicketStatus;
  ticketDate: string;
  requester: TicketRequester;
  category: Category;
  relatedSystem: Pick<RelatedSystem, "id" | "name">;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export async function fetchTicket(
  ticketId: number,
  requesterId: number
): Promise<TicketDetail> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/tickets/${ticketId}`, base);
  url.searchParams.set("requesterId", String(requesterId));

  const res = await fetch(url);
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch ticket: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: TicketDetail };
  return data;
}

// ── Attachments (Issue 11) ─────────────────────────────────────────────

export async function uploadAttachment(
  ticketId: number,
  requesterId: number,
  file: File
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("requesterId", String(requesterId));
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    await handleApiError(res, `Failed to upload attachment: ${res.status}`);
  }

  const { data } = (await res.json()) as { data: Attachment };
  return data;
}

export async function downloadAttachment(
  attachmentId: number,
  requesterId: number
): Promise<Blob> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/attachments/${attachmentId}/download`, base);
  url.searchParams.set("requesterId", String(requesterId));

  const res = await fetch(url);
  if (!res.ok) {
    await handleApiError(res, `Failed to download attachment: ${res.status}`);
  }

  return res.blob();
}

export async function removeAttachment(
  attachmentId: number,
  requesterId: number,
  removalReason: string
): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requesterId, removalReason }),
  });

  if (!res.ok) {
    await handleApiError(res, `Failed to remove attachment: ${res.status}`);
  }

  const { data } = (await res.json()) as { data: Attachment };
  return data;
}

