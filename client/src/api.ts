const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  categoryId: number | null;
}



// ── Lab 3 Authentication APIs (Issue 17) ────────────────────────────────────
// Session-based auth: the server sets a `connect.sid` cookie on login.
// Every call below sends `credentials: "include"` so the browser attaches
// that cookie — without it the server sees every request as unauthenticated.

export async function login(
  email: string,
  password: string
): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to sign in");
  }
  const { data } = (await res.json()) as { data: User };
  return data;
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to sign out");
  }
}

export async function fetchMe(): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to fetch current user");
  }
  const { data } = (await res.json()) as { data: User };
  return data;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePassword(
  input: ChangePasswordInput
): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to change password");
  }
}

// ── Lab 2 Reference APIs ───────────────────────────────────────────────────
// NOTE (Issue 17 fix): every call below sends `credentials: "include"` so the
// session cookie travels with it. Without this the server will see these
// requests as unauthenticated the moment Issue 18 enforces `requireAuth` on
// the ticket/attachment routes.

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`, {
    credentials: "include",
  });
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
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, "Failed to fetch related systems");
  }
  const { data } = (await res.json()) as { data: RelatedSystem[] };
  return data;
}

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

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

  const res = await fetch(url, { credentials: "include" });
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
    credentials: "include",
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
  resolutionSummary: string | null;
  requesterIndicatedResolved: boolean;
  indicatedResolvedAt: string | null;
  owner: { id: number; name: string; role: UserRole } | null;
  _count: { attachments: number; comments: number; notes: number };
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export async function fetchTicket(ticketId: number): Promise<TicketDetail> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/tickets/${ticketId}`, base);

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch ticket: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: TicketDetail };
  return data;
}

// ── Public Comments (Issue 18, api-spec 4.7-4.8) ──────────────────────────

export interface PublicComment {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role: UserRole };
}

export async function fetchTicketComments(
  ticketId: number
): Promise<PublicComment[]> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/tickets/${ticketId}/comments`, base);

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch comments: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: PublicComment[] };
  return data;
}

export async function postPublicComment(
  ticketId: number,
  content: string
): Promise<PublicComment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to post comment");
  }
  const { data } = (await res.json()) as { data: PublicComment };
  return data;
}

// ── "Problem Appears Resolved" toggle (Issue 18, api-spec 4.9) ────────────

export interface ResolvedIndicator {
  id: number;
  requesterIndicatedResolved: boolean;
  indicatedResolvedAt: string | null;
}

export async function indicateResolved(
  ticketId: number
): Promise<ResolvedIndicator> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/indicate-resolved`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to update resolved indicator");
  }
  const { data } = (await res.json()) as { data: ResolvedIndicator };
  return data;
}

// ── Attachments (Issue 11) ─────────────────────────────────────────────

export async function uploadAttachment(
  ticketId: number,
  file: File
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    await handleApiError(res, `Failed to upload attachment: ${res.status}`);
  }

  const { data } = (await res.json()) as { data: Attachment };
  return data;
}

export async function downloadAttachment(attachmentId: number): Promise<Blob> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/attachments/${attachmentId}/download`, base);

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to download attachment: ${res.status}`);
  }

  return res.blob();
}

export async function removeAttachment(
  attachmentId: number,
  removalReason: string
): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removalReason }),
  });

  if (!res.ok) {
    await handleApiError(res, `Failed to remove attachment: ${res.status}`);
  }

  const { data } = (await res.json()) as { data: Attachment };
  return data;
}

