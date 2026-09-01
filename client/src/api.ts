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

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// ── Legacy (Lab 1) ────────────────────────────────────────────────────────

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error(
      `Category fetch failed with status ${categoriesRes.status}`
    );
  }

  const { data: categories } = (await categoriesRes.json()) as {
    data: Category[];
  };
  return { online: true, categories };
}

// ── Lab 2 Reference APIs ───────────────────────────────────────────────────

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/dev/requesters`);
  if (!res.ok) {
    throw new Error(`Failed to fetch requesters: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: Requester[] };
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: Category[] };
  return data;
}

export async function fetchRelatedSystems(
  categoryId?: number
): Promise<RelatedSystem[]> {
  const base = API_URL || window.location.origin;
  const url = new URL("/api/related-systems", base);
  if (categoryId !== undefined) {
    url.searchParams.set("categoryId", String(categoryId));
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch related systems: ${res.status}`);
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
    let message = `Failed to fetch tickets: ${res.status}`;
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

export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let message = `Failed to create ticket: ${res.status}`;
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

  const { data } = (await res.json()) as { data: Ticket };
  return data;
}

