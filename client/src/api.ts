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

// ── IT Staff Ticket Queue (Issue 19) ────────────────────────────────────────

export interface StaffTicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: TicketStatus;
  category: Category;
  requester: TicketRequester;
  owner: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketListParams {
  search?: string;
  categoryId?: number;
  currentStatus?: string;
  requestedPriority?: string;
  itPriority?: string;
  /** "me" | "unassigned" | an integer owner id (api-spec section 5.1). */
  ownerId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchStaffTickets(
  params: StaffTicketListParams
): Promise<{ data: StaffTicketListItem[]; meta: TicketListMeta }> {
  const base = API_URL || window.location.origin;
  const url = new URL("/api/staff/tickets", base);
  if (params.search) url.searchParams.set("search", params.search);
  if (params.categoryId !== undefined)
    url.searchParams.set("categoryId", String(params.categoryId));
  if (params.currentStatus)
    url.searchParams.set("currentStatus", params.currentStatus);
  if (params.requestedPriority)
    url.searchParams.set("requestedPriority", params.requestedPriority);
  if (params.itPriority)
    url.searchParams.set("itPriority", params.itPriority);
  if (params.ownerId) url.searchParams.set("ownerId", params.ownerId);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.pageSize !== undefined)
    url.searchParams.set("pageSize", String(params.pageSize));

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch staff queue: ${res.status}`);
  }
  return (await res.json()) as { data: StaffTicketListItem[]; meta: TicketListMeta };
}

// ── IT Staff Ticket Detail (Issue 20, api-spec section 5.2-5.13) ────────────

/** Same shape as the requester detail (api-spec 5.2 "same as 4.3"). */
export type StaffTicketDetail = TicketDetail;

export interface StaffUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface TicketOwner {
  id: number;
  name: string;
  role: UserRole;
}

export interface InternalNote {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role: UserRole };
}

export async function fetchStaffTicket(ticketId: number): Promise<StaffTicketDetail> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/staff/tickets/${ticketId}`, base);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch ticket: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: StaffTicketDetail };
  return data;
}

export async function claimTicket(ticketId: number): Promise<{ owner: TicketOwner }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/claim`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to claim ticket");
  }
  const { data } = (await res.json()) as { data: { owner: TicketOwner } };
  return data;
}

export async function assignTicket(
  ticketId: number,
  ownerId: number
): Promise<{ owner: TicketOwner }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/assign`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to assign ticket");
  }
  const { data } = (await res.json()) as { data: { owner: TicketOwner } };
  return data;
}

export async function updateStaffTicketPriority(
  ticketId: number,
  itPriority: RequestedPriority
): Promise<{ itPriority: RequestedPriority }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itPriority }),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to set IT priority");
  }
  const { data } = (await res.json()) as { data: { itPriority: RequestedPriority } };
  return data;
}

export async function updateStaffTicketStatus(
  ticketId: number,
  currentStatus: TicketStatus
): Promise<{ currentStatus: TicketStatus }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentStatus }),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to update ticket status");
  }
  const { data } = (await res.json()) as { data: { currentStatus: TicketStatus } };
  return data;
}

export async function updateStaffTicketCategory(
  ticketId: number,
  categoryId: number
): Promise<{ category: Category }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/category`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId }),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to set category");
  }
  const { data } = (await res.json()) as { data: { category: Category } };
  return data;
}

export async function saveResolutionSummary(
  ticketId: number,
  resolutionSummary: string
): Promise<{ resolutionSummary: string }> {
  const res = await fetch(
    `${API_URL}/api/staff/tickets/${ticketId}/resolution-summary`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionSummary }),
    }
  );
  if (!res.ok) {
    await handleApiError(res, "Failed to save resolution summary");
  }
  const { data } = (await res.json()) as { data: { resolutionSummary: string } };
  return data;
}

export async function fetchStaffComments(ticketId: number): Promise<PublicComment[]> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/staff/tickets/${ticketId}/comments`, base);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch comments: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: PublicComment[] };
  return data;
}

export async function postStaffComment(
  ticketId: number,
  content: string
): Promise<PublicComment> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/comments`, {
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

export async function fetchInternalNotes(ticketId: number): Promise<InternalNote[]> {
  const base = API_URL || window.location.origin;
  const url = new URL(`/api/staff/tickets/${ticketId}/notes`, base);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch notes: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: InternalNote[] };
  return data;
}

export async function createInternalNote(
  ticketId: number,
  content: string
): Promise<InternalNote> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    await handleApiError(res, "Failed to create note");
  }
  const { data } = (await res.json()) as { data: InternalNote };
  return data;
}

export async function fetchStaffUsers(): Promise<StaffUser[]> {
  const base = API_URL || window.location.origin;
  const url = new URL("/api/staff/users", base);
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    await handleApiError(res, `Failed to fetch staff users: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: StaffUser[] };
  return data;
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

